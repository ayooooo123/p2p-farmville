/* global bridge */

// IPC Bridge - wraps window.bridge for worker communication
// Phase 4: Added P2P-specific high-level methods
const WORKER_PATH = '/workers/main.js'

const IPCBridge = {
  available: typeof window !== 'undefined' && !!window.bridge,

  _listeners: {
    neighbors: [],
    chatMessage: [],
    farmUpdate: [],
    peerCount: [],
    initialized: [],
    error: []
  },

  startWorker () {
    if (!this.available) {
      console.warn('[ipc-bridge] window.bridge not available')
      return Promise.resolve({ ok: false })
    }
    return window.bridge.startWorker(WORKER_PATH)
  },

  sendToWorker (msg) {
    if (!this.available) return
    const data = typeof msg === 'string' ? msg : JSON.stringify(msg)
    window.bridge.writeWorkerIPC(WORKER_PATH, data)
  },

  onWorkerMessage (cb) {
    if (!this.available) return
    window.bridge.onWorkerIPC(WORKER_PATH, (data) => {
      try {
        const str = typeof data === 'string' ? data : new TextDecoder().decode(data)
        const msg = JSON.parse(str)
        cb(msg)

        // Route to specific listeners
        this._routeMessage(msg)
      } catch (e) {
        console.warn('[ipc-bridge] Failed to parse worker message:', e)
      }
    })
  },

  onWorkerStdout (cb) {
    if (!this.available) return
    window.bridge.onWorkerStdout(WORKER_PATH, cb)
  },

  onWorkerStderr (cb) {
    if (!this.available) return
    window.bridge.onWorkerStderr(WORKER_PATH, cb)
  },

  onWorkerExit (cb) {
    if (!this.available) return
    window.bridge.onWorkerExit(WORKER_PATH, cb)
  },

  // ── P2P High-Level Methods ──────────────────────────────────────────────

  // Initialize P2P with player name
  initP2P (playerName) {
    this.sendToWorker({ type: 'init', playerName })
  },

  // Send farm state update to worker for replication
  sendFarmUpdate (farmState) {
    this.sendToWorker({ type: 'update-farm', farmState })
  },

  // Send chat message to worker for broadcast
  sendChatMessage (message) {
    this.sendToWorker({ type: 'chat', message })
  },

  // Register listener for neighbor list updates
  onNeighbors (callback) {
    this._listeners.neighbors.push(callback)
  },

  // Register listener for incoming chat messages
  onChatMessage (callback) {
    this._listeners.chatMessage.push(callback)
  },

  // Register listener for neighbor farm state updates
  onNeighborFarmUpdate (callback) {
    this._listeners.farmUpdate.push(callback)
  },

  // Register listener for peer connection count changes
  onPeerCount (callback) {
    this._listeners.peerCount.push(callback)
  },

  // Register listener for initialization complete
  onInitialized (callback) {
    this._listeners.initialized.push(callback)
  },

  // Register listener for errors
  onError (callback) {
    this._listeners.error.push(callback)
  },

  // ── Internal message router ─────────────────────────────────────────────

  _routeMessage (msg) {
    switch (msg.type) {
      case 'neighbors':
        this._listeners.neighbors.forEach(cb => {
          try { cb(msg.neighbors) } catch (e) { console.error('[ipc-bridge] Neighbor listener error:', e) }
        })
        break

      case 'chat-message':
        this._listeners.chatMessage.forEach(cb => {
          try { cb({ from: msg.from, message: msg.message, timestamp: msg.timestamp }) } catch (e) { console.error('[ipc-bridge] Chat listener error:', e) }
        })
        break

      case 'farm-update':
        this._listeners.farmUpdate.forEach(cb => {
          try { cb({ playerKey: msg.playerKey, farmState: msg.farmState }) } catch (e) { console.error('[ipc-bridge] Farm update listener error:', e) }
        })
        break

      case 'connected':
        this._listeners.peerCount.forEach(cb => {
          try { cb(msg.count) } catch (e) { console.error('[ipc-bridge] Peer count listener error:', e) }
        })
        break

      case 'initialized':
        this._listeners.initialized.forEach(cb => {
          try { cb({ playerKey: msg.playerKey, playerName: msg.playerName }) } catch (e) { console.error('[ipc-bridge] Init listener error:', e) }
        })
        break

      case 'error':
        this._listeners.error.forEach(cb => {
          try { cb(msg.error) } catch (e) { console.error('[ipc-bridge] Error listener error:', e) }
        })
        break
    }
  }
}

window.IPCBridge = IPCBridge
