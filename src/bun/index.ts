// P2P FarmVille - Electrobun Main Process
//
// Spawns workers/main.js as a Bare worker via pear-runtime.
// Bare.IPC in the worker ↔ ipc duplex stream here.
// Renderer communicates via Electrobun typed RPC.

import Electrobun, { BrowserWindow, BrowserView } from 'electrobun/bun'
import PearRuntime from 'pear-runtime'
import Protomux from 'protomux'
import cenc from 'compact-encoding'
import type { FarmvilleRPC } from '../shared/rpc-types'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { homedir, platform } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))

const APP_NAME = 'P2P FarmVille'
let mainWindow: any = null
let rendererReady = false
let ipc: any = null  // duplex stream returned by pear.run()

// ── Storage path ────────────────────────────────────────────────────────────
function getStoragePath (): string {
  const base =
    process.env.APPDATA ||
    (platform() === 'darwin'
      ? join(homedir(), 'Library', 'Application Support')
      : join(homedir(), '.local', 'share'))
  return join(base, 'p2p-farmville')
}

// ── Spawn Bare worker via PearRuntime.run() (static — no updater/swarm) ─────
// PearRuntime.run() is just new Sidecar(entrypoint, args) under the hood.
// We don't need the instance (updater, OTA, etc.) for local P2P.
const workerPath = join(__dirname, '..', '..', 'workers', 'main.js')
const storagePath = getStoragePath()
ipc = PearRuntime.run(workerPath, [storagePath])
console.log('[main] Bare worker spawned')

ipc.stdout.on('data', (d: Buffer) => console.log('[worker]', d.toString().trim()))
ipc.stderr.on('data', (d: Buffer) => console.error('[worker:err]', d.toString().trim()))
ipc.on('error', (e: Error) => console.error('[main] IPC stream error:', e.message))

// ── Protomux IPC (Bun main process ↔ Bare.IPC in worker) ────────────────────
const ipcMux = new Protomux(ipc)
const ipcChannel = ipcMux.createChannel({ protocol: 'farmville-ipc' })
const ipcMessage = ipcChannel.addMessage({
  encoding: cenc.json,
  onmessage (msg: any) { sendToRenderer(msg) }
})
ipcChannel.open()

function sendToWorker (msg: any) {
  try {
    ipcMessage.send(msg)
  } catch (e: any) {
    console.error('[main] sendToWorker error:', e.message)
  }
}

// ── RPC: Bun-side handlers called by renderer ────────────────────────────────
const gameRPC = BrowserView.defineRPC<FarmvilleRPC>({
  maxRequestTime: 10000,
  handlers: {
    requests: {
      viewReady: async () => {
        rendererReady = true
        console.log('[main] Renderer is ready')
        return { ok: true }
      }
    },
    messages: {
      p2pMessage: ({ type, ...rest }) => {
        sendToWorker({ type, ...rest })
      }
    }
  }
})

// ── Helper: push message from Bun to renderer ────────────────────────────────
function sendToRenderer (msg: any) {
  if (!mainWindow || !rendererReady) return
  const view = mainWindow.webview
  if (view?.rpc?.send) {
    view.rpc.send.onWorkerMessage(msg)
    if (msg.type === 'error') {
      view.rpc.send.onWorkerStderr({ data: String(msg.error) })
    }
  }
}

// ── Create window ────────────────────────────────────────────────────────────
function createWindow () {
  mainWindow = new BrowserWindow({
    title: APP_NAME,
    url: 'views://game/index.html',
    frame: { width: 1280, height: 800 },
    rpc: gameRPC
  })

  mainWindow.on('close', () => {
    ipc?.destroy()
    mainWindow = null
    rendererReady = false
    if (process.platform !== 'darwin') process.exit(0)
  })
}

createWindow()

Electrobun.events.on('reopen', () => {
  if (!mainWindow) createWindow()
})
