import { CROP_DEFINITIONS } from './crops.js'
import { TREE_DEFINITIONS } from './trees.js'
import { ANIMAL_DEFINITIONS } from './animals.js'
import { BUILDING_DEFINITIONS } from './buildings.js'
import { DECO_DEFINITIONS } from './decorations.js'
import { VEHICLE_DEFINITIONS } from './vehicles.js'

let marketPanel = null
let selectedSeed = null
let onSeedSelect = null
let onBuyItem = null
let activeTab = 'seeds'

const TABS = [
  { id: 'seeds', label: 'Seeds' },
  { id: 'trees', label: 'Trees' },
  { id: 'animals', label: 'Animals' },
  { id: 'buildings', label: 'Buildings' },
  { id: 'decorations', label: 'Decor' },
  { id: 'vehicles', label: 'Vehicles' }
]

/**
 * Initialize the market UI
 * @param {function} seedSelectCallback - called with crop key when seed selected
 * @param {function} buyCallback - called with { category, key, def } when buying non-seed items
 */
function initMarket (seedSelectCallback, buyCallback) {
  onSeedSelect = seedSelectCallback
  onBuyItem = buyCallback
  marketPanel = document.getElementById('market-panel')
  const closeBtn = document.getElementById('market-close-btn')
  const openBtn = document.getElementById('market-open-btn')

  if (closeBtn) {
    closeBtn.addEventListener('click', () => { hideMarket() })
  }
  if (openBtn) {
    openBtn.addEventListener('click', () => { toggleMarket() })
  }
}

/**
 * Show market panel with tab content filtered by player level
 * @param {number} playerLevel
 */
function showMarket (playerLevel) {
  if (!marketPanel) return
  selectedSeed = null

  const headerH2 = marketPanel.querySelector('#market-header h2')
  if (headerH2) headerH2.textContent = 'Market'

  // Build tabs if not already present
  _ensureTabs()

  // Set active tab and render
  _setTab(activeTab, playerLevel)

  marketPanel.classList.add('visible')
}

function _ensureTabs () {
  let tabBar = marketPanel.querySelector('#market-tabs')
  if (tabBar) return

  tabBar = document.createElement('div')
  tabBar.id = 'market-tabs'

  for (const tab of TABS) {
    const btn = document.createElement('button')
    btn.className = 'market-tab-btn' + (tab.id === activeTab ? ' active' : '')
    btn.dataset.tab = tab.id
    btn.textContent = tab.label
    btn.addEventListener('click', () => {
      activeTab = tab.id
      const level = window._gameState ? window._gameState.level : 1
      _setTab(tab.id, level)
    })
    tabBar.appendChild(btn)
  }

  const header = marketPanel.querySelector('#market-header')
  if (header) {
    header.after(tabBar)
  }
}

function _setTab (tabId, playerLevel) {
  // Update tab buttons
  const tabBtns = marketPanel.querySelectorAll('.market-tab-btn')
  tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId))

  const seedGrid = document.getElementById('market-seed-grid')
  if (!seedGrid) return
  seedGrid.innerHTML = ''

  switch (tabId) {
    case 'seeds': _renderSeeds(seedGrid, playerLevel); break
    case 'trees': _renderCategoryItems(seedGrid, TREE_DEFINITIONS, 'tree', playerLevel); break
    case 'animals': _renderCategoryItems(seedGrid, ANIMAL_DEFINITIONS, 'animal', playerLevel); break
    case 'buildings': _renderCategoryItems(seedGrid, BUILDING_DEFINITIONS, 'building', playerLevel); break
    case 'decorations': _renderCategoryItems(seedGrid, DECO_DEFINITIONS, 'decoration', playerLevel); break
    case 'vehicles': _renderCategoryItems(seedGrid, VEHICLE_DEFINITIONS, 'vehicle', playerLevel); break
  }
}

function _renderSeeds (grid, playerLevel) {
  const sortedCrops = Object.entries(CROP_DEFINITIONS)
    .filter(([, def]) => def.level <= playerLevel)
    .sort((a, b) => a[1].level - b[1].level || a[1].seedCost - b[1].seedCost)

  for (const [key, def] of sortedCrops) {
    const card = document.createElement('div')
    card.className = 'market-seed-card'
    card.dataset.cropKey = key

    const growTimeSec = Math.round(def.growTime / 1000)
    const growTimeStr = growTimeSec >= 60 ? Math.round(growTimeSec / 60) + 'm' : growTimeSec + 's'

    card.innerHTML = `
      <div class="seed-color-icon" style="background: #${def.colors[def.colors.length - 1].toString(16).padStart(6, '0')};"></div>
      <div class="seed-name">${def.name}</div>
      <div class="seed-stats">
        <span class="seed-cost">${def.seedCost} coins</span>
        <span class="seed-sell">Sells: ${def.sellPrice}</span>
        <span class="seed-time">${growTimeStr}</span>
        <span class="seed-xp">+${def.xp} XP</span>
      </div>
      <div class="seed-level">Lv.${def.level}</div>
    `

    card.addEventListener('click', () => {
      const prev = grid.querySelector('.market-seed-card.selected')
      if (prev) prev.classList.remove('selected')
      card.classList.add('selected')
      selectedSeed = key
      if (onSeedSelect) onSeedSelect(key)
    })

    grid.appendChild(card)
  }
}

