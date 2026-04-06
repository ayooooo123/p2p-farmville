/* global Bare */
const Pear = require('pear')

/* P2P FarmVille Main Process - Pear Desktop App
 *
 * This Bare worker handles ALL P2P networking:
 * - Corestore for persistent storage (farm state, world registry, chat)
 * - Hyperswarm for peer discovery on a shared world topic
 * - Protomux for multiplexed channels per connection
 * - Trade, Gift, Co-op, and Help channels for social features
 *
 * IPC Protocol (worker <-> renderer):
 *   Renderer sends:
 *     { type: 'init', playerName }
 *     { type: 'update-farm', farmState }
 *     { type: 'chat', message }
 *     { type: 'chat-private', targetKey, message }
 *     { type: 'chat-emote', emote }
 *     { type: 'trade-offer', targetKey, items, wants }
 *     { type: 'trade-respond', tradeId, accept }
 *     { type: 'trade-cancel', tradeId }
 *     { type: 'send-gift', targetKey, items, message }
 *     { type: 'create-coop', cropType, targetQty, reward }
 *     { type: 'contribute-coop', missionId, amount }
 *     { type: 'request-help', helpType, plotId }
 *     { type: 'respond-help', requestId }
 *   Worker sends:
 *     { type: 'neighbors', neighbors: [...] }
 *     { type: 'chat-message', from, message, timestamp, channel, fromKey }
 *     { type: 'farm-update', playerKey, farmState }
 *     { type: 'connected', count }
 *     { type: 'worker:ready', storagePath }
 *     { type: 'error', error }
 *     { type: 'trade-offer', trade }
 *     { type: 'trade-result', tradeId, accepted }
 *     { type: 'trade-cancelled', tradeId }
 *     { type: 'gift-received', from, fromKey, items, message }
 *     { type: 'coop-update', missions }
 *     { type: 'help-request', request }
 *     { type: 'help-response', requestId, responderKey, responderName }
 *     { type: 'player-joined', playerName, playerKey }
 *     { type: 'player-left', playerName, playerKey }
 */

const Corestore = require('corestore')
const Hyperswarm = require('hyperswarm')
const Protomux = require('protomux')
const b4a = require('b4a')
const crypto = require('hypercore-crypto')

const WORLD_TOPIC = 'p2p-farmville-world-v1'
const ANNOUNCE_INTERVAL = 30000 // re-announce every 30s
const NEIGHBOR_BROADCAST_INTERVAL = 5000 // send neighbor list every 5s
const HELP_REQUEST_EXPIRY = 30 * 60 * 1000 // 30 minutes
const DAILY_GIFT_LIMIT = 5

// ── State ───────────────────────────────────────────────────────────────────
const storagePath = Pear.config.storage
let store = null
let swarm = null
let playerName = ''
let playerKey = '' // hex of our public key
let initialized = false

// Named Hypercores
let farmStateCore = null // our own farm state (append-only snapshots)
let worldRegistryCore = null // shared world registry
let chatLogCore = null // shared chat history

// Discovered neighbors: Map<hexKey, { name, key, position, farmState, lastSeen }>
const neighbors = new Map()

// Connected peers: Map<hexKey, { stream, mux, channels }>
const peers = new Map()

let peerCount = 0

// ── Social state ────────────────────────────────────────────────────────────
// Trades: Map<tradeId, { from, fromKey, to, toKey, items, wants, status, timestamp }>
const pendingTrades = new Map()
let tradeIdCounter = 0

// Gifts: track daily gift count
let giftsSentToday = 0
let giftDayKey = new Date().toDateString()

// Co-op missions: Map<missionId, { cropType, targetQty, currentQty, contributors, reward, creatorKey, creatorName, status }>
const coopMissions = new Map()
let coopIdCounter = 0

// Help requests: Map<requestId, { playerKey, playerName, type, plotId, timestamp, responded }>
const helpRequests = new Map()
let helpIdCounter = 0

// ── Pear teardown ──────────────────────────────────────────────────────────
Pear.teardown(async () => {
  if (swarm) await swarm.destroy()
  if (store) await store.close()
})

// ── IPC helpers ─────────────────────────────────────────────────────────────
const NDJSON_DELIM = '\n'

function send (msg) {
  try {
    Bare.IPC.write(JSON.stringify(msg) + NDJSON_DELIM)
  } catch (e) {
    console.error('[main] IPC write error:', e.message)
  }
}

function sendError (error) {
  send({ type: 'error', error: String(error) })
}

// ── Protomux encoding helper ────────────────────────────────────────────────
const rawEncoding = {
  preencode (state, m) { state.end += m.byteLength },
  encode (state, m) { state.buffer.set(m, state.start); state.start += m.byteLength },
  decode (state) { return state.buffer.subarray(state.start, state.end) }
}

