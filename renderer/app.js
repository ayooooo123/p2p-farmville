import * as THREE from './js/three.module.min.js'
import { initScene, animate as renderScene, initCameraControls, updateCamera, resetCamera, getBorderTrees } from './js/scene.js'
import { CROP_DEFINITIONS, createCropMesh, createWitheredMesh, updateCropGrowth, animateHarvestPop } from './js/crops.js'
import { initMarket, showMarket, hideMarket, getSelectedSeed, clearSelectedSeed, setSelectedSeed, updateSeedStrip, loadPinnedSeeds, pinSeedToSlot, getPinnedSeeds, renderSeedHotbar, CONSUMABLE_DEFINITIONS } from './js/market.js'
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
import { initParticles, createParticleEffect, createFootstepDust, updateParticles } from './js/particles.js'
import { FarmActions } from './js/farm-actions.js'
import { showToast } from './js/toasts.js'
import { QuestSystem } from './js/quests.js'
import { openAlmanac, closeAlmanac, isAlmanacOpen } from './js/almanac.js'
import { SoundSystem } from './js/sounds.js'
import { initWeather, updateWeather, getCurrentWeather, getWeatherIcon, getWeatherName, onWeatherChange } from './js/weather.js'
import { initDayNight, updateDayNight, getGameClockString, getPhaseIcon, getTimeOfDay } from './js/daynight.js'
import { createOverlayEpochTracker, markOverlaySeen, sweepStaleOverlays } from './js/overlay-epochs.js'
import { formatTimeRemaining, getTimedProgress } from './js/time-progress.js'

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

const SAVE_KEY = 'p2p-farmville-save'

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
  lastUsedSeed: null,   // auto-equip: re-select this seed when plant tool activates
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
let placementHighlightMesh = null // glowing ring shown under ghost during placement
let activeCraftingBuilding = null

// ── Drag-to-multi-action state ───────────────────────────────────────────────
let isDragBulk = false          // suppress per-plot feedback during drag
let dragTool = null             // which tool is being dragged
let dragVisited = new Set()     // 'row,col' keys of plots acted on this drag
let dragDidMove = false         // true once mouse moved to a second plot

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
const seasonDisplay = document.getElementById('season-display')
const energyBarFill = document.getElementById('energy-bar-fill')
const xpBarFill = document.getElementById('xp-bar-fill')
const toolbar = document.getElementById('toolbar')
const gameContainer = document.getElementById('game-container')
const seedStrip = document.getElementById('seed-strip')
const seedHotbar = document.getElementById('seed-hotbar')
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
const _pointerRaycaster = new THREE.Raycaster()
const _pointerNDC = new THREE.Vector2()
const _pointerGroundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _pointerGroundIntersection = new THREE.Vector3()

function _setPointerRayFromMouse () {
  _pointerNDC.set(mouse.x, mouse.y)
  _pointerRaycaster.setFromCamera(_pointerNDC, sceneData.camera)
  return _pointerRaycaster
}

// ── HUD height tracking — keeps canvas below toolbar so farm isn't occluded ──
function _updateHudHeight () {
  const h = hud ? hud.getBoundingClientRect().height : 0
  document.documentElement.style.setProperty('--hud-h', h + 'px')
}
// Observe HUD for size changes (seed strip toggling changes its height)
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(_updateHudHeight).observe(hud || document.body)
}
// Also recompute on window resize
window.addEventListener('resize', _updateHudHeight)

// ── Initialize Three.js scene ────────────────────────────────────────────────
sceneData = initScene(canvas)
terrainData = sceneData.terrainData
initParticles(sceneData.scene)
initCameraControls(canvas)

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
  const raw = localStorage.getItem(SAVE_KEY)
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
  if (typeof window.IPCBridge.onVisitorFarmAction === 'function') {
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
  }

  if (typeof window.IPCBridge.onFarmActionResult === 'function') {
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
  }
} else {
  console.warn('[app] IPC bridge not available - running without worker')
}

// ── Initialize NeighborRenderer ─────────────────────────────────────────────
NeighborRenderer.init(sceneData.scene)

// ── Weather HUD + Rain auto-water ─────────────────────────────────────────────
const weatherDisplay = document.getElementById('weather-display')
const timeDisplay = document.getElementById('time-display')

function _updateWeatherHUD () {
  if (!weatherDisplay) return
  const icon = getWeatherIcon()
  const name = getWeatherName()
  weatherDisplay.textContent = icon + ' ' + name
}

function _updateTimeHUD () {
  if (!timeDisplay) return
  timeDisplay.textContent = getPhaseIcon() + ' ' + getGameClockString()
}

function rainAutoWaterCrops () {
  if (!terrainData || !gameState.running) return
  const allPlots = terrainData.getAllPlots()
  let count = 0
  for (const plot of allPlots) {
    if (plot.state !== terrainData.PLOT_STATES.PLANTED || !plot.crop || plot.crop.withered || plot.crop.watered) continue
    terrainData.setPlotWatered(plot.row, plot.col, true)
    count++
  }
  if (count > 0) {
    showToast('Rain watered ' + count + ' crop' + (count === 1 ? '' : 's') + '!', 'water', 'Growth speed doubled! 💧')
    SoundSystem.play('water')
    QuestSystem.recordAction('water', count)
  }
}

// ── Season system ─────────────────────────────────────────────────────────────
// Seasons cycle based on real-world week-of-year: 13 weeks each (spring/summer/autumn/winter)
// Using a repeating 52-week cycle so it feels alive without requiring a save field.
const SEASON_INFO = {
  spring: { icon: '🌸', label: 'Spring', weekStart: 0  },
  summer: { icon: '☀️', label: 'Summer', weekStart: 13 },
  autumn: { icon: '🍂', label: 'Autumn', weekStart: 26 },
  winter: { icon: '❄️', label: 'Winter', weekStart: 39 }
}

function getSeasonFromDate () {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const weekOfYear = Math.floor((now - startOfYear) / (7 * 24 * 60 * 60 * 1000))
  const w = weekOfYear % 52
  if (w < 13) return 'spring'
  if (w < 26) return 'summer'
  if (w < 39) return 'autumn'
  return 'winter'
}

let _lastSeasonCheck = 0

function updateSeasonIfChanged () {
  const now = Date.now()
  if (now - _lastSeasonCheck < 60000) return  // check at most once per minute
  _lastSeasonCheck = now

  const season = getSeasonFromDate()
  if (terrainData && terrainData.getCurrentSeason() !== season) {
    terrainData.setSeasonColors(season)
    SceneManager.setBorderTreeSeasonColors(season)
    TreeSystem.setFarmTreeSeasonColors(gameState.trees || [], season)
    showToast(SEASON_INFO[season].label + ' has arrived!', 'level',
      season === 'spring' ? 'Flowers bloom across the farm' :
      season === 'summer' ? 'Long sunny days ahead' :
      season === 'autumn' ? 'Harvest time — leaves turn golden' :
      'A blanket of frost settles on the fields')
  }

  // Update season HUD
  if (seasonDisplay) {
    const info = SEASON_INFO[season] || SEASON_INFO.summer
    seasonDisplay.textContent = info.icon + ' ' + info.label
  }
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

  // XP bar fill
  const xpPct = xpNeeded > 0 ? Math.min(100, (xpInLevel / xpNeeded) * 100) : 100
  if (xpBarFill) xpBarFill.style.width = xpPct + '%'

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
    let plowedCount = 0
    let grassCount = 0
    for (const p of allPlots) {
      if (p.state === terrainData.PLOT_STATES.GRASS) grassCount++
      if (p.state === terrainData.PLOT_STATES.PLOWED) plowedCount++
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
    const hungryCount = farmState.animals.filter(a => !a.fed && !a.productReady).length
    if (feedAllBtn) {
      feedAllBtn.style.display = hungryCount > 0 ? '' : 'none'
      if (hungryCount > 0) {
        const label = feedAllBtn.querySelector('.tool-label')
        if (label) label.textContent = 'Feed (' + hungryCount + ')'
      }
    }
    // Plant All: show when there are plowed plots and a seed is selected
    const activeSeed = gameState.selectedSeed || getSelectedSeed()
    if (plantAllBtn) {
      const showPlantAll = plowedCount > 0 && !!activeSeed
      plantAllBtn.style.display = showPlantAll ? '' : 'none'
      if (showPlantAll) {
        const label = plantAllBtn.querySelector('.tool-label')
        if (label) label.textContent = 'Plant (' + plowedCount + ')'
      }
    }
    // Plow All: show when there are unplowed grass plots and enough coins
    if (plowAllBtn) {
      const showPlowAll = grassCount > 0 && gameState.coins >= PLOW_COST
      plowAllBtn.style.display = showPlowAll ? '' : 'none'
      if (showPlowAll) {
        const label = plowAllBtn.querySelector('.tool-label')
        if (label) label.textContent = 'Plow (' + grassCount + ')'
      }
    }
  }
}

// ── Tool system ──────────────────────────────────────────────────────────────
function refreshHotbar () {
  renderSeedHotbar(seedHotbar, (cropKey) => {
    gameState.selectedSeed = cropKey
    setSelectedSeed(cropKey)
    selectTool('plant')
  })
}

function selectTool (toolName) {
  cancelPlacement()
  gameState.selectedTool = toolName

  toolbar.querySelectorAll('.tool-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === toolName)
  })

  if (toolName === 'plant') {
    seedStrip.style.display = 'flex'
    // Auto-equip last used seed before rendering strip so it highlights correctly
    if (!gameState.selectedSeed && gameState.lastUsedSeed) {
      gameState.selectedSeed = gameState.lastUsedSeed
      setSelectedSeed(gameState.lastUsedSeed)
    }
    updateSeedStrip(gameState.level, seedStrip, (seedKey) => {
      gameState.selectedSeed = seedKey
      refreshHotbar()
    })
    // Right-click a strip seed to pin it to the hotbar
    seedStrip.querySelectorAll('.seed-strip-btn').forEach(btn => {
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        const cropKey = btn.dataset.cropKey
        const slots = getPinnedSeeds()
        const emptyIdx = slots.indexOf(null)
        const slotIdx = emptyIdx !== -1 ? emptyIdx : 0
        pinSeedToSlot(slotIdx, cropKey)
        refreshHotbar()
        showFeedback('Pinned to slot ' + (slotIdx + 1), '#ffd700')
      })
    })
  } else {
    seedStrip.style.display = 'none'
  }
  refreshHotbar()

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
  if (terrainData) terrainData.clearHoverHighlight()
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
/**
 * Returns the effective energy cost for an action, factoring in owned vehicles.
 * Tractor (action_speed_3x): plow/water/remove cost 0 energy.
 * Seeder  (plant_speed_3x):  plant cost 0 energy.
 * Harvester (harvest_speed_3x): harvest cost 0 energy.
 */
function effectiveEnergyCost (action, baseCost) {
  const owned = farmState.ownedVehicles
  const vmul = getVehicleSpeedMultiplier(owned, action)
  // A vehicle with speedMultiplier >= 3 makes that action free
  return vmul >= 3 ? 0 : baseCost
}

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
  SoundSystem.play('levelup')
  levelUpDetail.textContent = 'You reached Level ' + level + '!'
  levelUpNotif.style.display = 'flex'
  levelUpNotif.classList.add('show')

  // Flash the XP bar gold on level-up, then reset to 0%
  if (xpBarFill) {
    xpBarFill.classList.add('level-up-flash')
    setTimeout(() => {
      xpBarFill.classList.remove('level-up-flash')
      xpBarFill.style.width = '0%'
    }, 650)
  }

  // Burst level-up particles at farm center
  createParticleEffect('levelup', { x: 0, y: 0.5, z: 0 })
  createParticleEffect('levelup', { x: -3, y: 0.5, z: -3 })
  createParticleEffect('levelup', { x: 3, y: 0.5, z: 3 })

  showToast('Level Up! You are now level ' + level, 'level', 'New crops and items unlocked!')

  setTimeout(() => {
    levelUpNotif.classList.remove('show')
    setTimeout(() => { levelUpNotif.style.display = 'none' }, 500)
  }, 3000)
}

