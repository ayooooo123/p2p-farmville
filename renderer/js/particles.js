import * as THREE from './three.module.min.js'

// ── Instanced Particle System ────────────────────────────────────────────────
// Single InstancedMesh for all particles — one draw call regardless of count.
// Particle state stored in typed arrays for zero per-frame GC pressure.

const MAX_INSTANCES = 300

const EFFECT_CONFIGS = {
  harvest: {
    count: 20,
    color: 0xffd700,
    colorVariance: 0x332200,
    size: 0.15,
    speed: 3,
    spread: 1.5,
    lifetime: 1200,
    gravity: -2,
    direction: { x: 0, y: 1, z: 0 },
    fadeOut: true
  },
  coin: {
    count: 8,
    color: 0xffd700,
    colorVariance: 0,
    size: 0.2,
    speed: 2,
    spread: 0.5,
    lifetime: 1500,
    gravity: -0.5,
    direction: { x: 0, y: 1, z: 0 },
    fadeOut: true
  },
  levelup: {
    count: 50,
    color: 0xffee00,
    colorVariance: 0xff0000,
    size: 0.25,
    speed: 6,
    spread: 4,
    lifetime: 2000,
    gravity: -1,
    direction: { x: 0, y: 1, z: 0 },
    fadeOut: true
  },
  planting: {
    count: 12,
    color: 0x8b6914,
    colorVariance: 0x222200,
    size: 0.1,
    speed: 2,
    spread: 0.8,
    lifetime: 600,
    gravity: 3,
    direction: { x: 0, y: 0.5, z: 0 },
    fadeOut: true
  },
  watering: {
    count: 15,
    color: 0x4488ff,
    colorVariance: 0x002244,
    size: 0.12,
    speed: 2.5,
    spread: 1,
    lifetime: 800,
    gravity: 4,
    direction: { x: 0, y: 1, z: 0 },
    fadeOut: true
  },
  gift: {
    count: 25,
    color: 0xff4488,
    colorVariance: 0x440044,
    size: 0.2,
    speed: 3,
    spread: 2,
    lifetime: 1500,
    gravity: -1,
    direction: { x: 0, y: 1, z: 0 },
    fadeOut: true
  },
  achievement: {
    count: 40,
    color: 0xffd700,
    colorVariance: 0xff4400,
    size: 0.2,
    speed: 5,
    spread: 3,
    lifetime: 1800,
    gravity: -1.5,
    direction: { x: 0, y: 1, z: 0 },
    fadeOut: true
  },
  mastery: {
    count: 30,
    color: 0xffaa00,
    colorVariance: 0x443300,
    size: 0.2,
    speed: 4,
    spread: 2.5,
    lifetime: 1500,
    gravity: -1,
    direction: { x: 0, y: 1, z: 0 },
    fadeOut: true
  },
  wither: {
    count: 10,
    color: 0x666666,
    colorVariance: 0x222222,
    size: 0.1,
    speed: 1,
    spread: 0.5,
    lifetime: 1000,
    gravity: 2,
    direction: { x: 0, y: 0.3, z: 0 },
    fadeOut: true
  },
  plow: {
    count: 16,
    color: 0x8b5e2a,
    colorVariance: 0x3a1a00,
    size: 0.12,
    speed: 2.8,
    spread: 1.2,
    lifetime: 700,
    gravity: 5,
    direction: { x: 0, y: 1, z: 0 },
    fadeOut: true
  }
}

// ── State ────────────────────────────────────────────────────────────────────

let scene = null
let instancedMesh = null

// Per-slot typed arrays — parallel to InstancedMesh slots
const slotInUse   = new Uint8Array(MAX_INSTANCES)
const slotPX      = new Float32Array(MAX_INSTANCES)
const slotPY      = new Float32Array(MAX_INSTANCES)
const slotPZ      = new Float32Array(MAX_INSTANCES)
const slotVX      = new Float32Array(MAX_INSTANCES)
const slotVY      = new Float32Array(MAX_INSTANCES)
const slotVZ      = new Float32Array(MAX_INSTANCES)
const slotGravity = new Float32Array(MAX_INSTANCES)
const slotSize    = new Float32Array(MAX_INSTANCES)
const slotR       = new Float32Array(MAX_INSTANCES)
const slotG       = new Float32Array(MAX_INSTANCES)
const slotB       = new Float32Array(MAX_INSTANCES)
const slotStart   = new Float64Array(MAX_INSTANCES) // ms timestamp
const slotLife    = new Float32Array(MAX_INSTANCES) // ms lifetime
const slotFade    = new Uint8Array(MAX_INSTANCES)

// Reusable scratch objects — avoid per-frame allocations
const _dummy  = new THREE.Object3D()
const _color  = new THREE.Color()

// ── Pool Management ──────────────────────────────────────────────────────────

function _acquireSlot () {
  for (let i = 0; i < MAX_INSTANCES; i++) {
    if (!slotInUse[i]) return i
  }
  return -1
}

function _hideSlot (i) {
  _dummy.position.set(0, -1000, 0)
  _dummy.scale.set(0, 0, 0)
  _dummy.updateMatrix()
  instancedMesh.setMatrixAt(i, _dummy.matrix)
  instancedMesh.setColorAt(i, _color.setRGB(0, 0, 0))
}

