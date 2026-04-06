// Test: use the bare-sidecar npm module from Bun (uses child_process internally)
import Sidecar from 'bare-sidecar'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const script = join(__dirname, 'bare-test.mjs')

console.log('[bun] Starting bare-sidecar module...')

const sidecar = new Sidecar(script)

sidecar.stdout.on('data', d => console.log('[bare stdout]', d.toString().trim()))
sidecar.stderr.on('data', d => console.error('[bare stderr]', d.toString().trim()))

// fd[3] IPC data comes through the sidecar stream itself
sidecar.on('data', d => console.log('[bare ipc]', d.toString().trim()))

sidecar.on('exit', (code) => {
  console.log('[bun] Bare process exited:', code)
  process.exit(0)
})

sidecar.on('error', (e) => {
  console.error('[bun] Sidecar error:', e.message)
  process.exit(1)
})

setTimeout(() => {
  console.log('[bun] Done (timeout)')
  process.exit(0)
}, 12000)
