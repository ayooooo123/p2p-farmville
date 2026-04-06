// Host side: Bun spawns Bare worker via pear-runtime, reads IPC
import PearRuntime from 'pear-runtime'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dir = join(homedir(), '.p2p-farmville-test-runtime')

const pear = new PearRuntime({ dir, version: '1.0.0', upgrade: 'pear://none', name: 'test', updates: false })
await pear.ready()
console.log('[host] PearRuntime ready')

const workerPath = join(__dirname, 'test-pear-runtime-worker.mjs')
const ipc = pear.run(workerPath)

ipc.stdout.on('data', d => console.log('[worker stdout]', d.toString().trim()))
ipc.stderr.on('data', d => console.error('[worker stderr]', d.toString().trim()))

ipc.on('data', data => {
  const msg = JSON.parse(data.toString())
  console.log('[worker ipc]', msg)
  ipc.destroy()
})

ipc.on('close', async () => {
  console.log('[host] IPC closed')
  await pear.close()
  process.exit(0)
})

setTimeout(() => {
  console.log('[host] Timeout')
  process.exit(1)
}, 15000)