// ── Initialize Corestore + Hypercores ───────────────────────────────────────
async function initStore () {
  try {
    store = new Corestore(storagePath)
    await store.ready()

    farmStateCore = store.get({ name: 'farm-state' })
    await farmStateCore.ready()

    worldRegistryCore = store.get({ name: 'world-registry' })
    await worldRegistryCore.ready()

    chatLogCore = store.get({ name: 'chat-log' })
    await chatLogCore.ready()

    playerKey = b4a.toString(farmStateCore.key, 'hex')

    console.log('[worker] Corestore ready at:', storagePath)
    console.log('[worker] Farm core key:', playerKey)
    console.log('[worker] World registry key:', b4a.toString(worldRegistryCore.key, 'hex'))

    return true
  } catch (e) {
    console.error('[worker] Corestore init error:', e.message)
    sendError('Failed to initialize storage: ' + e.message)
    return false
  }
}

// ── Initialize Hyperswarm ───────────────────────────────────────────────────
async function initSwarm () {
  try {
    swarm = new Hyperswarm()

    const topicBuffer = b4a.from(WORLD_TOPIC)
    const topicKey = crypto.discoveryKey(topicBuffer)

    swarm.on('connection', handleConnection)

    const discovery = swarm.join(topicKey, { server: true, client: true })
    await discovery.flushed()

    console.log('[worker] Joined swarm on topic:', WORLD_TOPIC)
    console.log('[worker] Discovery key:', b4a.toString(topicKey, 'hex').slice(0, 16) + '...')

    return true
  } catch (e) {
    console.error('[worker] Swarm init error:', e.message)
    sendError('Failed to join swarm: ' + e.message)
    return false
  }
}

// ── Handle new peer connection ──────────────────────────────────────────────
function handleConnection (stream) {
  try {
    const remoteKey = b4a.toString(stream.remotePublicKey, 'hex')
    console.log('[worker] Peer connected:', remoteKey.slice(0, 12) + '...')

    // Replicate corestore over the connection
    store.replicate(stream)

    // Set up Protomux for structured communication
    const mux = Protomux.from(stream)

    // ── Farm sync channel ─────────────────────────────────────────────────
    const farmChannel = mux.createChannel({
      protocol: 'farm-sync',
      id: b4a.from(playerKey, 'hex'),
      onopen () {
        console.log('[worker] Farm channel opened with:', remoteKey.slice(0, 12))
        farmChannel.messages[0].send(b4a.from(JSON.stringify({
          type: 'farm-key',
          key: playerKey,
          name: playerName,
          worldKey: b4a.toString(worldRegistryCore.key, 'hex'),
          chatKey: b4a.toString(chatLogCore.key, 'hex')
        })))
      },
      onclose () {
        console.log('[worker] Farm channel closed with:', remoteKey.slice(0, 12))
      }
    })

    farmChannel.addMessage({
      encoding: rawEncoding,
      onmessage (buf) { handleFarmMessage(remoteKey, buf) }
    })
    farmChannel.open()

    // ── World announce channel ────────────────────────────────────────────
    const worldChannel = mux.createChannel({
      protocol: 'world-announce',
      id: b4a.from(WORLD_TOPIC),
      onopen () {
        console.log('[worker] World channel opened with:', remoteKey.slice(0, 12))
        broadcastAnnouncement(worldChannel)
      },
      onclose () {
        console.log('[worker] World channel closed with:', remoteKey.slice(0, 12))
      }
    })

    worldChannel.addMessage({
      encoding: rawEncoding,
      onmessage (buf) { handleWorldMessage(remoteKey, buf) }
    })
    worldChannel.open()

    // ── Chat channel (enhanced with private, emotes, system) ──────────────
    const chatChannel = mux.createChannel({
      protocol: 'chat',
      id: b4a.from('p2p-farmville-chat'),
      onopen () {
        console.log('[worker] Chat channel opened with:', remoteKey.slice(0, 12))
        // Send system message about player join
        const joinMsg = JSON.stringify({
          type: 'system',
          message: playerName + ' is online',
          fromKey: playerKey,
          playerName: playerName,
          timestamp: Date.now()
        })
        chatChannel.messages[0].send(b4a.from(joinMsg))
      }
    })

    chatChannel.addMessage({
      encoding: rawEncoding,
      onmessage (buf) { handleChatMessage(remoteKey, buf) }
    })
    chatChannel.open()

    // ── Trade channel ─────────────────────────────────────────────────────
    const tradeChannel = mux.createChannel({
      protocol: 'trade',
      id: b4a.from('p2p-farmville-trade'),
      onopen () {
        console.log('[worker] Trade channel opened with:', remoteKey.slice(0, 12))
      }
    })

    tradeChannel.addMessage({
      encoding: rawEncoding,
      onmessage (buf) { handleTradeMessage(remoteKey, buf) }
    })
    tradeChannel.open()

    // ── Gift channel ──────────────────────────────────────────────────────
    const giftChannel = mux.createChannel({
      protocol: 'gift',
      id: b4a.from('p2p-farmville-gift'),
      onopen () {
        console.log('[worker] Gift channel opened with:', remoteKey.slice(0, 12))
      }
    })

    giftChannel.addMessage({
      encoding: rawEncoding,
      onmessage (buf) { handleGiftMessage(remoteKey, buf) }
    })
    giftChannel.open()

    // ── Co-op channel ─────────────────────────────────────────────────────
    const coopChannel = mux.createChannel({
      protocol: 'coop',
      id: b4a.from('p2p-farmville-coop'),
      onopen () {
        console.log('[worker] Coop channel opened with:', remoteKey.slice(0, 12))
        // Sync existing missions to new peer
        broadcastCoopList(coopChannel)
      }
    })

    coopChannel.addMessage({
      encoding: rawEncoding,
      onmessage (buf) { handleCoopMessage(remoteKey, buf) }
    })
    coopChannel.open()

    // ── Help channel ──────────────────────────────────────────────────────
    const helpChannel = mux.createChannel({
      protocol: 'help',
      id: b4a.from('p2p-farmville-help'),
      onopen () {
        console.log('[worker] Help channel opened with:', remoteKey.slice(0, 12))
      }
    })

    helpChannel.addMessage({
      encoding: rawEncoding,
      onmessage (buf) { handleHelpMessage(remoteKey, buf) }
    })
    helpChannel.open()

    // Store peer info
    peers.set(remoteKey, { stream, mux, farmChannel, worldChannel, chatChannel, tradeChannel, giftChannel, coopChannel, helpChannel })

    peerCount = peers.size
    send({ type: 'connected', count: peerCount })

    // Handle disconnection
    stream.on('close', () => {
      console.log('[worker] Peer disconnected:', remoteKey.slice(0, 12) + '...')
      const neighbor = neighbors.get(remoteKey)
      const disconnectedName = neighbor ? neighbor.name : 'Unknown'

      peers.delete(remoteKey)
      peerCount = peers.size
      send({ type: 'connected', count: peerCount })
      send({ type: 'player-left', playerName: disconnectedName, playerKey: remoteKey })
      send({ type: 'chat-message', from: 'System', fromKey: 'system', message: disconnectedName + ' went offline', timestamp: Date.now(), channel: 'system' })
    })

    stream.on('error', (err) => {
      console.error('[worker] Stream error with', remoteKey.slice(0, 12), ':', err.message)
    })
  } catch (e) {
    console.error('[worker] Connection handler error:', e.message)
  }
}

