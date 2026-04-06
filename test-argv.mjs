import PearRuntime from 'pear-runtime'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { homedir, platform } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const base = platform() === 'darwin' ? join(homedir(), 'Library', 'Application Support') : join(homedir(), '.local', 'share')
const storagePath = join(base, 'p2p-farmville-test')
const pear = new PearRuntime({ dir: join(storagePath, 'pear-runtime'), name: 'test', version: '1.0.0', upgrade: 'pear://none', updates: false })
await pear.ready()

const ipc = pear.run(join(__dirname, 'workers/debug-argv.js'), [storagePath])
ipc.stdout.on('data', d => console.log('[stdout]', d.toString().trim()))
ipc.on('data', d => { console.log('[ipc]', d.toString().trim()); process.exit(0) })
setTimeout(() => process.exit(1), 8000)
