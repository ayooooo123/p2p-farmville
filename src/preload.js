'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ElectronIPCBridge', {
  send: (msg) => ipcRenderer.send('to-worker', msg),
  onMessage: (cb) => ipcRenderer.on('from-worker', (_, msg) => cb(msg))
})
