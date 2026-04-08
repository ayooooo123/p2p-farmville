// ── Crop Almanac ────────────────────────────────────────────────────────────
// Searchable, sortable reference panel showing all crop stats.
// Shows locked crops as greyed-out so players can plan ahead.

import { CROP_DEFINITIONS } from './crops.js'

const panel   = document.getElementById('almanac-panel')
const content = document.getElementById('almanac-content')
const searchEl = document.getElementById('almanac-search')
const sortEl   = document.getElementById('almanac-sort')
const closeBtn = document.getElementById('almanac-close-btn')

let playerLevel = 1

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime (ms) {
  if (!ms || ms <= 0) return '—'
  const s = ms / 1000
  if (s < 60)  return s.toFixed(0) + 's'
  if (s < 3600) return (s / 60).toFixed(0) + 'm'
  return (s / 3600).toFixed(1) + 'h'
}

function profitPerMin (def) {
  if (!def.growTime || def.growTime <= 0) return 0
  const netGain = def.sellPrice - (def.seedCost || 0)
  return (netGain / (def.growTime / 60000)).toFixed(1)
}

// ── Render ───────────────────────────────────────────────────────────────────
function render () {
  if (!content) return

  const query = (searchEl ? searchEl.value.toLowerCase().trim() : '')
  const sort   = sortEl ? sortEl.value : 'level'

  // Build list from CROP_DEFINITIONS (object keyed by cropKey)
  let entries = Object.entries(CROP_DEFINITIONS).map(([key, def]) => ({ key, def }))

  // Filter by search
  if (query) {
    entries = entries.filter(({ key, def }) =>
      (def.name || key).toLowerCase().includes(query) ||
      (def.category || '').toLowerCase().includes(query)
    )
  }

  // Sort
  entries.sort((a, b) => {
    const da = a.def, db = b.def
    switch (sort) {
      case 'price':  return (db.sellPrice || 0) - (da.sellPrice || 0)
      case 'time':   return (da.growTime  || 0) - (db.growTime  || 0)
      case 'profit': return parseFloat(profitPerMin(db)) - parseFloat(profitPerMin(da))
      case 'name':   return (da.name || a.key).localeCompare(db.name || b.key)
      default:       return (da.unlockLevel || 0) - (db.unlockLevel || 0)
    }
  })

  // Build HTML
  const rows = entries.map(({ key, def }) => {
    const locked   = (def.unlockLevel || 0) > playerLevel
    const seedCost = def.seedCost || 0
    const profit   = profitPerMin(def)
    const netGain  = def.sellPrice - seedCost
    const color    = def.color ? `#${def.color.toString(16).padStart(6, '0')}` : '#4caf50'

    return `<div class="alm-row${locked ? ' alm-locked' : ''}">
      <div class="alm-swatch" style="background:${color};"></div>
      <div class="alm-name">
        <span class="alm-crop-name">${def.name || key}</span>
        ${locked ? `<span class="alm-lock">Lv ${def.unlockLevel}</span>` : ''}
      </div>
      <div class="alm-stat" title="Grow time">${fmtTime(def.growTime)}</div>
      <div class="alm-stat alm-price" title="Sell price">${def.sellPrice}🪙</div>
      <div class="alm-stat alm-net${netGain < 0 ? ' alm-neg' : ''}" title="Net gain per harvest">${netGain > 0 ? '+' : ''}${netGain}🪙</div>
      <div class="alm-stat alm-ppm" title="Profit per minute">${profit}/min</div>
      <div class="alm-stat alm-xp" title="XP per harvest">+${def.xp || 0}xp</div>
    </div>`
  }).join('')

  const header = `<div class="alm-header-row">
    <div class="alm-swatch"></div>
    <div class="alm-name">Crop</div>
    <div class="alm-stat">Time</div>
    <div class="alm-stat alm-price">Sell</div>
    <div class="alm-stat alm-net">Net</div>
    <div class="alm-stat alm-ppm">🪙/min</div>
    <div class="alm-stat alm-xp">XP</div>
  </div>`

  content.innerHTML = header + (rows || '<div class="alm-empty">No crops match your search.</div>')
}

// ── Public API ───────────────────────────────────────────────────────────────
export function openAlmanac (level) {
  if (!panel) return
  playerLevel = level || 1
  render()
  panel.style.display = 'flex'
}

export function closeAlmanac () {
  if (panel) panel.style.display = 'none'
}

export function isAlmanacOpen () {
  return panel && panel.style.display !== 'none'
}

// Wire up controls
if (searchEl) searchEl.addEventListener('input', render)
if (sortEl)   sortEl.addEventListener('change', render)
if (closeBtn) closeBtn.addEventListener('click', closeAlmanac)
