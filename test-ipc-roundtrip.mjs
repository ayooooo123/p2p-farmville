import PearRuntime from 'pear-runtime'
import Protomux from 'protomux'
import cenc from 'compact-encoding'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { homedir, platform } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const base = platform() === 'darwin'
  ? join(homedir(), 'Library', 'Application Support')
  : join(homedir(), '.local', 'share')
const storagePath = join(base, 'p2p-farmville-test-' + Date.now())

const pear = new PearRuntime({
  dir: join(storagePath, 'pear-runtime'),
  name: 'test', version: '1.0.0', upgrade: 'pear://none', updates: false
})
await pear.ready()
console.log('[host] PearRuntime ready')

const ipc = pear.run(join(__dirname, 'workers/main.js'), [storagePath])
ipc.stdout.on('data', d => console.log('[worker]', d.toString().trim()))
ipc.stderr.on('data', d => console.error('[worker:err]', d.toString().trim()))

// Mirror exactly what src/bun/index.ts does
const mux = new Protomux(ipc)
const ch = mux.createChannel({ protocol: 'farmville-ipc' })
const msg = ch.addMessage({
  encoding: cenc.json,
  onmessage (data) {
    console.log('[worker →]', data)

    if (data.type === 'worker:ready') {
      console.log('[host] Got worker:ready, sending init via Protomux...')
      msg.send({ type: 'init', playerName: 'TestFarmer' })
    }

    if (data.type === 'initialized') {
      console.log('[host] PROTOMUX ROUND-TRIP PASSED. playerKey:', data.playerKey.slice(0, 16) + '...')
      ipc.destroy()
      pear.close().then(() => process.exit(0))
    }
  }
})
ch.open()

setTimeout(() => {
  console.log('[host] Timeout - test failed')
  process.exit(1)
}, 20000)
