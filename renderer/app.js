import * as THREE from './js/three.module.min.js'
import { initScene, animate as renderScene } from './js/scene.js'
import { CROP_DEFINITIONS, createCropMesh, createWitheredMesh, updateCropGrowth, animateHarvestPop } from './js/crops.js'
import { initMarket, showMarket, hideMarket, getSelectedSeed, clearSelectedSeed, updateSeedStrip } from './js/market.js'
import { TREE_DEFINITIONS, createTreeMesh, createTreeData, updateTreeGrowth, isTreeReady, harvestTree } from './js/trees.js'
import { ANIMAL_DEFINITIONS, createAnimalMesh, createAnimalData, updateAnimalState, feedAnimal, collectAnimalProduct } from './js/animals.js'
import { BUILDING_DEFINITIONS, createBuildingMesh, createBuildingData, getBuildingEffects, updateCraftingQueue, startCrafting } from './js/buildings.js'
import { DECO_DEFINITIONS, createDecoMesh, createDecoData } from './js/decorations.js'
import { VEHICLE_DEFINITIONS, createVehicleMesh, getVehicleSpeedMultiplier } from './js/vehicles.js'
import { initInventory, addItem, removeItem, hasItem, getItemQty, sellItem, getInventory, renderInventoryPanel, setCapacityBonus, getItemCount, getMaxCapacity } from './js/inventory.js'
import * as NeighborRenderer from './js/neighbor-renderer.js'
import { initMastery, recordHarvest, getMasteryData, getMasteryStars, getMasteryStarHTML, renderMasteryPanel, getMasteryLevel } from './js/mastery.js'
import { initCollections, rollForDrop, getCollectionData, renderCollectionsPanel, isSetComplete, getCompletedSetsCount, getTotalItemsFound, COLLECTION_DEFINITIONS } from './js/collections.js'
import { initAchievements, updateStats, getAchievementState, isUnlocked, getUnlockedCount, getTotalPoints, getAllRibbons, renderAchievementsPanel } from './js/achievements.js'
import { initExpansion, getCurrentTier, getCurrentGridSize, getNextExpansion, canAffordExpansion, purchaseExpansion, showExpansionPreview, clearPreview, renderExpansionPanel, EXPANSION_DEFINITIONS } from './js/expansion.js'
import { initParticles, createParticleEffect, updateParticles } from './js/particles.js'
import { FarmActions } from './js/farm-actions.js'
import { showToast } from './js/toasts.js'
import { QuestSystem } from './js/quests.js'

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
  lastEnergyRegen: 0,
  // Phase 6: Progression tracking
  totalHarvests: 0,
  totalPlanted: 0,
  totalPlowed: 0,
  totalWatered: 0,
  totalCoinsEarned: 0,
  itemsSold: 0,
  itemsCrafted: 0,
  sessionsPlayed: 0,
  giftsSent: 0,
  tradesCompleted: 0,
  chatMessages: 0,
  coopCompleted: 0,
  farmsVisited: 0,
  animalsFed: 0,
  animalProductsCollected: 0
}
window._gameState = gameState

// ── Farm state (placed objects) ──────────────────────────────────────────────
const farmState = {
  trees: [],
  animals: [],
  buildings: [],
  decorations: [],
  ownedVehicles: []
}

let placementMode = null // { category, key, def, ghostMesh }
let activeCraftingBuilding = null

// ── P2P state ───────────────────────────────────────────────────────────────
const p2pState = {
  initialized: false,
  playerKey: '',
  peerCount: 0,
  neighbors: [],
  visiting: false,
  visitingNeighborName: '',
  lastFarmSyncTime: 0,
  farmSyncInterval: 10000 // sync farm state every 10s
}

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
const vehicleStatusEl = document.getElementById('vehicle-status')
const inventoryPanel = document.getElementById('inventory-panel')
const craftingPanel = document.getElementById('crafting-panel')
const placementIndicator = document.getElementById('placement-indicator')
const placementText = document.getElementById('placement-text')
const tooltipEl = document.getElementById('object-tooltip')
const tooltipTitle = document.getElementById('tooltip-title')
const tooltipInfo = document.getElementById('tooltip-info')
const tooltipProgressWrap = document.getElementById('tooltip-progress-wrap')
const tooltipProgressBar = document.getElementById('tooltip-progress-bar')
const tooltipProgressLabel = document.getElementById('tooltip-progress-label')

// P2P DOM elements
const peerCountEl = document.getElementById('peer-count')
const visitingIndicator = document.getElementById('visiting-indicator')
const visitingText = document.getElementById('visiting-text')
const returnHomeBtn = document.getElementById('return-home-btn')
const visitorToolbar = document.getElementById('visitor-toolbar')
const neighborPanel = document.getElementById('neighbor-panel')
const neighborList = document.getElementById('neighbor-list')
const neighborCountEl = document.getElementById('neighbor-count')

let sceneData = null
let terrainData = null
let lastTime = 0
const mouse = { x: 0, y: 0 }
const mousePx = { x: 0, y: 0 }

// ── Initialize Three.js scene ────────────────────────────────────────────────
sceneData = initScene(canvas)
terrainData = sceneData.terrainData
initParticles(sceneData.scene)

// ── Initialize Inventory ─────────────────────────────────────────────────────
initInventory(() => {
  if (inventoryPanel && inventoryPanel.classList.contains('visible')) {
    renderInventoryUI()
  }
})

// ── Initialize Market ────────────────────────────────────────────────────────
initMarket((seedKey) => {
  gameState.selectedSeed = seedKey
  selectTool('plant')
  hideMarket()
}, (purchase) => {
  handleMarketBuy(purchase)
})

// ── Load saved data for initialization ──────────────────────────────────────
let savedData = null
try {
  const raw = localStorage.getItem('p2p-farmville-save')
  if (raw) savedData = JSON.parse(raw)
} catch (e) { /* ignore */ }

// Pre-fill farm name from save
if (savedData?.gameState?.farmName && farmNameInput) {
  farmNameInput.value = savedData.gameState.farmName
}

// Auto-start if a valid save exists — skip the setup screen
if (savedData?.gameState?.farmName) {
  // setTimeout 0 defers until this script finishes executing
  // so all init code below (scene, mastery, etc.) runs first
  setTimeout(() => startGame(), 0)
}

// ── Initialize Phase 6: Progression Systems ─────────────────────────────────
initMastery(savedData?.mastery || {}, (cropKey, newLevel) => {
  const def = CROP_DEFINITIONS[cropKey]
  const name = def ? def.name : cropKey
  showMasteryNotification(name, newLevel)
})

initCollections(savedData?.collections || {}, (item, setKey, set) => {
  showCollectionNotification(item, set)
})

initAchievements(savedData?.achievements || {}, (achievement) => {
  showAchievementNotification(achievement)
  showToast(achievement.name, 'achievement', achievement.description)
  if (achievement.reward) {
    if (achievement.reward.coins) {
      gameState.coins += achievement.reward.coins
      gameState.totalCoinsEarned += achievement.reward.coins
    }
    if (achievement.reward.xp) addXP(achievement.reward.xp)
  }
})

initExpansion(null, savedData?.expansion?.tier || 0) // scene set later in startGame

// Phase 6 DOM elements
const masteryPanel = document.getElementById('mastery-panel')
const collectionsPanel = document.getElementById('collections-panel')
const achievementsPanel = document.getElementById('achievements-panel')
const expansionPanel = document.getElementById('expansion-panel')
const progressNotifArea = document.getElementById('progress-notification-area')

// ── Start worker via IPC bridge ──────────────────────────────────────────────
if (window.IPCBridge && window.IPCBridge.available) {
  window.IPCBridge.startWorker().then((result) => {
    console.log('[app] Worker started:', result)
  })

  window.IPCBridge.onWorkerMessage((msg) => {
    if (msg.type !== 'neighbors' && msg.type !== 'connected') {
      console.log('[app] Worker message:', msg.type)
    }
  })

  window.IPCBridge.onWorkerStdout((data) => {
    console.log('[worker stdout]', data)
  })

  window.IPCBridge.onWorkerStderr((data) => {
    console.error('[worker stderr]', data)
  })

  // P2P event listeners
  window.IPCBridge.onPeerCount((count) => {
    p2pState.peerCount = count
    updatePeerCountUI()
  })

  window.IPCBridge.onNeighbors((neighbors) => {
    p2pState.neighbors = neighbors
    updateNeighborPanel()
    NeighborRenderer.updateNeighbors(neighbors)
  })

  window.IPCBridge.onChatMessage((msg) => {
    appendChatMessageUI(msg.from, msg.message, msg.timestamp)
  })

  window.IPCBridge.onNeighborFarmUpdate((update) => {
    console.log('[app] Neighbor farm update from:', update.playerKey?.slice(0, 12))
    // NeighborRenderer handles this via the neighbors list
  })

  window.IPCBridge.onInitialized((info) => {
    p2pState.initialized = true
    p2pState.playerKey = info.playerKey
    console.log('[app] P2P initialized, key:', info.playerKey?.slice(0, 12) + '...')
  })

  window.IPCBridge.onError((error) => {
    console.error('[app] Worker error:', error)
  })

  // ── Farm action protocol (visitor water/harvest/feed) ────────────────────
  window.IPCBridge.onVisitorFarmAction((msg) => {
    // Someone is performing an action on our farm
    const combinedFarmState = {
      plots: terrainData ? terrainData.getAllPlots() : [],
      animals: farmState.animals
    }
    FarmActions.handleVisitorAction(msg, combinedFarmState, gameState, ({ action, targetId, visitorName, reward }) => {
      showFeedback(visitorName + ' ' + action + 'ed your ' + (action === 'feed' ? 'animal' : 'crop') + '!', '#4caf50')
      syncFarmStateNow()
    })
  })

  window.IPCBridge.onFarmActionResult((msg) => {
    // Result of an action WE sent to a neighbor
    if (msg.success) {
      showFeedback(msg.action + ' successful! +' + (msg.reward?.xp || 0) + ' XP', '#4caf50')
      if (msg.reward?.xp) addXP(msg.reward.xp)
      if (msg.reward?.coins) { gameState.coins += msg.reward.coins; updateHUD() }
    } else {
      const reasons = { no_crop: 'No crop there', already_watered: 'Already watered', not_ready: 'Not ready yet', action_not_permitted: 'Not allowed', withered: 'Crop withered', no_animal: 'No animal there', already_fed: 'Already fed', mature: 'Already mature' }
      showFeedback(reasons[msg.reason] || 'Action failed', '#f44336')
    }
  })
} else {
  console.warn('[app] IPC bridge not available - running without worker')
}