// ── Farm message handler ────────────────────────────────────────────────────
function handleFarmMessage (remoteKey, buf) {
  try {
    const msg = JSON.parse(b4a.toString(buf))

    if (msg.type === 'farm-key') {
      console.log('[worker] Received farm key from', remoteKey.slice(0, 12), '- name:', msg.name)

      const existing = neighbors.get(remoteKey) || {}
      neighbors.set(remoteKey, {
        ...existing,
        name: msg.name || 'Unknown',
        key: msg.key,
        worldKey: msg.worldKey,
        chatKey: msg.chatKey,
        lastSeen: Date.now()
      })

      if (msg.key) {
        try {
          const peerFarmCore = store.get(b4a.from(msg.key, 'hex'))
          peerFarmCore.ready().then(() => {
            readPeerFarmState(remoteKey, peerFarmCore)
          }).catch(e => console.error('[worker] Peer farm core error:', e.message))
        } catch (e) {
          console.error('[worker] Error getting peer farm core:', e.message)
        }
      }

      // Notify renderer of new player
      send({ type: 'player-joined', playerName: msg.name, playerKey: remoteKey })
      send({ type: 'chat-message', from: 'System', fromKey: 'system', message: msg.name + ' came online', timestamp: Date.now(), channel: 'system' })

      broadcastNeighborList()
    } else if (msg.type === 'farm-state') {
      const neighbor = neighbors.get(remoteKey)
      if (neighbor) {
        neighbor.farmState = msg.state
        neighbor.lastSeen = Date.now()
        neighbors.set(remoteKey, neighbor)

        send({
          type: 'farm-update',
          playerKey: remoteKey,
          farmState: msg.state
        })

        broadcastNeighborList()
      }
    }
  } catch (e) {
    console.error('[worker] Farm message parse error:', e.message)
  }
}

// ── World message handler ───────────────────────────────────────────────────
function handleWorldMessage (remoteKey, buf) {
  try {
    const msg = JSON.parse(b4a.toString(buf))

    if (msg.type === 'announce') {
      const existing = neighbors.get(remoteKey) || {}
      neighbors.set(remoteKey, {
        ...existing,
        name: msg.playerName || existing.name || 'Unknown',
        key: msg.playerKey || remoteKey,
        position: msg.position || existing.position || { x: 0, z: 0 },
        farmCoreKey: msg.farmCoreKey,
        lastSeen: Date.now()
      })

      console.log('[worker] Neighbor announced:', msg.playerName, 'at position', JSON.stringify(msg.position))
      broadcastNeighborList()
    }
  } catch (e) {
    console.error('[worker] World message parse error:', e.message)
  }
}

