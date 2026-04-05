/* global bridge */

// IPC Bridge - wraps window.bridge for worker communication
const WORKER_PATH = '/workers/main.js'

const IPCBridge = {
  available: typeof window !== 'undefined' && !!window.bridge,

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
        cb(JSON.parse(str))
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
  }
}

window.IPCBridge = IPCBridge
