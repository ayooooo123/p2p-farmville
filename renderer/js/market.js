import { CROP_DEFINITIONS } from './crops.js'

let marketPanel = null
let selectedSeed = null
let onSeedSelect = null

/**
 * Initialize the market UI
 * @param {function} seedSelectCallback - called with crop key when seed selected
 */
function initMarket (seedSelectCallback) {
  onSeedSelect = seedSelectCallback
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
 * Show market panel with seeds filtered by player level
 * @param {number} playerLevel
 */
function showMarket (playerLevel) {
  if (!marketPanel) return
  selectedSeed = null

  const seedGrid = document.getElementById('market-seed-grid')
  if (!seedGrid) return

  seedGrid.innerHTML = ''

  // Sort by level then cost
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
      // Deselect previous
      const prev = seedGrid.querySelector('.market-seed-card.selected')
      if (prev) prev.classList.remove('selected')

      card.classList.add('selected')
      selectedSeed = key
      if (onSeedSelect) onSeedSelect(key)
    })

    seedGrid.appendChild(card)
  }

  marketPanel.classList.add('visible')
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
 * @param {number} playerLevel
 * @param {HTMLElement} stripEl
 * @param {function} onSelect
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