// ── Enhanced chat message handler ───────────────────────────────────────────
function handleChatMessage (remoteKey, buf) {
  try {
    const msg = JSON.parse(b4a.toString(buf))

    if (msg.type === 'chat' || msg.type === 'private' || msg.type === 'emote' || msg.type === 'system') {
      // Private messages: only forward if intended for us
      if (msg.type === 'private' && msg.to !== playerKey) return

      appendChatLog(msg.from || msg.playerName, msg.message, msg.timestamp)

      send({
        type: 'chat-message',
        from: msg.from || msg.playerName || 'Unknown',
        fromKey: msg.fromKey || remoteKey,
        message: msg.message,
        timestamp: msg.timestamp,
        channel: msg.type === 'private' ? 'private' : msg.type === 'emote' ? 'global' : msg.type === 'system' ? 'system' : 'global'
      })
    }
  } catch (e) {
    console.error('[worker] Chat message parse error:', e.message)
  }
}

// ── Trade message handler ───────────────────────────────────────────────────
function handleTradeMessage (remoteKey, buf) {
  try {
    const msg = JSON.parse(b4a.toString(buf))

    switch (msg.type) {
      case 'trade-offer': {
        // Someone is offering a trade to us
        if (msg.toKey !== playerKey) return
        pendingTrades.set(msg.id, {
          id: msg.id,
          from: msg.from,
          fromKey: msg.fromKey,
          to: playerName,
          toKey: playerKey,
          items: msg.items,
          wants: msg.wants,
          status: 'pending',
          timestamp: msg.timestamp
        })
        send({ type: 'trade-offer', trade: pendingTrades.get(msg.id) })
        break
      }
      case 'trade-accept': {
        const trade = pendingTrades.get(msg.tradeId)
        if (trade) {
          trade.status = 'accepted'
          send({ type: 'trade-result', tradeId: msg.tradeId, accepted: true })
          pendingTrades.delete(msg.tradeId)
        }
        break
      }
      case 'trade-reject': {
        const trade = pendingTrades.get(msg.tradeId)
        if (trade) {
          trade.status = 'rejected'
          send({ type: 'trade-result', tradeId: msg.tradeId, accepted: false })
          pendingTrades.delete(msg.tradeId)
        }
        break
      }
      case 'trade-cancel': {
        pendingTrades.delete(msg.tradeId)
        send({ type: 'trade-cancelled', tradeId: msg.tradeId })
        break
      }
    }
  } catch (e) {
    console.error('[worker] Trade message parse error:', e.message)
  }
}

// ── Gift message handler ────────────────────────────────────────────────────
function handleGiftMessage (remoteKey, buf) {
  try {
    const msg = JSON.parse(b4a.toString(buf))

    if (msg.type === 'gift-send') {
      // Someone sent us a gift
      if (msg.to !== playerKey) return
      send({
        type: 'gift-received',
        from: msg.from,
        fromKey: msg.fromKey,
        items: msg.items,
        message: msg.message
      })
    }
  } catch (e) {
    console.error('[worker] Gift message parse error:', e.message)
  }
}

// ── Co-op message handler ───────────────────────────────────────────────────
function handleCoopMessage (remoteKey, buf) {
  try {
    const msg = JSON.parse(b4a.toString(buf))

    switch (msg.type) {
      case 'coop-create': {
        coopMissions.set(msg.missionId, {
          missionId: msg.missionId,
          cropType: msg.cropType,
          targetQty: msg.targetQty,
          currentQty: 0,
          contributors: [],
          reward: msg.reward,
          creatorKey: msg.creatorKey,
          creatorName: msg.creatorName,
          status: 'active'
        })
        broadcastCoopUpdate()
        break
      }
      case 'coop-contribute': {
        const mission = coopMissions.get(msg.missionId)
        if (mission && mission.status === 'active') {
          mission.currentQty += msg.amount
          const existing = mission.contributors.find(c => c.key === msg.playerKey)
          if (existing) {
            existing.amount += msg.amount
          } else {
            mission.contributors.push({ key: msg.playerKey, name: msg.playerName, amount: msg.amount })
          }
          // Check if mission complete
          if (mission.currentQty >= mission.targetQty) {
            mission.status = 'completed'
            // Broadcast completion
            broadcastCoopComplete(mission)
          }
          broadcastCoopUpdate()
        }
        break
      }
      case 'coop-complete': {
        const mission = coopMissions.get(msg.missionId)
        if (mission) {
          mission.status = 'completed'
          mission.contributors = msg.contributors || mission.contributors
          broadcastCoopUpdate()
        }
        break
      }
      case 'coop-list': {
        // Sync missions from peer
        if (msg.missions) {
          for (const m of msg.missions) {
            if (!coopMissions.has(m.missionId)) {
              coopMissions.set(m.missionId, m)
            }
          }
          broadcastCoopUpdate()
        }
        break
      }
    }
  } catch (e) {
    console.error('[worker] Coop message parse error:', e.message)
  }
}

