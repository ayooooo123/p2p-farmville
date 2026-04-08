/* global __rpc */

// IPC Bridge - supports Electron (window.ElectronIPCBridge) and Electrobun (window.__rpc)

const IPCBridge = {
  // Available in Electron mode or Electrobun mode
  available: typeof window !== 'undefined' && (!!window.ElectronIPCBridge || !!window.__rpc),

  _listeners: {
    neighbors: [],
    chatMessage: [],
    farmUpdate: [],
    peerCount: [],
    initialized: [],
    error: [],
    tradeOffer: [],
    tradeResult: [],
    tradeCancelled: [],
    giftReceived: [],
    giftSent: [],
    coopUpdate: [],
    helpRequest: [],
    helpResponse: [],
    playerJoined: [],
    playerLeft: [],
    visitorFarmAction: [],
    farmActionResult: []
  },

  // ── Internal: called by the view entrypoint when RPC events arrive ──────
  _emitWorkerStdout (data) {
    console.log('[ipc-bridge] worker stdout:', data.trimEnd())
  },

  _emitWorkerStderr (data) {
    console.warn('[ipc-bridge] worker stderr:', data.trimEnd())
  },

  _emitWorkerExit (code) {
    console.log('[ipc-bridge] worker exited with code:', code)
  },

  _emitWorkerMessage (data) {
    try {
      const msg = JSON.parse(data)
      this._routeMessage(msg)
    } catch (e) {
      console.warn('[ipc-bridge] Failed to parse worker message:', e)
    }
  },

  // ── Worker lifecycle ───────────────────────────────────────────────────
  startWorker () {
    if (window.ElectronIPCBridge) {
      // Worker already spawned by Electron main process; wire up the listener
      window.ElectronIPCBridge.onMessage(msg => this._routeMessage(msg))
      return Promise.resolve({ ok: true })
    }
    if (!window.__rpc) {
      console.warn('[ipc-bridge] no IPC transport available')
      return Promise.resolve({ ok: false })
    }
    return window.__rpc.startWorker()
  },

  sendToWorker (msg) {
    if (window.ElectronIPCBridge) {
      const data = typeof msg === 'string' ? JSON.parse(msg) : msg
      window.ElectronIPCBridge.send(data)
      return
    }
    if (!window.__rpc) return
    const data = typeof msg === 'string' ? msg : JSON.stringify(msg)
    window.__rpc.sendToWorker(data)
  },

  onWorkerMessage (cb) {
    // No-op: messages are routed via _routeMessage
  },

  onWorkerStdout (cb) {
    // No-op: handled in view entrypoint
  },

  onWorkerStderr (cb) {
    // No-op: handled in view entrypoint
  },

  onWorkerExit (cb) {
    // No-op: handled in view entrypoint
  },

  // ── P2P High-Level Methods ──────────────────────────────────────────────

  initP2P (playerName) {
    this.sendToWorker({ type: 'init', playerName })
  },

  sendFarmUpdate (farmState) {
    this.sendToWorker({ type: 'update-farm', farmState })
  },

  // ── Chat Methods ────────────────────────────────────────────────────────

  sendChatMessage (message) {
    this.sendToWorker({ type: 'chat', message })
  },

  sendPrivateMessage (targetKey, message) {
    this.sendToWorker({ type: 'chat-private', targetKey, message })
  },

  sendEmote (emote) {
    this.sendToWorker({ type: 'chat-emote', emote })
  },

  // ── Trade Methods ───────────────────────────────────────────────────────

  sendTradeOffer (targetKey, items, wants) {
    this.sendToWorker({ type: 'trade-offer', targetKey, items, wants })
  },

  respondToTrade (tradeId, accept) {
    this.sendToWorker({ type: 'trade-respond', tradeId, accept })
  },

  cancelTrade (tradeId) {
    this.sendToWorker({ type: 'trade-cancel', tradeId })
  },

  // ── Gift Methods ────────────────────────────────────────────────────────

  sendGift (targetKey, items, message) {
    this.sendToWorker({ type: 'send-gift', targetKey, items, message })
  },

  // ── Co-op Methods ───────────────────────────────────────────────────────

  createCoopMission (cropType, targetQty, reward) {
    this.sendToWorker({ type: 'create-coop', cropType, targetQty, reward })
  },

  contributeToCoopMission (missionId, amount) {
    this.sendToWorker({ type: 'contribute-coop', missionId, amount })
  },

  // ── Help Methods ────────────────────────────────────────────────────────

  requestHelp (helpType, plotId) {
    this.sendToWorker({ type: 'request-help', helpType, plotId })
  },

  respondToHelp (requestId) {
    this.sendToWorker({ type: 'respond-help', requestId })
  },

  // ── Event Listeners ─────────────────────────────────────────────────────

  onNeighbors (callback) { this._listeners.neighbors.push(callback) },
  onChatMessage (callback) { this._listeners.chatMessage.push(callback) },
  onNeighborFarmUpdate (callback) { this._listeners.farmUpdate.push(callback) },
  onPeerCount (callback) { this._listeners.peerCount.push(callback) },
  onInitialized (callback) { this._listeners.initialized.push(callback) },
  onError (callback) { this._listeners.error.push(callback) },
  onTradeOffer (callback) { this._listeners.tradeOffer.push(callback) },
  onTradeResult (callback) { this._listeners.tradeResult.push(callback) },
  onTradeCancelled (callback) { this._listeners.tradeCancelled.push(callback) },
  onGiftReceived (callback) { this._listeners.giftReceived.push(callback) },
  onGiftSent (callback) { this._listeners.giftSent.push(callback) },
  onCoopUpdate (callback) { this._listeners.coopUpdate.push(callback) },
  onHelpRequest (callback) { this._listeners.helpRequest.push(callback) },
  onHelpResponse (callback) { this._listeners.helpResponse.push(callback) },
  onPlayerJoined (callback) { this._listeners.playerJoined.push(callback) },
  onPlayerLeft (callback) { this._listeners.playerLeft.push(callback) },
  onVisitorFarmAction (callback) { this._listeners.visitorFarmAction.push(callback) },
  onFarmActionResult (callback) { this._listeners.farmActionResult.push(callback) },

  // ── Internal message router ─────────────────────────────────────────────

  _routeMessage (msg) {
    const fire = (key, data) => {
      this._listeners[key].forEach(cb => {
        try { cb(data) } catch (e) { console.error('[ipc-bridge]', key, 'listener error:', e) }
      })
    }

    switch (msg.type) {
      case 'neighbors':
        fire('neighbors', msg.neighbors)
        break
      case 'chat-message':
        fire('chatMessage', { from: msg.from, fromKey: msg.fromKey, message: msg.message, timestamp: msg.timestamp, channel: msg.channel, to: msg.to })
        break
      case 'farm-update':
        fire('farmUpdate', { playerKey: msg.playerKey, farmState: msg.farmState })
        break
      case 'connected':
        fire('peerCount', msg.count)
        break
      case 'initialized':
        fire('initialized', { playerKey: msg.playerKey, playerName: msg.playerName })
        break
      case 'error':
        fire('error', msg.error)
        break
      case 'trade-offer':
        fire('tradeOffer', msg.trade)
        break
      case 'trade-result':
        fire('tradeResult', { tradeId: msg.tradeId, accepted: msg.accepted })
        break
      case 'trade-cancelled':
        fire('tradeCancelled', { tradeId: msg.tradeId })
        break
      case 'gift-received':
        fire('giftReceived', { from: msg.from, fromKey: msg.fromKey, items: msg.items, message: msg.message })
        break
      case 'gift-sent':
        fire('giftSent', { remaining: msg.remaining })
        break
      case 'coop-update':
        fire('coopUpdate', msg.missions)
        break
      case 'help-request':
        fire('helpRequest', msg.request)
        break
      case 'help-response':
        fire('helpResponse', { requestId: msg.requestId, responderKey: msg.responderKey, responderName: msg.responderName })
        break
      case 'player-joined':
        fire('playerJoined', { playerName: msg.playerName, playerKey: msg.playerKey })
        break
      case 'player-left':
        fire('playerLeft', { playerName: msg.playerName, playerKey: msg.playerKey })
        break
      case 'visitor-farm-action':
        fire('visitorFarmAction', { action: msg.action, targetId: msg.targetId, visitorKey: msg.visitorKey, visitorName: msg.visitorName, timestamp: msg.timestamp })
        break
      case 'farm-action-result':
        fire('farmActionResult', { action: msg.action, targetId: msg.targetId, success: msg.success, reason: msg.reason, reward: msg.reward })
        break
    }
  }
}

window.IPCBridge = IPCBridge
