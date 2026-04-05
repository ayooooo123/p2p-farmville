import { initScene, animate as renderScene } from './js/scene.js'
import { CROP_DEFINITIONS, createCropMesh, createWitheredMesh, updateCropGrowth } from './js/crops.js'
import { initMarket, showMarket, hideMarket, getSelectedSeed, clearSelectedSeed, updateSeedStrip } from './js/market.js'

// ── Constants (mirrored from shared/constants.js for renderer) ───────────────
const PLOW_COST = 15
const PLOW_XP = 1
const ENERGY_COST = 1
const WATER_MULTIPLIER = 2

const LEVEL_THRESHOLDS = [
  0, 0, 100, 250, 500, 850, 1300, 1850, 2500, 3300, 4200,
  5200, 6400, 7800, 9400, 11200, 13200, 15500, 18000, 20800, 23900,
  27300, 31000, 35000, 39500, 44500, 50000, 56000, 62500, 69500, 77000,
  85000, 93500, 102500, 112000, 122000, 132500, 143500, 155000, 167000, 180000,
  194000, 209000, 225000, 242000, 260000, 279000, 299000, 320000, 342000, 365000
]

// ── Game state ───────────────────────────────────────────────────────────────
const gameState = {
  coins: 500,
  xp: 0,
  totalXp: 0,
  level: 1,
  energy: 30,
  maxEnergy: 30,
  farmName: '',
  running: false,
  selectedTool: null,
  selectedSeed: null,
  lastEnergyRegen: 0
}
window._gameState = gameState

// ── DOM elements ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas')
const setupScreen = document.getElementById('setup-screen')
const hud = document.getElementById('hud')
const chatPanel = document.getElementById('chat-panel')
const farmNameInput = document.getElementById('farm-name')
const startBtn = document.getElementById('start-btn')
const coinDisplay = document.getElementById('coin-display')
const xpDisplay = document.getElementById('xp-display')
const energyDisplay = document.getElementById('energy-display')
const energyBarFill = document.getElementById('energy-bar-fill')
const toolbar = document.getElementById('toolbar')
const seedStrip = document.getElementById('seed-strip')
const levelUpNotif = document.getElementById('level-up-notification')
const levelUpDetail = document.getElementById('level-up-detail')
const actionFeedback = document.getElementById('action-feedback')

let sceneData = null
let terrainData = null
let lastTime = 0
const mouse = { x: 0, y: 0 }

// ── Initialize Three.js scene ────────────────────────────────────────────────
sceneData = initScene(canvas)
terrainData = sceneData.terrainData

// ── Initialize Market ────────────────────────────────────────────────────────
initMarket((seedKey) => {
  gameState.selectedSeed = seedKey
  // Auto-switch to plant tool when selecting from market
  selectTool('plant')
  hideMarket()
})

// ── Start worker via IPC bridge ──────────────────────────────────────────────
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

// ── HUD update ───────────────────────────────────────────────────────────────
function updateHUD () {
  const nextLevelXp = LEVEL_THRESHOLDS[gameState.level + 1] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  const currentLevelXp = LEVEL_THRESHOLDS[gameState.level] || 0
  const xpInLevel = gameState.totalXp - currentLevelXp
  const xpNeeded = nextLevelXp - currentLevelXp

  coinDisplay.textContent = gameState.coins.toLocaleString() + ' coins'
  xpDisplay.textContent = 'Level ' + gameState.level + ' (' + xpInLevel + '/' + xpNeeded + ' XP)'
  energyDisplay.textContent = 'Energy: ' + gameState.energy + '/' + gameState.maxEnergy

  // Energy bar fill
  const pct = (gameState.energy / gameState.maxEnergy) * 100
  energyBarFill.style.width = pct + '%'
  if (pct > 50) energyBarFill.style.background = '#7cfc00'
  else if (pct > 20) energyBarFill.style.background = '#ffd700'
  else energyBarFill.style.background = '#ff4444'
}

// ── Tool system ──────────────────────────────────────────────────────────────
function selectTool (toolName) {
  gameState.selectedTool = toolName

  // Update toolbar button visuals
  toolbar.querySelectorAll('.tool-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === toolName)
  })

  // Show/hide seed strip
  if (toolName === 'plant') {
    seedStrip.style.display = 'flex'
    updateSeedStrip(gameState.level, seedStrip, (seedKey) => {
      gameState.selectedSeed = seedKey
    })
  } else {
    seedStrip.style.display = 'none'
  }

  // Update cursor
  const cursors = {
    plow: 'crosshair',
    plant: 'cell',
    water: 'pointer',
    harvest: 'grab',
    remove: 'not-allowed'
  }
  canvas.style.cursor = cursors[toolName] || 'default'
}

function deselectTool () {
  gameState.selectedTool = null
  gameState.selectedSeed = null
  clearSelectedSeed()
  toolbar.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'))
  seedStrip.style.display = 'none'
  canvas.style.cursor = 'default'
}

