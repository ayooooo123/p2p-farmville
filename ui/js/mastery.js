// ── Crop Mastery System ─────────────────────────────────────────────────────
// Tracks harvest count per crop, awards mastery levels with XP bonuses

export const MASTERY_LEVELS = [
  { name: 'Seedling', min: 0, max: 49, stars: 0, color: '#888888', icon: '' },
  { name: 'Bronze', min: 50, max: 149, stars: 1, color: '#cd7f32', icon: '\u2605' },
  { name: 'Silver', min: 150, max: 399, stars: 2, color: '#c0c0c0', icon: '\u2605\u2605' },
  { name: 'Gold', min: 400, max: 799, stars: 3, color: '#ffd700', icon: '\u2605\u2605\u2605' },
  { name: 'Platinum', min: 800, max: Infinity, stars: 4, color: '#e5e4e2', icon: '\u2605\u2605\u2605\u2605' }
]

// masteryData: { [cropKey]: { count: number } }
let masteryData = {}
let onMasteryLevelUp = null // callback(cropKey, newLevel)

export function initMastery (data, levelUpCallback) {
  masteryData = data || {}
  onMasteryLevelUp = levelUpCallback || null
}

export function getMasteryData () {
  return masteryData
}

export function getMasteryLevel (cropKey) {
  const count = (masteryData[cropKey] && masteryData[cropKey].count) || 0
  for (let i = MASTERY_LEVELS.length - 1; i >= 0; i--) {
    if (count >= MASTERY_LEVELS[i].min) return MASTERY_LEVELS[i]
  }
  return MASTERY_LEVELS[0]
}

export function getMasteryCount (cropKey) {
  return (masteryData[cropKey] && masteryData[cropKey].count) || 0
}

export function getMasteryStars (cropKey) {
  return getMasteryLevel(cropKey).stars
}

/**
 * Record a harvest. Returns { xpBonus, leveledUp, newLevel } or null
 */
export function recordHarvest (cropKey) {
  if (!masteryData[cropKey]) {
    masteryData[cropKey] = { count: 0 }
  }

  const oldLevel = getMasteryLevel(cropKey)
  masteryData[cropKey].count++
  const newLevel = getMasteryLevel(cropKey)

  const leveledUp = newLevel.stars > oldLevel.stars
  if (leveledUp && onMasteryLevelUp) {
    onMasteryLevelUp(cropKey, newLevel)
  }

  return {
    xpBonus: newLevel.stars,
    leveledUp,
    newLevel
  }
}

/**
 * Get next mastery level progress info
 */
export function getMasteryProgress (cropKey) {
  const count = getMasteryCount(cropKey)
  const current = getMasteryLevel(cropKey)
  const currentIdx = MASTERY_LEVELS.indexOf(current)

  if (currentIdx >= MASTERY_LEVELS.length - 1) {
    return { current, next: null, progress: 1, remaining: 0 }
  }

  const next = MASTERY_LEVELS[currentIdx + 1]
  const progressInTier = count - current.min
  const tierSize = next.min - current.min
  const progress = tierSize > 0 ? progressInTier / tierSize : 1

  return {
    current,
    next,
    progress: Math.min(1, progress),
    remaining: Math.max(0, next.min - count)
  }
}

/**
 * Render mastery panel into a container element
 */
export function renderMasteryPanel (container, cropDefs) {
  if (!container) return
  container.innerHTML = ''

  const cropKeys = Object.keys(cropDefs)
  if (cropKeys.length === 0) {
    container.innerHTML = '<div class="mastery-empty">No crops available</div>'
    return
  }

  for (const key of cropKeys) {
    const def = cropDefs[key]
    const count = getMasteryCount(key)
    const level = getMasteryLevel(key)
    const prog = getMasteryProgress(key)

    const card = document.createElement('div')
    card.className = 'mastery-card'

    const colorHex = '#' + (def.colors[def.colors.length - 1] || 0x4caf50).toString(16).padStart(6, '0')

    card.innerHTML =
      '<div class="mastery-card-top">' +
        '<div class="mastery-crop-icon" style="background:' + colorHex + '"></div>' +
        '<div class="mastery-crop-info">' +
          '<div class="mastery-crop-name">' + def.name + '</div>' +
          '<div class="mastery-level-name" style="color:' + level.color + '">' +
            level.icon + ' ' + level.name +
          '</div>' +
        '</div>' +
        '<div class="mastery-count">' + count + '</div>' +
      '</div>' +
      '<div class="mastery-bar-wrap">' +
        '<div class="mastery-bar-fill" style="width:' + (prog.progress * 100) + '%;background:' + level.color + '"></div>' +
      '</div>' +
      (prog.next
        ? '<div class="mastery-next">' + prog.remaining + ' more to ' + prog.next.name + '</div>'
        : '<div class="mastery-next" style="color:#e5e4e2">MAX MASTERY</div>')

    container.appendChild(card)
  }
}

/**
 * Get mastery star HTML for display in market/tooltips
 */
export function getMasteryStarHTML (cropKey) {
  const level = getMasteryLevel(cropKey)
  if (level.stars === 0) return ''
  return '<span class="mastery-stars" style="color:' + level.color + '">' + level.icon + '</span>'
}