// ── Action feedback ──────────────────────────────────────────────────────────
function showFeedback (text, color) {
  if (isDragBulk) return
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
const _worldToScreenVec = new THREE.Vector3()
const _worldToScreenResult = { x: 0, y: 0 }

function worldToScreenCoords (worldX, worldY, worldZ, out = _worldToScreenResult, rect = null) {
  if (!sceneData || !sceneData.camera) {
    out.x = 0
    out.y = 0
    return out
  }

  _worldToScreenVec.set(worldX, worldY, worldZ).project(sceneData.camera)
  const bounds = rect || canvas.getBoundingClientRect()
  out.x = (_worldToScreenVec.x * 0.5 + 0.5) * bounds.width + bounds.left
  out.y = (-_worldToScreenVec.y * 0.5 + 0.5) * bounds.height + bounds.top
  return out
}

function showFloatingCoin (worldX, worldZ, text) {
  if (!gameContainer) return

  const canvasRect = canvas.getBoundingClientRect()
  const screenPos = worldToScreenCoords(worldX, 0.5, worldZ, _worldToScreenResult, canvasRect)

  const el = document.createElement('div')
  el.className = 'floating-coin'
  el.textContent = text
  el.style.left = (screenPos.x - canvasRect.left) + 'px'
  el.style.top = (screenPos.y - canvasRect.top) + 'px'
  gameContainer.appendChild(el)

  // Remove after animation completes
  setTimeout(() => { el.remove() }, 1200)
}

// ── Float-up DOM text (coins / XP) ───────────────────────────────────────────
function worldToScreen (worldPos, out = _worldToScreenResult, rect = null) {
  return worldToScreenCoords(worldPos.x, worldPos.y, worldPos.z, out, rect)
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

// ── Chat panel toggle ────────────────────────────────────────────────────────
function toggleChat () {
  const minimized = chatPanel.classList.toggle('minimized')
  localStorage.setItem('farmville-chat-minimized', minimized ? '1' : '0')
  const btn = document.getElementById('chat-toggle-btn')
  if (btn) btn.textContent = minimized ? '▲' : '▼'
}

document.getElementById('chat-header').addEventListener('click', () => {
  if (gameState.running) toggleChat()
})

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
  const descriptions = farmState.ownedVehicles.map(v => {
    const def = VEHICLE_DEFINITIONS[v]
    if (!def) return v
    if (def.effect === 'action_speed_3x')   return def.name + ' (plow/water free)'
    if (def.effect === 'plant_speed_3x')    return def.name + ' (plant free)'
    if (def.effect === 'harvest_speed_3x')  return def.name + ' (harvest free)'
    return def.name
  })
  vehicleStatusEl.textContent = '🚜 ' + descriptions.join(' · ')
  vehicleStatusEl.style.display = 'block'
}

// ── Market buy handler ───────────────────────────────────────────────────────
function handleMarketBuy ({ category, key, def }) {
  if (gameState.coins < def.cost) {
    showFeedback('Not enough coins! (need ' + def.cost + ')', '#ff4444')
    SoundSystem.play('error')
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
    SoundSystem.play('buy')
    showFeedback('Bought ' + def.name + '!', '#32cd32')
    hideMarket()
    updateHUD()
    return
  }

  if (category === 'consumable') {
    gameState.coins -= def.cost
    addItem(key, 1, {
      name: def.name,
      type: 'consumable',
      sellPrice: def.sellPrice || 0,
      usable: true,
      useEffect: def.useEffect
    })
    SoundSystem.play('buy')
    showFeedback('Bought ' + def.name + '!', '#5bc8f5')
    showToast(def.name, 'harvest', 'Added to inventory — use it from your pack!')
    updateHUD()
    return
  }

  // Trees, Animals, Buildings, Decorations -> enter placement mode
  SoundSystem.play('buy')
  enterPlacementMode(category, key, def)
  hideMarket()
}

// ── Placement mode ──────────────────────────────────────────────��────────────
function enterPlacementMode (category, key, def) {
  cancelPlacement()
  deselectTool()

  let ghostMesh
  let ghostSeed = null
  switch (category) {
    case 'tree': ghostMesh = createTreeMesh(key, false, 1); break
    case 'animal': ghostMesh = createAnimalMesh(key); break
    case 'building': ghostMesh = createBuildingMesh(key); break
    case 'decoration': ghostMesh = createDecoMesh(key); break
  }

  if (ghostMesh) {
    _stylePlacementGhost(ghostMesh)
    ghostMesh.position.set(0, 0, 0)
    sceneData.scene.add(ghostMesh)
  }

  placementMode = { category, key, def, ghostMesh, ghostSeed }

  // Create placement highlight ring — glowing disc beneath ghost
  if (placementHighlightMesh) sceneData.scene.remove(placementHighlightMesh)
  const hlRingGeo = new THREE.RingGeometry(1.0, 1.6, 32)
  const hlRingMat = new THREE.MeshBasicMaterial({
    color: 0x44ff88,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false
  })
  placementHighlightMesh = new THREE.Mesh(hlRingGeo, hlRingMat)
  placementHighlightMesh.rotation.x = -Math.PI / 2
  placementHighlightMesh.position.set(0, 0.05, 0)
  sceneData.scene.add(placementHighlightMesh)

  if (placementIndicator) placementIndicator.style.display = 'flex'
  if (placementText) placementText.textContent = 'Placing: ' + def.name

  canvas.style.cursor = 'crosshair'
  canvas.style.pointerEvents = 'auto'
}

function _stylePlacementGhost (ghostMesh) {
  ghostMesh.traverse(child => {
    if (child.isMesh) {
      child.material = child.material.clone()
      child.material.transparent = true
      child.material.opacity = 0.5
    }
  })
}

function cancelPlacement () {
  if (!placementMode) return

  if (placementMode.ghostMesh) {
    sceneData.scene.remove(placementMode.ghostMesh)
  }

  if (placementHighlightMesh) {
    sceneData.scene.remove(placementHighlightMesh)
    placementHighlightMesh = null
  }

  placementMode = null

  if (placementIndicator) placementIndicator.style.display = 'none'
  canvas.style.cursor = 'default'
  canvas.style.pointerEvents = 'none'
}

function updateGhostPosition () {
  if (!placementMode || !placementMode.ghostMesh) return

  // Raycast to ground plane (y=0) without allocating new pointer helpers each frame.
  const raycaster = _setPointerRayFromMouse()
  const intersection = raycaster.ray.intersectPlane(_pointerGroundPlane, _pointerGroundIntersection)

  if (intersection) {
    // Snap to grid (2-unit grid)
    const snappedX = Math.round(intersection.x / 2) * 2
    const snappedZ = Math.round(intersection.z / 2) * 2

    if (placementMode.category === 'decoration') {
      const nextSeed = createDecoData(placementMode.key, snappedX, snappedZ).variantSeed
      if (placementMode.ghostSeed !== nextSeed) {
        const nextGhostMesh = createDecoMesh(placementMode.key, nextSeed)
        _stylePlacementGhost(nextGhostMesh)
        nextGhostMesh.position.set(snappedX, 0, snappedZ)
        sceneData.scene.remove(placementMode.ghostMesh)
        sceneData.scene.add(nextGhostMesh)
        placementMode.ghostMesh = nextGhostMesh
        placementMode.ghostSeed = nextSeed
      }
    }

    placementMode.ghostMesh.position.set(snappedX, 0, snappedZ)
    // Keep highlight ring aligned beneath ghost
    if (placementHighlightMesh) {
      placementHighlightMesh.position.set(snappedX, 0.05, snappedZ)
    }
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
      // Apply correct window glow for current time of day immediately
      applyWindowGlow()
      // Update building effects
      const effects = getBuildingEffects(farmState.buildings)
      setCapacityBonus(effects.storageBonus)
      addXP(10)
      break
    }
    case 'decoration': {
      const data = createDecoData(key, x, z, placementMode.ghostSeed)
      const mesh = createDecoMesh(key, data.variantSeed)
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

  // Clear placement mode + highlight ring
  if (placementHighlightMesh) {
    sceneData.scene.remove(placementHighlightMesh)
    placementHighlightMesh = null
  }
  placementMode = null
  if (placementIndicator) placementIndicator.style.display = 'none'
  canvas.style.cursor = 'default'
  updateHUD()
}

// ── Object interaction ───────────────────────────────────────────────────────
const _placedObjectRaycastCache = {
  signature: '',
  allMeshes: [],
  objectMap: new Map()
}

function appendPlacedObjectMeshes (placedObject, type, allMeshes, objectMap) {
  if (!placedObject.mesh) return

  const cachedMeshes = placedObject.mesh.userData.interactiveMeshes
  if (Array.isArray(cachedMeshes) && cachedMeshes.length > 0) {
    for (const child of cachedMeshes) {
      if (!child?.isMesh) continue
      allMeshes.push(child)
      objectMap.set(child.id, { type, data: placedObject })
    }
    return
  }

  // Fallback for legacy meshes created before interactive refs were cached.
  placedObject.mesh.traverse(child => {
    if (!child.isMesh) return
    allMeshes.push(child)
    objectMap.set(child.id, { type, data: placedObject })
  })
}

function _getPlacedObjectMeshSignature (placedObjects) {
  return placedObjects.map((placedObject) => {
    const mesh = placedObject.mesh
    if (!mesh) return 'none'
    const interactiveMeshes = mesh.userData.interactiveMeshes
    const interactiveCount = Array.isArray(interactiveMeshes) ? interactiveMeshes.length : -1
    return mesh.uuid + ':' + interactiveCount
  }).join(',')
}

function getPlacedObjectRaycastData () {
  const signature = [
    _getPlacedObjectMeshSignature(farmState.trees),
    _getPlacedObjectMeshSignature(farmState.animals),
    _getPlacedObjectMeshSignature(farmState.buildings)
  ].join('|')

  if (signature !== _placedObjectRaycastCache.signature) {
    const allMeshes = []
    const objectMap = new Map()

    for (const tree of farmState.trees) appendPlacedObjectMeshes(tree, 'tree', allMeshes, objectMap)
    for (const animal of farmState.animals) appendPlacedObjectMeshes(animal, 'animal', allMeshes, objectMap)
    for (const building of farmState.buildings) appendPlacedObjectMeshes(building, 'building', allMeshes, objectMap)

    _placedObjectRaycastCache.signature = signature
    _placedObjectRaycastCache.allMeshes = allMeshes
    _placedObjectRaycastCache.objectMap = objectMap
  }

  return _placedObjectRaycastCache
}

function handleObjectClick (px, py) {
  // Raycast against all placed object meshes.
  const raycaster = _setPointerRayFromMouse()

  const { allMeshes, objectMap } = getPlacedObjectRaycastData()
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
    if (!useEnergy(effectiveEnergyCost('harvest', ENERGY_COST))) return
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
    const countdown = getTimedProgress({
      now: Date.now(),
      startedAt: tree.lastHarvest || tree.plantedAt,
      durationMs: def.harvestTime,
      readyLabel: '1s'
    })
    showFeedback(def.name + ' fruit in ' + countdown.timeLabel, '#7df9ff')
  }
  updateHUD()
}

function handleAnimalInteract (animal) {
  const def = ANIMAL_DEFINITIONS[animal.type]
  if (!def) return

  if (animal.productReady) {
    // Collect product
    if (!useEnergy(effectiveEnergyCost('harvest', ENERGY_COST))) return
    const reward = collectAnimalProduct(animal)
    if (reward) {
      gameState.coins += reward.coins
      gameState.totalCoinsEarned += reward.coins
      gameState.animalProductsCollected++
      addXP(reward.xp)
      addItem(animal.type + '_product', 1, { name: reward.product, type: 'animal product', sellPrice: reward.coins })
      createParticleEffect('harvest', { x: animal.x, y: 0.3, z: animal.z })
      showFloatingCoin(animal.x, animal.z, '+' + reward.coins)
      SoundSystem.play('collect')
      showFeedback('Collected ' + reward.product + '! +' + reward.coins + ' coins', '#ffd700')
      checkAchievements()
    }
  } else if (!animal.fed) {
    // Feed animal
    if (gameState.coins < def.feedCost) {
      showFeedback('Not enough coins to feed! (need ' + def.feedCost + ')', '#ff4444')
      return
    }
    if (!useEnergy(effectiveEnergyCost('plow', ENERGY_COST))) return
    const result = feedAnimal(animal)
    if (result) {
      gameState.animalsFed++
      gameState.coins -= result.feedCost
      SoundSystem.play('feed')
      showFeedback('Fed ' + def.name + '! -' + result.feedCost + ' coins', '#32cd32')
    }
  } else {
    // Waiting for product
    const countdown = getTimedProgress({
      now: Date.now(),
      startedAt: animal.lastFed,
      durationMs: def.harvestTime,
      readyLabel: '1s'
    })
    showFeedback(def.name + ': ' + def.product + ' in ' + countdown.timeLabel, '#7df9ff')
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
      gameState.itemsSold += result.sold
      QuestSystem.recordAction('sell', result.sold)
      QuestSystem.recordAction('earn', result.coins)
      SoundSystem.play('sell')
      const soldMsg = result.sold > 1 ? 'Sold ' + result.sold + 'x for ' + result.coins + ' 🪙!' : 'Sold for ' + result.coins + ' 🪙!'
      showFeedback(soldMsg, '#ffd700')
      updateHUD()
      renderInventoryUI()
      checkAchievements()
    }
  }, (itemId, useEffect) => {
    // Handle usable item consumption
    if (!useEffect) return
    const removed = removeItem(itemId, 1)
    if (!removed) { showFeedback('No more ' + itemId + '!', '#ff4444'); return }
    if (useEffect.restoreEnergy) {
      const restored = Math.min(useEffect.restoreEnergy, gameState.maxEnergy - gameState.energy)
      gameState.energy = Math.min(gameState.energy + useEffect.restoreEnergy, gameState.maxEnergy)
      showFeedback('+' + restored + ' Energy!', '#5bc8f5')
      showToast('Energy Restored', 'water', '+' + restored + ' energy (' + gameState.energy + '/' + gameState.maxEnergy + ')')
      updateHUD()
    }
    if (useEffect.fertilizeAll != null && terrainData) {
      // Advance every planted, non-withered, non-mature crop by the given fraction of a stage
      const fraction = useEffect.fertilizeAll
      const allPlots = terrainData.getAllPlots()
      let boosted = 0
      for (const plot of allPlots) {
        if (!plot.crop || plot.state !== terrainData.PLOT_STATES.PLANTED) continue
        if (plot.crop.withered) continue
        const def = CROP_DEFINITIONS[plot.crop.type]
        if (!def) continue
        const maxStage = def.stages - 1
        if (plot.crop.stage >= maxStage) continue  // already mature, skip
        const timePerStage = def.growTime / maxStage
        plot.crop.growthAccum = (plot.crop.growthAccum || 0) + timePerStage * fraction
        // Handle multi-stage advance from large accumulation
        while (plot.crop.growthAccum >= timePerStage && plot.crop.stage < maxStage) {
          plot.crop.growthAccum -= timePerStage
          plot.crop.stage = Math.min(plot.crop.stage + 1, maxStage)
          plot.crop.watered = false
        }
        boosted++
        // Refresh crop mesh to new stage
        if (plot.cropMesh) sceneData.scene.remove(plot.cropMesh)
        plot.cropMesh = createCropMesh(plot.crop.type, plot.crop.stage)
        plot.cropMesh.position.set(plot.x, 0.08, plot.z)
        sceneData.scene.add(plot.cropMesh)
        // Tiny particle burst per boosted crop
        createParticleEffect('harvest', { x: plot.x, y: 0.3, z: plot.z })
      }
      if (boosted > 0) {
        SoundSystem.play('bulk_harvest')
        showFeedback('🌿 Fertilized ' + boosted + ' crop' + (boosted === 1 ? '' : 's') + '!', '#7ec850')
        showToast('Fertilizer Applied', 'water', boosted + ' crop' + (boosted === 1 ? '' : 's') + ' advanced by ' + Math.round(fraction * 100) + '% of a stage')
      } else {
        showFeedback('No crops to fertilize!', '#ff9900')
      }
    }
    renderInventoryUI()
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
  if (!useEnergy(effectiveEnergyCost('plow', ENERGY_COST))) return

  gameState.coins -= PLOW_COST
  addXP(PLOW_XP)
  gameState.totalPlowed++
  terrainData.setPlotState(plot.row, plot.col, terrainData.PLOT_STATES.PLOWED)
  SoundSystem.play('plow')
  createParticleEffect('plow', { x: plot.x, y: 0.1, z: plot.z })
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
  if (!useEnergy(effectiveEnergyCost('plant', ENERGY_COST))) return

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
  gameState.lastUsedSeed = seedKey  // remember for auto-equip next time
  createParticleEffect('planting', { x: plot.x, y: 0.1, z: plot.z })
  SoundSystem.play('plant')
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
  if (!useEnergy(effectiveEnergyCost('water', ENERGY_COST))) return

  plot.crop.watered = true
  gameState.totalWatered++
  terrainData.setPlotWatered(plot.row, plot.col, true)
  createParticleEffect('watering', { x: plot.x, y: 0.1, z: plot.z })
  SoundSystem.play('water')
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
  if (!useEnergy(effectiveEnergyCost('harvest', ENERGY_COST))) return

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
  SoundSystem.play('harvest')
  createParticleEffect('harvest', { x: plot.x, y: 0.1, z: plot.z })
  createParticleEffect('coin', { x: plot.x, y: 0.3, z: plot.z })
  const sc = worldToScreenCoords(plot.x, 0.08, plot.z)
  spawnFloatUp('+' + cropDef.sellPrice + ' 🪙', 'coins', sc.x, sc.y)
  spawnFloatUp('+' + (cropDef.xp + masteryBonus) + ' XP', 'xp', sc.x, sc.y + 25)

  let feedbackText = 'Harvested ' + cropDef.name + '! +' + cropDef.sellPrice + ' coins, +' + (cropDef.xp + masteryBonus) + ' XP'
  if (masteryBonus > 0) feedbackText += ' (+' + masteryBonus + ' mastery)'
  showFeedback(feedbackText, '#ffd700')

  if (!isDragBulk) showToast('Harvested ' + cropDef.name, 'harvest', '+' + cropDef.sellPrice + ' 🪙 · +' + (cropDef.xp + masteryBonus) + ' XP' + (masteryBonus > 0 ? ' (mastery bonus!)' : ''))

  checkAchievements()
  syncFarmStateNow()
}

function handleRemove (plot) {
  if (plot.state !== terrainData.PLOT_STATES.PLANTED || !plot.crop) {
    showFeedback('Nothing to remove!', '#ffa500')
    return
  }
    if (!useEnergy(effectiveEnergyCost('remove', ENERGY_COST))) return

  const cropDef = CROP_DEFINITIONS[plot.crop.type]
  const name = cropDef ? cropDef.name : 'crop'

  if (plot.cropMesh) {
    sceneData.scene.remove(plot.cropMesh)
    plot.cropMesh = null
  }
  plot.crop = null
  terrainData.setPlotState(plot.row, plot.col, terrainData.PLOT_STATES.PLOWED)
  SoundSystem.play('remove')
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
    if (!useEnergy(effectiveEnergyCost('harvest', ENERGY_COST))) break  // stop if out of energy

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
    SoundSystem.play('bulk_harvest')
    showFeedback('Harvested ' + count + ' crops! +' + totalCoins + ' coins', '#ffd700')
    showToast('Harvest All: ' + count + ' crops', 'bulk', '+' + totalCoins + ' 🪙 coins earned')
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
    if (!useEnergy(effectiveEnergyCost('water', ENERGY_COST))) break  // stop if out of energy

    plot.crop.watered = true
    gameState.totalWatered++
    terrainData.setPlotWatered(plot.row, plot.col, true)
    createParticleEffect('watering', { x: plot.x, y: 0.1, z: plot.z })
    QuestSystem.recordAction('water')
    count++
  }
  if (count > 0) {
    SoundSystem.play('bulk_water')
    showFeedback('Watered ' + count + ' crops!', '#4169e1')
    showToast('Water All: ' + count + ' crops watered', 'water', 'Growth speed doubled! 💧')
    checkAchievements()
    syncFarmStateNow()
    updateHUD()
  } else {
    showFeedback('No unwatered crops!', '#ffa500')
  }
}

