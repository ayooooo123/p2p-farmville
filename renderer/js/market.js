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
let marketSearch = ''

const TABS = [
  { id: 'seeds', label: 'Seeds' },
  { id: 'trees', label: 'Trees' },
  { id: 'animals', label: 'Animals' },
  { id: 'buildings', label: 'Buildings' },
  { id: 'decorations', label: 'Decor' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'items', label: 'Items' }
]

// ── Consumable / Usable Items ──────────────────────────────────────────────
const CONSUMABLE_DEFINITIONS = {
  energy_potion: {
    name: 'Energy Potion',
    description: 'Restores 10 energy instantly.',
    cost: 50,
    level: 1,
    icon: '#5bc8f5',
    usable: true,
    useEffect: { restoreEnergy: 10 },
    sellPrice: 0
  },
  energy_potion_large: {
    name: 'Super Energy Potion',
    description: 'Restores 25 energy instantly.',
    cost: 110,
    level: 5,
    icon: '#2288ff',
    usable: true,
    useEffect: { restoreEnergy: 25 },
    sellPrice: 0
  }
}

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

function _ensureSearchBar (playerLevel) {
  if (marketPanel.querySelector('#market-search-wrap')) return

  const wrap = document.createElement('div')
  wrap.id = 'market-search-wrap'

  const input = document.createElement('input')
  input.id = 'market-search'
  input.type = 'search'
  input.placeholder = 'Search...'
  input.value = marketSearch
  input.autocomplete = 'off'

  const clear = document.createElement('button')
  clear.id = 'market-search-clear'
  clear.textContent = 'x'
  clear.title = 'Clear search'
  clear.style.display = marketSearch ? '' : 'none'

  input.addEventListener('input', () => {
    marketSearch = input.value.trim().toLowerCase()
    clear.style.display = marketSearch ? '' : 'none'
    const level = window._gameState ? window._gameState.level : playerLevel
    _setTab(activeTab, level)
    // Restore focus after re-render (which rebuilds the search bar node)
    const newInput = marketPanel.querySelector('#market-search')
    if (newInput) { newInput.focus(); newInput.selectionStart = newInput.selectionEnd = newInput.value.length }
  })

  clear.addEventListener('click', () => {
    marketSearch = ''
    const level = window._gameState ? window._gameState.level : playerLevel
    _setTab(activeTab, level)
  })

  wrap.appendChild(input)
  wrap.appendChild(clear)

  const tabBar = marketPanel.querySelector('#market-tabs')
  if (tabBar) tabBar.after(wrap)
}

function _setTab (tabId, playerLevel) {
  // Update tab buttons
  const tabBtns = marketPanel.querySelectorAll('.market-tab-btn')
  tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId))

  // Rebuild search bar each render so it reflects current search state
  const oldWrap = marketPanel.querySelector('#market-search-wrap')
  if (oldWrap) oldWrap.remove()
  _ensureSearchBar(playerLevel)

  const seedGrid = document.getElementById('market-seed-grid')
  if (!seedGrid) return
  seedGrid.innerHTML = ''

  const q = marketSearch
  switch (tabId) {
    case 'seeds': _renderSeeds(seedGrid, playerLevel, q); break
    case 'trees': _renderCategoryItems(seedGrid, TREE_DEFINITIONS, 'tree', playerLevel, q); break
    case 'animals': _renderCategoryItems(seedGrid, ANIMAL_DEFINITIONS, 'animal', playerLevel, q); break
    case 'buildings': _renderCategoryItems(seedGrid, BUILDING_DEFINITIONS, 'building', playerLevel, q); break
    case 'decorations': _renderCategoryItems(seedGrid, DECO_DEFINITIONS, 'decoration', playerLevel, q); break
    case 'vehicles': _renderCategoryItems(seedGrid, VEHICLE_DEFINITIONS, 'vehicle', playerLevel, q); break
    case 'items': _renderConsumables(seedGrid, playerLevel, q); break
  }
}

