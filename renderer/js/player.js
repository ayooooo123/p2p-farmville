import * as THREE from './three.module.min.js'

const PLAYER_SPEED = 15
const FARM_HALF_W = 40
const FARM_HALF_D = 40

// Extended world bounds for visiting neighbors
const WORLD_HALF_W = 200 // can walk far left/right to visit neighbors
const WORLD_HALF_D = 50 // slightly beyond farm depth

let playerMesh = null
let playerBody = null   // cylinder body ref for bob
let playerHead = null   // sphere head ref for bob
let leftLegPivot = null   // Group pivot at hip for left leg swing
let rightLegPivot = null  // Group pivot at hip for right leg swing
let leftArmPivot = null   // Group pivot at shoulder for left arm swing
let rightArmPivot = null  // Group pivot at shoulder for right arm swing
let dirIndicator = null
let bobTime = 0
const keys = { w: false, a: false, s: false, d: false }
const playerPos = { x: 0, z: 0 }
let isMoving = false

// Visiting state
let visiting = false
let visitingNeighborKey = null
let visitingNeighborName = ''
let onVisitChangeCallback = null

function initPlayer (scene) {
  // 3D capsule-like player: cylinder body + sphere head with shadow
  const group = new THREE.Group()

  // Body: cylinder (torso)
  const bodyGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.72, 12)
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2196f3 })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = 0.46
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)
  playerBody = body

  // Legs: two small cylinders below body, wrapped in pivot groups for swing animation
  // Each pivot sits at hip height (y=0.30); the mesh is offset -0.15 so it hangs down from the pivot.
  const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 8)
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1565c0 })

  const leftLegPivotGroup = new THREE.Group()
  leftLegPivotGroup.position.set(-0.14, 0.30, 0)
  const leftLegMesh = new THREE.Mesh(legGeo, legMat)
  leftLegMesh.position.set(0, -0.15, 0)
  leftLegMesh.castShadow = true
  leftLegPivotGroup.add(leftLegMesh)
  group.add(leftLegPivotGroup)
  leftLegPivot = leftLegPivotGroup

  const rightLegPivotGroup = new THREE.Group()
  rightLegPivotGroup.position.set(0.14, 0.30, 0)
  const rightLegMesh = new THREE.Mesh(legGeo, legMat)
  rightLegMesh.position.set(0, -0.15, 0)
  rightLegMesh.castShadow = true
  rightLegPivotGroup.add(rightLegMesh)
  group.add(rightLegPivotGroup)
  rightLegPivot = rightLegPivotGroup

  // Arms: two short cylinders hanging from shoulder pivots, counter-swing to legs
  // Shoulder pivot sits near top of body (y=0.78), offset laterally
  const armGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.36, 6)
  const armMat = new THREE.MeshStandardMaterial({ color: 0x1a6bc7 })

  const leftArmPivotGroup = new THREE.Group()
  leftArmPivotGroup.position.set(-0.40, 0.78, 0)
  const leftArmMesh = new THREE.Mesh(armGeo, armMat)
  leftArmMesh.position.set(0, -0.18, 0)
  leftArmMesh.castShadow = true
  leftArmPivotGroup.add(leftArmMesh)
  group.add(leftArmPivotGroup)
  leftArmPivot = leftArmPivotGroup

  const rightArmPivotGroup = new THREE.Group()
  rightArmPivotGroup.position.set(0.40, 0.78, 0)
  const rightArmMesh = new THREE.Mesh(armGeo, armMat)
  rightArmMesh.position.set(0, -0.18, 0)
  rightArmMesh.castShadow = true
  rightArmPivotGroup.add(rightArmMesh)
  group.add(rightArmPivotGroup)
  rightArmPivot = rightArmPivotGroup

  // Head: sphere (skin tone)
  const headGeo = new THREE.SphereGeometry(0.28, 12, 10)
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc88 })
  const head = new THREE.Mesh(headGeo, headMat)
  head.position.y = 1.08
  head.castShadow = true
  group.add(head)
  playerHead = head

  // Hat: small flat cylinder on top of head
  const hatBrimGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.06, 12)
  const hatTopGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.26, 12)
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 })
  const hatBrim = new THREE.Mesh(hatBrimGeo, hatMat)
  hatBrim.position.y = 1.36
  hatBrim.castShadow = true
  group.add(hatBrim)
  const hatTop = new THREE.Mesh(hatTopGeo, hatMat)
  hatTop.position.y = 1.55
  hatTop.castShadow = true
  group.add(hatTop)

  // Direction indicator: small blue sphere in front
  const dotGeo = new THREE.SphereGeometry(0.08, 6, 6)
  const dotMat = new THREE.MeshStandardMaterial({ color: 0x90caf9, emissive: 0x1565c0, emissiveIntensity: 0.4 })
  dirIndicator = new THREE.Mesh(dotGeo, dotMat)
  dirIndicator.position.set(0, 0.6, -0.42)
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

  isMoving = dx !== 0 || dz !== 0

  playerPos.x += dx * PLAYER_SPEED * dt
  playerPos.z += dz * PLAYER_SPEED * dt

  // Clamp to world bounds (extended for visiting)
  playerPos.x = Math.max(-WORLD_HALF_W, Math.min(WORLD_HALF_W, playerPos.x))
  playerPos.z = Math.max(-WORLD_HALF_D, Math.min(WORLD_HALF_D, playerPos.z))

  playerMesh.position.x = playerPos.x
  playerMesh.position.z = playerPos.z

  // Rotate player to face movement direction
  if (isMoving) {
    playerMesh.rotation.y = Math.atan2(dx, dz)
  }

  // Bob animation: sine wave on Y when moving, idle gentle sway when still
  if (isMoving) {
    bobTime += dt * 8.0  // faster bob while walking
    const bobY = Math.abs(Math.sin(bobTime)) * 0.12
    playerMesh.position.y = bobY
    // Slight lean in movement direction (roll)
    playerMesh.rotation.z = Math.sin(bobTime) * 0.06
    // Leg swing: alternating fore/aft rotation on X, out of phase by π
    const LEG_SWING = 0.55  // max swing angle in radians (~31°)
    if (leftLegPivot && rightLegPivot) {
      leftLegPivot.rotation.x  =  Math.sin(bobTime) * LEG_SWING
      rightLegPivot.rotation.x = -Math.sin(bobTime) * LEG_SWING
    }
    // Arms counter-swing: left arm back when left leg forward (natural gait)
    const ARM_SWING = 0.38
    if (leftArmPivot && rightArmPivot) {
      leftArmPivot.rotation.x  = -Math.sin(bobTime) * ARM_SWING
      rightArmPivot.rotation.x =  Math.sin(bobTime) * ARM_SWING
    }
  } else {
    // Idle: slow gentle float, legs return to neutral
    bobTime += dt * 1.5
    const idleY = Math.sin(bobTime) * 0.03
    playerMesh.position.y = idleY
    playerMesh.rotation.z = 0
    // Smoothly reset legs and arms to neutral when idle
    if (leftLegPivot && rightLegPivot) {
      leftLegPivot.rotation.x  *= 0.85
      rightLegPivot.rotation.x *= 0.85
    }
    if (leftArmPivot && rightArmPivot) {
      leftArmPivot.rotation.x  *= 0.85
      rightArmPivot.rotation.x *= 0.85
    }
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

function isPlayerMoving () { return isMoving }

window.PlayerController = {
  initPlayer,
  updatePlayer,
  updateCamera,
  getPlayerPos,
  isPlayerMoving,
  isVisiting,
  getVisitingInfo,
  setVisitingNeighbor,
  returnToFarm,
  onVisitChange,
  isOnOwnFarm
}