// ── Help message handler ────────────────────────────────────────────────────
function handleHelpMessage (remoteKey, buf) {
  try {
    const msg = JSON.parse(b4a.toString(buf))

    switch (msg.type) {
      case 'help-request': {
        helpRequests.set(msg.requestId, {
          requestId: msg.requestId,
          playerKey: msg.playerKey,
          playerName: msg.playerName,
          helpType: msg.helpType,
          plotId: msg.plotId,
          timestamp: msg.timestamp,
          responded: false
        })
        send({ type: 'help-request', request: helpRequests.get(msg.requestId) })
        break
      }
      case 'help-respond': {
        const request = helpRequests.get(msg.requestId)
        if (request) {
          request.responded = true
          send({
            type: 'help-response',
            requestId: msg.requestId,
            responderKey: msg.responderKey,
            responderName: msg.responderName
          })
        }
        break
      }
    }
  } catch (e) {
    console.error('[worker] Help message parse error:', e.message)
  }
}

// ── Read peer farm state from their Hypercore ───────────────────────────────
async function readPeerFarmState (remoteKey, peerCore) {
  try {
    await peerCore.update()
    const len = peerCore.length
    if (len === 0) return

    const entry = await peerCore.get(len - 1)
    if (entry) {
      const state = JSON.parse(b4a.toString(entry))
      const neighbor = neighbors.get(remoteKey)
      if (neighbor) {
        neighbor.farmState = state
        neighbors.set(remoteKey, neighbor)

        send({
          type: 'farm-update',
          playerKey: remoteKey,
          farmState: state
        })

        broadcastNeighborList()
      }
    }
  } catch (e) {
    console.error('[worker] Read peer farm state error:', e.message)
  }
}

// ── Broadcast announcement to all peers ─────────────────────────────────────
function broadcastAnnouncement (specificChannel) {
  const announcement = JSON.stringify({
    type: 'announce',
    playerKey: playerKey,
    playerName: playerName,
    farmCoreKey: playerKey,
    position: getMyPosition(),
    timestamp: Date.now()
  })

  const buf = b4a.from(announcement)

  if (specificChannel) {
    try {
      specificChannel.messages[0].send(buf)
    } catch (e) {
      console.error('[worker] Announce send error:', e.message)
    }
    return
  }

  for (const [key, peer] of peers) {
    try {
      if (peer.worldChannel && peer.worldChannel.opened) {
        peer.worldChannel.messages[0].send(buf)
      }
    } catch (e) {
      console.error('[worker] Broadcast announce error to', key.slice(0, 12), ':', e.message)
    }
  }
}

// ── Broadcast farm state to all peers ───────────────────────────────────────
function broadcastFarmState (farmState) {
  const msg = JSON.stringify({
    type: 'farm-state',
    state: farmState
  })

  const buf = b4a.from(msg)

  for (const [key, peer] of peers) {
    try {
      if (peer.farmChannel && peer.farmChannel.opened) {
        peer.farmChannel.messages[0].send(buf)
      }
    } catch (e) {
      console.error('[worker] Broadcast farm state error to', key.slice(0, 12), ':', e.message)
    }
  }
}

// ── Broadcast chat message to all peers ─────────────────────────────────────
function broadcastChatMessage (message, type, targetKey) {
  const msg = {
    type: type || 'chat',
    from: playerName,
    fromKey: playerKey,
    message: message,
    timestamp: Date.now()
  }
  if (type === 'private') msg.to = targetKey

  const buf = b4a.from(JSON.stringify(msg))

  if (type === 'private') {
    // Only send to specific peer
    const peer = peers.get(targetKey)
    if (peer && peer.chatChannel && peer.chatChannel.opened) {
      try { peer.chatChannel.messages[0].send(buf) } catch (e) { /* ignore */ }
    }
  } else {
    for (const [key, peer] of peers) {
      try {
        if (peer.chatChannel && peer.chatChannel.opened) {
          peer.chatChannel.messages[0].send(buf)
        }
      } catch (e) {
        console.error('[worker] Broadcast chat error to', key.slice(0, 12), ':', e.message)
      }
    }
  }
}

// ── Send trade offer ────────────────────────────────────────────────────────
function sendTradeOffer (targetKey, items, wants) {
  const tradeId = playerKey.slice(0, 8) + '-' + (++tradeIdCounter) + '-' + Date.now()
  const trade = {
    id: tradeId,
    from: playerName,
    fromKey: playerKey,
    to: '',
    toKey: targetKey,
    items: items,
    wants: wants,
    status: 'pending',
    timestamp: Date.now()
  }

  // Resolve target name
  const neighbor = neighbors.get(targetKey)
  trade.to = neighbor ? neighbor.name : 'Unknown'

  pendingTrades.set(tradeId, trade)

  const msg = JSON.stringify({
    type: 'trade-offer',
    id: tradeId,
    from: playerName,
    fromKey: playerKey,
    toKey: targetKey,
    items: items,
    wants: wants,
    timestamp: trade.timestamp
  })

  const peer = peers.get(targetKey)
  if (peer && peer.tradeChannel && peer.tradeChannel.opened) {
    try { peer.tradeChannel.messages[0].send(b4a.from(msg)) } catch (e) { /* ignore */ }
  }

  // Notify renderer of our outgoing trade
  send({ type: 'trade-offer', trade: trade })
  return tradeId
}

