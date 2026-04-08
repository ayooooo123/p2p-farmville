'use strict'

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')
const os = require('os')
const PearRuntime = require('pear-runtime')
const Protomux = require('protomux')
const cenc = require('compact-encoding')

const pkg = require('../package.json')

// ── Storage path ─────────────────────────────────────────────────────────────
function getStoragePath () {
  const base =
    process.env.APPDATA ||
    (process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support')
      : path.join(os.homedir(), '.local', 'share'))
  return path.join(base, 'p2p-farmville')
}

// ── Static HTTP server for renderer/ ─────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg'
}

function serveRenderer (rendererDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let urlPath = req.url.split('?')[0]
      if (urlPath === '/') urlPath = '/index.html'

      const filePath = path.join(rendererDir, urlPath)
      const ext = path.extname(filePath)
      const contentType = MIME[ext] || 'application/octet-stream'

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        res.writeHead(200, { 'Content-Type': contentType })
        res.end(data)
      })
    })

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve(`http://127.0.0.1:${port}`)
    })

    server.on('error', reject)
  })
}

// ── App state ─────────────────────────────────────────────────────────────────
let mainWindow = null
let pear = null
let ipcMessage = null

// ── Main setup ────────────────────────────────────────────────────────────────
async function createApp () {
  const storagePath = getStoragePath()
  const rendererDir = path.join(__dirname, '..', 'renderer')

  // Serve renderer/ over HTTP
  const url = await serveRenderer(rendererDir)
  console.log('[main] Renderer served at', url)

  // Create BrowserWindow
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // Spawn Bare worker via PearRuntime
  pear = new PearRuntime({ dir: storagePath, version: pkg.version, name: pkg.name, updates: false })
  await pear.ready()
  console.log('[main] PearRuntime ready')

  const workerPath = path.join(__dirname, '..', 'workers', 'main.js')
  const ipc = pear.run(workerPath, [storagePath])
  console.log('[main] Bare worker spawned:', workerPath)

  ipc.stdout.on('data', d => console.log('[worker]', d.toString().trim()))
  ipc.stderr.on('data', d => console.error('[worker:err]', d.toString().trim()))
  ipc.on('error', e => console.error('[main] IPC stream error:', e.message))

  // Protomux over the IPC duplex stream
  const ipcMux = new Protomux(ipc)
  const ipcChannel = ipcMux.createChannel({ protocol: 'farmville-ipc' })
  ipcMessage = ipcChannel.addMessage({
    encoding: cenc.json,
    onmessage (msg) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('from-worker', msg)
      }
    }
  })
  ipcChannel.open()

  // Forward renderer → worker messages
  ipcMain.on('to-worker', (event, msg) => {
    try {
      ipcMessage.send(msg)
    } catch (e) {
      console.error('[main] sendToWorker error:', e.message)
    }
  })

  // Load renderer
  await mainWindow.loadURL(url)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  try {
    await createApp()
  } catch (e) {
    console.error('[main] startup error:', e)
    app.quit()
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      try {
        await createApp()
      } catch (e) {
        console.error('[main] reopen error:', e)
      }
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async () => {
  if (pear) {
    try {
      await pear.close()
    } catch (e) {
      console.error('[main] pear.close error:', e.message)
    }
  }
})