function _renderSeeds (grid, playerLevel, q = '') {
  const sortedCrops = Object.entries(CROP_DEFINITIONS)
    .filter(([, def]) => def.level <= playerLevel)
    .filter(([, def]) => !q || def.name.toLowerCase().includes(q))
    .sort((a, b) => a[1].level - b[1].level || a[1].seedCost - b[1].seedCost)

  if (sortedCrops.length === 0) {
    grid.innerHTML = '<div class="market-empty">' + (q ? 'No results for "' + q + '"' : 'No seeds available at your level') + '</div>'
    return
  }

  for (const [key, def] of sortedCrops) {
    const card = document.createElement('div')
    card.className = 'market-seed-card'
    card.dataset.cropKey = key

    const growTimeSec = Math.round(def.growTime / 1000)
    const growTimeStr = growTimeSec >= 60 ? Math.round(growTimeSec / 60) + 'm' : growTimeSec + 's'
    const profit = def.sellPrice - def.seedCost
    const coinsPerMin = growTimeSec > 0 ? (profit / (growTimeSec / 60)).toFixed(1) : 0
    const profitClass = profit >= 0 ? 'seed-profit-pos' : 'seed-profit-neg'

    card.innerHTML = `
      <div class="seed-color-icon" style="background: #${def.colors[def.colors.length - 1].toString(16).padStart(6, '0')};"></div>
      <div class="seed-name">${def.name}</div>
      <div class="seed-stats">
        <span class="seed-cost">${def.seedCost} coins</span>
        <span class="seed-sell">Sells: ${def.sellPrice}</span>
        <span class="${profitClass}">${profit >= 0 ? '+' : ''}${profit} profit</span>
        <span class="seed-time">${growTimeStr}</span>
        <span class="seed-cpm" title="Coins per minute">${coinsPerMin}/min</span>
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

function _renderCategoryItems (grid, definitions, category, playerLevel, q = '') {
  const sorted = Object.entries(definitions)
    .filter(([, def]) => def.level <= playerLevel)
    .filter(([, def]) => !q || def.name.toLowerCase().includes(q))
    .sort((a, b) => a[1].level - b[1].level || a[1].cost - b[1].cost)

  if (sorted.length === 0) {
    grid.innerHTML = '<div class="market-empty">' + (q ? 'No results for "' + q + '"' : 'No items available at your level') + '</div>'
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
    if (def.effect) {
      const effectLabel = def.effect === 'action_speed_3x' ? 'Plow & Water: FREE energy'
        : def.effect === 'plant_speed_3x'   ? 'Plant: FREE energy'
        : def.effect === 'harvest_speed_3x' ? 'Harvest: FREE energy'
        : def.effect
      statsHtml += `<span class="seed-xp">${effectLabel}</span>`
    }
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

function _renderConsumables (grid, playerLevel, q = '') {
  const available = Object.entries(CONSUMABLE_DEFINITIONS)
    .filter(([, def]) => def.level <= playerLevel)
    .filter(([, def]) => !q || def.name.toLowerCase().includes(q))
    .sort((a, b) => a[1].cost - b[1].cost)

  if (available.length === 0) {
    grid.innerHTML = '<div class="market-empty">' + (q ? 'No results for "' + q + '"' : 'No items available at your level') + '</div>'
    return
  }

  for (const [key, def] of available) {
    const card = document.createElement('div')
    card.className = 'market-seed-card market-item-card market-consumable-card'
    card.dataset.itemKey = key

    card.innerHTML = `
      <div class="consumable-icon" style="background: ${def.icon};"></div>
      <div class="seed-name">${def.name}</div>
      <div class="consumable-desc">${def.description}</div>
      <div class="seed-stats">
        <span class="seed-cost">${def.cost} coins</span>
        <span class="seed-level">Lv.${def.level}</span>
      </div>
      <button class="market-buy-btn">Buy</button>
    `

    const buyBtn = card.querySelector('.market-buy-btn')
    buyBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      if (onBuyItem) onBuyItem({ category: 'consumable', key, def })
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

function setSelectedSeed (key) {
  selectedSeed = key
}

// ── Pinned Seed Hotbar ────────────────────────────────────────────────────────
let pinnedSeeds = [null, null, null, null, null]

function loadPinnedSeeds () {
  try {
    const stored = localStorage.getItem('p2p-farmville-pinned-seeds')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length === 5) pinnedSeeds = parsed
    }
  } catch (e) {}
}

function savePinnedSeeds () {
  localStorage.setItem('p2p-farmville-pinned-seeds', JSON.stringify(pinnedSeeds))
}

function pinSeedToSlot (slotIndex, cropKey) {
  pinnedSeeds[slotIndex] = cropKey
  savePinnedSeeds()
}

function getPinnedSeeds () {
  return pinnedSeeds
}

/**
 * Render the always-visible pinned seed hotbar.
 * @param {HTMLElement} hotbarEl - the #seed-hotbar container
 * @param {function} onSelect - called with (cropKey, slotIndex) when a filled slot is clicked
 */
function renderSeedHotbar (hotbarEl, onSelect) {
  if (!hotbarEl) return
  hotbarEl.innerHTML = ''

  for (let i = 0; i < 5; i++) {
    const cropKey = pinnedSeeds[i]
    const def = cropKey ? CROP_DEFINITIONS[cropKey] : null
    const color = def
      ? '#' + def.colors[def.colors.length - 1].toString(16).padStart(6, '0')
      : '#555'

    const btn = document.createElement('button')
    btn.className = 'hotbar-slot' +
      (cropKey ? ' filled' : ' empty') +
      (cropKey && cropKey === selectedSeed ? ' selected' : '')
    btn.title = def
      ? `Slot ${i + 1}: ${def.name} (Ctrl+${i + 1})`
      : `Slot ${i + 1}: Empty — right-click a seed in the strip to pin`
    btn.dataset.slotIndex = i
    if (def) btn.style.setProperty('--slot-color', color)

    btn.innerHTML =
      `<span class="hotbar-circle" style="background:${color};"></span>` +
      `<span class="hotbar-num">${i + 1}</span>`

    btn.addEventListener('click', () => {
      if (cropKey && onSelect) onSelect(cropKey, i)
    })

    hotbarEl.appendChild(btn)
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

window.MarketSystem = { initMarket, showMarket, hideMarket, toggleMarket, getSelectedSeed, clearSelectedSeed, setSelectedSeed, updateSeedStrip, loadPinnedSeeds, savePinnedSeeds, pinSeedToSlot, getPinnedSeeds, renderSeedHotbar, CONSUMABLE_DEFINITIONS }
export { initMarket, showMarket, hideMarket, toggleMarket, getSelectedSeed, clearSelectedSeed, setSelectedSeed, updateSeedStrip, loadPinnedSeeds, savePinnedSeeds, pinSeedToSlot, getPinnedSeeds, renderSeedHotbar, CONSUMABLE_DEFINITIONS }
