/* global Bare */
const storagePath = Bare.argv[0] || './storage'
console.log('[worker] Storage path:', storagePath)

Bare.IPC.on('data', (msg) => {
  const str = msg.toString()
  console.log('[worker] Received:', str)
  Bare.IPC.write(JSON.stringify({ echo: str }))
})

Bare.IPC.write(JSON.stringify({ type: 'worker:ready', storagePath }))
console.log('[worker] Main worker started')
