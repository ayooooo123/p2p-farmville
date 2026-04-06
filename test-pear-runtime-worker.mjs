// Bare worker: runs in Bare via pear-runtime, does Corestore + Hyperswarm
import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'

const store = new Corestore('/tmp/bare-pear-runtime-test-' + Date.now())
await store.ready()
const core = store.get({ name: 'farm-state' })
await core.ready()

await core.append(JSON.stringify({ crops: [], coins: 999 }))
const block = await core.get(0)
const parsed = JSON.parse(b4a.toString(block))

const swarm = new Hyperswarm()

// Send result back over IPC
Bare.IPC.write(JSON.stringify({
  type: 'ready',
  key: b4a.toString(core.key, 'hex').slice(0, 16),
  coins: parsed.coins,
  swarmOk: true
}))

await swarm.destroy()
await store.close()
