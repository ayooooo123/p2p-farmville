/* global THREE */

const PLAYER_SPEED = 15
const FARM_HALF_W = 40
const FARM_HALF_D = 40
const CAMERA_OFFSET = { x: 0, y: 20, z: 25 }
const CAMERA_LOOK_AHEAD = 5

// Extended world bounds for visiting neighbors
const WORLD_HALF_W = 200 // can walk far left/right to visit neighbors
const WORLD_HALF_D = 50 // slightly beyond farm depth

let playerMesh = null
const keys = { w: false, a: false, s: false, d: false }
const playerPos = { x: 0, z: 0 }

// Visiting state
let visiting = false
let visitingNeighborKey = null
let visitingNeighborName = ''
let onVisitChangeCallback = null

function initPlayer (scene) {
  // Simple player: capsule-like shape (cylinder + spheres)
  const group = new window.THREE.Group()

  // Body (cylinder)
  const bodyGeo = new window.THREE.CylinderGeometry(0.4, 0.4, 1.0, 8)
  const bodyMat = new window.THREE.MeshStandardMaterial({ color: 0x2196f3 })
  const body = new window.THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = 0.8
  body.castShadow = true
  group.add(body)

  // Head (sphere)
  const headGeo = new window.THREE.SphereGeometry(0.35, 8, 8)
  const headMat = new window.THREE.MeshStandardMaterial({ color: 0xffcc88 })
  const head = new window.THREE.Mesh(headGeo, headMat)
  head.position.y = 1.55
  head.castShadow = true
  group.add(head)

  // Hat (cone)
  const hatGeo = new window.THREE.ConeGeometry(0.4, 0.4, 8)
  const hatMat = new window.THREE.MeshStandardMaterial({ color: 0x8b4513 })
  const hat = new window.THREE.Mesh(hatGeo, hatMat)
  hat.position.y = 1.95
  hat.castShadow = true
  group.add(hat)

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

  camera.position.x = playerPos.x + CAMERA_OFFSET.x
  camera.position.y = CAMERA_OFFSET.y
  camera.position.z = playerPos.z + CAMERA_OFFSET.z

  camera.lookAt(playerPos.x, 0, playerPos.z - CAMERA_LOOK_AHEAD)
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