// Toolbar click handlers
toolbar.addEventListener('click', (e) => {
  const btn = e.target.closest('.tool-btn')
  if (!btn || btn.id === 'market-open-btn') return

  const tool = btn.dataset.tool
  if (gameState.selectedTool === tool) {
    deselectTool()
  } else {
    selectTool(tool)
  }
})

// ── Energy system ────────────────────────────────────────────────────────────
function useEnergy (amount) {
  if (gameState.energy < amount) {
    showFeedback('Not enough energy!', '#ff4444')
    return false
  }
  gameState.energy -= amount
  return true
}

function regenEnergy (dt) {
  gameState.lastEnergyRegen += dt
  // Regen 1 energy every 10 seconds (fast for gameplay)
  if (gameState.lastEnergyRegen >= 10000 && gameState.energy < gameState.maxEnergy) {
    gameState.energy = Math.min(gameState.energy + 1, gameState.maxEnergy)
    gameState.lastEnergyRegen = 0
  }
}

// ── XP / Level system ────────────────────────────────────────────────────────
function addXP (amount) {
  gameState.totalXp += amount

  // Check for level up
  while (gameState.level < LEVEL_THRESHOLDS.length - 1 &&
         gameState.totalXp >= LEVEL_THRESHOLDS[gameState.level + 1]) {
    gameState.level++
    showLevelUp(gameState.level)
  }
}

function showLevelUp (level) {
  levelUpDetail.textContent = 'You reached Level ' + level + '!'
  levelUpNotif.style.display = 'flex'
  levelUpNotif.classList.add('show')

  setTimeout(() => {
    levelUpNotif.classList.remove('show')
    setTimeout(() => { levelUpNotif.style.display = 'none' }, 500)
  }, 3000)
}

// ── Action feedback ──────────────────────────────────────────────────────────
function showFeedback (text, color) {
  actionFeedback.textContent = text
  actionFeedback.style.color = color || '#fff'
  actionFeedback.style.display = 'block'
  actionFeedback.classList.add('show')

  setTimeout(() => {
    actionFeedback.classList.remove('show')
    setTimeout(() => { actionFeedback.style.display = 'none' }, 300)
  }, 1500)
}

// ── Plot click actions ───────────────────────────────────────────────────────
function handlePlotClick (plot) {
  if (!plot || !gameState.selectedTool) return

  switch (gameState.selectedTool) {
    case 'plow':
      handlePlow(plot)
      break
    case 'plant':
      handlePlant(plot)
      break
    case 'water':
      handleWater(plot)
      break
    case 'harvest':
      handleHarvest(plot)
      break
    case 'remove':
      handleRemove(plot)
      break
  }
  updateHUD()
}

function handlePlow (plot) {
  if (plot.state !== terrainData.PLOT_STATES.GRASS) {
    showFeedback('Already plowed!', '#ffa500')
    return
  }
  if (gameState.coins < PLOW_COST) {
    showFeedback('Not enough coins! (need ' + PLOW_COST + ')', '#ff4444')
    return
  }
  if (!useEnergy(ENERGY_COST)) return

  gameState.coins -= PLOW_COST
  addXP(PLOW_XP)
  terrainData.setPlotState(plot.row, plot.col, terrainData.PLOT_STATES.PLOWED)
  showFeedback('Plowed! -' + PLOW_COST + ' coins', '#daa520')
}

function handlePlant (plot) {
  if (plot.state !== terrainData.PLOT_STATES.PLOWED) {
    showFeedback('Plow the soil first!', '#ffa500')
    return
  }
  const seedKey = gameState.selectedSeed || getSelectedSeed()
  if (!seedKey) {
    showFeedback('Select a seed first!', '#ffa500')
    return
  }
  const cropDef = CROP_DEFINITIONS[seedKey]
  if (!cropDef) return

  if (gameState.coins < cropDef.seedCost) {
    showFeedback('Not enough coins! (need ' + cropDef.seedCost + ')', '#ff4444')
    return
  }
  if (!useEnergy(ENERGY_COST)) return

  gameState.coins -= cropDef.seedCost

  // Create crop data
  plot.crop = {
    type: seedKey,
    plantedAt: Date.now(),
    watered: false,
    stage: 0,
    withered: false,
    growthAccum: 0
  }

  // Create crop mesh
  const cropMesh = createCropMesh(seedKey, 0)
  cropMesh.position.set(plot.x, 0.08, plot.z)
  sceneData.scene.add(cropMesh)
  plot.cropMesh = cropMesh

  terrainData.setPlotState(plot.row, plot.col, terrainData.PLOT_STATES.PLANTED)
  showFeedback('Planted ' + cropDef.name + '! -' + cropDef.seedCost + ' coins', '#32cd32')
}

