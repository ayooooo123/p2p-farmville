/* global THREE */

const PLAYER_SPEED = 15
const FARM_HALF_W = 40
const FARM_HALF_D = 40

// Extended world bounds for visiting neighbors
const WORLD_HALF_W = 200 // can walk far left/right to visit neighbors
const WORLD_HALF_D = 50 // slightly beyond farm depth

let playerMesh = null
let dirIndicator = null
const keys = { w: false, a: false, s: false, d: false }
const playerPos = { x: 0, z: 0 }

// Visiting state
let visiting = false
let visitingNeighborKey = null
let visitingNeighborName = ''
let onVisitChangeCallback = null

function initPlayer (scene) {
  // Flat player: colored circle with direction triangle (top-down view)
  const group = new window.THREE.Group()

  // Body circle (blue)
  const bodyGeo = new window.THREE.CircleGeometry(0.5, 16)
  const bodyMat = new window.THREE.MeshStandardMaterial({ color: 0x2196f3 })
  const body = new window.THREE.Mesh(bodyGeo, bodyMat)
  body.rotation.x = -Math.PI / 2
  body.position.y = 0.03
  group.add(body)

  // Head/skin inner circle
  const headGeo = new window.THREE.CircleGeometry(0.25, 12)
  const headMat = new window.THREE.MeshStandardMaterial({ color: 0xffcc88 })
  const head = new window.THREE.Mesh(headGeo, headMat)
  head.rotation.x = -Math.PI / 2
  head.position.y = 0.035
  group.add(head)

  // Direction indicator (triangle pointing forward)
  const triShape = new window.THREE.Shape()
  triShape.moveTo(0, -0.7)
  triShape.lineTo(-0.15, -0.45)
  triShape.lineTo(0.15, -0.45)
  triShape.closePath()
  const triGeo = new window.THREE.ShapeGeometry(triShape)
  const triMat = new window.THREE.MeshStandardMaterial({ color: 0x1565c0 })
  dirIndicator = new window.THREE.Mesh(triGeo, triMat)
  dirIndicator.rotation.x = -Math.PI / 2
  dirIndicator.position.y = 0.04
  group.add(dirIndicator)

  group.position.set(0, 0, 0)
  scene.add(group)
  playerMesh = group

  // Key listeners
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase()
    if (key in keys) keys[key] = true
  })

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase()
    if (key in keys) keys[key] = false
  })

  return playerMesh
}

function updatePlayer (dt) {
  if (!playerMesh) return

  let dx = 0
  let dz = 0

  if (keys.w) dz -= 1
  if (keys.s) dz += 1
  if (keys.a) dx -= 1
  if (keys.d) dx += 1

  // Normalize diagonal movement
  if (dx !== 0 && dz !== 0) {
    const len = Math.sqrt(dx * dx + dz * dz)
    dx /= len
    dz /= len
  }

  playerPos.x += dx * PLAYER_SPEED * dt
  playerPos.z += dz * PLAYER_SPEED * dt

  // Clamp to world bounds (extended for visiting)
  playerPos.x = Math.max(-WORLD_HALF_W, Math.min(WORLD_HALF_W, playerPos.x))
  playerPos.z = Math.max(-WORLD_HALF_D, Math.min(WORLD_HALF_D, playerPos.z))

  playerMesh.position.x = playerPos.x
  playerMesh.position.z = playerPos.z

  // Rotate player to face movement direction
  if (dx !== 0 || dz !== 0) {
    playerMesh.rotation.y = Math.atan2(dx, dz)
  }

  // Check if player has crossed farm boundary
  checkVisitingState()
}

function updateCamera (camera) {
  if (!playerMesh || !camera) return

  // Top-down: camera directly above player, looking straight down
  camera.position.x = playerPos.x
  camera.position.y = 50
  camera.position.z = playerPos.z
}

function getPlayerPos () {
  return { ...playerPos }
}

// ── Visiting mode ───────────────────────────────────────────────────────────

function checkVisitingState () {
  const isOutsideFarm = Math.abs(playerPos.x) > FARM_HALF_W + 2 ||
                         Math.abs(playerPos.z) > FARM_HALF_D + 2

  if (isOutsideFarm && !visiting) {
    visiting = true
    if (onVisitChangeCallback) {
      onVisitChangeCallback({ visiting: true, position: { ...playerPos } })
    }
  } else if (!isOutsideFarm && visiting) {
    visiting = false
    visitingNeighborKey = null
    visitingNeighborName = ''
    if (onVisitChangeCallback) {
      onVisitChangeCallback({ visiting: false, position: { ...playerPos } })
    }
  }
}

function isVisiting () {
  return visiting
}

function getVisitingInfo () {
  return {
    visiting,
    neighborKey: visitingNeighborKey,
    neighborName: visitingNeighborName
  }
}

function setVisitingNeighbor (key, name) {
  visitingNeighborKey = key
  visitingNeighborName = name || ''
}

function returnToFarm () {
  playerPos.x = 0
  playerPos.z = 0
  if (playerMesh) {
    playerMesh.position.x = 0
    playerMesh.position.z = 0
  }
  visiting = false
  visitingNeighborKey = null
  visitingNeighborName = ''
  if (onVisitChangeCallback) {
    onVisitChangeCallback({ visiting: false, position: { x: 0, z: 0 } })
  }
}

function onVisitChange (callback) {
  onVisitChangeCallback = callback
}

function isOnOwnFarm () {
  return Math.abs(playerPos.x) <= FARM_HALF_W && Math.abs(playerPos.z) <= FARM_HALF_D
}

window.PlayerController = {
  initPlayer,
  updatePlayer,
  updateCamera,
  getPlayerPos,
  isVisiting,
  getVisitingInfo,
  setVisitingNeighbor,
  returnToFarm,
  onVisitChange,
  isOnOwnFarm
}