// ── Initialize NeighborRenderer ─────────────────────────────────────────────
NeighborRenderer.init(sceneData.scene)

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

  // Quick-action buttons: show when there's something to do
  if (terrainData && gameState.running) {
    const allPlots = terrainData.getAllPlots()
    let readyCount = 0
    let unwateredCount = 0
    for (const p of allPlots) {
      if (p.state === terrainData.PLOT_STATES.PLANTED && p.crop && !p.crop.withered) {
        const def = CROP_DEFINITIONS[p.crop.type]
        if (def && p.crop.stage >= def.stages - 1) readyCount++
        else if (!p.crop.watered) unwateredCount++
      }
    }
    if (harvestAllBtn) {
      harvestAllBtn.style.display = readyCount > 0 ? '' : 'none'
      if (readyCount > 0) {
        const label = harvestAllBtn.querySelector('.tool-label')
        if (label) label.textContent = 'Harvest (' + readyCount + ')'
      }
    }
    if (waterAllBtn) {
      waterAllBtn.style.display = unwateredCount > 0 ? '' : 'none'
      if (unwateredCount > 0) {
        const label = waterAllBtn.querySelector('.tool-label')
        if (label) label.textContent = 'Water (' + unwateredCount + ')'
      }
    }
  }
}

// ── Tool system ──────────────────────────────────────────────────────────────
function selectTool (toolName) {
  cancelPlacement()
  gameState.selectedTool = toolName

  toolbar.querySelectorAll('.tool-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === toolName)
  })

  if (toolName === 'plant') {
    seedStrip.style.display = 'flex'
    updateSeedStrip(gameState.level, seedStrip, (seedKey) => {
      gameState.selectedSeed = seedKey
    })
  } else {
    seedStrip.style.display = 'none'
  }

  const cursors = {
    plow: 'crosshair',
    plant: 'cell',
    water: 'pointer',
    harvest: 'grab',
    remove: 'not-allowed'
  }
  canvas.style.cursor = cursors[toolName] || 'default'
  canvas.style.pointerEvents = 'auto'
}

function deselectTool () {
  gameState.selectedTool = null
  gameState.selectedSeed = null
  clearSelectedSeed()
  toolbar.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'))
  seedStrip.style.display = 'none'
  canvas.style.cursor = 'default'
  canvas.style.pointerEvents = 'none'
}