// ── Respond to trade ────────────────────────────────────────────────────────
function respondToTrade (tradeId, accept) {
  const trade = pendingTrades.get(tradeId)
  if (!trade) return

  const msgType = accept ? 'trade-accept' : 'trade-reject'
  const msg = JSON.stringify({ type: msgType, tradeId: tradeId })

  const peer = peers.get(trade.fromKey)
  if (peer && peer.tradeChannel && peer.tradeChannel.opened) {
    try { peer.tradeChannel.messages[0].send(b4a.from(msg)) } catch (e) { /* ignore */ }
  }

  trade.status = accept ? 'accepted' : 'rejected'
  send({ type: 'trade-result', tradeId: tradeId, accepted: accept })
  pendingTrades.delete(tradeId)
}

// ── Cancel trade ────────────────────────────────────────────────────────────
function cancelTrade (tradeId) {
  const trade = pendingTrades.get(tradeId)
  if (!trade) return

  const targetKey = trade.fromKey === playerKey ? trade.toKey : trade.fromKey
  const msg = JSON.stringify({ type: 'trade-cancel', tradeId: tradeId })

  const peer = peers.get(targetKey)
  if (peer && peer.tradeChannel && peer.tradeChannel.opened) {
    try { peer.tradeChannel.messages[0].send(b4a.from(msg)) } catch (e) { /* ignore */ }
  }

  pendingTrades.delete(tradeId)
  send({ type: 'trade-cancelled', tradeId: tradeId })
}

// ── Send gift ───────────────────────────────────────────────────────────────
function sendGift (targetKey, items, message) {
  // Reset daily counter if new day
  const today = new Date().toDateString()
  if (today !== giftDayKey) {
    giftDayKey = today
    giftsSentToday = 0
  }

  if (giftsSentToday >= DAILY_GIFT_LIMIT) {
    send({ type: 'error', error: 'Daily gift limit reached (' + DAILY_GIFT_LIMIT + '/day)' })
    return false
  }

  const msg = JSON.stringify({
    type: 'gift-send',
    from: playerName,
    fromKey: playerKey,
    to: targetKey,
    items: items,
    message: message || ''
  })

  const peer = peers.get(targetKey)
  if (peer && peer.giftChannel && peer.giftChannel.opened) {
    try { peer.giftChannel.messages[0].send(b4a.from(msg)) } catch (e) { /* ignore */ }
  }

  giftsSentToday++
  send({ type: 'gift-sent', remaining: DAILY_GIFT_LIMIT - giftsSentToday })
  return true
}

// ── Create co-op mission ────────────────────────────────────────────────────
function createCoopMission (cropType, targetQty, reward) {
  const missionId = playerKey.slice(0, 8) + '-coop-' + (++coopIdCounter) + '-' + Date.now()
  const mission = {
    missionId: missionId,
    cropType: cropType,
    targetQty: targetQty,
    currentQty: 0,
    contributors: [],
    reward: reward,
    creatorKey: playerKey,
    creatorName: playerName,
    status: 'active'
  }

  coopMissions.set(missionId, mission)

  const msg = JSON.stringify({
    type: 'coop-create',
    missionId: missionId,
    cropType: cropType,
    targetQty: targetQty,
    reward: reward,
    creatorKey: playerKey,
    creatorName: playerName
  })

  const buf = b4a.from(msg)
  for (const [, peer] of peers) {
    try {
      if (peer.coopChannel && peer.coopChannel.opened) {
        peer.coopChannel.messages[0].send(buf)
      }
    } catch (e) { /* ignore */ }
  }

  broadcastCoopUpdate()
  return missionId
}

// ── Contribute to co-op mission ─────────────────────────────────────────────
function contributeToCoopMission (missionId, amount) {
  const mission = coopMissions.get(missionId)
  if (!mission || mission.status !== 'active') return

  mission.currentQty += amount
  const existing = mission.contributors.find(c => c.key === playerKey)
  if (existing) {
    existing.amount += amount
  } else {
    mission.contributors.push({ key: playerKey, name: playerName, amount: amount })
  }

  const msg = JSON.stringify({
    type: 'coop-contribute',
    missionId: missionId,
    playerKey: playerKey,
    playerName: playerName,
    amount: amount
  })

  const buf = b4a.from(msg)
  for (const [, peer] of peers) {
    try {
      if (peer.coopChannel && peer.coopChannel.opened) {
        peer.coopChannel.messages[0].send(buf)
      }
    } catch (e) { /* ignore */ }
  }

  if (mission.currentQty >= mission.targetQty) {
    mission.status = 'completed'
    broadcastCoopComplete(mission)
  }

  broadcastCoopUpdate()
}

