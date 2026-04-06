// Test: Bun spawning the Bare sidecar - using Bun.spawnSync first to verify output
import { join } from 'path'

const bareBin = join(import.meta.dir, 'node_modules/bare-sidecar/prebuilds/linux-arm64/bare')
const script = join(import.meta.dir, 'bare-test.mjs')

console.log('[bun] Testing with spawnSync first...')

const result = Bun.spawnSync([bareBin, script], {
  cwd: import.meta.dir,
  stdout: 'pipe',
  stderr: 'pipe',
  timeout: 15000,
})

console.log('[bun] stdout:', new TextDecoder().decode(result.stdout))
console.log('[bun] stderr:', new TextDecoder().decode(result.stderr))
console.log('[bun] exit code:', result.exitCode)