// Tool button direct listeners (delegation unreliable in Electrobun WebView)
;['plow', 'plant', 'water', 'harvest', 'remove'].forEach(tool => {
  const btn = toolbar.querySelector(`[data-tool="${tool}"]`)
  if (btn) {
    btn.addEventListener('click', () => {
      if (gameState.selectedTool === tool) {
        deselectTool()
      } else {
        selectTool(tool)
      }
    })
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
  if (gameState.lastEnergyRegen >= 10000 && gameState.energy < gameState.maxEnergy) {
    gameState.energy = Math.min(gameState.energy + 1, gameState.maxEnergy)
    gameState.lastEnergyRegen = 0
  }
}

// ── XP / Level system ────────────────────────────────────────────────────────
function addXP (amount) {
  gameState.totalXp += amount

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

  showToast('Level Up! You are now level ' + level, 'level', 'New crops and items unlocked!')

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

// ── Floating coin text (world-to-screen) ────────────────────────────────────
function showFloatingCoin (worldX, worldZ, text) {
  if (!sceneData || !sceneData.camera) return

  // Project world position to screen
  const pos = new THREE.Vector3(worldX, 0.5, worldZ)
  pos.project(sceneData.camera)

  const canvas = document.getElementById('game-canvas')
  const screenX = (pos.x * 0.5 + 0.5) * canvas.clientWidth
  const screenY = (-pos.y * 0.5 + 0.5) * canvas.clientHeight

  const el = document.createElement('div')
  el.className = 'floating-coin'
  el.textContent = text
  el.style.left = screenX + 'px'
  el.style.top = screenY + 'px'
  document.getElementById('game-container').appendChild(el)

  // Remove after animation completes
  setTimeout(() => { el.remove() }, 1200)
}

// ── Float-up DOM text (coins / XP) ───────────────────────────────────────────
function worldToScreen (worldPos) {
  if (!sceneData || !sceneData.camera) return { x: 0, y: 0 }
  const vec = worldPos.clone().project(sceneData.camera)
  return {
    x: (vec.x * 0.5 + 0.5) * window.innerWidth,
    y: (-vec.y * 0.5 + 0.5) * window.innerHeight
  }
}

function spawnFloatUp (text, cssClass, screenX, screenY) {
  const el = document.createElement('div')
  el.className = `float-up ${cssClass}`
  el.textContent = text
  el.style.left = (screenX - 20) + 'px'
  el.style.top = (screenY - 20) + 'px'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 1300)
}

// ── Phase 6: Notification helpers ───────────────────────────────────────────
function showProgressNotification (html, duration) {
  if (!progressNotifArea) return
  const notif = document.createElement('div')
  notif.className = 'progress-notif show'
  notif.innerHTML = html
  progressNotifArea.appendChild(notif)
  setTimeout(() => {
    notif.classList.remove('show')
    setTimeout(() => notif.remove(), 400)
  }, duration || 3000)
}

function showMasteryNotification (cropName, level) {
  showProgressNotification(
    '<div class="notif-mastery">' +
      '<span class="notif-icon" style="color:' + level.color + '">' + level.icon + '</span> ' +
      '<span><b>' + cropName + '</b> reached <b style="color:' + level.color + '">' + level.name + '</b> mastery!</span>' +
    '</div>', 4000
  )
}

function showCollectionNotification (item, set) {
  const rarityColors = { common: '#aaa', uncommon: '#4caf50', rare: '#2196f3', epic: '#e040fb' }
  showProgressNotification(
    '<div class="notif-collection">' +
      '<span class="notif-sparkle">&#10024;</span> ' +
      '<span>Found <b style="color:' + (rarityColors[item.rarity] || '#fff') + '">' + item.icon + ' ' + item.name + '</b></span>' +
      '<span class="notif-set-name"> from ' + set.name + '</span>' +
    '</div>', 3500
  )
}

function showAchievementNotification (achievement) {
  showProgressNotification(
    '<div class="notif-achievement">' +
      '<span class="notif-icon">&#127942;</span> ' +
      '<span>Achievement Unlocked: <b>' + achievement.name + '</b></span>' +
      (achievement.reward.coins ? '<span class="notif-reward">+' + achievement.reward.coins + ' coins</span>' : '') +
    '</div>', 4500
  )
}

// ── Phase 6: Check achievements after actions ───────────────────────────────
function checkAchievements () {
  const masteryData = getMasteryData()
  let masteredCrops = 0
  let goldMastery = 0
  let allBronze = true
  const plantedCropKeys = Object.keys(masteryData)

  for (const key of plantedCropKeys) {
    const level = getMasteryLevel(key)
    if (level.stars >= 1) masteredCrops++
    if (level.stars >= 3) goldMastery++
    if (level.stars < 1) allBronze = false
  }
  if (plantedCropKeys.length === 0) allBronze = false

  updateStats({
    totalHarvests: gameState.totalHarvests,
    totalPlanted: gameState.totalPlanted,
    totalPlowed: gameState.totalPlowed,
    totalWatered: gameState.totalWatered,
    totalCoinsEarned: gameState.totalCoinsEarned,
    itemsSold: gameState.itemsSold,
    itemsCrafted: gameState.itemsCrafted,
    sessionsPlayed: gameState.sessionsPlayed,
    giftsSent: gameState.giftsSent,
    tradesCompleted: gameState.tradesCompleted,
    chatMessages: gameState.chatMessages,
    coopCompleted: gameState.coopCompleted,
    farmsVisited: gameState.farmsVisited,
    animalsFed: gameState.animalsFed,
    animalProductsCollected: gameState.animalProductsCollected,
    level: gameState.level,
    neighborsFound: p2pState.neighbors.length,
    buildingsPlaced: farmState.buildings.length,
    treesPlanted: farmState.trees.length,
    decorationsPlaced: farmState.decorations.length,
    animalsBought: farmState.animals.length,
    masteredCrops,
    goldMastery,
    allBronze,
    completedCollections: getCompletedSetsCount(),
    expansionTier: getCurrentTier()
  })
}

// ── Phase 6: Panel open functions ───────────────────────────────────────────
function openMasteryPanel () {
  togglePanel(masteryPanel)
  if (masteryPanel && masteryPanel.classList.contains('visible')) {
    const content = document.getElementById('mastery-content')
    if (content) renderMasteryPanel(content, CROP_DEFINITIONS)
  }
}

function openCollectionsPanel () {
  togglePanel(collectionsPanel)
  if (collectionsPanel && collectionsPanel.classList.contains('visible')) {
    const content = document.getElementById('collections-content')
    const progressEl = document.getElementById('collections-progress')
    if (progressEl) progressEl.textContent = getCompletedSetsCount() + '/' + Object.keys(COLLECTION_DEFINITIONS).length + ' sets'
    if (content) renderCollectionsPanel(content)
  }
}

function openAchievementsPanel () {
  togglePanel(achievementsPanel)
  if (achievementsPanel && achievementsPanel.classList.contains('visible')) {
    const content = document.getElementById('achievements-content')
    const progressEl = document.getElementById('achievements-progress')
    if (progressEl) progressEl.textContent = getUnlockedCount() + '/' + Object.keys(ACHIEVEMENT_DEFINITIONS).length + ' unlocked'
    if (content) renderAchievementsPanel(content)
  }
}

function openExpansionPanel () {
  togglePanel(expansionPanel)
  if (expansionPanel && expansionPanel.classList.contains('visible')) {
    const content = document.getElementById('expansion-content')
    const currentEl = document.getElementById('expansion-current')
    if (currentEl) currentEl.textContent = 'Current: ' + getCurrentGridSize() + 'x' + getCurrentGridSize()
    if (content) renderExpansionPanel(content, gameState.coins, gameState.level)
  }
}

// ── Phase 6: Panel toggle helpers ───────────────────────────────────────────
function togglePanel (panel) {
  if (!panel) return
  const isVisible = panel.classList.contains('visible')
  // Close all Phase 6 panels first
  ;[masteryPanel, collectionsPanel, achievementsPanel, expansionPanel].forEach(p => {
    if (p) p.classList.remove('visible')
  })
  if (!isVisible) panel.classList.add('visible')
}

function closePanelIfOpen (panel) {
  if (panel) panel.classList.remove('visible')
}

// ── Phase 6: Close button handlers ──────────────────────────────────────────
const masteryCloseBtn = document.getElementById('mastery-close-btn')
if (masteryCloseBtn) masteryCloseBtn.addEventListener('click', () => closePanelIfOpen(masteryPanel))
const collectionsCloseBtn = document.getElementById('collections-close-btn')
if (collectionsCloseBtn) collectionsCloseBtn.addEventListener('click', () => closePanelIfOpen(collectionsPanel))
const achievementsCloseBtn = document.getElementById('achievements-close-btn')
if (achievementsCloseBtn) achievementsCloseBtn.addEventListener('click', () => closePanelIfOpen(achievementsPanel))
const expansionCloseBtn = document.getElementById('expansion-close-btn')
if (expansionCloseBtn) expansionCloseBtn.addEventListener('click', () => closePanelIfOpen(expansionPanel))

// ── Vehicle status ───────────────────────────────────────────────────────────
function updateVehicleStatus () {
  if (!vehicleStatusEl) return
  if (farmState.ownedVehicles.length === 0) {
    vehicleStatusEl.style.display = 'none'
    return
  }
  const names = farmState.ownedVehicles.map(v => {
    const def = VEHICLE_DEFINITIONS[v]
    return def ? def.name : v
  })
  vehicleStatusEl.textContent = 'Vehicles: ' + names.join(', ')
  vehicleStatusEl.style.display = 'block'
}

// ── Market buy handler ───────────────────────────────────────────────────────
function handleMarketBuy ({ category, key, def }) {
  if (gameState.coins < def.cost) {
    showFeedback('Not enough coins! (need ' + def.cost + ')', '#ff4444')
    return
  }

  if (category === 'vehicle') {
    if (farmState.ownedVehicles.includes(key)) {
      showFeedback('Already owned!', '#ffa500')
      return
    }
    gameState.coins -= def.cost
    farmState.ownedVehicles.push(key)
    updateVehicleStatus()
    addXP(10)
    showFeedback('Bought ' + def.name + '!', '#32cd32')
    hideMarket()
    updateHUD()
    return
  }

  // Trees, Animals, Buildings, Decorations -> enter placement mode
  enterPlacementMode(category, key, def)
  hideMarket()
}

// ── Placement mode ───────────────────────────────────────────────────────────
function enterPlacementMode (category, key, def) {
  cancelPlacement()
  deselectTool()

  let ghostMesh
  switch (category) {
    case 'tree': ghostMesh = createTreeMesh(key, false, 1); break
    case 'animal': ghostMesh = createAnimalMesh(key); break
    case 'building': ghostMesh = createBuildingMesh(key); break
    case 'decoration': ghostMesh = createDecoMesh(key); break
  }

  if (ghostMesh) {
    ghostMesh.traverse(child => {
      if (child.isMesh) {
        child.material = child.material.clone()
        child.material.transparent = true
        child.material.opacity = 0.5
      }
    })
    ghostMesh.position.set(0, 0, 0)
    sceneData.scene.add(ghostMesh)
  }

  placementMode = { category, key, def, ghostMesh }

  if (placementIndicator) placementIndicator.style.display = 'flex'
  if (placementText) placementText.textContent = 'Placing: ' + def.name

  canvas.style.cursor = 'crosshair'
  canvas.style.pointerEvents = 'auto'
}

function cancelPlacement () {
  if (!placementMode) return

  if (placementMode.ghostMesh) {
    sceneData.scene.remove(placementMode.ghostMesh)
  }

  placementMode = null

  if (placementIndicator) placementIndicator.style.display = 'none'
  canvas.style.cursor = 'default'
  canvas.style.pointerEvents = 'none'
}

function updateGhostPosition () {
  if (!placementMode || !placementMode.ghostMesh) return

  // Raycast to ground plane (y=0)
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2(mouse.x, mouse.y)
  raycaster.setFromCamera(ndc, sceneData.camera)

  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const intersection = new THREE.Vector3()
  raycaster.ray.intersectPlane(groundPlane, intersection)

  if (intersection) {
    // Snap to grid (2-unit grid)
    const snappedX = Math.round(intersection.x / 2) * 2
    const snappedZ = Math.round(intersection.z / 2) * 2
    placementMode.ghostMesh.position.set(snappedX, 0, snappedZ)
  }
}

function confirmPlacement () {
  if (!placementMode) return

  const pos = placementMode.ghostMesh.position
  const x = pos.x
  const z = pos.z

  // Check if position is within farm bounds
  if (Math.abs(x) > 38 || Math.abs(z) > 38) {
    showFeedback('Too far from farm!', '#ff4444')
    return
  }

  // Deduct cost
  if (gameState.coins < placementMode.def.cost) {
    showFeedback('Not enough coins! (need ' + placementMode.def.cost + ')', '#ff4444')
    return
  }
  gameState.coins -= placementMode.def.cost

  // Remove ghost mesh
  sceneData.scene.remove(placementMode.ghostMesh)

  // Create real object
  const { category, key, def } = placementMode

  switch (category) {
    case 'tree': {
      const data = createTreeData(key, x, z)
      const mesh = createTreeMesh(key, false, data.growthScale)
      mesh.position.set(x, 0, z)
      sceneData.scene.add(mesh)
      data.mesh = mesh
      farmState.trees.push(data)
      addXP(def.xp || 3)
      break
    }
    case 'animal': {
      const data = createAnimalData(key, x, z)
      const mesh = createAnimalMesh(key)
      mesh.position.set(x, 0, z)
      sceneData.scene.add(mesh)
      data.mesh = mesh
      farmState.animals.push(data)
      addXP(def.xp || 3)
      break
    }
    case 'building': {
      const data = createBuildingData(key, x, z)
      const mesh = createBuildingMesh(key)
      mesh.position.set(x, 0, z)
      sceneData.scene.add(mesh)
      data.mesh = mesh
      farmState.buildings.push(data)
      // Update building effects
      const effects = getBuildingEffects(farmState.buildings)
      setCapacityBonus(effects.storageBonus)
      addXP(10)
      break
    }
    case 'decoration': {
      const data = createDecoData(key, x, z)
      const mesh = createDecoMesh(key)
      mesh.position.set(x, 0, z)
      sceneData.scene.add(mesh)
      data.mesh = mesh
      farmState.decorations.push(data)
      addXP(def.bonus || 1)
      break
    }
  }

  showFeedback('Placed ' + def.name + '! -' + def.cost + ' coins', '#32cd32')
  syncFarmStateNow()

  // Clear placement mode
  placementMode = null
  if (placementIndicator) placementIndicator.style.display = 'none'
  canvas.style.cursor = 'default'
  updateHUD()
}

// ── Object interaction ───────────────────────────────────────────────────────
function handleObjectClick (px, py) {
  // Raycast against all placed object meshes
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2(mouse.x, mouse.y)
  raycaster.setFromCamera(ndc, sceneData.camera)

  // Collect all meshes from placed objects
  const allMeshes = []
  const objectMap = new Map()

  for (const tree of farmState.trees) {
    if (tree.mesh) {
      tree.mesh.traverse(child => {
        if (child.isMesh) {
          allMeshes.push(child)
          objectMap.set(child.id, { type: 'tree', data: tree })
        }
      })
    }
  }
  for (const animal of farmState.animals) {
    if (animal.mesh) {
      animal.mesh.traverse(child => {
        if (child.isMesh) {
          allMeshes.push(child)
          objectMap.set(child.id, { type: 'animal', data: animal })
        }
      })
    }
  }
  for (const building of farmState.buildings) {
    if (building.mesh) {
      building.mesh.traverse(child => {
        if (child.isMesh) {
          allMeshes.push(child)
          objectMap.set(child.id, { type: 'building', data: building })
        }
      })
    }
  }

  const intersects = raycaster.intersectObjects(allMeshes, false)
  if (intersects.length === 0) return false

  const hit = intersects[0]
  const obj = objectMap.get(hit.object.id)
  if (!obj) return false

  switch (obj.type) {
    case 'tree': handleTreeInteract(obj.data); break
    case 'animal': handleAnimalInteract(obj.data); break
    case 'building': handleBuildingInteract(obj.data); break
  }

  return true
}

function handleTreeInteract (tree) {
  const def = TREE_DEFINITIONS[tree.type]
  if (!def) return

  if (isTreeReady(tree)) {
    if (!useEnergy(ENERGY_COST)) return
    const reward = harvestTree(tree)
    if (reward) {
      gameState.coins += reward.coins
      gameState.totalCoinsEarned += reward.coins
      addXP(reward.xp)
      // Add product to inventory
      addItem(tree.type + '_fruit', 1, { name: reward.product, type: 'fruit', sellPrice: reward.coins })
      createParticleEffect('harvest', { x: tree.x, y: 0.5, z: tree.z })
      showFloatingCoin(tree.x, tree.z, '+' + reward.coins)
      showFeedback('Harvested ' + reward.product + '! +' + reward.coins + ' coins', '#ffd700')
      // Rebuild mesh without fruits
      if (tree.mesh) sceneData.scene.remove(tree.mesh)
      tree.mesh = createTreeMesh(tree.type, false, tree.growthScale)
      tree.mesh.position.set(tree.x, 0, tree.z)
      sceneData.scene.add(tree.mesh)
    }
  } else if (tree.growthScale < 1) {
    showFeedback(def.name + ' is still growing...', '#7df9ff')
  } else {
    const elapsed = Date.now() - (tree.lastHarvest || tree.plantedAt)
    const remaining = Math.max(0, def.harvestTime - elapsed)
    const secs = Math.ceil(remaining / 1000)
    showFeedback(def.name + ' fruit in ' + secs + 's', '#7df9ff')
  }
  updateHUD()
}

function handleAnimalInteract (animal) {
  const def = ANIMAL_DEFINITIONS[animal.type]
  if (!def) return

  if (animal.productReady) {
    // Collect product
    if (!useEnergy(ENERGY_COST)) return
    const reward = collectAnimalProduct(animal)
    if (reward) {
      gameState.coins += reward.coins
      gameState.totalCoinsEarned += reward.coins
      gameState.animalProductsCollected++
      addXP(reward.xp)
      addItem(animal.type + '_product', 1, { name: reward.product, type: 'animal product', sellPrice: reward.coins })
      createParticleEffect('harvest', { x: animal.x, y: 0.3, z: animal.z })
      showFloatingCoin(animal.x, animal.z, '+' + reward.coins)
      showFeedback('Collected ' + reward.product + '! +' + reward.coins + ' coins', '#ffd700')
      checkAchievements()
    }
  } else if (!animal.fed) {
    // Feed animal
    if (gameState.coins < def.feedCost) {
      showFeedback('Not enough coins to feed! (need ' + def.feedCost + ')', '#ff4444')
      return
    }
    if (!useEnergy(ENERGY_COST)) return
    const result = feedAnimal(animal)
    if (result) {
      gameState.animalsFed++
      gameState.coins -= result.feedCost
      showFeedback('Fed ' + def.name + '! -' + result.feedCost + ' coins', '#32cd32')
    }
  } else {
    // Waiting for product
    const elapsed = Date.now() - animal.lastFed
    const remaining = Math.max(0, def.harvestTime - elapsed)
    const secs = Math.ceil(remaining / 1000)
    showFeedback(def.name + ': ' + def.product + ' in ' + secs + 's', '#7df9ff')
  }
  updateHUD()
}

function handleBuildingInteract (building) {
  const def = BUILDING_DEFINITIONS[building.type]
  if (!def) return

  if (def.type === 'crafting') {
    openCraftingPanel(building)
  } else if (def.type === 'storage') {
    showFeedback(def.name + ': +' + (def.capacity || 0) + ' storage capacity', '#6495ed')
  } else {
    showFeedback(def.name + ': ' + (def.effect || 'Active'), '#dda0dd')
  }
}

// ── Crafting panel ───────────────────────────────────────────────────────────
function openCraftingPanel (building) {
  const def = BUILDING_DEFINITIONS[building.type]
  if (!def || !def.recipes) return

  activeCraftingBuilding = building

  const titleEl = document.getElementById('crafting-title')
  if (titleEl) titleEl.textContent = def.name + ' - Crafting'

  const recipesEl = document.getElementById('crafting-recipes')
  if (recipesEl) {
    recipesEl.innerHTML = ''
    def.recipes.forEach((recipe, idx) => {
      const card = document.createElement('div')
      card.className = 'craft-recipe-card'

      const hasInput = hasItem(recipe.input, recipe.inputQty)

      card.innerHTML = `
        <div class="craft-recipe-info">
          <div class="craft-recipe-name">${recipe.output.replace(/_/g, ' ')}</div>
          <div class="craft-recipe-detail">${recipe.inputQty}x ${recipe.input} -> ${recipe.outputQty}x ${recipe.output.replace(/_/g, ' ')}</div>
          <div class="craft-recipe-value">Sells for ${recipe.value} coins | ${Math.round(recipe.time / 1000)}s</div>
        </div>
        <button class="craft-btn" ${!hasInput ? 'disabled style="opacity:0.4"' : ''}>Craft</button>
      `

      const btn = card.querySelector('.craft-btn')
      if (btn && hasInput) {
        btn.addEventListener('click', () => {
          if (!removeItem(recipe.input, recipe.inputQty)) {
            showFeedback('Missing materials!', '#ff4444')
            return
          }
          startCrafting(building, idx)
          showFeedback('Crafting ' + recipe.output.replace(/_/g, ' ') + '...', '#daa520')
          openCraftingPanel(building) // refresh
        })
      }

      recipesEl.appendChild(card)
    })
  }

  // Render crafting queue
  renderCraftingQueue(building)

  if (craftingPanel) {
    craftingPanel.classList.add('visible')
  }
}

function renderCraftingQueue (building) {
  const queueEl = document.getElementById('crafting-queue')
  if (!queueEl) return

  if (!building.craftQueue || building.craftQueue.length === 0) {
    queueEl.innerHTML = '<div style="color:#666;font-size:12px;">No items in queue</div>'
    return
  }

  queueEl.innerHTML = ''
  for (const item of building.craftQueue) {
    const elapsed = Date.now() - item.startedAt
    const progress = Math.min(1, elapsed / item.recipe.time)
    const div = document.createElement('div')
    div.className = 'craft-queue-item'
    div.innerHTML = `
      <span>${item.recipe.output.replace(/_/g, ' ')}</span>
      <div class="craft-queue-progress"><div class="craft-queue-fill" style="width:${progress * 100}%"></div></div>
    `
    queueEl.appendChild(div)
  }
}

function closeCraftingPanel () {
  activeCraftingBuilding = null
  if (craftingPanel) craftingPanel.classList.remove('visible')
}

// ── Inventory panel ──────────────────────────────────────────────────────────
function toggleInventory () {
  if (!inventoryPanel) return
  if (inventoryPanel.classList.contains('visible')) {
    inventoryPanel.classList.remove('visible')
  } else {
    renderInventoryUI()
    inventoryPanel.classList.add('visible')
  }
}

function renderInventoryUI () {
  renderInventoryPanel(inventoryPanel, (itemId, qty) => {
    const result = sellItem(itemId, qty)
    if (result) {
      gameState.coins += result.coins
      gameState.totalCoinsEarned += result.coins
      gameState.itemsSold++
      QuestSystem.recordAction('sell', qty)
      QuestSystem.recordAction('earn', result.coins)
      showFeedback('Sold for ' + result.coins + ' coins!', '#ffd700')
      updateHUD()
      renderInventoryUI()
      checkAchievements()
    }
  })
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
function showTooltip (title, info, px, py, progress) {
  if (!tooltipEl) return
  tooltipTitle.textContent = title
  tooltipInfo.textContent = info
  tooltipEl.style.left = (px + 15) + 'px'
  tooltipEl.style.top = (py + 15) + 'px'
  tooltipEl.style.display = 'block'
  // progress: { pct: 0-100, label: string } or null
  if (progress) {
    tooltipProgressWrap.style.display = 'block'
    tooltipProgressBar.style.width = progress.pct + '%'
    // Color the bar: green when ready, yellow when close, blue for watered
    if (progress.pct >= 100) {
      tooltipProgressBar.style.background = 'linear-gradient(90deg, #ffd700, #ffeb3b)'
    } else if (progress.watered) {
      tooltipProgressBar.style.background = 'linear-gradient(90deg, #2196f3, #64b5f6)'
    } else {
      tooltipProgressBar.style.background = 'linear-gradient(90deg, #4caf50, #8bc34a)'
    }
    tooltipProgressLabel.textContent = progress.label
  } else {
    tooltipProgressWrap.style.display = 'none'
    tooltipProgressLabel.textContent = ''
  }
}

function hideTooltip () {
  if (tooltipEl) tooltipEl.style.display = 'none'
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
  gameState.totalPlowed++
  terrainData.setPlotState(plot.row, plot.col, terrainData.PLOT_STATES.PLOWED)
  showFeedback('Plowed! -' + PLOW_COST + ' coins', '#daa520')
  QuestSystem.recordAction('plow')
  checkAchievements()
  syncFarmStateNow()
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

  plot.crop = {
    type: seedKey,
    plantedAt: Date.now(),
    watered: false,
    stage: 0,
    withered: false,
    growthAccum: 0
  }

  const cropMesh = createCropMesh(seedKey, 0)
  cropMesh.position.set(plot.x, 0.08, plot.z)
  sceneData.scene.add(cropMesh)
  plot.cropMesh = cropMesh

  terrainData.setPlotState(plot.row, plot.col, terrainData.PLOT_STATES.PLANTED)
  gameState.totalPlanted++
  createParticleEffect('planting', { x: plot.x, y: 0.1, z: plot.z })
  showFeedback('Planted ' + cropDef.name + '! -' + cropDef.seedCost + ' coins', '#32cd32')
  QuestSystem.recordAction('plant')
  checkAchievements()
  syncFarmStateNow()
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
  gameState.totalWatered++
  terrainData.setPlotWatered(plot.row, plot.col, true)
  createParticleEffect('watering', { x: plot.x, y: 0.1, z: plot.z })
  showFeedback('Watered! Growth speed 2x', '#4169e1')
  QuestSystem.recordAction('water')
  checkAchievements()
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
  const cropType = plot.crop.type
  gameState.coins += cropDef.sellPrice
  gameState.totalCoinsEarned += cropDef.sellPrice
  gameState.totalHarvests++

  // Mastery: record harvest and get XP bonus
  const masteryResult = recordHarvest(cropType)
  const masteryBonus = masteryResult ? masteryResult.xpBonus : 0
  addXP(cropDef.xp + masteryBonus)

  // Collection: roll for rare drop (5% chance)
  const drop = rollForDrop(0.05)

  // Add harvested crop to inventory
  addItem(cropType, 1, { name: cropDef.name, type: 'crop', sellPrice: cropDef.sellPrice })

  // Quest tracking
  QuestSystem.recordAction('harvest', 1, { cropType })

  // Animate harvest pop, then remove mesh
  if (plot.cropMesh) {
    const meshRef = plot.cropMesh
    plot.cropMesh = null
    animateHarvestPop(meshRef, sceneData.scene, () => {
      sceneData.scene.remove(meshRef)
    })
  }
  plot.crop = null
  terrainData.setPlotState(plot.row, plot.col, terrainData.PLOT_STATES.PLOWED)

  // Particle burst + float-up text at harvest position
  createParticleEffect('harvest', { x: plot.x, y: 0.1, z: plot.z })
  createParticleEffect('coin', { x: plot.x, y: 0.3, z: plot.z })
  const sc = worldToScreen(new THREE.Vector3(plot.x, 0.08, plot.z))
  spawnFloatUp('+' + cropDef.sellPrice + ' 🪙', 'coins', sc.x, sc.y)
  spawnFloatUp('+' + (cropDef.xp + masteryBonus) + ' XP', 'xp', sc.x, sc.y + 25)

  let feedbackText = 'Harvested ' + cropDef.name + '! +' + cropDef.sellPrice + ' coins, +' + (cropDef.xp + masteryBonus) + ' XP'
  if (masteryBonus > 0) feedbackText += ' (+' + masteryBonus + ' mastery)'
  showFeedback(feedbackText, '#ffd700')

  if (cropDef.sellPrice > 50) {
    showToast('Harvested ' + cropDef.name, 'harvest', '+' + cropDef.sellPrice + ' coins · +' + cropDef.xp + ' XP')
  }

  checkAchievements()
  syncFarmStateNow()
}

function handleRemove (plot) {
  if (plot.state !== terrainData.PLOT_STATES.PLANTED || !plot.crop) {
    showFeedback('Nothing to remove!', '#ffa500')
    return
  }
  if (!useEnergy(ENERGY_COST)) return

  const cropDef = CROP_DEFINITIONS[plot.crop.type]
  const name = cropDef ? cropDef.name : 'crop'

  if (plot.cropMesh) {
    sceneData.scene.remove(plot.cropMesh)
    plot.cropMesh = null
  }
  plot.crop = null
  terrainData.setPlotState(plot.row, plot.col, terrainData.PLOT_STATES.PLOWED)
  showFeedback('Removed ' + name + ' (no refund)', '#ff6347')
}

// ── Quick bulk actions ───────────────────────────────────────────────────
function harvestAll () {
  if (!terrainData || !gameState.running) return
  const allPlots = terrainData.getAllPlots()
  let count = 0
  let totalCoins = 0
  for (const plot of allPlots) {
    if (plot.state !== terrainData.PLOT_STATES.PLANTED || !plot.crop || plot.crop.withered) continue
    const def = CROP_DEFINITIONS[plot.crop.type]
    if (!def || plot.crop.stage < def.stages - 1) continue
    if (!useEnergy(ENERGY_COST)) break  // stop if out of energy

    const harvestCropType = plot.crop.type
    gameState.coins += def.sellPrice
    gameState.totalCoinsEarned += def.sellPrice
    gameState.totalHarvests++
    totalCoins += def.sellPrice
    const masteryResult = recordHarvest(harvestCropType)
    const masteryBonus = masteryResult ? masteryResult.xpBonus : 0
    addXP(def.xp + masteryBonus)
    addItem(harvestCropType, 1, { name: def.name, type: 'crop', sellPrice: def.sellPrice })
    QuestSystem.recordAction('harvest', 1, { cropType: harvestCropType })
    if (plot.cropMesh) { sceneData.scene.remove(plot.cropMesh); plot.cropMesh = null }
    plot.crop = null
    terrainData.setPlotState(plot.row, plot.col, terrainData.PLOT_STATES.PLOWED)
    createParticleEffect('harvest', { x: plot.x, y: 0.1, z: plot.z })
    createParticleEffect('coin', { x: plot.x, y: 0.3, z: plot.z })
    count++
  }
  if (count > 0) {
    showFeedback('Harvested ' + count + ' crops! +' + totalCoins + ' coins', '#ffd700')
    checkAchievements()
    syncFarmStateNow()
    updateHUD()
  } else {
    showFeedback('No crops ready to harvest!', '#ffa500')
  }
}

function waterAll () {
  if (!terrainData || !gameState.running) return
  const allPlots = terrainData.getAllPlots()
  let count = 0
  for (const plot of allPlots) {
    if (plot.state !== terrainData.PLOT_STATES.PLANTED || !plot.crop || plot.crop.withered) continue
    const def = CROP_DEFINITIONS[plot.crop.type]
    if (!def || plot.crop.stage >= def.stages - 1) continue  // already mature, skip
    if (plot.crop.watered) continue
    if (!useEnergy(ENERGY_COST)) break  // stop if out of energy

    plot.crop.watered = true
    gameState.totalWatered++
    terrainData.setPlotWatered(plot.row, plot.col, true)
    createParticleEffect('watering', { x: plot.x, y: 0.1, z: plot.z })
    QuestSystem.recordAction('water')
    count++
  }
  if (count > 0) {
    showFeedback('Watered ' + count + ' crops!', '#4169e1')
    checkAchievements()
    updateHUD()
  } else {
    showFeedback('No unwatered crops!', '#ffa500')
  }
}

// ── Mouse tracking ───────────────────────────────────────────────────────────
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect()
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  mousePx.x = e.clientX
  mousePx.y = e.clientY

  // Update ghost mesh position during placement
  if (placementMode) {
    updateGhostPosition()
  }

  // Tooltip on hover over placed objects (when no tool/placement active)
  if (!placementMode && !gameState.selectedTool && gameState.running) {
    updateHoverTooltip()
  } else {
    hideTooltip()
  }
})

function updateHoverTooltip () {
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2(mouse.x, mouse.y)
  raycaster.setFromCamera(ndc, sceneData.camera)

  const allMeshes = []
  const objectMap = new Map()

  for (const tree of farmState.trees) {
    if (tree.mesh) {
      tree.mesh.traverse(child => {
        if (child.isMesh) { allMeshes.push(child); objectMap.set(child.id, { type: 'tree', data: tree }) }
      })
    }
  }
  for (const animal of farmState.animals) {
    if (animal.mesh) {
      animal.mesh.traverse(child => {
        if (child.isMesh) { allMeshes.push(child); objectMap.set(child.id, { type: 'animal', data: animal }) }
      })
    }
  }
  for (const building of farmState.buildings) {
    if (building.mesh) {
      building.mesh.traverse(child => {
        if (child.isMesh) { allMeshes.push(child); objectMap.set(child.id, { type: 'building', data: building }) }
      })
    }
  }

  const intersects = raycaster.intersectObjects(allMeshes, false)

  // If no placed objects hit, check if we're hovering a planted crop plot
  if (intersects.length === 0) {
    if (terrainData) {
      const plot = terrainData.getPlotFromRaycast(new THREE.Vector2(mouse.x, mouse.y), sceneData.camera)
      if (plot && plot.state === terrainData.PLOT_STATES.PLANTED && plot.crop && !plot.crop.withered) {
        _showCropTooltip(plot, mousePx.x, mousePx.y)
        return
      }
    }
    hideTooltip()
    return
  }

  const obj = objectMap.get(intersects[0].object.id)
  if (!obj) { hideTooltip(); return }

  let title = ''
  let info = ''
  switch (obj.type) {
    case 'tree': {
      const def = TREE_DEFINITIONS[obj.data.type]
      title = def ? def.name : obj.data.type
      info = isTreeReady(obj.data) ? 'Click to harvest!' : 'Growing...'
      break
    }
    case 'animal': {
      const def = ANIMAL_DEFINITIONS[obj.data.type]
      title = def ? def.name : obj.data.type
      if (obj.data.productReady) info = 'Click to collect ' + (def ? def.product : 'product') + '!'
      else if (obj.data.fed) info = 'Producing...'
      else info = 'Click to feed'
      break
    }
    case 'building': {
      const def = BUILDING_DEFINITIONS[obj.data.type]
      title = def ? def.name : obj.data.type
      info = def ? (def.type === 'crafting' ? 'Click to craft' : def.effect) : ''
      break
    }
  }
  showTooltip(title, info, mousePx.x, mousePx.y)
}

function _showCropTooltip (plot, px, py) {
  const crop = plot.crop
  const def = CROP_DEFINITIONS[crop.type]
  if (!def) { hideTooltip(); return }

  const maxStage = def.stages - 1
  const isMature = crop.stage >= maxStage

  let title = def.name
  let info = ''
  let progress = null

  if (isMature) {
    title = def.name + ' — Ready!'
    info = 'Click to harvest  +' + def.sellPrice + ' coins  +' + def.xp + ' XP'
    progress = { pct: 100, label: 'Stage ' + crop.stage + '/' + maxStage + ' — Ready to harvest!', watered: false }
  } else {
    const timePerStage = def.growTime / maxStage
    const stageProgress = Math.min((crop.growthAccum || 0) / timePerStage, 1)
    const overallPct = Math.round(((crop.stage + stageProgress) / maxStage) * 100)

    // Estimate time remaining
    const stagesLeft = maxStage - crop.stage
    const accumLeft = timePerStage - (crop.growthAccum || 0)
    const multiplier = crop.watered ? 2 : 1
    const msLeft = (accumLeft + (stagesLeft - 1) * timePerStage) / multiplier
    let timeLabel
    if (msLeft < 60000) {
      timeLabel = Math.ceil(msLeft / 1000) + 's'
    } else if (msLeft < 3600000) {
      timeLabel = Math.ceil(msLeft / 60000) + 'm'
    } else {
      timeLabel = (msLeft / 3600000).toFixed(1) + 'h'
    }

    const wateredNote = crop.watered ? '  · Watered (2x)' : '  · Water to speed up'
    info = 'Stage ' + crop.stage + '/' + maxStage + wateredNote
    const progressLabel = overallPct + '% grown  · ~' + timeLabel + ' remaining'
    progress = { pct: overallPct, label: progressLabel, watered: crop.watered }
  }

  showTooltip(title, info, px, py, progress)
}

// ── Mouse click -> raycast to plot or object ─────────────────────────────────
canvas.addEventListener('click', (e) => {
  if (!gameState.running || !terrainData) return

  const rect = canvas.getBoundingClientRect()
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

  // If in placement mode, confirm placement
  if (placementMode) {
    confirmPlacement()
    return
  }

  // If a tool is selected, try plot actions
  if (gameState.selectedTool) {
    const plot = terrainData.getPlotFromRaycast(mouse, sceneData.camera)
    handlePlotClick(plot)
    return
  }

  // Otherwise, try to interact with placed objects
  handleObjectClick(mousePx.x, mousePx.y)
})

// Right-click or ESC to deselect tool / cancel placement
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  if (placementMode) {
    cancelPlacement()
  } else {
    deselectTool()
  }
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (placementMode) cancelPlacement()
    else if (craftingPanel && craftingPanel.classList.contains('visible')) closeCraftingPanel()
    else if (inventoryPanel && inventoryPanel.classList.contains('visible')) inventoryPanel.classList.remove('visible')
    else if (masteryPanel && masteryPanel.classList.contains('visible')) closePanelIfOpen(masteryPanel)
    else if (collectionsPanel && collectionsPanel.classList.contains('visible')) closePanelIfOpen(collectionsPanel)
    else if (achievementsPanel && achievementsPanel.classList.contains('visible')) closePanelIfOpen(achievementsPanel)
    else if (expansionPanel && expansionPanel.classList.contains('visible')) closePanelIfOpen(expansionPanel)
    else deselectTool()
    return
  }

  // I key for inventory
  if (e.key === 'i' || e.key === 'I') {
    if (gameState.running) toggleInventory()
    return
  }

  // Phase 6: panel hotkeys
  if (e.key === 'm' || e.key === 'M') {
    if (gameState.running) openMasteryPanel()
    return
  }
  if (e.key === 'j' || e.key === 'J') {
    if (gameState.running) openCollectionsPanel()
    return
  }
  if (e.key === 'k' || e.key === 'K') {
    if (gameState.running) openAchievementsPanel()
    return
  }
  if (e.key === 'x' || e.key === 'X') {
    if (gameState.running) openExpansionPanel()
    return
  }

  // H key for Harvest All, W key for Water All
  if (e.key === 'h' || e.key === 'H') {
    if (gameState.running) harvestAll()
    return
  }
  if (e.key === 'w' || e.key === 'W') {
    if (gameState.running) waterAll()
    return
  }

  // Number keys for quick tool select
  const toolKeys = { '1': 'plow', '2': 'plant', '3': 'water', '4': 'harvest', '5': 'remove' }
  if (toolKeys[e.key] && gameState.running) {
    selectTool(toolKeys[e.key])
  }
})