function _renderCategoryItems (grid, definitions, category, playerLevel) {
  const sorted = Object.entries(definitions)
    .filter(([, def]) => def.level <= playerLevel)
    .sort((a, b) => a[1].level - b[1].level || a[1].cost - b[1].cost)

  if (sorted.length === 0) {
    grid.innerHTML = '<div class="market-empty">No items available at your level</div>'
    return
  }

  for (const [key, def] of sorted) {
    const card = document.createElement('div')
    card.className = 'market-seed-card market-item-card'
    card.dataset.itemKey = key

    let statsHtml = `<span class="seed-cost">${def.cost} coins</span>`

    if (def.sellPrice) statsHtml += `<span class="seed-sell">Earns: ${def.sellPrice}</span>`
    if (def.product) statsHtml += `<span class="seed-time">${def.product}</span>`
    if (def.harvestTime) {
      const timeSec = Math.round(def.harvestTime / 1000)
      statsHtml += `<span class="seed-time">${timeSec >= 60 ? Math.round(timeSec / 60) + 'm' : timeSec + 's'}</span>`
    }
    if (def.xp) statsHtml += `<span class="seed-xp">+${def.xp} XP</span>`
    if (def.effect) statsHtml += `<span class="seed-xp">${def.effect}</span>`
    if (def.type) statsHtml += `<span class="seed-time">${def.type}</span>`
    if (def.bonus) statsHtml += `<span class="seed-xp">+${def.bonus} beauty</span>`

    card.innerHTML = `
      <div class="seed-name">${def.name}</div>
      <div class="seed-stats">${statsHtml}</div>
      <div class="seed-level">Lv.${def.level}</div>
      <button class="market-buy-btn">Buy</button>
    `

    const buyBtn = card.querySelector('.market-buy-btn')
    buyBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      if (onBuyItem) onBuyItem({ category, key, def })
    })

    grid.appendChild(card)
  }
}

function hideMarket () {
  if (marketPanel) marketPanel.classList.remove('visible')
}

function toggleMarket () {
  if (marketPanel && marketPanel.classList.contains('visible')) {
    hideMarket()
  } else {
    showMarket(window._gameState ? window._gameState.level : 1)
  }
}

function getSelectedSeed () {
  return selectedSeed
}

function clearSelectedSeed () {
  selectedSeed = null
  if (marketPanel) {
    const prev = marketPanel.querySelector('.market-seed-card.selected')
    if (prev) prev.classList.remove('selected')
  }
}

/**
 * Update seed selector strip (shown when plant tool is active)
 */
function updateSeedStrip (playerLevel, stripEl, onSelect) {
  if (!stripEl) return
  stripEl.innerHTML = ''

  const sortedCrops = Object.entries(CROP_DEFINITIONS)
    .filter(([, def]) => def.level <= playerLevel)
    .sort((a, b) => a[1].level - b[1].level || a[1].seedCost - b[1].seedCost)

  for (const [key, def] of sortedCrops) {
    const btn = document.createElement('button')
    btn.className = 'seed-strip-btn'
    if (key === selectedSeed) btn.classList.add('selected')
    btn.dataset.cropKey = key
    btn.title = `${def.name} (${def.seedCost} coins)`
    btn.innerHTML = `<span class="seed-strip-icon" style="background: #${def.colors[def.colors.length - 1].toString(16).padStart(6, '0')};"></span><span class="seed-strip-name">${def.name}</span>`

    btn.addEventListener('click', () => {
      stripEl.querySelectorAll('.seed-strip-btn.selected').forEach(b => b.classList.remove('selected'))
      btn.classList.add('selected')
      selectedSeed = key
      if (onSelect) onSelect(key)
    })

    stripEl.appendChild(btn)
  }
}

window.MarketSystem = { initMarket, showMarket, hideMarket, toggleMarket, getSelectedSeed, clearSelectedSeed, updateSeedStrip }
export { initMarket, showMarket, hideMarket, toggleMarket, getSelectedSeed, clearSelectedSeed, updateSeedStrip }