function feedAll () {
  if (!gameState.running) return
  let count = 0
  let totalCost = 0
  for (const animal of farmState.animals) {
    if (animal.fed || animal.productReady) continue
    const def = ANIMAL_DEFINITIONS[animal.type]
    if (!def) continue
    if (gameState.coins < def.feedCost) break  // stop if can't afford
    if (!useEnergy(effectiveEnergyCost('plow', ENERGY_COST))) break  // stop if out of energy
    const result = feedAnimal(animal)
    if (result) {
      gameState.coins -= result.feedCost
      gameState.animalsFed++
      totalCost += result.feedCost
      count++
    }
  }
  if (count > 0) {
    SoundSystem.play('feed')
    showFeedback('Fed ' + count + ' animal' + (count > 1 ? 's' : '') + '! -' + totalCost + ' coins', '#32cd32')
    showToast('Feed All: ' + count + ' animal' + (count > 1 ? 's' : '') + ' fed', 'plant', '-' + totalCost + ' 🪙 coins spent')
    checkAchievements()
    syncFarmStateNow()
    updateHUD()
  } else {
    showFeedback('No hungry animals!', '#ffa500')
  }
}

function plantAll () {
  if (!terrainData || !gameState.running) return
  const seedKey = gameState.selectedSeed || getSelectedSeed()
  if (!seedKey) {
    showFeedback('Select a seed first!', '#ffa500')
    return
  }
  const cropDef = CROP_DEFINITIONS[seedKey]
  if (!cropDef) return

  const allPlots = terrainData.getAllPlots()
  let count = 0
  let totalCost = 0
  for (const plot of allPlots) {
    if (plot.state !== terrainData.PLOT_STATES.PLOWED) continue
    if (gameState.coins < cropDef.seedCost) break  // stop if can't afford
    if (!useEnergy(effectiveEnergyCost('plant', ENERGY_COST))) break  // stop if out of energy

    gameState.coins -= cropDef.seedCost
    totalCost += cropDef.seedCost

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
    QuestSystem.recordAction('plant')
    count++
  }
  gameState.lastUsedSeed = seedKey
  if (count > 0) {
    SoundSystem.play('bulk_water')  // reuse the satisfying multi-action sound
    showFeedback('Planted ' + count + ' ' + cropDef.name + '! -' + totalCost + ' coins', '#32cd32')
    showToast('Plant All: ' + count + ' ' + cropDef.name + ' planted', 'plant', '-' + totalCost + ' 🪙 seeds purchased')
    checkAchievements()
    syncFarmStateNow()
    updateHUD()
  } else {
    showFeedback('No plowed plots or not enough coins/energy!', '#ffa500')
  }
}