function handleWater (plot) {
  if (plot.state !== terrainData.PLOT_STATES.PLANTED || !plot.crop) {
    showFeedback('Nothing to water here!', '#ffa500')
    return
  }
  if (plot.crop.withered) {
    showFeedback('This crop is withered! Remove it.', '#808080')
    return
  }
  if (plot.crop.watered) {
    showFeedback('Already watered!', '#4169e1')
    return
  }
  if (!useEnergy(ENERGY_COST)) return

  plot.crop.watered = true
  showFeedback('Watered! Growth speed 2x', '#4169e1')
}

function handleHarvest (plot) {
  if (plot.state !== terrainData.PLOT_STATES.PLANTED || !plot.crop) {
    showFeedback('Nothing to harvest!', '#ffa500')
    return
  }
  if (plot.crop.withered) {
    showFeedback('Withered! Can only remove.', '#808080')
    return
  }

  const cropDef = CROP_DEFINITIONS[plot.crop.type]
  if (!cropDef) return

  const maxStage = cropDef.stages - 1
  if (plot.crop.stage < maxStage) {
    showFeedback('Not mature yet! (stage ' + plot.crop.stage + '/' + maxStage + ')', '#ffa500')
    return
  }
  if (!useEnergy(ENERGY_COST)) return

  // Harvest rewards
  gameState.coins += cropDef.sellPrice
  addXP(cropDef.xp)

  // Remove crop mesh
  if (plot.cropMesh) {
    sceneData.scene.remove(plot.cropMesh)
    plot.cropMesh = null
  }
  plot.crop = null
  terrainData.setPlotState(plot.row, plot.col, terrainData.PLOT_STATES.PLOWED)
  showFeedback('Harvested ' + cropDef.name + '! +' + cropDef.sellPrice + ' coins, +' + cropDef.xp + ' XP', '#ffd700')
}

function handleRemove (plot) {
  if (plot.state !== terrainData.PLOT_STATES.PLANTED || !plot.crop) {
    showFeedback('Nothing to remove!', '#ffa500')
    return
  }
  if (!useEnergy(ENERGY_COST)) return

  const cropDef = CROP_DEFINITIONS[plot.crop.type]
  const name = cropDef ? cropDef.name : 'crop'

  // Remove crop mesh
  if (plot.cropMesh) {
    sceneData.scene.remove(plot.cropMesh)
    plot.cropMesh = null
  }
  plot.crop = null
  terrainData.setPlotState(plot.row, plot.col, terrainData.PLOT_STATES.PLOWED)
  showFeedback('Removed ' + name + ' (no refund)', '#ff6347')
}

// ── Mouse click -> raycast to plot ───────────────────────────────────────────
canvas.addEventListener('click', (e) => {
  if (!gameState.running || !terrainData) return

  // Convert mouse to normalized device coordinates
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

  const plot = terrainData.getPlotFromRaycast(mouse, sceneData.camera)
  handlePlotClick(plot)
})

// Right-click or ESC to deselect tool
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  deselectTool()
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') deselectTool()

  // Number keys for quick tool select
  const toolKeys = { '1': 'plow', '2': 'plant', '3': 'water', '4': 'harvest', '5': 'remove' }
  if (toolKeys[e.key] && gameState.running) {
    selectTool(toolKeys[e.key])
  }
})

// ── Crop growth update ───────────────────────────────────────────────────────
function updateCrops (dtMs) {
  if (!terrainData) return

  const allPlots = terrainData.getAllPlots()
  for (const plot of allPlots) {
    if (!plot.crop || plot.state !== terrainData.PLOT_STATES.PLANTED) continue

    const stageChanged = updateCropGrowth(plot.crop, dtMs)

    if (stageChanged) {
      // Remove old mesh
      if (plot.cropMesh) {
        sceneData.scene.remove(plot.cropMesh)
      }

      // Create new mesh for current stage
      if (plot.crop.withered) {
        plot.cropMesh = createWitheredMesh(plot.crop.type)
      } else {
        plot.cropMesh = createCropMesh(plot.crop.type, plot.crop.stage)
      }
      plot.cropMesh.position.set(plot.x, 0.08, plot.z)
      sceneData.scene.add(plot.cropMesh)
    }
  }
}

// ── Game loop ────────────────────────────────────────────────────────────────
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
  const dtMs = clampedDt * 1000

  // Update player movement
  window.PlayerController.updatePlayer(clampedDt)
  window.PlayerController.updateCamera(sceneData.camera)

  // Update crops growth (time-based)
  updateCrops(dtMs)

  // Energy regen
  regenEnergy(dtMs)

  // Update HUD periodically
  updateHUD()

  // Render
  renderScene()
}

// ── Setup screen logic ───────────────────────────────────────────────────────
function startGame () {
  const name = farmNameInput.value.trim()
  if (!name) {
    farmNameInput.style.borderColor = '#f44336'
    farmNameInput.focus()
    return
  }

  gameState.farmName = name
  gameState.running = true
  gameState.lastEnergyRegen = 0

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
