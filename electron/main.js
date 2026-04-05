const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const os = require('os')

// Pear Runtime
const Pear = require('pear-runtime')

const APP_NAME = 'P2P FarmVille'

// Platform-specific storage directory
function getStoragePath () {
  const base = process.env.APPDATA ||
    (process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support')
      : path.join(os.homedir(), '.local', 'share'))
  return path.join(base, 'p2p-farmville')
}

let mainWindow = null
const workers = new Map()

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// Initialize Pear Runtime
const storagePath = getStoragePath()
const pear = new Pear({
  storage: storagePath,
  version: require('../package.json').version
})

pear.on('update', (update) => {
  if (mainWindow) {
    mainWindow.webContents.send('pear:event', { type: 'update', data: update })
  }
})

function createWindow () {
  mainWindow = new BrowserWindow({
    title: APP_NAME,
    width: 1280,
    height: 800,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))

  // Open DevTools in dev mode
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    // Clean up workers
    for (const [key, worker] of workers) {
      worker.kill()
      workers.delete(key)
    }
  })
}

// IPC: Get package info
ipcMain.handle('pkg', () => {
  return require('../package.json')
})

// IPC: Apply Pear update
ipcMain.handle('pear:applyUpdate', async () => {
  if (pear.applyUpdate) await pear.applyUpdate()
})

// IPC: Start a worker
ipcMain.handle('pear:startWorker', async (event, workerPath) => {
  if (workers.has(workerPath)) return { ok: true, already: true }

  const resolvedPath = path.join(__dirname, '..', workerPath)
  const worker = pear.run(resolvedPath, [pear.storage])

  workers.set(workerPath, worker)

  worker.stdout?.on('data', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('pear:worker:stdout', workerPath, data.toString())
    }
  })

  worker.stderr?.on('data', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('pear:worker:stderr', workerPath, data.toString())
    }
  })

  worker.on('message', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send(`pear:worker:ipc:${workerPath}`, data)
    }
  })

  worker.on('exit', (code) => {
    workers.delete(workerPath)
    if (mainWindow) {
      mainWindow.webContents.send('pear:worker:exit', workerPath, code)
    }
  })

  return { ok: true }
})

// IPC: Write to worker IPC
ipcMain.handle('pear:worker:writeIPC', (event, workerPath, data) => {
  const worker = workers.get(workerPath)
  if (!worker) return { ok: false, error: 'Worker not found' }
  worker.send(data)
  return { ok: true }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
