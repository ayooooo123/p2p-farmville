// P2P FarmVille - Electrobun Main Process
//
// Spawns workers/main.js as a Bare worker via pear-runtime.
// Bare.IPC in the worker ↔ ipc duplex stream here.
// Renderer communicates via Electrobun typed RPC.

import Electrobun, { BrowserWindow, BrowserView } from 'electrobun/bun'
import PearRuntime from 'pear-runtime'
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

// ── pear-runtime setup ──────────────────────────────────────────────────────
const pearRuntimeDir = join(getStoragePath(), 'pear-runtime')
const pear = new PearRuntime({
  dir: pearRuntimeDir,
  name: APP_NAME,
  version: '1.0.0',
  upgrade: 'pear://none',
  updates: false
})

await pear.ready()
console.log('[main] PearRuntime ready')

// ── Spawn Bare worker ────────────────────────────────────────────────────────
const workerPath = join(__dirname, '..', '..', 'workers', 'main.js')
const storagePath = getStoragePath()
ipc = pear.run(workerPath, [storagePath])

ipc.stdout.on('data', (d: Buffer) => console.log('[worker]', d.toString().trim()))
ipc.stderr.on('data', (d: Buffer) => console.error('[worker:err]', d.toString().trim()))

// ── IPC: worker → renderer ───────────────────────────────────────────────────
let ipcBuffer = ''
ipc.on('data', (chunk: Buffer) => {
  ipcBuffer += chunk.toString()
  let idx: number
  while ((idx = ipcBuffer.indexOf('\n')) !== -1) {
    const line = ipcBuffer.slice(0, idx).trim()
    ipcBuffer = ipcBuffer.slice(idx + 1)
    if (!line) continue
    try {
      const msg = JSON.parse(line)
      sendToRenderer(msg)
    } catch (e) {
      console.error('[main] IPC parse error:', e)
    }
  }
})

ipc.on('error', (e: Error) => console.error('[main] IPC stream error:', e.message))

// ── IPC: renderer → worker ───────────────────────────────────────────────────
function sendToWorker (msg: any) {
  if (!ipc) return
  try {
    ipc.write(JSON.stringify(msg) + '\n')
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

  mainWindow.on('close', async () => {
    ipc?.destroy()
    await pear.close()
    mainWindow = null
    rendererReady = false
    if (process.platform !== 'darwin') process.exit(0)
  })
}

createWindow()

Electrobun.events.on('reopen', () => {
  if (!mainWindow) createWindow()
})
