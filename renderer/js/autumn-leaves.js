import * as THREE from './three.module.min.js'

// ── Autumn falling leaves ────────────────────────────────────────────────────
// During the autumn season, a small InstancedMesh pool spawns leaves from
// random border-tree canopies. Each leaf falls with sinusoidal sway plus the
// shared farm wind drift, scaling in at spawn and scaling out near the end of
// its life before recycling. Scale-fade is used instead of alpha-fade because
// per-instance opacity would require a custom shader; modulating the matrix
// scale gives a clean appear/disappear with the standard MeshBasicMaterial.

const MAX_LEAVES = 24
const SPAWN_INTERVAL_MIN_MS = 750
const SPAWN_INTERVAL_MAX_MS = 1450
const FADE_MS = 600 // scale-in at spawn and scale-out at end of life
const MAX_SPAWNS_PER_FRAME = 4 // guard against tab-resume dt spikes

const AUTUMN_PALETTE = [
  0xd4780a, // amber
  0xcc4400, // burnt orange
  0xb8741a, // ochre
  0xe6a83a, // golden yellow
  0x8b4a14, // dark brown
  0xc94f1f  // rust red
]

const PALETTE_RGB = AUTUMN_PALETTE.map((hex) => {
  const c = new THREE.Color(hex)
  return [c.r, c.g, c.b]
})

let scene = null
let mesh = null
let geometry = null
let material = null

const slotInUse  = new Uint8Array(MAX_LEAVES)
const slotPX     = new Float32Array(MAX_LEAVES)
const slotPY     = new Float32Array(MAX_LEAVES)
const slotPZ     = new Float32Array(MAX_LEAVES)
const slotVY     = new Float32Array(MAX_LEAVES)
const slotSwayP  = new Float32Array(MAX_LEAVES)
const slotSwayA  = new Float32Array(MAX_LEAVES)
const slotScale  = new Float32Array(MAX_LEAVES)
const slotRotY   = new Float32Array(MAX_LEAVES)
const slotRotYV  = new Float32Array(MAX_LEAVES)
const slotR      = new Float32Array(MAX_LEAVES)
const slotG      = new Float32Array(MAX_LEAVES)
const slotB      = new Float32Array(MAX_LEAVES)
const slotLife   = new Float32Array(MAX_LEAVES) // ms remaining
const slotTotal  = new Float32Array(MAX_LEAVES) // total lifetime ms

let activeCount = 0
let nextSlot = 0
let spawnTimerMs = 0
let nextSpawnDelayMs = SPAWN_INTERVAL_MIN_MS

const _dummy = new THREE.Object3D()
const _color = new THREE.Color()

function _resetState () {
  slotInUse.fill(0)
  activeCount = 0
  nextSlot = 0
  spawnTimerMs = 0
  nextSpawnDelayMs = SPAWN_INTERVAL_MIN_MS + Math.random() * (SPAWN_INTERVAL_MAX_MS - SPAWN_INTERVAL_MIN_MS)
}

function _hideSlot (i) {
  _dummy.position.set(0, -1000, 0)
  _dummy.rotation.set(0, 0, 0)
  _dummy.scale.set(0, 0, 0)
  _dummy.updateMatrix()
  mesh.setMatrixAt(i, _dummy.matrix)
  mesh.setColorAt(i, _color.setRGB(0, 0, 0))
}

function _acquireSlot () {
  for (let i = 0; i < MAX_LEAVES; i++) {
    const slot = (nextSlot + i) % MAX_LEAVES
    if (slotInUse[slot]) continue
    nextSlot = (slot + 1) % MAX_LEAVES
    return slot
  }
  return -1
}

function _spawnLeaf (borderTrees) {
  if (!borderTrees || borderTrees.length === 0) return
  const slot = _acquireSlot()
  if (slot < 0) return

  const tree = borderTrees[Math.floor(Math.random() * borderTrees.length)]
  const tx = tree.position.x
  const tz = tree.position.z

  // Use the first cached canopy mesh to derive radius + Y if available.
  const canopies = tree.userData && tree.userData.canopyMeshes
  let canopyRadius = 1.4
  let canopyY = 1.6
  if (Array.isArray(canopies) && canopies.length > 0) {
    const c = canopies[0]
    canopyRadius = c.userData.canopyRadius || canopyRadius
    canopyY = c.position.y
  }

  const angle = Math.random() * Math.PI * 2
  const r = Math.random() * canopyRadius * 0.85

  slotPX[slot] = tx + Math.cos(angle) * r
  slotPZ[slot] = tz + Math.sin(angle) * r
  slotPY[slot] = canopyY + 0.1 + Math.random() * 0.2
  slotVY[slot] = -(0.55 + Math.random() * 0.45)
  slotSwayP[slot] = Math.random() * Math.PI * 2
  slotSwayA[slot] = 0.3 + Math.random() * 0.35
  slotScale[slot] = 0.7 + Math.random() * 0.5
  slotRotY[slot] = Math.random() * Math.PI * 2
  slotRotYV[slot] = (Math.random() - 0.5) * 1.6

  const [r0, g0, b0] = PALETTE_RGB[Math.floor(Math.random() * PALETTE_RGB.length)]
  slotR[slot] = r0
  slotG[slot] = g0
  slotB[slot] = b0

  const total = 4500 + Math.random() * 2500
  slotTotal[slot] = total
  slotLife[slot] = total
  slotInUse[slot] = 1
  activeCount++
}

