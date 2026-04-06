import * as THREE from './three.module.min.js'

// ── Particle Effects System ─────────────────────────────────────────────────
// Pooled particle system with multiple effect types

let scene = null
const activeEffects = []

// Object pool
const POOL_SIZE = 200
const particlePool = []
let poolInitialized = false

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
  }
}

// ── Pool Management ─────────────────────────────────────────────────────────

function _initPool () {
  if (poolInitialized) return

  const geo = new THREE.SphereGeometry(1, 4, 4)

  for (let i = 0; i < POOL_SIZE; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.visible = false
    mesh.userData.inUse = false
    particlePool.push(mesh)
    if (scene) scene.add(mesh)
  }

  poolInitialized = true
}

function _acquireParticle () {
  for (const p of particlePool) {
    if (!p.userData.inUse) {
      p.userData.inUse = true
      p.visible = true
      return p
    }
  }
  return null // pool exhausted
}

function _releaseParticle (p) {
  p.userData.inUse = false
  p.visible = false
}

// ── Public API ──────────────────────────────────────────────────────────────

function initParticles (sceneRef) {
  scene = sceneRef
  _initPool()
}

function createParticleEffect (type, position) {
  if (!scene) return

  const config = EFFECT_CONFIGS[type]
  if (!config) return

  const effect = {
    type,
    particles: [],
    startTime: Date.now(),
    lifetime: config.lifetime,
    config
  }

  for (let i = 0; i < config.count; i++) {
    const p = _acquireParticle()
    if (!p) break

    // Position at origin of effect
    p.position.set(
      position.x + (Math.random() - 0.5) * config.spread * 0.3,
      position.y + Math.random() * 0.3,
      position.z + (Math.random() - 0.5) * config.spread * 0.3
    )

    // Scale
    const s = config.size * (0.7 + Math.random() * 0.6)
    p.scale.set(s, s, s)

    // Color with variance
    const baseColor = new THREE.Color(config.color)
    if (config.colorVariance) {
      const variance = new THREE.Color(config.colorVariance)
      const t = Math.random()
      baseColor.r += variance.r * t
      baseColor.g += variance.g * t
      baseColor.b += variance.b * t
    }
    p.material.color.copy(baseColor)
    p.material.opacity = 1

    // Velocity
    const angle = Math.random() * Math.PI * 2
    const upAngle = Math.random() * Math.PI * 0.5
    const speed = config.speed * (0.5 + Math.random() * 0.5)
    p.userData.velocity = {
      x: Math.cos(angle) * Math.sin(upAngle) * speed * config.spread / 2 +
         config.direction.x * speed,
      y: Math.cos(upAngle) * speed * 0.7 + config.direction.y * speed,
      z: Math.sin(angle) * Math.sin(upAngle) * speed * config.spread / 2 +
         config.direction.z * speed
    }
    p.userData.gravity = config.gravity

    effect.particles.push(p)
  }

  activeEffects.push(effect)
}

function updateParticles (dtMs) {
  if (activeEffects.length === 0) return

  const now = Date.now()
  const dt = dtMs / 1000

  for (let i = activeEffects.length - 1; i >= 0; i--) {
    const effect = activeEffects[i]
    const elapsed = now - effect.startTime
    const progress = elapsed / effect.lifetime

    if (progress >= 1) {
      // Effect expired, release all particles
      for (const p of effect.particles) {
        _releaseParticle(p)
      }
      activeEffects.splice(i, 1)
      continue
    }

    // Update each particle
    for (const p of effect.particles) {
      const vel = p.userData.velocity
      const grav = p.userData.gravity

      p.position.x += vel.x * dt
      p.position.y += vel.y * dt
      p.position.z += vel.z * dt

      // Apply gravity
      vel.y -= grav * dt

      // Damping
      vel.x *= 0.99
      vel.z *= 0.99

      // Fade out
      if (effect.config.fadeOut) {
        p.material.opacity = Math.max(0, 1 - progress)
      }

      // Prevent going below ground
      if (p.position.y < 0.05) {
        p.position.y = 0.05
        vel.y = 0
        vel.x *= 0.9
        vel.z *= 0.9
      }
    }
  }
}

function getActiveEffectCount () {
  return activeEffects.length
}

function dispose () {
  for (const effect of activeEffects) {
    for (const p of effect.particles) {
      _releaseParticle(p)
    }
  }
  activeEffects.length = 0
}

export {
  initParticles,
  createParticleEffect,
  updateParticles,
  getActiveEffectCount,
  dispose
}