// ── Broadcast co-op mission list ────────────────────────────────────────────
function broadcastCoopList (specificChannel) {
  const missions = []
  for (const [, m] of coopMissions) {
    if (m.status === 'active') missions.push(m)
  }

  const msg = JSON.stringify({ type: 'coop-list', missions: missions })
  const buf = b4a.from(msg)

  if (specificChannel) {
    try { specificChannel.messages[0].send(buf) } catch (e) { /* ignore */ }
    return
  }

  for (const [, peer] of peers) {
    try {
      if (peer.coopChannel && peer.coopChannel.opened) {
        peer.coopChannel.messages[0].send(buf)
      }
    } catch (e) { /* ignore */ }
  }
}

function broadcastCoopComplete (mission) {
  const msg = JSON.stringify({
    type: 'coop-complete',
    missionId: mission.missionId,
    contributors: mission.contributors
  })

  const buf = b4a.from(msg)
  for (const [, peer] of peers) {
    try {
      if (peer.coopChannel && peer.coopChannel.opened) {
        peer.coopChannel.messages[0].send(buf)
      }
    } catch (e) { /* ignore */ }
  }
}

function broadcastCoopUpdate () {
  const missions = []
  for (const [, m] of coopMissions) {
    missions.push(m)
  }
  send({ type: 'coop-update', missions: missions })
}

// ── Request help ────────────────────────────────────────────────────────────
function requestHelp (helpType, plotId) {
  const requestId = playerKey.slice(0, 8) + '-help-' + (++helpIdCounter) + '-' + Date.now()
  const request = {
    requestId: requestId,
    playerKey: playerKey,
    playerName: playerName,
    helpType: helpType,
    plotId: plotId,
    timestamp: Date.now(),
    responded: false
  }

  helpRequests.set(requestId, request)

  const msg = JSON.stringify({
    type: 'help-request',
    requestId: requestId,
    playerKey: playerKey,
    playerName: playerName,
    helpType: helpType,
    plotId: plotId,
    timestamp: request.timestamp
  })

  const buf = b4a.from(msg)
  for (const [, peer] of peers) {
    try {
      if (peer.helpChannel && peer.helpChannel.opened) {
        peer.helpChannel.messages[0].send(buf)
      }
    } catch (e) { /* ignore */ }
  }

  return requestId
}

// ── Respond to help request ─────────────────────────────────────────────────
function respondToHelp (requestId) {
  const request = helpRequests.get(requestId)
  if (!request || request.responded) return

  request.responded = true

  const msg = JSON.stringify({
    type: 'help-respond',
    requestId: requestId,
    responderKey: playerKey,
    responderName: playerName
  })

  const buf = b4a.from(msg)
  for (const [, peer] of peers) {
    try {
      if (peer.helpChannel && peer.helpChannel.opened) {
        peer.helpChannel.messages[0].send(buf)
      }
    } catch (e) { /* ignore */ }
  }

  send({ type: 'help-response', requestId: requestId, responderKey: playerKey, responderName: playerName })
}

// ── Send neighbor list to renderer ──────────────────────────────────────────
function broadcastNeighborList () {
  const neighborList = []
  let idx = 0

  for (const [key, neighbor] of neighbors) {
    if (!neighbor.position || (neighbor.position.x === 0 && neighbor.position.z === 0)) {
      idx++
      neighbor.position = { x: idx * 90, z: 0 }
    }

    neighborList.push({
      name: neighbor.name || 'Unknown',
      key: key,
      position: neighbor.position,
      farmState: neighbor.farmState || null,
      lastSeen: neighbor.lastSeen,
      online: peers.has(key)
    })
  }

  send({ type: 'neighbors', neighbors: neighborList })
}

// ── Get our position ────────────────────────────────────────────────────────
function getMyPosition () {
  return { x: 0, z: 0 }
}

// ── Persist farm state to Hypercore ─────────────────────────────────────────
async function persistFarmState (farmState) {
  try {
    if (!farmStateCore) return

    const snapshot = JSON.stringify({
      ...farmState,
      playerName: playerName,
      playerKey: playerKey,
      timestamp: Date.now()
    })

    await farmStateCore.append(b4a.from(snapshot))
    console.log('[worker] Farm state persisted, entries:', farmStateCore.length)
  } catch (e) {
    console.error('[worker] Persist farm state error:', e.message)
  }
}

// ── Append chat log to Hypercore ────────────────────────────────────────────
async function appendChatLog (from, message, timestamp) {
  try {
    if (!chatLogCore) return

    const entry = JSON.stringify({ from, message, timestamp: timestamp || Date.now() })
    await chatLogCore.append(b4a.from(entry))
  } catch (e) {
    console.error('[worker] Append chat log error:', e.message)
  }
}

