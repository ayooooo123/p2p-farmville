import path from 'bare-path'
import Corestore from 'corestore'
import b4a from 'b4a'

const store = new Corestore(path.join(Pear.config.storage, 'corestore'))

async function initCores () {
  const farmCore = store.get({ name: 'farm-state' })
  await farmCore.ready()

  const chatCore = store.get({ name: 'chat-log' })
  await chatCore.ready()

  return { farmCore, chatCore, store }
}

async function loadFarmState (farmCore) {
  if (farmCore.length === 0) return null
  const lastBlock = await farmCore.get(farmCore.length - 1)
  return JSON.parse(b4a.toString(lastBlock))
}

async function saveFarmState (farmCore, farmState) {
  await farmCore.append(b4a.from(farmState.serialize()))
}

export { initCores, loadFarmState, saveFarmState, store }
