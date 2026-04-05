import { initScene, animate as renderScene } from './js/scene.js'

// Game state
const gameState = {
  coins: 500,
  xp: 0,
  level: 1,
  energy: 30,
  maxEnergy: 30,
  xpPerLevel: 100,
  farmName: '',
  running: false
}

// DOM elements
const canvas = document.getElementById('game-canvas')
const setupScreen = document.getElementById('setup-screen')
const hud = document.getElementById('hud')
const chatPanel = document.getElementById('chat-panel')
const farmNameInput = document.getElementById('farm-name')
const startBtn = document.getElementById('start-btn')
const coinDisplay = document.getElementById('coin-display')
const xpDisplay = document.getElementById('xp-display')
const energyDisplay = document.getElementById('energy-display')

let sceneData = null
let lastTime = 0

// Initialize Three.js scene
sceneData = initScene(canvas)

// Start worker via IPC bridge
if (window.IPCBridge && window.IPCBridge.available) {
  window.IPCBridge.startWorker().then((result) => {
    console.log('[app] Worker started:', result)
  })

  window.IPCBridge.onWorkerMessage((msg) => {
    console.log('[app] Worker message:', msg)
  })

  window.IPCBridge.onWorkerStdout((data) => {
    console.log('[worker stdout]', data)
  })

  window.IPCBridge.onWorkerStderr((data) => {
    console.error('[worker stderr]', data)
  })
} else {
  console.warn('[app] IPC bridge not available - running without worker')
}

// HUD update
function updateHUD () {
  coinDisplay.textContent = gameState.coins + ' coins'
  xpDisplay.textContent = 'Level ' + gameState.level + ' (' + gameState.xp + '/' + gameState.xpPerLevel + ' XP)'
  energyDisplay.textContent = 'Energy: ' + gameState.energy + '/' + gameState.maxEnergy
}

// Game loop
function gameLoop (time) {
  requestAnimationFrame(gameLoop)

  if (!gameState.running) {
    renderScene()
    return
  }

  const dt = lastTime ? (time - lastTime) / 1000 : 0
  lastTime = time

  // Cap delta time to avoid large jumps
  const clampedDt = Math.min(dt, 0.1)

  // Update player movement
  window.PlayerController.updatePlayer(clampedDt)
  window.PlayerController.updateCamera(sceneData.camera)

  // Render
  renderScene()
}

// Setup screen logic
function startGame () {
  const name = farmNameInput.value.trim()
  if (!name) {
    farmNameInput.style.borderColor = '#f44336'
    farmNameInput.focus()
    return
  }

  gameState.farmName = name
  gameState.running = true

  // Hide setup, show HUD + chat
  setupScreen.style.display = 'none'
  hud.style.display = 'block'
  chatPanel.style.display = 'flex'

  // Init player
  window.PlayerController.initPlayer(sceneData.scene)

  // Update HUD
  updateHUD()

  // Notify worker
  if (window.IPCBridge && window.IPCBridge.available) {
    window.IPCBridge.sendToWorker({ type: 'farm:init', farmName: name })
  }

  console.log('[app] Game started - Farm:', name)
}

startBtn.addEventListener('click', startGame)
farmNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startGame()
  farmNameInput.style.borderColor = '#4caf50'
})

// Chat form (placeholder - will connect to P2P in Phase 5)
document.getElementById('chat-form').addEventListener('submit', (e) => {
  e.preventDefault()
  const input = document.getElementById('chat-input')
  const msg = input.value.trim()
  if (!msg) return

  const messagesEl = document.getElementById('chat-messages')
  const div = document.createElement('div')
  div.className = 'msg'
  div.textContent = gameState.farmName + ': ' + msg
  messagesEl.appendChild(div)
  messagesEl.scrollTop = messagesEl.scrollHeight
  input.value = ''
})

// Kick off render loop
requestAnimationFrame(gameLoop)