function initAutumnLeaves (sceneRef) {
  if (mesh) disposeAutumnLeaves()
  scene = sceneRef
  _resetState()

  geometry = new THREE.PlaneGeometry(0.34, 0.34)
  // Lay flat so the planar face reads from the top-down orthographic camera.
  geometry.rotateX(-Math.PI / 2)

  material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: false
  })

  mesh = new THREE.InstancedMesh(geometry, material, MAX_LEAVES)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled = false

  // Allocate the per-instance color attribute up-front so setColorAt is safe
  // for hidden/initial slots before any visible leaf has been written.
  const colorBuffer = new Float32Array(MAX_LEAVES * 3)
  mesh.instanceColor = new THREE.InstancedBufferAttribute(colorBuffer, 3)
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage)

  for (let i = 0; i < MAX_LEAVES; i++) _hideSlot(i)
  mesh.instanceMatrix.needsUpdate = true
  mesh.instanceColor.needsUpdate = true

  scene.add(mesh)
}

function updateAutumnLeaves (dtMs, ctx) {
  if (!mesh) return

  const season = ctx && ctx.season
  const time = (ctx && ctx.time) || 0
  const borderTrees = ctx && ctx.borderTrees
  const windX = (ctx && ctx.windX) || 0
  const windZ = (ctx && ctx.windZ) || 0

  let dirty = false

  // Spawn new leaves only during autumn. Cap spawns per frame so a huge
  // dtMs (e.g. after the tab is resumed) cannot drain the pool in one tick.
  if (season === 'autumn' && borderTrees && borderTrees.length > 0) {
    spawnTimerMs += dtMs
    let spawnsThisFrame = 0
    while (spawnTimerMs >= nextSpawnDelayMs && spawnsThisFrame < MAX_SPAWNS_PER_FRAME) {
      spawnTimerMs -= nextSpawnDelayMs
      nextSpawnDelayMs = SPAWN_INTERVAL_MIN_MS +
        Math.random() * (SPAWN_INTERVAL_MAX_MS - SPAWN_INTERVAL_MIN_MS)
      _spawnLeaf(borderTrees)
      spawnsThisFrame++
    }
    // Drop any remaining backlog so we don't burst-spawn on the next frame.
    if (spawnTimerMs >= nextSpawnDelayMs) spawnTimerMs = 0
  } else {
    spawnTimerMs = 0
  }

  if (activeCount === 0) return

  const dt = dtMs / 1000

  for (let i = 0; i < MAX_LEAVES; i++) {
    if (!slotInUse[i]) continue

    slotLife[i] -= dtMs
    slotPY[i] += slotVY[i] * dt
    slotPX[i] += (Math.cos(time * 0.0028 + slotSwayP[i]) * slotSwayA[i] + windX * 0.35) * dt
    slotPZ[i] += (Math.sin(time * 0.0023 + slotSwayP[i]) * slotSwayA[i] + windZ * 0.35) * dt
    slotRotY[i] += slotRotYV[i] * dt

    if (slotLife[i] <= 0 || slotPY[i] <= 0.04) {
      slotInUse[i] = 0
      activeCount = Math.max(0, activeCount - 1)
      _hideSlot(i)
      dirty = true
      continue
    }

    // Scale-fade in at spawn (first FADE_MS) and out near end (last FADE_MS)
    const elapsed = slotTotal[i] - slotLife[i]
    let fade = 1
    if (elapsed < FADE_MS) fade = elapsed / FADE_MS
    else if (slotLife[i] < FADE_MS) fade = slotLife[i] / FADE_MS
    if (fade < 0) fade = 0
    else if (fade > 1) fade = 1

    const s = slotScale[i] * fade
    _dummy.position.set(slotPX[i], slotPY[i], slotPZ[i])
    _dummy.rotation.set(0, slotRotY[i], 0)
    _dummy.scale.set(s, s, s)
    _dummy.updateMatrix()
    mesh.setMatrixAt(i, _dummy.matrix)
    mesh.setColorAt(i, _color.setRGB(slotR[i], slotG[i], slotB[i]))
    dirty = true
  }

  if (dirty) {
    mesh.instanceMatrix.needsUpdate = true
    mesh.instanceColor.needsUpdate = true
  }
}

function disposeAutumnLeaves () {
  _resetState()
  if (mesh) {
    if (scene) scene.remove(mesh)
    if (typeof mesh.dispose === 'function') mesh.dispose()
    if (geometry) geometry.dispose()
    if (material) material.dispose()
    mesh = null
    geometry = null
    material = null
  }
  scene = null
}

export { initAutumnLeaves, updateAutumnLeaves, disposeAutumnLeaves }