function plowAll () {
  if (!terrainData || !gameState.running) return
  const allPlots = terrainData.getAllPlots()
  let count = 0
  let totalCost = 0
  for (const plot of allPlots) {
    if (plot.state !== terrainData.PLOT_STATES.GRASS) continue
    if (gameState.coins < PLOW_COST) break  // stop if can't afford
    if (!useEnergy(effectiveEnergyCost('plow', ENERGY_COST))) break  // stop if out of energy

    gameState.coins -= PLOW_COST
    totalCost += PLOW_COST
    addXP(PLOW_XP)
    gameState.totalPlowed++
    terrainData.setPlotState(plot.row, plot.col, terrainData.PLOT_STATES.PLOWED)
    createParticleEffect('plow', { x: plot.x, y: 0.1, z: plot.z })
    QuestSystem.recordAction('plow')
    count++
  }
  if (count > 0) {
    SoundSystem.play('bulk_water')
    showFeedback('Plowed ' + count + ' plots! -' + totalCost + ' coins', '#daa520')
    showToast('Plow All: ' + count + ' plots plowed', 'plow', '-' + totalCost + ' 🪙 coins spent')
    checkAchievements()
    syncFarmStateNow()
    updateHUD()
  } else {
    showFeedback('No grass plots or not enough coins/energy!', '#ffa500')
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

  // Drag-to-multi-action: act on each new plot while dragging
  if (dragTool && gameState.running && terrainData && !placementMode) {
    const plot = terrainData.getPlotFromRaycast(mouse, sceneData.camera)
    if (plot) {
      const key = plot.row + ',' + plot.col
      if (!dragVisited.has(key)) {
        dragVisited.add(key)
        // isDragBulk suppresses per-plot feedback from the 2nd plot onward
        isDragBulk = dragVisited.size > 1
        dragDidMove = dragVisited.size > 1
        handlePlotClick(plot)
      }
    }
  }

  // Tooltip on hover over placed objects (when no tool/placement active)
  if (!placementMode && !gameState.selectedTool && gameState.running) {
    updateHoverTooltip()
    if (terrainData) terrainData.clearHoverHighlight()
  } else {
    hideTooltip()
    // Grid highlight: show colored overlay on hovered plot when a tool is active
    if (terrainData && gameState.selectedTool && gameState.running && !placementMode) {
      const hoverPlot = terrainData.getPlotFromRaycast(mouse, sceneData.camera)
      if (hoverPlot) {
        terrainData.setHoverHighlight(hoverPlot, gameState.selectedTool)
      } else {
        terrainData.clearHoverHighlight()
      }
    } else if (terrainData) {
      terrainData.clearHoverHighlight()
    }
  }
})

canvas.addEventListener('mouseleave', () => {
  if (terrainData) terrainData.clearHoverHighlight()
  hideTooltip()
})

// ── Drag-to-multi-action: start / finish ─────────────────────────────────────
canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return
  if (!gameState.running || !gameState.selectedTool || !terrainData || placementMode) return

  dragTool = gameState.selectedTool
  dragVisited.clear()
  dragDidMove = false
  isDragBulk = false
  // Note: the first plot is acted on by mousemove (which fires on any movement)
  // or by the click handler if the mouse never moves.
})

window.addEventListener('mouseup', (e) => {
  if (e.button !== 0 || !dragTool) return

  const count = dragVisited.size
  if (count > 1) {
    // Show summary for bulk drag operations
    const toolLabels = { plow: 'Plowed', plant: 'Planted', water: 'Watered', harvest: 'Harvested', remove: 'Removed' }
    const label = toolLabels[dragTool] || dragTool
    showToast(label + ' ' + count + ' plots', dragTool === 'harvest' ? 'harvest' : dragTool === 'water' ? 'water' : dragTool === 'plant' ? 'plant' : 'bulk')
    updateHUD()
  }

  dragTool = null
  isDragBulk = false
  dragDidMove = false
  // Clear dragVisited after the click event fires (click fires synchronously after mouseup)
  setTimeout(() => { dragVisited.clear() }, 50)
})

