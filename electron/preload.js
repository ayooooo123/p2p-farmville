const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('bridge', {
  // Get package.json info
  pkg: () => ipcRenderer.invoke('pkg'),

  // Pear update management
  applyUpdate: () => ipcRenderer.invoke('pear:applyUpdate'),
  appRestart: () => ipcRenderer.send('pear:restart'),

  // Pear events (updates, etc.)
  onPearEvent: (cb) => {
    ipcRenderer.on('pear:event', (event, data) => cb(data))
  },

  // Worker management
  startWorker: (workerPath) => ipcRenderer.invoke('pear:startWorker', workerPath),

  onWorkerStdout: (workerPath, cb) => {
    ipcRenderer.on('pear:worker:stdout', (event, wp, data) => {
      if (wp === workerPath) cb(data)
    })
  },

  onWorkerStderr: (workerPath, cb) => {
    ipcRenderer.on('pear:worker:stderr', (event, wp, data) => {
      if (wp === workerPath) cb(data)
    })
  },

  onWorkerIPC: (workerPath, cb) => {
    ipcRenderer.on(`pear:worker:ipc:${workerPath}`, (event, data) => cb(data))
  },

  onWorkerExit: (workerPath, cb) => {
    ipcRenderer.on('pear:worker:exit', (event, wp, code) => {
      if (wp === workerPath) cb(code)
    })
  },

  writeWorkerIPC: (workerPath, data) => {
    return ipcRenderer.invoke('pear:worker:writeIPC', workerPath, data)
  }
})
