// App initialization, game loop, networking, and screen transitions
import Corestore from 'corestore'
import path from 'bare-path'
import b4a from 'b4a'

let farmState = null
let network = null
let chat = null
let farmCore = null
let store = null
let gameCanvas = null
let gameCtx = null
let gameLoopId = null
let tickIntervalId = null
let isVisitor = false
let lastSavedState = null

// --- Corestore / Hypercore helpers (inlined from lib/core.js) ---

async function initCorestore () {
  store = new Corestore(path.join(Pear.config.storage, 'corestore'))
  const fc = store.get({ name: 'farm-state' })
  await fc.ready()
  const cc = store.get({ name: 'chat-log' })
  await cc.ready()
  farmCore = fc
  return { farmCore: fc, chatCore: cc, store }
}

async function loadFarm (core) {
  if (core.length === 0) return null
  const lastBlock = await core.get(core.length - 1)
  return b4a.toString(lastBlock) // raw JSON string for FarmState.deserialize()
}

async function saveFarm () {
  if (!farmState || !farmCore) return
  const serialized = farmState.serialize()
  if (serialized === lastSavedState) return
  lastSavedState = serialized
  await farmCore.append(b4a.from(serialized))
  if (network && !isVisitor) {
    network.broadcastFarmState(farmState)
  }
}

// --- Screen transitions ---

function showLoading () {
  document.getElementById('setup').style.display = 'none'
  document.getElementById('loading').style.display = 'flex'
  document.getElementById('game').style.display = 'none'
}

function showGame () {
  document.getElementById('setup').style.display = 'none'
  document.getElementById('loading').style.display = 'none'
  document.getElementById('game').style.display = 'flex'
}

function showSetup () {
  document.getElementById('setup').style.display = 'flex'
  document.getElementById('loading').style.display = 'none'
  document.getElementById('game').style.display = 'none'
}

// --- Game view setup ---

function setupGameView () {
  gameCanvas = document.getElementById('farm-canvas')
  gameCtx = gameCanvas.getContext('2d')
  resizeCanvas()

  document.getElementById('player-name-display').textContent = farmState.playerName
  updateCoinDisplay(farmState)

  if (isVisitor) {
    // Visitors can only water
    document.querySelectorAll('.tool-btn').forEach(btn => {
      if (btn.dataset.tool !== 'water') {
        btn.disabled = true
        btn.style.opacity = '0.4'
        btn.classList.remove('active')
      } else {
        btn.classList.add('active')
      }
    })
    selectedTool = 'water'
  }

  initFarmInteraction(gameCanvas, gameCtx, farmState)

  // Render loop
  gameLoopId = requestAnimationFrame(gameLoop)

  // Tick interval: advance crop growth, detect changes, persist + broadcast
  tickIntervalId = setInterval(async () => {
    if (!farmState) return
    farmState.tick()
    updateCoinDisplay(farmState)
    if (!isVisitor) {
      await saveFarm()
    }
  }, 1000)
}

// --- Networking event wiring ---

function setupNetworkEvents () {
  network.onPeerJoin = (peerKey) => {
    console.log('Peer joined:', peerKey.slice(0, 8))
    if (chat) chat.addMessage('System', 'A peer connected')
    // Send current state to newly joined peer
    if (!isVisitor && farmState) {
      network.broadcastFarmState(farmState)
    }
  }

  network.onPeerLeave = (peerKey) => {
    console.log('Peer left:', peerKey.slice(0, 8))
    if (chat) chat.addMessage('System', 'A peer disconnected')
  }

  network.onFarmState = (peerKey, msg) => {
    if (isVisitor && msg.type === 'full-state') {
      farmState = FarmState.deserialize(msg.data)
      updateCoinDisplay(farmState)
    }
  }
}

// --- Create Farm ---

document.getElementById('create-farm').addEventListener('click', async () => {
  const name = document.getElementById('farm-name').value.trim() || 'My Farm'
  window.playerName = name

  showLoading()

  try {
    const cores = await initCorestore()

    // Try loading persisted state from Hypercore
    const saved = await loadFarm(cores.farmCore)
    if (saved) {
      farmState = FarmState.deserialize(saved)
    } else {
      farmState = new FarmState(name)
    }
    lastSavedState = farmState.serialize()

    // Save initial state if new
    if (!saved) {
      await farmCore.append(b4a.from(lastSavedState))
    }

    // Set up networking
    network = new FarmNetwork(cores.farmCore, cores.store, cores.chatCore)
    setupNetworkEvents()
    const topicHex = await network.createFarm()

    showGame()

    // Display topic (click to copy)
    const topicEl = document.getElementById('topic-display')
    topicEl.textContent = 'Topic: ' + topicHex.slice(0, 8) + '...'
    topicEl.title = topicHex
    topicEl.style.cursor = 'pointer'
    topicEl.addEventListener('click', () => {
      navigator.clipboard.writeText(topicHex).then(() => {
        topicEl.textContent = 'Copied!'
        setTimeout(() => {
          topicEl.textContent = 'Topic: ' + topicHex.slice(0, 8) + '...'
        }, 1500)
      })
    })

    setupGameView()

    // Init chat
    chat = new FarmChat(network)
  } catch (err) {
    console.error('Failed to create farm:', err)
    showSetup()
  }
})

// --- Visit Farm ---

document.getElementById('join-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const name = document.getElementById('farm-name').value.trim() || 'Visitor'
  const topicHex = document.getElementById('join-topic').value.trim()
  if (!topicHex) return

  window.playerName = name
  isVisitor = true

  showLoading()

  try {
    const cores = await initCorestore()

    // Placeholder state until we receive the real one from the farm owner
    farmState = new FarmState(name)

    // Set up networking
    network = new FarmNetwork(cores.farmCore, cores.store, cores.chatCore)
    setupNetworkEvents()
    await network.joinFarm(topicHex)

    showGame()
    document.getElementById('topic-display').textContent = 'Visiting farm...'

    setupGameView()

    // Init chat
    chat = new FarmChat(network)
  } catch (err) {
    console.error('Failed to join farm:', err)
    isVisitor = false
    showSetup()
  }
})

// --- Game loop ---

function gameLoop () {
  if (!farmState || !gameCtx) return
  renderFarm(gameCtx, farmState, hoverTile, selectedTool)
  gameLoopId = requestAnimationFrame(gameLoop)
}

function resizeCanvas () {
  if (!gameCanvas) return
  gameCanvas.width = gameCanvas.clientWidth
  gameCanvas.height = gameCanvas.clientHeight
}

// --- Window events ---

window.addEventListener('resize', resizeCanvas)

// Pear hot reload support
if (typeof Pear !== 'undefined') {
  Pear.updates(() => Pear.reload())
}
