/* global Bare */
/* P2P FarmVille Worker - Phase 4: P2P Networking Engine
 *
 * This Bare worker handles ALL P2P networking:
 * - Corestore for persistent storage (farm state, world registry, chat)
 * - Hyperswarm for peer discovery on a shared world topic
 * - Protomux for multiplexed channels per connection
 *
 * IPC Protocol (worker <-> renderer):
 *   Renderer sends:
 *     { type: 'init', playerName }
 *     { type: 'update-farm', farmState }
 *     { type: 'chat', message }
 *   Worker sends:
 *     { type: 'neighbors', neighbors: [{ name, key, position, farmState }] }
 *     { type: 'chat-message', from, message, timestamp }
 *     { type: 'farm-update', playerKey, farmState }
 *     { type: 'connected', count }
 *     { type: 'worker:ready', storagePath }
 *     { type: 'error', error }
 */

const Corestore = require('corestore')
const Hyperswarm = require('hyperswarm')
const Protomux = require('protomux')
const b4a = require('b4a')
const crypto = require('hypercore-crypto')

const WORLD_TOPIC = 'p2p-farmville-world-v1'
const ANNOUNCE_INTERVAL = 30000 // re-announce every 30s
const NEIGHBOR_BROADCAST_INTERVAL = 5000 // send neighbor list every 5s

// ── State ───────────────────────────────────────────────────────────────────
const storagePath = Bare.argv[2] || Bare.argv[0] || './storage'
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

// ── IPC helpers ─────────────────────────────────────────────────────────────
function send (msg) {
  try {
    Bare.IPC.write(JSON.stringify(msg))
  } catch (e) {
    console.error('[worker] IPC write error:', e.message)
  }
}

function sendError (error) {
  send({ type: 'error', error: String(error) })
}