// Inventory button
const harvestAllBtn = document.getElementById('harvest-all-btn')
const waterAllBtn = document.getElementById('water-all-btn')
const invBtn = document.getElementById('inventory-btn')
if (invBtn) {
  invBtn.addEventListener('click', () => {
    if (gameState.running) toggleInventory()
  })
}

// Inventory close button
const invCloseBtn = document.getElementById('inventory-close-btn')
if (invCloseBtn) {
  invCloseBtn.addEventListener('click', () => {
    if (inventoryPanel) inventoryPanel.classList.remove('visible')
  })
}

// Harvest All button
if (harvestAllBtn) {
  harvestAllBtn.addEventListener('click', () => harvestAll())
}

// Water All button
if (waterAllBtn) {
  waterAllBtn.addEventListener('click', () => waterAll())
}

// Quest button
const questBtn = document.getElementById('quest-btn')
if (questBtn) {
  questBtn.addEventListener('click', () => {
    if (gameState.running) QuestSystem.openPanel()
  })
}
const questCloseBtn = document.getElementById('quest-close-btn')
if (questCloseBtn) {
  questCloseBtn.addEventListener('click', () => QuestSystem.closePanel())
}

// Quest complete event — grant rewards
window.addEventListener('quest-complete', (e) => {
  const { quest, coins, xp, streak } = e.detail
  gameState.coins += coins
  addXP(xp)
  updateHUD()
  showToast(
    'Quest Complete: ' + quest.desc, 'quest',
    '+' + coins + ' coins · +' + xp + ' XP' + (streak > 1 ? ' · 🔥' + streak + ' streak' : '')
  )
})