// ── Periodic tasks ──────────────────────────────────────────────────────────
function startPeriodicTasks () {
  // Re-announce to all peers periodically
  setInterval(() => {
    if (initialized && playerName) {
      broadcastAnnouncement()
    }
  }, ANNOUNCE_INTERVAL)

  // Send neighbor list to renderer periodically
  setInterval(() => {
    if (initialized) {
      broadcastNeighborList()
    }
  }, NEIGHBOR_BROADCAST_INTERVAL)

  // Clean up stale neighbors (not seen in 2 minutes)
  setInterval(() => {
    const now = Date.now()
    for (const [key, neighbor] of neighbors) {
      if (now - neighbor.lastSeen > 120000) {
        neighbors.delete(key)
        console.log('[worker] Removed stale neighbor:', key.slice(0, 12))
      }
    }

    // Clean up expired help requests
    for (const [id, req] of helpRequests) {
      if (now - req.timestamp > HELP_REQUEST_EXPIRY) {
        helpRequests.delete(id)
      }
    }

    // Clean up completed co-op missions older than 5 minutes
    for (const [id, m] of coopMissions) {
      if (m.status === 'completed' && now - (m.completedAt || 0) > 300000) {
        coopMissions.delete(id)
      }
    }

    if (initialized) broadcastNeighborList()
  }, 60000)
}

// ── IPC message handler from UI ─────────────────────────────────────────────
let ipcBuffer = ''

Bare.IPC.on('data', (chunk) => {
  ipcBuffer += chunk.toString()
  const lines = ipcBuffer.split(NDJSON_DELIM)
  ipcBuffer = lines.pop()

  for (const line of lines) {
    if (!line.trim()) continue
    handleIPCMessage(line)
  }
})

async function handleIPCMessage (str) {
  try {
    let data

    try {
      data = JSON.parse(str)
    } catch (e) {
      console.log('[main] Non-JSON message:', str)
      return
    }

    switch (data.type) {
      case 'init':
      case 'farm:init': {
        playerName = data.playerName || data.farmName || 'Farmer'
        console.log('[worker] Player initialized:', playerName)

        if (!initialized) {
          const storeOk = await initStore()
          if (!storeOk) return

          const swarmOk = await initSwarm()
          if (!swarmOk) return

          initialized = true
          startPeriodicTasks()

          send({
            type: 'initialized',
            playerKey: playerKey,
            playerName: playerName
          })

          console.log('[worker] P2P engine fully initialized')
        }

        if (worldRegistryCore) {
          const announcement = JSON.stringify({
            type: 'announce',
            playerKey: playerKey,
            playerName: playerName,
            farmCoreKey: playerKey,
            position: getMyPosition(),
            timestamp: Date.now()
          })
          await worldRegistryCore.append(b4a.from(announcement))
        }

        break
      }

      case 'update-farm': {
        if (!initialized) return
        const farmState = data.farmState
        if (!farmState) return
        await persistFarmState(farmState)
        broadcastFarmState(farmState)
        break
      }

      case 'chat': {
        if (!initialized) return
        const message = data.message
        if (!message) return
        await appendChatLog(playerName, message)
        broadcastChatMessage(message, 'chat')
        send({ type: 'chat-message', from: playerName, fromKey: playerKey, message: message, timestamp: Date.now(), channel: 'global' })
        break
      }

      case 'chat-private': {
        if (!initialized) return
        if (!data.targetKey || !data.message) return
        const neighbor = neighbors.get(data.targetKey)
        broadcastChatMessage(data.message, 'private', data.targetKey)
        send({ type: 'chat-message', from: playerName, fromKey: playerKey, message: data.message, timestamp: Date.now(), channel: 'private', to: neighbor ? neighbor.name : 'Unknown' })
        break
      }

      case 'chat-emote': {
        if (!initialized) return
        if (!data.emote) return
        const emoteMsg = playerName + ' ' + data.emote
        broadcastChatMessage(emoteMsg, 'emote')
        send({ type: 'chat-message', from: playerName, fromKey: playerKey, message: emoteMsg, timestamp: Date.now(), channel: 'global' })
        break
      }

      case 'trade-offer': {
        if (!initialized) return
        sendTradeOffer(data.targetKey, data.items, data.wants)
        break
      }

      case 'trade-respond': {
        if (!initialized) return
        respondToTrade(data.tradeId, data.accept)
        break
      }

      case 'trade-cancel': {
        if (!initialized) return
        cancelTrade(data.tradeId)
        break
      }

      case 'send-gift': {
        if (!initialized) return
        sendGift(data.targetKey, data.items, data.message)
        break
      }

      case 'create-coop': {
        if (!initialized) return
        createCoopMission(data.cropType, data.targetQty, data.reward)
        break
      }

      case 'contribute-coop': {
        if (!initialized) return
        contributeToCoopMission(data.missionId, data.amount)
        break
      }

      case 'request-help': {
        if (!initialized) return
        requestHelp(data.helpType, data.plotId)
        break
      }

      case 'respond-help': {
        if (!initialized) return
        respondToHelp(data.requestId)
        break
      }

      default:
        console.log('[worker] Unknown message type:', data.type)
    }
  } catch (e) {
    console.error('[main] IPC handler error:', e.message)
    sendError('Error: ' + e.message)
  }
}

// ── Startup ─────────────────────────────────────────────────────────────────
send({ type: 'ready', storagePath })
console.log('[main] P2P FarmVille started, storage:', storagePath)
console.log('[main] Waiting for init message from UI...')