// ── Initialize Corestore + Hypercores ───────────────────────────────────────
async function initStore () {
  try {
    store = new Corestore(storagePath)
    await store.ready()

    // Our farm state core (named, so it's deterministic per storage)
    farmStateCore = store.get({ name: 'farm-state' })
    await farmStateCore.ready()

    // World registry: shared core for player announcements
    // Each player has their own world registry they write to
    worldRegistryCore = store.get({ name: 'world-registry' })
    await worldRegistryCore.ready()

    // Chat log core
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

    // Derive a discovery key from the world topic
    const topicBuffer = b4a.from(WORLD_TOPIC)
    const topicKey = crypto.discoveryKey(topicBuffer)

    swarm.on('connection', handleConnection)

    // Join the world topic
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

    // Create channels for farm sync, world announcements, and chat
    const farmChannel = mux.createChannel({
      protocol: 'farm-sync',
      id: b4a.from(playerKey, 'hex'),
      onopen () {
        console.log('[worker] Farm channel opened with:', remoteKey.slice(0, 12))
        // Send our farm core key so peer can replicate our farm
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

    // Message handler for farm channel
    farmChannel.addMessage({
      encoding: {
        preencode (state, m) { state.end += m.byteLength },
        encode (state, m) { state.buffer.set(m, state.start); state.start += m.byteLength },
        decode (state) { return state.buffer.subarray(state.start, state.end) }
      },
      onmessage (buf) {
        handleFarmMessage(remoteKey, buf)
      }
    })

    farmChannel.open()

    // World channel for neighbor announcements
    const worldChannel = mux.createChannel({
      protocol: 'world-announce',
      id: b4a.from(WORLD_TOPIC),
      onopen () {
        console.log('[worker] World channel opened with:', remoteKey.slice(0, 12))
        // Send our announcement
        broadcastAnnouncement(worldChannel)
      },
      onclose () {
        console.log('[worker] World channel closed with:', remoteKey.slice(0, 12))
      }
    })

    worldChannel.addMessage({
      encoding: {
        preencode (state, m) { state.end += m.byteLength },
        encode (state, m) { state.buffer.set(m, state.start); state.start += m.byteLength },
        decode (state) { return state.buffer.subarray(state.start, state.end) }
      },
      onmessage (buf) {
        handleWorldMessage(remoteKey, buf)
      }
    })

    worldChannel.open()

    // Chat channel
    const chatChannel = mux.createChannel({
      protocol: 'chat',
      id: b4a.from('p2p-farmville-chat'),
      onopen () {
        console.log('[worker] Chat channel opened with:', remoteKey.slice(0, 12))
      }
    })

    chatChannel.addMessage({
      encoding: {
        preencode (state, m) { state.end += m.byteLength },
        encode (state, m) { state.buffer.set(m, state.start); state.start += m.byteLength },
        decode (state) { return state.buffer.subarray(state.start, state.end) }
      },
      onmessage (buf) {
        handleChatMessage(remoteKey, buf)
      }
    })

    chatChannel.open()

    // Store peer info
    peers.set(remoteKey, { stream, mux, farmChannel, worldChannel, chatChannel })

    peerCount = peers.size
    send({ type: 'connected', count: peerCount })

    // Handle disconnection
    stream.on('close', () => {
      console.log('[worker] Peer disconnected:', remoteKey.slice(0, 12) + '...')
      peers.delete(remoteKey)
      peerCount = peers.size
      send({ type: 'connected', count: peerCount })
    })

    stream.on('error', (err) => {
      console.error('[worker] Stream error with', remoteKey.slice(0, 12), ':', err.message)
    })
  } catch (e) {
    console.error('[worker] Connection handler error:', e.message)
  }
}

// ── Message handlers ────────────────────────────────────────────────────────
function handleFarmMessage (remoteKey, buf) {
  try {
    const msg = JSON.parse(b4a.toString(buf))

    if (msg.type === 'farm-key') {
      console.log('[worker] Received farm key from', remoteKey.slice(0, 12), '- name:', msg.name)

      // Track this neighbor
      const existing = neighbors.get(remoteKey) || {}
      neighbors.set(remoteKey, {
        ...existing,
        name: msg.name || 'Unknown',
        key: msg.key,
        worldKey: msg.worldKey,
        chatKey: msg.chatKey,
        lastSeen: Date.now()
      })

      // Replicate their farm core if we have the key
      if (msg.key) {
        try {
          const peerFarmCore = store.get(b4a.from(msg.key, 'hex'))
          peerFarmCore.ready().then(() => {
            // Read latest farm state from peer's core
            readPeerFarmState(remoteKey, peerFarmCore)
          }).catch(e => console.error('[worker] Peer farm core error:', e.message))
        } catch (e) {
          console.error('[worker] Error getting peer farm core:', e.message)
        }
      }

      broadcastNeighborList()
    } else if (msg.type === 'farm-state') {
      // Peer is sending their farm state directly
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

function handleChatMessage (remoteKey, buf) {
  try {
    const msg = JSON.parse(b4a.toString(buf))

    if (msg.type === 'chat') {
      // Append to our chat log
      appendChatLog(msg.from, msg.message, msg.timestamp)

      // Forward to renderer
      send({
        type: 'chat-message',
        from: msg.from,
        message: msg.message,
        timestamp: msg.timestamp
      })
    }
  } catch (e) {
    console.error('[worker] Chat message parse error:', e.message)
  }
}

// ── Read peer farm state from their Hypercore ───────────────────────────────
async function readPeerFarmState (remoteKey, peerCore) {
  try {
    await peerCore.update()
    const len = peerCore.length
    if (len === 0) return

    // Read the latest entry (most recent farm state snapshot)
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

  // Broadcast to all peers
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
function broadcastChatMessage (message) {
  const msg = JSON.stringify({
    type: 'chat',
    from: playerName,
    message: message,
    timestamp: Date.now()
  })

  const buf = b4a.from(msg)

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

// ── Send neighbor list to renderer ──────────────────────────────────────────
function broadcastNeighborList () {
  const neighborList = []
  let idx = 0

  for (const [key, neighbor] of neighbors) {
    // Assign positions along a street if not set
    if (!neighbor.position || (neighbor.position.x === 0 && neighbor.position.z === 0)) {
      idx++
      neighbor.position = { x: idx * 90, z: 0 }
    }

    neighborList.push({
      name: neighbor.name || 'Unknown',
      key: key,
      position: neighbor.position,
      farmState: neighbor.farmState || null,
      lastSeen: neighbor.lastSeen
    })
  }

  send({ type: 'neighbors', neighbors: neighborList })
}

// ── Get our position (based on key for deterministic placement) ─────────────
function getMyPosition () {
  // Use first 4 bytes of our key to generate a semi-unique position
  // This places farms along a "street" at different x offsets
  const keyBuf = b4a.from(playerKey, 'hex')
  const offset = (keyBuf[0] + keyBuf[1] * 256) % 1000
  return { x: 0, z: 0 } // our farm is always at origin from our perspective
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
    if (initialized) broadcastNeighborList()
  }, 60000)
}

// ── IPC message handler from renderer ───────────────────────────────────────
Bare.IPC.on('data', async (msg) => {
  try {
    const str = msg.toString()
    let data

    try {
      data = JSON.parse(str)
    } catch (e) {
      console.log('[worker] Non-JSON message:', str)
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

        // Announce on the world registry
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

        // Persist to our Hypercore
        await persistFarmState(farmState)

        // Broadcast to connected peers
        broadcastFarmState(farmState)

        break
      }

      case 'chat': {
        if (!initialized) return

        const message = data.message
        if (!message) return

        // Append to chat log
        await appendChatLog(playerName, message)

        // Broadcast to peers
        broadcastChatMessage(message)

        // Echo back to renderer so our message shows too
        send({
          type: 'chat-message',
          from: playerName,
          message: message,
          timestamp: Date.now()
        })

        break
      }

      default:
        console.log('[worker] Unknown message type:', data.type)
    }
  } catch (e) {
    console.error('[worker] IPC handler error:', e.message)
    sendError('Worker error: ' + e.message)
  }
})

// ── Startup ─────────────────────────────────────────────────────────────────
send({ type: 'worker:ready', storagePath })
console.log('[worker] P2P FarmVille worker started, storage:', storagePath)
console.log('[worker] Waiting for init message from renderer...')
