import path from 'bare-path'
import Corestore from 'corestore'
import b4a from 'b4a'

const store = new Corestore(path.join(Pear.config.storage, 'corestore'))

async function initCores () {
  // Farm state core - only the owner writes
  const farmCore = store.get({ name: 'farm-state' })
  await farmCore.ready()

  // Chat log core - all peers can append (via protomux)
  const chatCore = store.get({ name: 'chat-log' })
  await chatCore.ready()

  return { farmCore, chatCore, store }
}

// Load latest farm state from core
async function loadFarmState (farmCore) {
  if (farmCore.length === 0) return null
  const lastBlock = await farmCore.get(farmCore.length - 1)
  return JSON.parse(b4a.toString(lastBlock))
}

// Save farm state to core (append)
async function saveFarmState (farmCore, farmState) {
  await farmCore.append(b4a.from(farmState.serialize()))
}

function getCoreKeys (farmCore, chatCore) {
  return {
    farmKey: b4a.toString(farmCore.key, 'hex'),
    chatKey: b4a.toString(chatCore.key, 'hex')
  }
}

export { initCores, loadFarmState, saveFarmState, getCoreKeys }