// Crafting close button
const craftCloseBtn = document.getElementById('crafting-close-btn')
if (craftCloseBtn) {
  craftCloseBtn.addEventListener('click', () => {
    closeCraftingPanel()
  })
}

// ── Crop growth update ───────────────────────────────────────────────────────
function updateCrops (dtMs) {
  if (!terrainData) return

  // Apply building effects
  const effects = getBuildingEffects(farmState.buildings)
  const growthMul = effects.cropGrowthMultiplier

  const allPlots = terrainData.getAllPlots()
  for (const plot of allPlots) {
    if (!plot.crop || plot.state !== terrainData.PLOT_STATES.PLANTED) continue

    const stageChanged = updateCropGrowth(plot.crop, dtMs * growthMul)

    if (stageChanged) {
      if (plot.cropMesh) {
        sceneData.scene.remove(plot.cropMesh)
      }

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

// ── Ready-to-harvest pulse animation ────────────────────────────────────────
function animateReadyCrops (time) {
  if (!terrainData) return
  const allPlots = terrainData.getAllPlots()
  const glowOpacity = Math.sin(Date.now() * 0.004) * 0.5 + 0.5
  for (const plot of allPlots) {
    if (!plot.cropMesh) continue
    if (plot.crop && !plot.crop.withered && plot.cropMesh.userData.isReady) {
      // Gentle pulse: scale between 1.0 and 1.15 with a slow sine wave
      const pulse = 1.0 + 0.15 * Math.sin(time * 0.003 + plot.x * 1.7 + plot.z * 2.3)
      plot.cropMesh.scale.set(pulse, 1, pulse)
      // Pulse glow ring opacity
      plot.cropMesh.traverse(child => {
        if (child.userData.isGlowRing && child.material) {
          child.material.opacity = glowOpacity
        }
      })
    } else {
      // Reset scale for non-ready crops
      plot.cropMesh.scale.set(1, 1, 1)
    }
  }
}

// ── Tree growth update ───────────────────────────────────────────────────────
function updateTrees (dtMs) {
  const effects = getBuildingEffects(farmState.buildings)
  const growthMul = effects.treeGrowthMultiplier

  for (const tree of farmState.trees) {
    const changed = updateTreeGrowth(tree, dtMs * growthMul)
    if (changed && tree.mesh) {
      sceneData.scene.remove(tree.mesh)
      tree.mesh = createTreeMesh(tree.type, tree.mature, tree.growthScale)
      tree.mesh.position.set(tree.x, 0, tree.z)
      sceneData.scene.add(tree.mesh)
    }
  }
}

// ── Animal update ────────────────────────────────────────────────────────────
function updateAnimals (dtMs) {
  for (const animal of farmState.animals) {
    updateAnimalState(animal, dtMs)
  }
}

// ── Building crafting update ─────────────────────────────────────────────────
function updateBuildings (dtMs) {
  for (const building of farmState.buildings) {
    const completed = updateCraftingQueue(building, dtMs)
    for (const item of completed) {
      // Add crafted item to inventory
      const recipe = item.recipe
      addItem(recipe.output, recipe.outputQty, {
        name: recipe.output.replace(/_/g, ' '),
        type: 'crafted',
        sellPrice: recipe.value
      })
      gameState.coins += recipe.value
      gameState.totalCoinsEarned += recipe.value
      gameState.itemsCrafted++
      addXP(5)
      showFeedback('Crafted ' + recipe.output.replace(/_/g, ' ') + '! +' + recipe.value + ' coins', '#daa520')
      checkAchievements()
    }
  }

  // Refresh crafting panel if open
  if (activeCraftingBuilding && craftingPanel && craftingPanel.classList.contains('visible')) {
    renderCraftingQueue(activeCraftingBuilding)
  }
}

// ── P2P UI functions ────────────────────────────────────────────────────────
function updatePeerCountUI () {
  if (!peerCountEl) return
  const count = p2pState.peerCount
  peerCountEl.textContent = count + (count === 1 ? ' peer' : ' peers')
  peerCountEl.style.display = count > 0 ? 'block' : 'none'
}

function updateNeighborPanel () {
  if (!neighborPanel || !neighborList || !neighborCountEl) return

  const neighbors = p2pState.neighbors
  neighborCountEl.textContent = neighbors.length

  if (neighbors.length === 0) {
    neighborPanel.style.display = 'none'
    return
  }

  neighborPanel.style.display = 'flex'
  neighborList.innerHTML = ''

  for (const neighbor of neighbors) {
    const entry = document.createElement('div')
    entry.className = 'neighbor-entry'

    const nameEl = document.createElement('span')
    nameEl.className = 'neighbor-name'
    nameEl.textContent = neighbor.name || 'Unknown'
    entry.appendChild(nameEl)

    const visitBtn = document.createElement('button')
    visitBtn.className = 'neighbor-visit-btn'
    visitBtn.textContent = 'Visit'
    visitBtn.addEventListener('click', () => {
      visitNeighbor(neighbor)
    })
    entry.appendChild(visitBtn)

    neighborList.appendChild(entry)
  }
}

function visitNeighbor (neighbor) {
  // Find the rendered position for this neighbor
  const positions = NeighborRenderer.getRenderedNeighborPositions()
  const target = positions.find(p => p.key === neighbor.key)
  if (target) {
    window.PlayerController.setVisitingNeighbor(neighbor.key, neighbor.name)
  }
}

function appendChatMessageUI (from, message) {
  const messagesEl = document.getElementById('chat-messages')
  if (!messagesEl) return

  const div = document.createElement('div')
  div.className = 'msg'

  const nameSpan = document.createElement('span')
  nameSpan.style.color = from === gameState.farmName ? '#7df9ff' : '#4caf50'
  nameSpan.style.fontWeight = 'bold'
  nameSpan.textContent = from + ': '
  div.appendChild(nameSpan)

  div.appendChild(document.createTextNode(message))
  messagesEl.appendChild(div)
  messagesEl.scrollTop = messagesEl.scrollHeight
}

function updateVisitingUI () {
  const visitInfo = window.PlayerController.getVisitingInfo()

  if (visitInfo.visiting) {
    const pos = window.PlayerController.getPlayerPos()
    const neighborAt = NeighborRenderer.getNeighborAtPosition(pos.x)

    if (neighborAt) {
      const neighbor = p2pState.neighbors.find(n => n.key === neighborAt.key)
      if (neighbor) {
        window.PlayerController.setVisitingNeighbor(neighbor.key, neighbor.name)
      }
    }

    const name = visitInfo.neighborName || 'Neighbor'
    if (visitingIndicator) {
      visitingIndicator.style.display = 'flex'
      if (visitingText) visitingText.textContent = 'Visiting: ' + name
    }
    if (visitorToolbar) visitorToolbar.style.display = 'flex'
    if (toolbar) toolbar.style.display = 'none'
    canvas.style.cursor = 'pointer'
  } else {
    if (visitingIndicator) visitingIndicator.style.display = 'none'
    if (visitorToolbar) visitorToolbar.style.display = 'none'
    if (toolbar && gameState.running) toolbar.style.display = 'flex'
  }
}

// ── Farm state serialization for P2P sync ───────────────────────────────────
function serializeFarmState () {
  const plotData = []
  if (terrainData) {
    const allPlots = terrainData.getAllPlots()
    for (const plot of allPlots) {
      if (plot.state !== 'grass') {
        plotData.push({
          row: plot.row, col: plot.col,
          x: plot.x, z: plot.z,
          state: plot.state,
          crop: plot.crop ? {
            type: plot.crop.type, stage: plot.crop.stage,
            watered: plot.crop.watered, withered: plot.crop.withered
          } : null
        })
      }
    }
  }

  return {
    playerName: gameState.farmName,
    coins: gameState.coins,
    level: gameState.level,
    plots: plotData,
    trees: farmState.trees.map(t => ({
      type: t.type, x: t.x, z: t.z,
      growthScale: t.growthScale, mature: t.mature
    })),
    animals: farmState.animals.map(a => ({
      type: a.type, x: a.x, z: a.z,
      fed: a.fed, productReady: a.productReady
    })),
    buildings: farmState.buildings.map(b => ({
      type: b.type, x: b.x, z: b.z,
      wallColor: b.wallColor, roofColor: b.roofColor,
      width: b.width, height: b.height, depth: b.depth
    })),
    decorations: farmState.decorations.map(d => ({
      type: d.type, x: d.x, z: d.z, color: d.color
    }))
  }
}

function syncFarmState () {
  if (!window.IPCBridge || !window.IPCBridge.available || !p2pState.initialized) return

  const now = Date.now()
  if (now - p2pState.lastFarmSyncTime < p2pState.farmSyncInterval) return

  p2pState.lastFarmSyncTime = now
  window.IPCBridge.sendFarmUpdate(serializeFarmState())
}

function syncFarmStateNow () {
  if (!window.IPCBridge || !window.IPCBridge.available || !p2pState.initialized) return
  p2pState.lastFarmSyncTime = Date.now()
  window.IPCBridge.sendFarmUpdate(serializeFarmState())
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

  const clampedDt = Math.min(dt, 0.1)
  const dtMs = clampedDt * 1000

  // Update player movement
  window.PlayerController.updatePlayer(clampedDt)
  window.PlayerController.updateCamera(sceneData.camera)

  // Update systems
  updateCrops(dtMs)
  animateReadyCrops(time)
  updateTrees(dtMs)
  updateAnimals(dtMs)
  updateBuildings(dtMs)
  updateParticles(dtMs)

  // Energy regen
  regenEnergy(dtMs)

  // P2P: sync farm state periodically
  syncFarmState()

  // Auto-save
  autoSave(dtMs)

  // P2P: update visiting state UI
  updateVisitingUI()

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

  // Load saved game state (restores coins, xp, level, etc.)
  loadGame()
  QuestSystem.init()

  setupScreen.style.display = 'none'
  hud.style.display = 'block'
  chatPanel.style.display = 'flex'

  // Init player
  window.PlayerController.initPlayer(sceneData.scene)

  // Update HUD
  updateHUD()
  updateVehicleStatus()

  // Initialize P2P
  if (window.IPCBridge && window.IPCBridge.available) {
    window.IPCBridge.initP2P(name)
  }

  // Setup visiting mode callbacks
  window.PlayerController.onVisitChange((info) => {
    p2pState.visiting = info.visiting
    if (!info.visiting) {
      // Returned to own farm
      console.log('[app] Returned to own farm')
    }
  })

  console.log('[app] Game started - Farm:', name)
}

startBtn.addEventListener('click', startGame)
farmNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startGame()
  farmNameInput.style.borderColor = '#4caf50'
})

// Chat form - sends via P2P if available
document.getElementById('chat-form').addEventListener('submit', (e) => {
  e.preventDefault()
  const input = document.getElementById('chat-input')
  const msg = input.value.trim()
  if (!msg) return

  if (window.IPCBridge && window.IPCBridge.available && p2pState.initialized) {
    // Send via P2P worker (worker echoes back to us)
    window.IPCBridge.sendChatMessage(msg)
  } else {
    // Offline: just show locally
    appendChatMessageUI(gameState.farmName, msg)
  }
  input.value = ''
})

// Return home button
if (returnHomeBtn) {
  returnHomeBtn.addEventListener('click', () => {
    window.PlayerController.returnToFarm()
  })
}

// ESC also returns home when visiting
const origKeydown = window.addEventListener
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && window.PlayerController.isVisiting()) {
    window.PlayerController.returnToFarm()
  }
})