function updateHoverTooltip () {
  const now = Date.now()
  const raycaster = _setPointerRayFromMouse()

  const { allMeshes, objectMap } = getPlacedObjectRaycastData()
  const intersects = raycaster.intersectObjects(allMeshes, false)

  // If no placed objects hit, check if we're hovering a planted crop plot
  if (intersects.length === 0) {
    if (terrainData) {
      const plot = terrainData.getPlotFromRaycast(_pointerNDC, sceneData.camera)
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
  let progress = null
  switch (obj.type) {
    case 'tree': {
      const def = TREE_DEFINITIONS[obj.data.type]
      title = def ? def.name : obj.data.type
      const tree = obj.data
      if (isTreeReady(tree)) {
        info = 'Click to harvest!  +' + (def ? def.sellPrice : '?') + ' coins  +' + (def ? def.xp : '?') + ' XP'
        progress = { pct: 100, label: 'Ready to harvest!', watered: false }
      } else if (def) {
        const countdown = getTimedProgress({
          now,
          startedAt: tree.lastHarvest || tree.plantedAt,
          durationMs: def.harvestTime,
          readyLabel: '1s'
        })
        info = 'Growing  · ~' + countdown.timeLabel + ' to harvest'
        progress = { pct: countdown.pct, label: countdown.pct + '% ready  · ~' + countdown.timeLabel + ' remaining', watered: false }
      } else {
        info = 'Growing...'
      }
      break
    }
    case 'animal': {
      const def = ANIMAL_DEFINITIONS[obj.data.type]
      title = def ? def.name : obj.data.type
      const animal = obj.data
      if (animal.productReady) {
        info = 'Click to collect ' + (def ? def.product : 'product') + '!  +' + (def ? def.sellPrice : '?') + ' coins'
        progress = { pct: 100, label: 'Product ready to collect!', watered: false }
      } else if (animal.fed && def) {
        const countdown = getTimedProgress({
          now,
          startedAt: animal.lastFed,
          durationMs: def.harvestTime,
          readyLabel: '1s'
        })
        info = 'Producing ' + (def.product || 'product') + '  · ~' + countdown.timeLabel + ' remaining'
        progress = { pct: countdown.pct, label: countdown.pct + '% complete  · ~' + countdown.timeLabel + ' remaining', watered: true }
      } else {
        info = 'Click to feed  (costs ' + (def ? def.feedCost : '?') + ' coins)'
      }
      break
    }
    case 'building': {
      const def = BUILDING_DEFINITIONS[obj.data.type]
      title = def ? def.name : obj.data.type
      info = def ? (def.type === 'crafting' ? 'Click to craft' : def.effect) : ''
      break
    }
  }
  showTooltip(title, info, mousePx.x, mousePx.y, progress)
}

function _showCropTooltip (plot, px, py) {
  const now = Date.now()
  const crop = plot.crop
  const def = CROP_DEFINITIONS[crop.type]
  if (!def) { hideTooltip(); return }

  const maxStage = def.stages - 1
  const isMature = crop.stage >= maxStage

  let title = def.name
  let info = ''
  let progress = null

  if (isMature) {
    // Calculate wither countdown
    const witherTime = def.growTime * 3
    const witherCountdown = getTimedProgress({ now, startedAt: crop.plantedAt, durationMs: witherTime })
    const witherMsLeft = witherCountdown.msLeft
    const witherPct = witherMsLeft / (def.growTime * 2)
    let witherNote = ''
    if (witherMsLeft > 0) {
      const witherLabel = witherCountdown.timeLabel
      if (witherPct <= 0.25) {
        witherNote = '  · ⚠ Withers in ' + witherLabel + '!'
      } else if (witherPct <= 0.5) {
        witherNote = '  · Withers in ' + witherLabel
      }
    }
    title = def.name + ' — Ready!'
    info = 'Click to harvest  +' + def.sellPrice + ' coins  +' + def.xp + ' XP' + witherNote
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
    const timeLabel = formatTimeRemaining(msLeft, { readyLabel: '1s' })

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

  // Skip click if any plots were already acted on during a drag gesture
  if (dragVisited.size > 0) return

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
    else if (statsPanel && statsPanel.classList.contains('visible')) closeStatsPanel()
    else deselectTool()
    return
  }

  // I key for inventory
  if (e.key === 'i' || e.key === 'I') {
    if (gameState.running) toggleInventory()
    return
  }
  if (e.key === 't' || e.key === 'T') {
    if (gameState.running) toggleChat()
    return
  }
  if (e.key === 'r' || e.key === 'R') {
    if (gameState.running) resetCamera()
    return
  }

  // Phase 6: panel hotkeys
  if (e.key === 'u' || e.key === 'U') {
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
  if (e.key === 'f' || e.key === 'F') {
    if (gameState.running) toggleStatsPanel()
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
  if (e.key === 'n' || e.key === 'N') {
    if (gameState.running) feedAll()
    return
  }
  if (e.key === 'p' || e.key === 'P') {
    if (gameState.running) plantAll()
    return
  }
  if (e.key === 'l' || e.key === 'L') {
    if (gameState.running) plowAll()
    return
  }
  if (e.key === 'm' || e.key === 'M') {
    if (gameState.running) toggleMinimap()
    return
  }

  // ? key toggles shortcuts help panel
  if (e.key === '?' || e.key === '/') {
    toggleShortcutsPanel()
    return
  }

  // Ctrl+1-5: select pinned seed in hotbar slot
  if (e.ctrlKey && ['1', '2', '3', '4', '5'].includes(e.key) && gameState.running) {
    e.preventDefault()
    const slotIdx = parseInt(e.key) - 1
    const cropKey = getPinnedSeeds()[slotIdx]
    if (cropKey) {
      gameState.selectedSeed = cropKey
      setSelectedSeed(cropKey)
      selectTool('plant')
    }
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
const feedAllBtn = document.getElementById('feed-all-btn')
const plantAllBtn = document.getElementById('plant-all-btn')
const plowAllBtn = document.getElementById('plow-all-btn')
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

// Feed All button
if (feedAllBtn) {
  feedAllBtn.addEventListener('click', () => feedAll())
}

// Plant All button
if (plantAllBtn) {
  plantAllBtn.addEventListener('click', () => { if (gameState.running) plantAll() })
}

// Plow All button
if (plowAllBtn) {
  plowAllBtn.addEventListener('click', () => { if (gameState.running) plowAll() })
}

// Almanac button
const almanacBtn = document.getElementById('almanac-btn')
if (almanacBtn) {
  almanacBtn.addEventListener('click', () => {
    if (!gameState.running) return
    if (isAlmanacOpen()) closeAlmanac()
    else openAlmanac(gameState.level)
  })
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
  SoundSystem.play('quest')
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

// ── Sound toggle button ───────────────────────────────────────────────────────
const soundToggleBtn = document.getElementById('sound-toggle-btn')
if (soundToggleBtn) {
  // Reflect initial state
  soundToggleBtn.textContent = SoundSystem.enabled ? '🔊' : '🔇'
  soundToggleBtn.title = SoundSystem.enabled ? 'Sound On (click to mute)' : 'Sound Off (click to unmute)'
  soundToggleBtn.addEventListener('click', () => {
    const on = SoundSystem.toggle()
    soundToggleBtn.textContent = on ? '🔊' : '🔇'
    soundToggleBtn.title = on ? 'Sound On (click to mute)' : 'Sound Off (click to unmute)'
    if (on) SoundSystem.play('toast')
  })
}

// ── Crop growth update ───────────────────────────────────────────────────────
// Throttle wither warning toasts — batch into one toast per check interval
let _witherWarnCooldown = 0

function updateCrops (dtMs) {
  if (!terrainData) return

  // Apply building effects
  const effects = getBuildingEffects(farmState.buildings)
  const growthMul = effects.cropGrowthMultiplier

  _witherWarnCooldown = Math.max(0, _witherWarnCooldown - dtMs)

  const allPlots = terrainData.getAllPlots()
  let witherWarnCount = 0
  let justWitheredCount = 0
  let justRipenedCount = 0
  let justRipenedName = ''

  for (const plot of allPlots) {
    if (!plot.crop || plot.state !== terrainData.PLOT_STATES.PLANTED) continue

    const stageChanged = updateCropGrowth(plot.crop, dtMs * growthMul)

    if (stageChanged) {
      if (plot.cropMesh) {
        sceneData.scene.remove(plot.cropMesh)
      }

      if (plot.crop.withered) {
        plot.cropMesh = createWitheredMesh(plot.crop.type)
        justWitheredCount++
      } else {
        const def = CROP_DEFINITIONS[plot.crop.type]
        // Sparkle burst when crop first reaches final (ready-to-harvest) stage
        if (def && plot.crop.stage >= def.stages - 1) {
          createParticleEffect('harvest', { x: plot.x, y: 0.3, z: plot.z })
          justRipenedCount++
          justRipenedName = def.name
        }
        plot.cropMesh = createCropMesh(plot.crop.type, plot.crop.stage)
      }
      plot.cropMesh.position.set(plot.x, 0.08, plot.z)
      sceneData.scene.add(plot.cropMesh)
    }

    // Wither warning: mature crop past 75% of its wither window -> orange glow ring
    if (plot.crop && !plot.crop.withered && plot.cropMesh) {
      const def = CROP_DEFINITIONS[plot.crop.type]
      if (def) {
        const maxStage = def.stages - 1
        if (plot.crop.stage >= maxStage) {
          const elapsed = Date.now() - plot.crop.plantedAt
          const warnThreshold = def.growTime * 2.5     // 75% into 2x wither window
          if (elapsed >= warnThreshold) {
            // Tint glow ring orange as a persistent visual warning.
            const glowRings = plot.cropMesh.userData.glowRingMeshes
            if (Array.isArray(glowRings) && glowRings.length > 0) {
              for (const ring of glowRings) {
                if (ring.material) ring.material.color.setHex(0xff6600)
              }
            } else {
              plot.cropMesh.traverse(child => {
                if (child.userData.isGlowRing && child.material) {
                  child.material.color.setHex(0xff6600)
                }
              })
            }
            // Toast once per crop
            if (!plot.crop.witherWarned) {
              plot.crop.witherWarned = true
              witherWarnCount++
            }
          }
        }
      }
    }
  }

  // Batch wither warning toast (throttled to avoid spam)
  if (witherWarnCount > 0 && _witherWarnCooldown <= 0) {
    const label = witherWarnCount === 1 ? '1 crop is nearly withered!' : witherWarnCount + ' crops are nearly withered!'
    showToast(label, 'error', 'Harvest now before they die!')
    _witherWarnCooldown = 60000 // 60 s cooldown before next batch warning
  }

  // Wither event toast (immediate, one-shot per event)
  if (justWitheredCount > 0) {
    SoundSystem.play('wither')
    const label = justWitheredCount === 1 ? '1 crop withered away' : justWitheredCount + ' crops withered'
    showToast(label, 'error', 'Remove withered crops to free the plot')
  }

  // Ripened crops toast + sound (one-shot per batch)
  if (justRipenedCount > 0) {
    SoundSystem.play('crop_ready')
    const label = justRipenedCount === 1
      ? justRipenedName + ' is ready to harvest!'
      : justRipenedCount + ' crops are ready to harvest!'
    showToast(label, 'harvest', 'Click to harvest or press H for Harvest All')
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
      // Pulse glow ring opacity without traversing the crop subtree every frame.
      const glowRings = plot.cropMesh.userData.glowRingMeshes
      if (Array.isArray(glowRings) && glowRings.length > 0) {
        for (const ring of glowRings) {
          if (ring.material) ring.material.opacity = glowOpacity
        }
      } else {
        plot.cropMesh.traverse(child => {
          if (child.userData.isGlowRing && child.material) {
            child.material.opacity = glowOpacity
          }
        })
      }
    } else {
      // Reset scale for non-ready crops
      plot.cropMesh.scale.set(1, 1, 1)
    }
  }
}

// ── Weather-responsive wind system ───────────────────────────────────────────
// Wind strength and frequency scale with current weather:
//   clear   → gentle breeze  (0.6×)
//   cloudy  → light wind     (0.85×)
//   rainy   → moderate wind  (1.3×)
//   stormy  → strong gusts   (2.6×) + direction drift + turbulence
//   snowy   → calm drift     (0.45×)
//
// windDriftAngle accumulates slowly during stormy weather, rotating the dominant
// wind direction so gusts shift across the farm realistically.
let _windDriftAngle = 0   // accumulated wind direction offset (radians)
let _windGustPhase  = 0   // drives irregular gust amplitude during storms

// ── Footstep dust throttle ───────────────────────────────────────────────────
// Emit a dust puff every FOOTSTEP_INTERVAL_MS while the player is moving.
// Keeping this at ~180 ms means 5-6 puffs/s — enough for a continuous trail
// without overwhelming the particle pool (4 particles × 6/s = 24 active max).
const FOOTSTEP_INTERVAL_MS = 180
let _footstepTimer = 0   // ms since last footstep puff

const WEATHER_WIND = {
  clear:  { str: 0.6,  freq: 0.0012, treeStr: 0.6  },
  cloudy: { str: 0.85, freq: 0.0014, treeStr: 0.85 },
  rainy:  { str: 1.3,  freq: 0.0018, treeStr: 1.3  },
  stormy: { str: 2.6,  freq: 0.0028, treeStr: 2.5  },
  snowy:  { str: 0.45, freq: 0.0008, treeStr: 0.40 }
}

function _getWindParams () {
  const weather = getCurrentWeather ? getCurrentWeather() : 'clear'
  return WEATHER_WIND[weather] || WEATHER_WIND.clear
}

// ── Crop wind sway animation ─────────────────────────────────────────────────
// Applies a gentle per-stem rotation each frame using per-plot phase offsets
// so crops wave independently rather than in lockstep.
// Wind strength and frequency now scale with current weather conditions.
function animateCropWind (time) {
  if (!terrainData) return

  const wp = _getWindParams()
  const weather = getCurrentWeather ? getCurrentWeather() : 'clear'

  // Base wind parameters scaled by weather
  const WIND_FREQ = wp.freq                         // weather-scaled frequency
  const WIND_STR  = 0.18   * wp.str                // weather-scaled amplitude

  // Stormy-only: drift the wind direction and add irregular gusts
  if (weather === 'stormy') {
    _windDriftAngle = (_windDriftAngle + 0.000035) % (Math.PI * 2)  // slow direction rotation
    _windGustPhase  = (_windGustPhase  + 0.000031) % (Math.PI * 2)  // irregular gust cycle
  } else {
    // Gently decay drift in non-stormy conditions
    _windDriftAngle *= 0.9998
    _windGustPhase  *= 0.9995
  }

  // Gust envelope: in stormy weather adds ±40% amplitude variation
  const gustEnvelope = weather === 'stormy'
    ? 1.0 + 0.4 * Math.sin(_windGustPhase + time * 0.00041)
    : 1.0

  // Hoist drift trig outside the per-plot loop — same values for all stems this frame
  const sinDrift = Math.sin(_windDriftAngle)
  const cosDrift = Math.cos(_windDriftAngle)

  const allPlots = terrainData.getAllPlots()
  for (const plot of allPlots) {
    if (!plot.cropMesh || !plot.crop || plot.crop.withered) continue
    if (plot.crop.stage === 0) continue  // seeds stay flush with soil

    const phase = plot.x * 1.31 + plot.z * 0.97
    const swayBase = Math.sin(time * WIND_FREQ + phase)
    const swayOrth = Math.cos(time * WIND_FREQ * 0.71 + phase) * 0.45

    const stems = plot.cropMesh.userData.stemMeshes
    if (Array.isArray(stems) && stems.length > 0) {
      for (const child of stems) {
        const amp = child.userData.stemHeight * WIND_STR * gustEnvelope

        // Apply wind direction drift: rotate the sway axes by the drift angle
        child.rotation.z = (swayBase * cosDrift + swayOrth * sinDrift) * amp
        child.rotation.x = (swayBase * sinDrift - swayOrth * cosDrift) * amp
      }
      continue
    }

    // Fallback for any legacy crop meshes created before cached refs existed.
    plot.cropMesh.traverse(child => {
      if (!child.userData.isStem) return
      const amp = child.userData.stemHeight * WIND_STR * gustEnvelope

      // Apply wind direction drift: rotate the sway axes by the drift angle
      child.rotation.z = (swayBase * cosDrift + swayOrth * sinDrift) * amp
      child.rotation.x = (swayBase * sinDrift - swayOrth * cosDrift) * amp
    })
  }
}

// ── Border tree wind sway animation ──────────────────────────────────────────
// Gently sways the canopy spheres and trunks of the 12 decorative border trees
// around the farm perimeter. Each tree has a unique windPhase so they wave
// independently. Frequency is slower than crop sway (bigger/heavier trees).
// Amplitude: trunk gets half the sway, canopy gets full sway scaled by radius.
// Wind strength scales with current weather (stormy = dramatic swaying).
let _borderTrees = null  // cached once on first call
function animateBorderTreeWind (time) {
  if (!_borderTrees) _borderTrees = getBorderTrees()
  if (!_borderTrees || _borderTrees.length === 0) return

  const wp = _getWindParams()
  const weather = getCurrentWeather ? getCurrentWeather() : 'clear'

  // Trees sway at 64% of crop frequency (ponderous mass)
  const WIND_FREQ  = 0.0009 * wp.freq / 0.0014
  const TRUNK_STR  = 0.022  * wp.treeStr    // max trunk rotation in radians
  const CANOPY_STR = 0.055  * wp.treeStr    // canopy sways more than trunk
  const CANOPY_SCL = 0.012  * wp.treeStr    // extra scale per unit of canopy radius

  // Stormy: use the same gust envelope from crop wind
  const gustEnvelope = weather === 'stormy'
    ? 1.0 + 0.35 * Math.sin(_windGustPhase * 0.73 + time * 0.00035)
    : 1.0

  // Hoist drift trig — same for every tree this frame
  const treeSinDrift = Math.sin(_windDriftAngle)
  const treeCosDrift = Math.cos(_windDriftAngle)

  for (const treeGroup of _borderTrees) {
    const phase = treeGroup.userData.windPhase || 0

    // Apply drift angle to tree sway for consistency with crop wind
    const swayBase = Math.sin(time * WIND_FREQ + phase)
    const swayOrth = Math.cos(time * WIND_FREQ * 0.73 + phase)

    const swayZ = (swayBase * treeCosDrift + swayOrth * treeSinDrift) * gustEnvelope
    const swayX = (swayBase * treeSinDrift - swayOrth * treeCosDrift) * gustEnvelope

    const trunks = treeGroup.userData.trunkMeshes
    const canopies = treeGroup.userData.canopyMeshes
    const hasCachedTrunks = Array.isArray(trunks) && trunks.length > 0
    const hasCachedCanopies = Array.isArray(canopies) && canopies.length > 0
    if (hasCachedTrunks || hasCachedCanopies) {
      if (hasCachedTrunks) {
        for (const child of trunks) {
          child.rotation.z = swayZ * TRUNK_STR
          child.rotation.x = swayX * TRUNK_STR * 0.5
        }
      }
      if (hasCachedCanopies) {
        for (const child of canopies) {
          const r = child.userData.canopyRadius || 1.2
          const amp = CANOPY_STR + r * CANOPY_SCL
          child.rotation.z = swayZ * amp
          child.rotation.x = swayX * amp * 0.55
        }
      }
      continue
    }

    // Fallback for any legacy border trees created before cached refs existed.
    treeGroup.traverse(child => {
      if (child.userData.isBorderTrunk) {
        child.rotation.z = swayZ * TRUNK_STR
        child.rotation.x = swayX * TRUNK_STR * 0.5
      } else if (child.userData.isBorderCanopy) {
        const r = child.userData.canopyRadius || 1.2
        const amp = CANOPY_STR + r * CANOPY_SCL
        child.rotation.z = swayZ * amp
        child.rotation.x = swayX * amp * 0.55
      }
    })
  }
}

// ── Farm-placed tree wind sway animation ─────────────────────────────────────
// Applies the same physics-accurate wind sway to trees placed on the farm by
// the player. Matches the visual language of border tree sway: trunk gets a
// gentler rotation than the canopy, and both axes are modulated so the tree
// sways in a figure-eight pattern rather than a simple pendulum.
// Each tree group carries a unique userData.windPhase set at mesh creation time
// so adjacent trees don't wave in lockstep.
function animateFarmTreeWind (time) {
  if (!farmState || !farmState.trees || farmState.trees.length === 0) return

  const wp = _getWindParams()
  const weather = getCurrentWeather ? getCurrentWeather() : 'clear'

  // Same frequency ratio as border trees (heavier/slower than crops)
  const WIND_FREQ  = 0.0009 * wp.freq / 0.0014
  const TRUNK_STR  = 0.020  * wp.treeStr    // slightly tighter than border trees (smaller grid trees)
  const CANOPY_STR = 0.048  * wp.treeStr    // canopy sways more visibly
  const CANOPY_SCL = 0.010  * wp.treeStr    // scale per unit of canopy radius

  // Stormy gust envelope (reuses _windGustPhase from animateCropWind)
  const gustEnvelope = weather === 'stormy'
    ? 1.0 + 0.35 * Math.sin(_windGustPhase * 0.73 + time * 0.00035)
    : 1.0

  // Reuse the same drift trig as border trees for a unified wind direction
  const treeSinDrift = Math.sin(_windDriftAngle)
  const treeCosDrift = Math.cos(_windDriftAngle)

  for (const tree of farmState.trees) {
    if (!tree.mesh) continue

    const phase = tree.mesh.userData.windPhase || 0
    const swayBase = Math.sin(time * WIND_FREQ + phase)
    const swayOrth = Math.cos(time * WIND_FREQ * 0.73 + phase)

    const swayZ = (swayBase * treeCosDrift + swayOrth * treeSinDrift) * gustEnvelope
    const swayX = (swayBase * treeSinDrift - swayOrth * treeCosDrift) * gustEnvelope

    const trunks = tree.mesh.userData.trunkMeshes
    const canopies = tree.mesh.userData.canopyMeshes
    if (Array.isArray(trunks) || Array.isArray(canopies)) {
      if (Array.isArray(trunks)) {
        for (const child of trunks) {
          child.rotation.z = swayZ * TRUNK_STR
          child.rotation.x = swayX * TRUNK_STR * 0.5
        }
      }
      if (Array.isArray(canopies)) {
        for (const child of canopies) {
          const r = child.userData.canopyRadius || 1.0
          const amp = CANOPY_STR + r * CANOPY_SCL
          child.rotation.z = swayZ * amp
          child.rotation.x = swayX * amp * 0.55
        }
      }
      continue
    }

    // Fallback for any legacy meshes created before cached refs existed.
    tree.mesh.traverse(child => {
      if (child.userData.isFarmTrunk) {
        child.rotation.z = swayZ * TRUNK_STR
        child.rotation.x = swayX * TRUNK_STR * 0.5
      } else if (child.userData.isFarmCanopy) {
        const r = child.userData.canopyRadius || 1.0
        const amp = CANOPY_STR + r * CANOPY_SCL
        child.rotation.z = swayZ * amp
        child.rotation.x = swayX * amp * 0.55
      }
    })
  }
}

// ── Crop timer labels (world-to-screen DOM overlay) ──────────────────────────
// Map from 'row,col' -> div element
const _cropTimerEls = new Map()
const _cropTimerEpoch = createOverlayEpochTracker()
let _lastCropTimerTextAt = 0

function updateCropTimers (time) {
  if (!terrainData || !sceneData || !gameState.running || !gameContainer) return

  // Throttle text updates to twice per second without relying on frame rate.
  const updateText = (time - _lastCropTimerTextAt) >= 500
  if (updateText) _lastCropTimerTextAt = time
  const textNow = updateText ? Date.now() : 0
  const canvasRect = canvas.getBoundingClientRect()
  const epoch = _cropTimerEpoch.next()

  for (const plot of terrainData.getAllPlots()) {
    if (!plot.crop || plot.state !== terrainData.PLOT_STATES.PLANTED || plot.crop.withered) continue

    const def = CROP_DEFINITIONS[plot.crop.type]
    if (!def) continue

    const maxStage = def.stages - 1
    const key = plot.row + ',' + plot.col

    // Get or create label element
    let el = _cropTimerEls.get(key)
    if (!el) {
      el = document.createElement('div')
      el.className = 'crop-timer'
      gameContainer.appendChild(el)
      _cropTimerEls.set(key, el)
    }
    markOverlaySeen(_cropTimerEls, key, epoch)

    // World-to-screen position (above the crop)
    const sc = worldToScreenCoords(plot.x, 0.5, plot.z, _worldToScreenResult, canvasRect)
    el.style.left = sc.x + 'px'
    el.style.top = (sc.y - 14) + 'px'

    if (updateText) {
      const isMature = plot.crop.stage >= maxStage
      if (isMature) {
        // Show wither countdown: witherTime = growTime * 3 total from plantedAt
        const witherTime = def.growTime * 3
        const elapsed = textNow - plot.crop.plantedAt
        const witherMsLeft = witherTime - elapsed
        const witherPct = witherMsLeft / (def.growTime * 2)  // fraction of wither window left
        if (witherMsLeft <= 0) {
          el.textContent = '★'
          el.className = 'crop-timer ready'
        } else if (witherPct <= 0.25) {
          // Last 25% of wither window — red urgent countdown
          el.textContent = '★ ' + formatTimeRemaining(witherMsLeft)
          el.className = 'crop-timer ready wither-urgent'
        } else if (witherPct <= 0.5) {
          // Middle 25-50% — orange warning
          el.textContent = '★ ' + formatTimeRemaining(witherMsLeft)
          el.className = 'crop-timer ready wither-warn'
        } else {
          // Fresh mature — just the star (no countdown clutter)
          el.textContent = '★'
          el.className = 'crop-timer ready'
        }
      } else {
        const timePerStage = def.growTime / maxStage
        const stagesLeft = maxStage - plot.crop.stage
        const accumLeft = timePerStage - (plot.crop.growthAccum || 0)
        const multiplier = plot.crop.watered ? 2 : 1
        const msLeft = (accumLeft + (stagesLeft - 1) * timePerStage) / multiplier
        el.textContent = formatTimeRemaining(msLeft, { readyLabel: '1s' })
        el.className = 'crop-timer' + (plot.crop.watered ? ' watered' : '')
      }
    }
  }

  sweepStaleOverlays(_cropTimerEls, epoch, (_key, el) => {
    el.remove()
  })
}

// ── Animal product-ready indicators (DOM overlay) ────────────────────────────
// Map from animal index -> div element
const _animalProductEls = new Map()
const _animalHungerEls = new Map()
const _animalProductEpoch = createOverlayEpochTracker()
const _animalHungerEpoch = createOverlayEpochTracker()

function updateAnimalProductIndicators () {
  if (!sceneData || !gameState.running || !gameContainer) return

  const canvasRect = canvas.getBoundingClientRect()
  const productEpoch = _animalProductEpoch.next()
  const hungerEpoch = _animalHungerEpoch.next()

  for (let i = 0; i < farmState.animals.length; i++) {
    const animal = farmState.animals[i]
    if (!animal.mesh) continue

    // ── Product-ready star ─────────────────────────────────────────────
    if (animal.productReady) {
      let el = _animalProductEls.get(i)
      if (!el) {
        el = document.createElement('div')
        el.className = 'animal-product-ready'
        el.textContent = '★'
        el.title = 'Product ready — click to collect!'
        gameContainer.appendChild(el)
        _animalProductEls.set(i, el)
      }
      markOverlaySeen(_animalProductEls, i, productEpoch)

      const sc = worldToScreenCoords(animal.x, 1.1, animal.z, _worldToScreenResult, canvasRect)
      el.style.left = sc.x + 'px'
      el.style.top = sc.y + 'px'
      el.style.display = 'block'
    }

    // ── Hunger indicator (! badge) ─────────────────────────────────────
    // Show when animal has never been fed, or after product was collected
    const isHungry = !animal.fed && !animal.productReady
    if (isHungry) {
      let hel = _animalHungerEls.get(i)
      if (!hel) {
        hel = document.createElement('div')
        hel.className = 'animal-hungry'
        hel.textContent = '!'
        hel.title = 'Hungry! Click to feed'
        gameContainer.appendChild(hel)
        _animalHungerEls.set(i, hel)
      }
      markOverlaySeen(_animalHungerEls, i, hungerEpoch)

      // Position slightly offset from product star so they don't overlap
      const sc = worldToScreenCoords(animal.x, 1.1, animal.z, _worldToScreenResult, canvasRect)
      hel.style.left = (sc.x + 10) + 'px'
      hel.style.top = sc.y + 'px'
      hel.style.display = 'block'
    }
  }

  sweepStaleOverlays(_animalProductEls, productEpoch, (_key, el) => {
    el.remove()
  })

  sweepStaleOverlays(_animalHungerEls, hungerEpoch, (_key, el) => {
    el.remove()
  })
}

// ── Decoration animations (weather-reactive wind + water) ───────────────────
// _waterAnimProfiles: per-decoration water tuning. Phase offsets keep multiple
// ponds/wells from pulsing in perfect lockstep when several are placed.
const _WATER_ANIM_PROFILES = {
  fountain: { baseOpacity: 0.70, pulseFreq: 0.60, pulseMag: 0.018, shimmerFreq: 1.10, shimmerMag: 0.08, driftFreq: 0.25 },
  pond:     { baseOpacity: 0.70, pulseFreq: 0.40, pulseMag: 0.012, shimmerFreq: 1.10, shimmerMag: 0.08, driftFreq: 0.25 },
  well:     { baseOpacity: 0.60, pulseFreq: 0.60, pulseMag: 0.018, shimmerFreq: 0.80, shimmerMag: 0.08, driftFreq: 0.25 },
  birdbath: { baseOpacity: 0.58, pulseFreq: 0.95, pulseMag: 0.010, shimmerFreq: 1.65, shimmerMag: 0.05, driftFreq: 0.34 }
}
let _lastDecorationAnimMs = 0

function updateDecorations (time) {
  const t = time * 0.001 // seconds
  const wp = _getWindParams()
  const weather = getCurrentWeather ? getCurrentWeather() : 'clear'
  const nightFactor = _nightFactorFromTime(getTimeOfDay())
  const lampWeatherBoost = weather === 'stormy' ? 1.14 : weather === 'rainy' ? 1.08 : 1.0
  const dtMs = _lastDecorationAnimMs > 0
    ? Math.max(0, Math.min(50, time - _lastDecorationAnimMs))
    : 16.67
  _lastDecorationAnimMs = time

  const gustEnvelope = weather === 'stormy'
    ? 1.0 + 0.35 * Math.sin(_windGustPhase * 0.79 + time * 0.00045)
    : 1.0
  const decoWindFreq = 0.0016 * wp.freq / 0.0014
  const sinDrift = Math.sin(_windDriftAngle)
  const cosDrift = Math.cos(_windDriftAngle)

  for (const deco of farmState.decorations) {
    if (!deco.mesh) continue

    const lampGlow = deco.mesh.userData.lampGlowMesh
    const lampHalo = deco.mesh.userData.lampHaloMesh
    const lampLight = deco.mesh.userData.lampPointLight
    if (lampGlow || lampHalo || lampLight) {
      const phase = deco.x * 0.83 + deco.z * 1.37
      const pulse = 0.95 + Math.sin(t * 0.9 + phase) * 0.06 + Math.sin(t * 1.7 + phase * 1.9) * 0.02
      const lampStrength = nightFactor * lampWeatherBoost * Math.max(0.84, pulse)

      if (lampGlow && lampGlow.material) {
        lampGlow.material.emissiveIntensity = lampStrength * 1.8
      }
      if (lampHalo && lampHalo.material) {
        const haloPulse = 0.97 + Math.sin(t * 1.05 + phase * 0.7) * 0.06
        const haloStrength = lampStrength * haloPulse
        lampHalo.material.opacity = Math.max(0, (nightFactor - 0.08) * 0.18 * haloPulse)
        const haloScale = (lampHalo.userData.baseScale || 1.0) * (1.15 + haloStrength * 0.9)
        lampHalo.scale.set(haloScale, haloScale, 1)
      }
      if (lampLight) {
        lampLight.intensity = lampStrength * 1.2
        lampLight.distance = 8 + lampStrength * 1.6
      }
    }

    const windmillRotors = deco.mesh.userData.windmillRotors || []
    for (const rotor of windmillRotors) {
      // Weather-reactive rotor speed — calm days turn lazily, storms spin faster.
      const rotorSpeed = (0.00018 + 0.00022 * wp.str) * gustEnvelope
      const nextAngle = (rotor.userData.rotorAngle ?? rotor.rotation.z) + rotorSpeed * dtMs
      rotor.userData.rotorAngle = nextAngle % (Math.PI * 2)
      rotor.rotation.z = rotor.userData.rotorAngle
    }

    const windDecorations = deco.mesh.userData.windDecorations || []
    for (const child of windDecorations) {
      const phase = child.userData.windPhase || 0
      const swayBase = Math.sin(time * decoWindFreq + phase)
      const swayOrth = Math.cos(time * decoWindFreq * 0.83 + phase * 1.7)
      const swayZ = (swayBase * cosDrift + swayOrth * sinDrift) * gustEnvelope
      const swayX = (swayBase * sinDrift - swayOrth * cosDrift) * gustEnvelope
      const baseRotX = child.userData.baseRotationX || 0
      const baseRotZ = child.userData.baseRotationZ || 0

      if (child.userData.windKind === 'mailboxFlag') {
        child.rotation.z = baseRotZ + swayZ * (0.18 * wp.str)
        child.rotation.x = baseRotX + swayX * (0.06 * wp.str)
      } else if (child.userData.windKind === 'flowerStalk') {
        const bend = child.userData.windBend || 1
        const nod = Math.sin(time * decoWindFreq * 0.71 + phase * 2.3) * 0.018 * bend * gustEnvelope
        child.rotation.z = baseRotZ + swayZ * (0.085 * wp.str * bend) + nod
        child.rotation.x = baseRotX + swayX * (0.032 * wp.str * bend)
      } else {
        child.rotation.z = baseRotZ + swayZ * (0.10 * wp.str)
        child.rotation.x = baseRotX + swayX * (0.04 * wp.str)
      }
    }

    const waterMeshes = deco.mesh.userData.waterMeshes || []
    for (const child of waterMeshes) {
      const wt = child.userData.waterType
      const waterAnim = _WATER_ANIM_PROFILES[wt] || _WATER_ANIM_PROFILES.fountain
      const phase = child.userData.waterPhase || 0

      // 1. Slow scale pulse — water surface expands/contracts slightly
      const s = 1.0 + Math.sin(t * waterAnim.pulseFreq * Math.PI * 2 + phase) * waterAnim.pulseMag
      child.scale.set(s, 1, s)

      // 2. Opacity shimmer — subtle glint
      child.material.opacity = waterAnim.baseOpacity + Math.sin(t * waterAnim.shimmerFreq * Math.PI * 2 + phase * 1.7 + 1.3) * waterAnim.shimmerMag

      // 3. Color temperature drift — cool to bright blue and back
      //    hue stays steel-blue, lightness drifts slightly
      const drift = (Math.sin(t * waterAnim.driftFreq * Math.PI * 2 + phase * 0.6) + 1) * 0.5  // 0..1
      const colorBoost = wt === 'birdbath' ? 0.75 : 1.0
      const r = 0x46 / 255 + drift * 0.04 * colorBoost
      const g = 0x82 / 255 + drift * 0.06 * colorBoost
      const b = 0xb4 / 255 + drift * 0.08 * colorBoost
      child.material.color.setRGB(Math.min(1, r), Math.min(1, g), Math.min(1, b))
    }
  }
}

// ── Chimney smoke particles ───────────────────────────────────────────────────
// Emit a lazy smoke puff from each building chimney cap every ~800ms daytime,
// ~2400ms at night. Uses the InstancedMesh particle pool — no GC overhead.
const _chimneyLastEmit = new Map()  // chimneyMesh.uuid → last emit timestamp (ms)
const _chimneyWorldPos = new THREE.Vector3()

function animateChimneySmoke (time) {
  if (!farmState.buildings || !farmState.buildings.length) return

  // Emit less often at night (buildings still active but quieter)
  const tod = getTimeOfDay()
  const isNightTime = tod > 0.62 || tod < 0.08
  const interval = isNightTime ? 2400 : 800

  for (const building of farmState.buildings) {
    if (!building.mesh) continue
    const chimneyTops = building.mesh.userData.chimneyTopMeshes
    if (Array.isArray(chimneyTops)) {
      for (const child of chimneyTops) {
        const last = _chimneyLastEmit.get(child.uuid) || 0
        if (time - last < interval) continue
        _chimneyLastEmit.set(child.uuid, time)
        child.getWorldPosition(_chimneyWorldPos)
        _chimneyWorldPos.y += 0.12  // start just above cap
        createParticleEffect('smoke', _chimneyWorldPos)
      }
      continue
    }

    // Fallback for any legacy building meshes created before cached refs existed.
    building.mesh.traverse(child => {
      if (!child.userData.isChimneyTop) return
      const last = _chimneyLastEmit.get(child.uuid) || 0
      if (time - last < interval) return
      _chimneyLastEmit.set(child.uuid, time)
      child.getWorldPosition(_chimneyWorldPos)
      _chimneyWorldPos.y += 0.12  // start just above cap
      createParticleEffect('smoke', _chimneyWorldPos)
    })
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

// ── Building window night glow ───────────────────────────────────────────────
// nightFactor: 0 = full day (noon), 1 = full night. Uses a cosine curve so
// windows ramp up smoothly at dusk and ramp down at dawn.
let _lastWindowGlowMs = 0
let _windowGlowUpdateStamp = 0

function _nightFactorFromTime (t) {
  // t is 0..1 fraction of a full day cycle where 0.33 = noon (sun angle π/2)
  // We want nightFactor=0 at noon (t≈0.33) and nightFactor=1 at midnight (t≈0.83).
  // Map to sun elevation angle: sunAngle = t*2π - π/2 (matches daynight.js)
  const sunAngle = t * Math.PI * 2 - Math.PI / 2
  const elevation = Math.sin(sunAngle) // 1 at noon, -1 at midnight
  return Math.max(0, Math.min(1, (1 - elevation) / 2)) // 0 at noon, 1 at midnight
}

function applyWindowGlow () {
  const nightFactor = _nightFactorFromTime(getTimeOfDay())
  const glowStamp = ++_windowGlowUpdateStamp

  for (const building of farmState.buildings) {
    const glowMaterials = building.mesh && building.mesh.userData.windowGlowMaterials
    if (Array.isArray(glowMaterials) && glowMaterials.length > 0) {
      for (const material of glowMaterials) {
        if (!material || Array.isArray(material)) continue
        if (material.userData.windowGlowUpdateStamp === glowStamp) continue
        const baseIntensity = material.userData.baseEmissiveIntensity || 0
        material.emissiveIntensity = baseIntensity * nightFactor
        material.userData.windowGlowUpdateStamp = glowStamp
      }
      continue
    }

    const panes = building.mesh && building.mesh.userData.windowPanes
    if (!Array.isArray(panes)) continue
    for (const pane of panes) {
      if (!pane.isMesh || !pane.userData.isWindowPane) continue
      if (Array.isArray(pane.material)) continue
      pane.material.emissiveIntensity = pane.userData.baseEmissiveIntensity * nightFactor
    }
  }
}

function updateWindowGlow (dtMs) {
  _lastWindowGlowMs += dtMs
  if (_lastWindowGlowMs < 200) return
  _lastWindowGlowMs = 0
  applyWindowGlow()
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
      type: d.type, x: d.x, z: d.z, color: d.color, variantSeed: d.variantSeed
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

// ── Minimap ──────────────────────────────────────────────────────────────────
const minimapWrap = document.getElementById('minimap-wrap')
const minimapCanvas = document.getElementById('minimap-canvas')
const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null
let minimapVisible = true

function toggleMinimap () {
  minimapVisible = !minimapVisible
  if (minimapWrap) minimapWrap.classList.toggle('minimap-hidden', !minimapVisible)
}

// Draw the minimap — called every ~10 frames for performance
let minimapFrameCount = 0
function drawMinimap () {
  if (!minimapCtx || !terrainData || !gameState.running) return
  minimapFrameCount++
  if (minimapFrameCount % 10 !== 0) return  // update ~6fps

  const COLS = 20
  const ROWS = 20
  const cw = minimapCanvas.width   // 120
  const ch = minimapCanvas.height  // 120
  const cellW = cw / COLS
  const cellH = ch / ROWS

  const plots = terrainData.getAllPlots()
  const PS = terrainData.PLOT_STATES

  minimapCtx.clearRect(0, 0, cw, ch)

  for (const plot of plots) {
    const x = plot.col * cellW
    const y = plot.row * cellH

    let color
    if (plot.state === PS.GRASS) {
      color = '#3d7a3d'
    } else if (plot.state === PS.PLOWED) {
      color = '#7a5c3d'
    } else if (plot.state === PS.PLANTED) {
      if (plot.crop && plot.crop.withered) {
        color = '#5a3a2a'
      } else if (plot.crop && plot.crop.stage >= 4) {
        // Ready to harvest — gold
        color = '#d4aa00'
      } else if (plot.crop && plot.crop.watered) {
        color = '#3a8fa0'
      } else {
        color = '#5aa05a'
      }
    } else {
      color = '#3d7a3d'
    }

    minimapCtx.fillStyle = color
    minimapCtx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cellW), Math.ceil(cellH))
  }

  // Grid lines (subtle)
  minimapCtx.strokeStyle = 'rgba(0,0,0,0.2)'
  minimapCtx.lineWidth = 0.5
  for (let c = 0; c <= COLS; c++) {
    minimapCtx.beginPath()
    minimapCtx.moveTo(c * cellW, 0)
    minimapCtx.lineTo(c * cellW, ch)
    minimapCtx.stroke()
  }
  for (let r = 0; r <= ROWS; r++) {
    minimapCtx.beginPath()
    minimapCtx.moveTo(0, r * cellH)
    minimapCtx.lineTo(cw, r * cellH)
    minimapCtx.stroke()
  }

  // Player dot
  if (window.PlayerController) {
    const pos = window.PlayerController.getPlayerPos()
    // World coords: each cell is 2 units wide (PLOT_SIZE=2), grid is centered at 0
    // Plot col = Math.floor((pos.x + ROWS) / 2) for a 20-col grid offset at -20
    const WORLD_HALF = COLS  // 20 world units half-width
    const px = ((pos.x + WORLD_HALF) / (WORLD_HALF * 2)) * cw
    const py = ((pos.z + WORLD_HALF) / (WORLD_HALF * 2)) * ch
    minimapCtx.beginPath()
    minimapCtx.arc(px, py, 3, 0, Math.PI * 2)
    minimapCtx.fillStyle = '#ffffff'
    minimapCtx.fill()
    minimapCtx.strokeStyle = 'rgba(0,0,0,0.6)'
    minimapCtx.lineWidth = 1
    minimapCtx.stroke()
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

  const clampedDt = Math.min(dt, 0.1)
  const dtMs = clampedDt * 1000

  // Update player movement
  window.PlayerController.updatePlayer(clampedDt)
  window.PlayerController.updateCamera(sceneData.camera)
  updateCamera()

  // Footstep dust: emit a tiny dust puff at player feet while walking
  if (window.PlayerController.isPlayerMoving && window.PlayerController.isPlayerMoving()) {
    _footstepTimer += dtMs
    if (_footstepTimer >= FOOTSTEP_INTERVAL_MS) {
      _footstepTimer = 0
      const fpos = window.PlayerController.getPlayerPos()
      createFootstepDust({ x: fpos.x, y: 0.05, z: fpos.z })
    }
  } else {
    _footstepTimer = FOOTSTEP_INTERVAL_MS // reset so next step fires immediately
  }

  // Update systems
  updateWeather(dtMs, sceneData.sunLight)
  updateDayNight(dtMs)
  _updateTimeHUD()
  updateCrops(dtMs)
  animateReadyCrops(time)
  animateCropWind(time)
  animateBorderTreeWind(time)
  animateFarmTreeWind(time)
  updateCropTimers(time)
  updateTrees(dtMs)
  updateAnimals(dtMs)
  updateAnimalProductIndicators()
  updateBuildings(dtMs)
  updateWindowGlow(dtMs)
  updateDecorations(time)
  animateChimneySmoke(time)
  updateParticles(dtMs)

  // Energy regen
  regenEnergy(dtMs)

  // Season check (throttled to once per minute inside the function)
  updateSeasonIfChanged()

  // P2P: sync farm state periodically
  syncFarmState()

  // Auto-save
  autoSave(dtMs)

  // P2P: update visiting state UI
  updateVisitingUI()

  // Update HUD periodically
  updateHUD()

  // Pulse placement highlight ring (breathing opacity + scale)
  if (placementHighlightMesh) {
    const pulse = 0.55 + 0.35 * Math.sin(time * 0.004)
    placementHighlightMesh.material.opacity = pulse
    const sc = 0.9 + 0.15 * Math.sin(time * 0.004)
    placementHighlightMesh.scale.setScalar(sc)
  }

  // Render
  renderScene()
  drawMinimap()
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
  if (minimapWrap) minimapWrap.style.display = 'block'
  chatPanel.style.display = 'flex'
  // Restore minimized state (default: minimized)
  const chatWasMinimized = localStorage.getItem('farmville-chat-minimized')
  const startMinimized = chatWasMinimized === null ? true : chatWasMinimized === '1'
  if (startMinimized) chatPanel.classList.add('minimized')
  const chatToggleBtn = document.getElementById('chat-toggle-btn')
  if (chatToggleBtn) chatToggleBtn.textContent = startMinimized ? '▲' : '▼'

  // Init player
  window.PlayerController.initPlayer(sceneData.scene)

  // Update HUD
  updateHUD()
  updateVehicleStatus()

  // Apply initial season colors
  if (terrainData) {
    terrainData.setSeasonColors(getSeasonFromDate())
    _lastSeasonCheck = Date.now()
    updateSeasonIfChanged()
  }

  // ── Initialize weather system ──────────────────────────────────────────────
  initWeather(sceneData.scene, {
    onAutoWater: rainAutoWaterCrops
  })

  // ── Initialize day/night cycle ─────────────────────────────────────────────
  // Wire up the full day/night system: controls sunLight + ambientLight colour,
  // sky background, stars, and the only firefly swarm so visuals stay synced to
  // the in-game clock instead of the host machine's real local time.
  initDayNight(sceneData.scene, sceneData.sunLight, sceneData.ambientLight, sceneData.hemiLight, {
    renderer: sceneData.renderer   // enables per-phase toneMappingExposure driving
  })
  _updateTimeHUD()

  // Register weather change listener → update HUD + toast
  onWeatherChange((newWeather, oldWeather) => {
    _updateWeatherHUD()
    if (newWeather === 'rainy' || newWeather === 'stormy') {
      showToast(
        getWeatherIcon() + ' ' + getWeatherName() + ' is rolling in!',
        'water',
        'Rain will water your crops automatically'
      )
    } else if (oldWeather === 'rainy' || oldWeather === 'stormy') {
      showToast(
        getWeatherIcon() + ' ' + getWeatherName(),
        'info',
        'The rain has passed'
      )
    }
  })

  // Set initial weather HUD state
  _updateWeatherHUD()

  // Initialize P2P
  if (window.IPCBridge && window.IPCBridge.available) {
    console.log('[app] Calling IPCBridge.initP2P for farm:', name, 'available=', !!window.IPCBridge.available)
    window.IPCBridge.initP2P(name)
    console.log('[app] IPCBridge.initP2P dispatched')
  } else {
    console.warn('[app] IPCBridge unavailable during startGame')
  }

  // Setup visiting mode callbacks
  window.PlayerController.onVisitChange((info) => {
    p2pState.visiting = info.visiting
    if (!info.visiting) {
      // Returned to own farm
      console.log('[app] Returned to own farm')
    }
  })

  // Show pinned seed hotbar
  loadPinnedSeeds()
  seedHotbar.style.display = 'flex'
  refreshHotbar()

  console.log('[app] Game started - Farm:', name)
}

startBtn.addEventListener('click', () => {
  console.log('[app] Start Farming button clicked')
  startGame()
})
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
              plantedAt: plot.crop.plantedAt, growthAccum: plot.crop.growthAccum,
              witherWarned: plot.crop.witherWarned || false
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
        animalProductsCollected: gameState.animalProductsCollected,
        lastUsedSeed: gameState.lastUsedSeed
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
          type: d.type, x: d.x, z: d.z, color: d.color, variantSeed: d.variantSeed
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
      gameState.lastUsedSeed = gs.lastUsedSeed ?? null
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
            witherWarned: pd.crop.witherWarned || false,
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
      // Apply window glow for the current time of day immediately after load
      applyWindowGlow()
      const effects = getBuildingEffects(farmState.buildings)
      setCapacityBonus(effects.storageBonus)
    }

    // ── Restore decorations ───────────────────────────────────────────────────
    if (saveData.farmState?.decorations) {
      for (const d of saveData.farmState.decorations) {
        const data = createDecoData(d.type, d.x, d.z, d.variantSeed)
        const mesh = createDecoMesh(d.type, data.variantSeed)
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

// ── Keyboard Shortcuts Help Panel ────────────────────────────────────────────
const shortcutsPanel = document.getElementById('shortcuts-panel')
const shortcutsCloseBtn = document.getElementById('shortcuts-close-btn')

function toggleShortcutsPanel () {
  if (!shortcutsPanel) return
  const visible = shortcutsPanel.style.display !== 'none'
  shortcutsPanel.style.display = visible ? 'none' : ''
}

if (shortcutsCloseBtn) {
  shortcutsCloseBtn.addEventListener('click', () => {
    if (shortcutsPanel) shortcutsPanel.style.display = 'none'
  })
}

// ── Farm Stats Panel ─────────────────────────────────────────────────────────
const statsPanel = document.getElementById('stats-panel')
const statsCloseBtn = document.getElementById('stats-close-btn')
const statsBtnEl = document.getElementById('stats-btn')

function openStatsPanel () {
  if (!statsPanel || !gameState.running) return
  // Populate all values from gameState
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = typeof val === 'number' ? val.toLocaleString() : val }
  set('stat-harvests', gameState.totalHarvests)
  set('stat-planted', gameState.totalPlanted)
  set('stat-watered', gameState.totalWatered)
  set('stat-plowed', gameState.totalPlowed)
  set('stat-earned', gameState.totalCoinsEarned)
  set('stat-sold', gameState.itemsSold)
  set('stat-crafted', gameState.itemsCrafted)
  set('stat-trades', gameState.tradesCompleted)
  set('stat-messages', gameState.chatMessages)
  set('stat-gifts', gameState.giftsSent)
  set('stat-visits', gameState.farmsVisited)
  set('stat-coops', gameState.coopCompleted)
  set('stat-fed', gameState.animalsFed)
  set('stat-products', gameState.animalProductsCollected)
  set('stat-sessions', gameState.sessionsPlayed)
  set('stat-level', gameState.level)
  statsPanel.classList.add('visible')
}

function closeStatsPanel () {
  if (statsPanel) statsPanel.classList.remove('visible')
}

function toggleStatsPanel () {
  if (!statsPanel) return
  if (statsPanel.classList.contains('visible')) closeStatsPanel()
  else openStatsPanel()
}

if (statsCloseBtn) statsCloseBtn.addEventListener('click', closeStatsPanel)
if (statsBtnEl) statsBtnEl.addEventListener('click', () => toggleStatsPanel())

// Kick off render loop
console.log('[app] starting game loop via requestAnimationFrame')
requestAnimationFrame(gameLoop)
