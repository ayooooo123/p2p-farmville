// Test bare-sidecar from Node - spawns Bare and communicates over fd[3] IPC
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const bareBin = join(__dirname, 'node_modules/bare-sidecar/prebuilds/linux-arm64/bare')
const script = join(__dirname, 'bare-test.mjs')

console.log('[host] Spawning Bare sidecar...')

const child = spawn(bareBin, [script], {
  stdio: ['pipe', 'pipe', 'pipe', 'overlapped'],
  cwd: __dirname
})

child.stdout.on('data', d => console.log('[bare stdout]', d.toString().trim()))
child.stderr.on('data', d => console.error('[bare stderr]', d.toString().trim()))
child.stdio[3].on('data', d => console.log('[bare ipc]', d.toString().trim()))

child.on('exit', (code) => {
  console.log('[host] Bare process exited with code:', code)
  process.exit(code)
})

setTimeout(() => {
  console.log('[host] Timeout - killing child')
  child.kill()
  process.exit(1)
}, 15000)
