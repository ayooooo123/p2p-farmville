import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'

const store = new Corestore('/tmp/bare-test-store-' + Date.now())
await store.ready()
const core = store.get({ name: 'farm-state' })
await core.ready()
console.log('Corestore OK, key:', b4a.toString(core.key, 'hex').slice(0, 16))
await core.append(JSON.stringify({ crops: [], coins: 100 }))
const block = await core.get(0)
const parsed = JSON.parse(b4a.toString(block))
console.log('Snapshot read back, coins:', parsed.coins)
const swarm = new Hyperswarm()
console.log('Hyperswarm OK')
await swarm.destroy()
await store.close()
console.log('ALL BARE TESTS PASSED')