// ── Save/Load Persistence (localStorage) ────────────────────────────────────
const SAVE_KEY = 'p2p-farmville-save'
const SAVE_INTERVAL = 15000 // auto-save every 15s
let lastSaveTime = 0

function saveGame () {
  try {
    const plotData = []
    if (terrainData) {
      const allPlots = terrainData.getAllPlots()
      for (const plot of allPlots) {
        if (plot.state !== 'grass') {
          plotData.push({
            row: plot.row, col: plot.col,
            x: plot.x, z: plot.z,
            state: plot.state,
            crop: plot.crop ? {
              type: plot.crop.type, stage: plot.crop.stage,
              watered: plot.crop.watered, withered: plot.crop.withered,
              plantedAt: plot.crop.plantedAt, growthAccum: plot.crop.growthAccum
            } : null
          })
        }
      }
    }

    const saveData = {
      version: 2,
      timestamp: Date.now(),
      gameState: {
        coins: gameState.coins,
        totalXp: gameState.totalXp,
        level: gameState.level,
        energy: gameState.energy,
        maxEnergy: gameState.maxEnergy,
        farmName: gameState.farmName,
        totalHarvests: gameState.totalHarvests,
        totalPlanted: gameState.totalPlanted,
        totalPlowed: gameState.totalPlowed,
        totalWatered: gameState.totalWatered,
        totalCoinsEarned: gameState.totalCoinsEarned,
        itemsSold: gameState.itemsSold,
        itemsCrafted: gameState.itemsCrafted,
        sessionsPlayed: gameState.sessionsPlayed,
        giftsSent: gameState.giftsSent,
        tradesCompleted: gameState.tradesCompleted,
        chatMessages: gameState.chatMessages,
        coopCompleted: gameState.coopCompleted,
        farmsVisited: gameState.farmsVisited,
        animalsFed: gameState.animalsFed,
        animalProductsCollected: gameState.animalProductsCollected
      },
      farmState: {
        ownedVehicles: farmState.ownedVehicles,
        trees: farmState.trees.map(t => ({
          type: t.type, x: t.x, z: t.z,
          growthScale: t.growthScale, mature: t.mature,
          plantedAt: t.plantedAt, lastHarvest: t.lastHarvest
        })),
        animals: farmState.animals.map(a => ({
          type: a.type, x: a.x, z: a.z,
          fed: a.fed, productReady: a.productReady,
          lastFed: a.lastFed, fedAt: a.fedAt
        })),
        buildings: farmState.buildings.map(b => ({
          type: b.type, x: b.x, z: b.z,
          wallColor: b.wallColor, roofColor: b.roofColor,
          width: b.width, height: b.height, depth: b.depth,
          craftQueue: b.craftQueue
        })),
        decorations: farmState.decorations.map(d => ({
          type: d.type, x: d.x, z: d.z, color: d.color
        }))
      },
      plotData: plotData,
      inventory: getInventory(),
      mastery: getMasteryData(),
      collections: getCollectionData(),
      achievements: getAchievementState(),
      expansion: {
        tier: getCurrentTier()
      }
    }

    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData))
    console.log('[save] Game saved', new Date().toLocaleTimeString())
  } catch (e) {
    console.error('[save] Save error:', e)
  }
}

