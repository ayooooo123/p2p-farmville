import * as THREE from './js/three.module.min.js'
import { initScene, animate as renderScene } from './js/scene.js'
import { CROP_DEFINITIONS, createCropMesh, createWitheredMesh, updateCropGrowth } from './js/crops.js'
import { initMarket, showMarket, hideMarket, getSelectedSeed, clearSelectedSeed, updateSeedStrip } from './js/market.js'
import { TREE_DEFINITIONS, createTreeMesh, createTreeData, updateTreeGrowth, isTreeReady, harvestTree } from './js/trees.js'
import { ANIMAL_DEFINITIONS, createAnimalMesh, createAnimalData, updateAnimalState, feedAnimal, collectAnimalProduct } from './js/animals.js'
import { BUILDING_DEFINITIONS, createBuildingMesh, createBuildingData, getBuildingEffects, updateCraftingQueue, startCrafting } from './js/buildings.js'
import { DECO_DEFINITIONS, createDecoMesh, createDecoData } from './js/decorations.js'
import { VEHICLE_DEFINITIONS, createVehicleMesh, getVehicleSpeedMultiplier } from './js/vehicles.js'
import { initInventory, addItem, removeItem, hasItem, getItemQty, sellItem, getInventory, renderInventoryPanel, setCapacityBonus, getItemCount, getMaxCapacity } from './js/inventory.js'
import * as NeighborRenderer from './js/neighbor-renderer.js'

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
  if (!btn || btn.id === 'market-open-btn' || btn.id === 'inventory-btn') return

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
}

function cancelPlacement () {
  if (!placementMode) return

  if (placementMode.ghostMesh) {
    sceneData.scene.remove(placementMode.ghostMesh)
  }

  placementMode = null

  if (placementIndicator) placementIndicator.style.display = 'none'
  canvas.style.cursor = 'default'
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
      addXP(reward.xp)
      // Add product to inventory
      addItem(tree.type + '_fruit', 1, { name: reward.product, type: 'fruit', sellPrice: reward.coins })
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
      addXP(reward.xp)
      addItem(animal.type + '_product', 1, { name: reward.product, type: 'animal product', sellPrice: reward.coins })
      showFeedback('Collected ' + reward.product + '! +' + reward.coins + ' coins', '#ffd700')
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
      showFeedback('Sold for ' + result.coins + ' coins!', '#ffd700')
      updateHUD()
      renderInventoryUI()
    }
  })
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
function showTooltip (title, info, px, py) {
  if (!tooltipEl) return
  tooltipTitle.textContent = title
  tooltipInfo.textContent = info
  tooltipEl.style.left = (px + 15) + 'px'
  tooltipEl.style.top = (py + 15) + 'px'
  tooltipEl.style.display = 'block'
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
  terrainData.setPlotState(plot.row, plot.col, terrainData.PLOT_STATES.PLOWED)
  showFeedback('Plowed! -' + PLOW_COST + ' coins', '#daa520')
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
  showFeedback('Planted ' + cropDef.name + '! -' + cropDef.seedCost + ' coins', '#32cd32')
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

  // Add harvested crop to inventory
  addItem(plot.crop.type, 1, { name: cropDef.name, type: 'crop', sellPrice: cropDef.sellPrice })

  // Remove crop mesh
  if (plot.cropMesh) {
    sceneData.scene.remove(plot.cropMesh)
    plot.cropMesh = null
  }
  plot.crop = null
  terrainData.setPlotState(plot.row, plot.col, terrainData.PLOT_STATES.PLOWED)
  showFeedback('Harvested ' + cropDef.name + '! +' + cropDef.sellPrice + ' coins, +' + cropDef.xp + ' XP', '#ffd700')
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

// ── Mouse tracking ───────────────────────────────────────────────────────────
canvas.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
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
  if (intersects.length === 0) { hideTooltip(); return }

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

// ── Mouse click -> raycast to plot or object ─────────────────────────────────
canvas.addEventListener('click', (e) => {
  if (!gameState.running || !terrainData) return

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

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
    else deselectTool()
    return
  }

  // I key for inventory
  if (e.key === 'i' || e.key === 'I') {
    if (gameState.running) toggleInventory()
    return
  }

  // Number keys for quick tool select
  const toolKeys = { '1': 'plow', '2': 'plant', '3': 'water', '4': 'harvest', '5': 'remove' }
  if (toolKeys[e.key] && gameState.running) {
    selectTool(toolKeys[e.key])
  }
})

// Inventory button
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
      addXP(5)
      showFeedback('Crafted ' + recipe.output.replace(/_/g, ' ') + '! +' + recipe.value + ' coins', '#daa520')
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
  updateTrees(dtMs)
  updateAnimals(dtMs)
  updateBuildings(dtMs)

  // Energy regen
  regenEnergy(dtMs)

  // P2P: sync farm state periodically
  syncFarmState()

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

// Trigger immediate farm sync after crop actions
function hookFarmSync (fn) {
  return function (...args) {
    const result = fn.apply(this, args)
    syncFarmStateNow()
    return result
  }
}

// Kick off render loop
requestAnimationFrame(gameLoop)
