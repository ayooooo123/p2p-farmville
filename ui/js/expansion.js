// ── Farm Expansion System ───────────────────────────────────────────────────
// Allows players to expand their farm grid by purchasing expansion tiers

import * as THREE from './three.module.min.js'

export const EXPANSION_DEFINITIONS = [
  { tier: 1, gridSize: 24, cost: 5000, farmCash: 0, level: 5, label: 'Small Expansion' },
  { tier: 2, gridSize: 28, cost: 15000, farmCash: 0, level: 8, label: 'Medium Expansion' },
  { tier: 3, gridSize: 32, cost: 30000, farmCash: 0, level: 12, label: 'Large Expansion' },
  { tier: 4, gridSize: 36, cost: 50000, farmCash: 5, level: 16, label: 'Great Expansion' },
  { tier: 5, gridSize: 40, cost: 80000, farmCash: 10, level: 20, label: 'Grand Expansion' },
  { tier: 6, gridSize: 44, cost: 120000, farmCash: 15, level: 25, label: 'Mighty Expansion' },
  { tier: 7, gridSize: 48, cost: 180000, farmCash: 20, level: 30, label: 'Epic Expansion' },
  { tier: 8, gridSize: 52, cost: 260000, farmCash: 30, level: 35, label: 'Legendary Expansion' },
  { tier: 9, gridSize: 56, cost: 370000, farmCash: 40, level: 40, label: 'Mythic Expansion' },
  { tier: 10, gridSize: 60, cost: 500000, farmCash: 50, level: 45, label: 'Ultimate Expansion' }
]

const BASE_GRID_SIZE = 20
const PLOT_SIZE = 2

const COLORS = {
  grass: 0x4a7c2e,
  grassAlt: 0x3f7028,
  plowed: 0x6b4226,
  plowedDark: 0x5a3520,
  path: 0xc2a66e,
  expansion_preview: 0x2a5c1e
}

let currentTier = 0
let scene = null
let previewMeshes = []

export function initExpansion (sceneRef, tier) {
  scene = sceneRef
  currentTier = tier || 0
}

export function getCurrentTier () {
  return currentTier
}

export function getCurrentGridSize () {
  if (currentTier === 0) return BASE_GRID_SIZE
  const def = EXPANSION_DEFINITIONS[currentTier - 1]
  return def ? def.gridSize : BASE_GRID_SIZE
}

export function getNextExpansion () {
  if (currentTier >= EXPANSION_DEFINITIONS.length) return null
  return EXPANSION_DEFINITIONS[currentTier]
}

export function canAffordExpansion (coins, level) {
  const next = getNextExpansion()
  if (!next) return false
  return coins >= next.cost && level >= next.level
}

/**
 * Perform expansion. Returns { newGridSize, newPlots, tier } or null.
 * The caller (app.js) is responsible for rebuilding the terrain.
 */
export function purchaseExpansion () {
  if (currentTier >= EXPANSION_DEFINITIONS.length) return null
  const def = EXPANSION_DEFINITIONS[currentTier]
  currentTier++
  clearPreview()
  return {
    tier: currentTier,
    newGridSize: def.gridSize,
    cost: def.cost,
    farmCash: def.farmCash,
    label: def.label
  }
}

/**
 * Show preview of expansion area (border markers)
 */