// ── Public API ───────────────────────────────────────────────────────────────

function initParticles (sceneRef) {
  scene = sceneRef

  const geo = new THREE.SphereGeometry(1, 4, 4)
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true })
  instancedMesh = new THREE.InstancedMesh(geo, mat, MAX_INSTANCES)
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  instancedMesh.frustumCulled = false // particles can be anywhere

  // Initialise all slots to hidden
  for (let i = 0; i < MAX_INSTANCES; i++) {
    _hideSlot(i)
  }
  instancedMesh.instanceMatrix.needsUpdate = true
  instancedMesh.instanceColor.needsUpdate = true

  scene.add(instancedMesh)
}

function createParticleEffect (type, position) {
  if (!scene || !instancedMesh) return

  const config = EFFECT_CONFIGS[type]
  if (!config) return

  const baseColor = new THREE.Color(config.color)
  const now = Date.now()

  for (let p = 0; p < config.count; p++) {
    const slot = _acquireSlot()
    if (slot < 0) break

    slotInUse[slot] = 1

    // Spawn position — small jitter
    slotPX[slot] = position.x + (Math.random() - 0.5) * config.spread * 0.3
    slotPY[slot] = position.y + Math.random() * 0.3
    slotPZ[slot] = position.z + (Math.random() - 0.5) * config.spread * 0.3

    // Size
    slotSize[slot] = config.size * (0.7 + Math.random() * 0.6)

    // Color with optional variance
    let r = baseColor.r
    let g = baseColor.g
    let b = baseColor.b
    if (config.colorVariance) {
      const variance = new THREE.Color(config.colorVariance)
      const t = Math.random()
      r = Math.min(1, r + variance.r * t)
      g = Math.min(1, g + variance.g * t)
      b = Math.min(1, b + variance.b * t)
    }
    slotR[slot] = r
    slotG[slot] = g
    slotB[slot] = b

    // Velocity — hemispherical burst in direction
    const angle    = Math.random() * Math.PI * 2
    const upAngle  = Math.random() * Math.PI * 0.5
    const speed    = config.speed * (0.5 + Math.random() * 0.5)
    slotVX[slot] = Math.cos(angle) * Math.sin(upAngle) * speed * config.spread / 2 +
                   config.direction.x * speed
    slotVY[slot] = Math.cos(upAngle) * speed * 0.7 + config.direction.y * speed
    slotVZ[slot] = Math.sin(angle) * Math.sin(upAngle) * speed * config.spread / 2 +
                   config.direction.z * speed

    slotGravity[slot] = config.gravity
    slotStart[slot]   = now
    slotLife[slot]    = config.lifetime
    slotFade[slot]    = config.fadeOut ? 1 : 0
  }
}

function updateParticles (dtMs) {
  if (!instancedMesh) return

  const dt  = dtMs / 1000
  const now = Date.now()
  let anyActive = false

  for (let i = 0; i < MAX_INSTANCES; i++) {
    if (!slotInUse[i]) continue

    const progress = (now - slotStart[i]) / slotLife[i]

    if (progress >= 1) {
      slotInUse[i] = 0
      _hideSlot(i)
      continue
    }

    anyActive = true

    // Physics
    slotPX[i] += slotVX[i] * dt
    slotPY[i] += slotVY[i] * dt
    slotPZ[i] += slotVZ[i] * dt
    slotVY[i] -= slotGravity[i] * dt
    slotVX[i] *= 0.99
    slotVZ[i] *= 0.99

    // Ground bounce / stop
    if (slotPY[i] < 0.05) {
      slotPY[i] = 0.05
      slotVY[i] = 0
      slotVX[i] *= 0.9
      slotVZ[i] *= 0.9
    }

    // Matrix: position + uniform scale
    const s = slotSize[i]
    _dummy.position.set(slotPX[i], slotPY[i], slotPZ[i])
    _dummy.scale.set(s, s, s)
    _dummy.updateMatrix()
    instancedMesh.setMatrixAt(i, _dummy.matrix)

    // Color: multiply RGB by alpha for fade-to-black effect
    const alpha = slotFade[i] ? Math.max(0, 1 - progress) : 1
    instancedMesh.setColorAt(i, _color.setRGB(
      slotR[i] * alpha,
      slotG[i] * alpha,
      slotB[i] * alpha
    ))
  }

  if (anyActive) {
    instancedMesh.instanceMatrix.needsUpdate = true
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true
  }
}

function getActiveEffectCount () {
  let count = 0
  for (let i = 0; i < MAX_INSTANCES; i++) {
    if (slotInUse[i]) count++
  }
  return count
}

function dispose () {
  for (let i = 0; i < MAX_INSTANCES; i++) slotInUse[i] = 0
  if (instancedMesh) {
    scene.remove(instancedMesh)
    instancedMesh.geometry.dispose()
    instancedMesh.material.dispose()
    instancedMesh = null
  }
}

export {
  initParticles,
  createParticleEffect,
  updateParticles,
  getActiveEffectCount,
  dispose
}
