import PearRuntime from 'pear-runtime'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { homedir, platform } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Use a fresh unique path each run to avoid lock contention
const storagePath = join(homedir(), '.local', 'share', 'p2p-farmville-test-' + Date.now())
const pear = new PearRuntime({ dir: join(storagePath, 'pear-runtime'), name: 'test', version: '1.0.0', upgrade: 'pear://none', updates: false })
await pear.ready()
console.log('[host] PearRuntime ready')

const workerPath = join(__dirname, 'workers', 'main.js')
const ipc = pear.run(workerPath, [storagePath])

ipc.stdout.on('data', d => console.log('[worker stdout]', d.toString().trim()))
ipc.stderr.on('data', d => console.error('[worker stderr]', d.toString().trim()))

let buf = ''
ipc.on('data', async chunk => {
  buf += chunk.toString()
  let idx
  while ((idx = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, idx).trim()
    buf = buf.slice(idx + 1)
    if (!line) continue
    const msg = JSON.parse(line)
    console.log('[worker ipc →]', msg)

    if (msg.type === 'worker:ready') {
      console.log('[host] Got worker:ready, sending init...')
      ipc.write(JSON.stringify({ type: 'init', playerName: 'TestFarmer' }) + '\n')
    }

    if (msg.type === 'initialized') {
      console.log('[host] Got initialized! playerKey:', msg.playerKey)
      console.log('[host] ROUND-TRIP TEST PASSED')
      ipc.destroy()
      await pear.close()
      process.exit(0)
    }
  }
})

setTimeout(() => {
  console.log('[host] Timeout - test failed')
  process.exit(1)
}, 20000)