function loadGame () {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return false

    const saveData = JSON.parse(raw)
    if (!saveData) return false

    // Migrate old saves: ensure version field is present
    if (!saveData.version || saveData.version < 2) {
      console.warn('[save] Migrating save from version', saveData.version ?? 'unknown', '→ 2')
      saveData.version = 2
    }

    const gs = saveData.gameState
    if (gs) {
      gameState.coins = gs.coins ?? 500
      gameState.totalXp = gs.totalXp ?? 0
      gameState.level = gs.level ?? 1
      gameState.energy = gs.energy ?? 30
      gameState.maxEnergy = gs.maxEnergy ?? 30
      gameState.farmName = gs.farmName ?? ''
      gameState.totalHarvests = gs.totalHarvests ?? 0
      gameState.totalPlanted = gs.totalPlanted ?? 0
      gameState.totalPlowed = gs.totalPlowed ?? 0
      gameState.totalWatered = gs.totalWatered ?? 0
      gameState.totalCoinsEarned = gs.totalCoinsEarned ?? 0
      gameState.itemsSold = gs.itemsSold ?? 0
      gameState.itemsCrafted = gs.itemsCrafted ?? 0
      gameState.sessionsPlayed = (gs.sessionsPlayed ?? 0) + 1
      gameState.giftsSent = gs.giftsSent ?? 0
      gameState.tradesCompleted = gs.tradesCompleted ?? 0
      gameState.chatMessages = gs.chatMessages ?? 0
      gameState.coopCompleted = gs.coopCompleted ?? 0
      gameState.farmsVisited = gs.farmsVisited ?? 0
      gameState.animalsFed = gs.animalsFed ?? 0
      gameState.animalProductsCollected = gs.animalProductsCollected ?? 0
    }

    // Restore farm name to input
    if (gameState.farmName && farmNameInput) {
      farmNameInput.value = gameState.farmName
    }

    // ── Restore plot data (tilled soil + crops) ───────────────────────────────
    if (saveData.plotData && terrainData) {
      for (const pd of saveData.plotData) {
        const plot = terrainData.getPlotAt(pd.row, pd.col)
        if (!plot) continue
        if (pd.state !== 'grass') {
          terrainData.setPlotState(plot, pd.state)
        }
        if (pd.crop) {
          const cropMesh = createCropMesh(pd.crop.type, pd.crop.stage)
          cropMesh.position.set(pd.x, 0.02, pd.z)
          sceneData.scene.add(cropMesh)
          plot.crop = {
            type: pd.crop.type,
            stage: pd.crop.stage,
            watered: pd.crop.watered,
            withered: pd.crop.withered || false,
            plantedAt: pd.crop.plantedAt,
            growthAccum: pd.crop.growthAccum || 0,
            mesh: cropMesh
          }
          plot.cropMesh = cropMesh
          // Restore watered soil colour
          if (pd.crop.watered) {
            terrainData.setPlotWatered(plot.row, plot.col, true)
          }
        }
      }
    }

    // ── Restore trees ─────────────────────────────────────────────────────────
    if (saveData.farmState?.trees) {
      for (const t of saveData.farmState.trees) {
        const data = createTreeData(t.type, t.x, t.z)
        const mesh = createTreeMesh(t.type, t.mature, t.growthScale || 0)
        mesh.position.set(t.x, 0, t.z)
        sceneData.scene.add(mesh)
        data.mesh = mesh
        data.growthScale = t.growthScale || 0
        data.mature = t.mature || false
        data.plantedAt = t.plantedAt || Date.now()
        data.lastHarvest = t.lastHarvest || 0
        farmState.trees.push(data)
      }
    }

    // ── Restore animals ───────────────────────────────────────────────────────
    if (saveData.farmState?.animals) {
      for (const a of saveData.farmState.animals) {
        const data = createAnimalData(a.type, a.x, a.z)
        const mesh = createAnimalMesh(a.type)
        mesh.position.set(a.x, 0, a.z)
        sceneData.scene.add(mesh)
        data.mesh = mesh
        data.fed = a.fed || false
        data.productReady = a.productReady || false
        data.lastFed = a.lastFed || 0
        data.fedAt = a.fedAt || 0
        farmState.animals.push(data)
      }
    }

    // ── Restore buildings ─────────────────────────────────────────────────────
    if (saveData.farmState?.buildings) {
      for (const b of saveData.farmState.buildings) {
        const data = createBuildingData(b.type, b.x, b.z)
        const mesh = createBuildingMesh(b.type)
        mesh.position.set(b.x, 0, b.z)
        sceneData.scene.add(mesh)
        data.mesh = mesh
        data.craftQueue = b.craftQueue || []
        farmState.buildings.push(data)
      }
      const effects = getBuildingEffects(farmState.buildings)
      setCapacityBonus(effects.storageBonus)
    }

    // ── Restore decorations ───────────────────────────────────────────────────
    if (saveData.farmState?.decorations) {
      for (const d of saveData.farmState.decorations) {
        const data = createDecoData(d.type, d.x, d.z)
        const mesh = createDecoMesh(d.type)
        mesh.position.set(d.x, 0, d.z)
        sceneData.scene.add(mesh)
        data.mesh = mesh
        data.color = d.color
        farmState.decorations.push(data)
      }
    }

    // ── Restore inventory ─────────────────────────────────────────────────────
    if (saveData.inventory) {
      for (const item of saveData.inventory) {
        addItem(item.id, item.quantity, item.meta || {})
      }
    }

    console.log('[save] Game loaded, session #' + gameState.sessionsPlayed)
    return true
  } catch (e) {
    console.error('[save] Load error:', e)
    return false
  }
}

function deleteSave () {
  localStorage.removeItem(SAVE_KEY)
  console.log('[save] Save deleted')
}
window.deleteSave = deleteSave

function autoSave (dtMs) {
  lastSaveTime += dtMs
  if (lastSaveTime >= SAVE_INTERVAL) {
    lastSaveTime = 0
    saveGame()
  }
}

// Save before unload
window.addEventListener('beforeunload', () => {
  if (gameState.running) saveGame()
})

// Trigger immediate farm sync after crop actions
function hookFarmSync (fn) {
  return function (...args) {
    const result = fn.apply(this, args)
    syncFarmStateNow()
    return result
  }
}

// Kick off render loop
console.log('[app] starting game loop via requestAnimationFrame')
requestAnimationFrame(gameLoop)