export function showExpansionPreview () {
  clearPreview()
  if (!scene) return

  const next = getNextExpansion()
  if (!next) return

  const currentSize = getCurrentGridSize()
  const newSize = next.gridSize
  const currentHalf = (currentSize * PLOT_SIZE) / 2
  const newHalf = (newSize * PLOT_SIZE) / 2

  const previewMat = new THREE.MeshStandardMaterial({
    color: COLORS.expansion_preview,
    transparent: true,
    opacity: 0.3
  })

  // Right expansion strip
  const rightWidth = newHalf - currentHalf
  if (rightWidth > 0) {
    const rightGeo = new THREE.BoxGeometry(rightWidth, 0.05, newSize * PLOT_SIZE)
    const right = new THREE.Mesh(rightGeo, previewMat)
    right.position.set(currentHalf + rightWidth / 2, 0.02, 0)
    right.receiveShadow = true
    scene.add(right)
    previewMeshes.push(right)
  }

  // Left expansion strip
  if (rightWidth > 0) {
    const leftGeo = new THREE.BoxGeometry(rightWidth, 0.05, newSize * PLOT_SIZE)
    const left = new THREE.Mesh(leftGeo, previewMat)
    left.position.set(-(currentHalf + rightWidth / 2), 0.02, 0)
    left.receiveShadow = true
    scene.add(left)
    previewMeshes.push(left)
  }

  // Top expansion strip
  const topGeo = new THREE.BoxGeometry(currentSize * PLOT_SIZE, 0.05, rightWidth)
  const top = new THREE.Mesh(topGeo, previewMat)
  top.position.set(0, 0.02, -(currentHalf + rightWidth / 2))
  top.receiveShadow = true
  scene.add(top)
  previewMeshes.push(top)

  // Bottom expansion strip
  const bottomGeo = new THREE.BoxGeometry(currentSize * PLOT_SIZE, 0.05, rightWidth)
  const bottom = new THREE.Mesh(bottomGeo, previewMat)
  bottom.position.set(0, 0.02, currentHalf + rightWidth / 2)
  bottom.receiveShadow = true
  scene.add(bottom)
  previewMeshes.push(bottom)

  // Border markers (glowing posts at new corners)
  const markerMat = new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    emissive: 0x00ff88,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.7
  })

  for (const xSign of [-1, 1]) {
    for (const zSign of [-1, 1]) {
      const markerGeo = new THREE.CylinderGeometry(0.2, 0.2, 2, 8)
      const marker = new THREE.Mesh(markerGeo, markerMat)
      marker.position.set(xSign * newHalf, 1, zSign * newHalf)
      scene.add(marker)
      previewMeshes.push(marker)
    }
  }
}

export function clearPreview () {
  for (const mesh of previewMeshes) {
    if (scene) scene.remove(mesh)
    if (mesh.geometry) mesh.geometry.dispose()
    if (mesh.material) mesh.material.dispose()
  }
  previewMeshes = []
}

/**
 * Render expansion panel into container
 */
export function renderExpansionPanel (container, playerCoins, playerLevel) {
  if (!container) return
  container.innerHTML = ''

  // Current farm info
  const currentSize = getCurrentGridSize()
  const infoDiv = document.createElement('div')
  infoDiv.className = 'expansion-current-info'
  infoDiv.innerHTML =
    '<div class="expansion-farm-size">Current Farm: ' + currentSize + 'x' + currentSize + ' plots</div>' +
    '<div class="expansion-tier-info">Expansion Tier: ' + currentTier + '/' + EXPANSION_DEFINITIONS.length + '</div>'
  container.appendChild(infoDiv)

  // Expansion tiers
  const tiersDiv = document.createElement('div')
  tiersDiv.className = 'expansion-tiers'

  for (let i = 0; i < EXPANSION_DEFINITIONS.length; i++) {
    const def = EXPANSION_DEFINITIONS[i]
    const purchased = i < currentTier
    const isNext = i === currentTier
    const canAfford = playerCoins >= def.cost && playerLevel >= def.level

    const card = document.createElement('div')
    card.className = 'expansion-tier-card' +
      (purchased ? ' purchased' : '') +
      (isNext ? ' next' : '') +
      (!purchased && !isNext ? ' future' : '')

    let costText = def.cost.toLocaleString() + ' coins'
    if (def.farmCash > 0) costText += ' + ' + def.farmCash + ' FC'

    card.innerHTML =
      '<div class="expansion-tier-header">' +
        '<span class="expansion-tier-label">' + def.label + '</span>' +
        '<span class="expansion-tier-num">Tier ' + def.tier + '</span>' +
      '</div>' +
      '<div class="expansion-tier-details">' +
        '<div class="expansion-size">' + def.gridSize + 'x' + def.gridSize + ' plots</div>' +
        '<div class="expansion-cost">' + costText + '</div>' +
        '<div class="expansion-level-req">Requires Level ' + def.level + '</div>' +
      '</div>' +
      (purchased
        ? '<div class="expansion-status purchased-status">Purchased</div>'
        : isNext
          ? '<button class="expansion-buy-btn" ' + (!canAfford ? 'disabled' : '') + '>Expand</button>'
          : '<div class="expansion-status">Locked</div>')

    tiersDiv.appendChild(card)
  }

  container.appendChild(tiersDiv)
}
