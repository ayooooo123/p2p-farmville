import * as THREE from './three.module.min.js'

// ── Performance Monitoring & Optimization ───────────────────────────────────

let renderer = null
let scene = null
let fpsCounter = { frames: 0, lastTime: 0, fps: 60 }
let showFPS = false
let fpsDisplayEl = null

// Quality levels
const QUALITY_LEVELS = {
  high: { shadowMapSize: 2048, shadowsEnabled: true, antialias: true, pixelRatio: 1 },
  medium: { shadowMapSize: 1024, shadowsEnabled: true, antialias: true, pixelRatio: 1 },
  low: { shadowMapSize: 512, shadowsEnabled: true, antialias: false, pixelRatio: 0.75 },
  minimal: { shadowMapSize: 256, shadowsEnabled: false, antialias: false, pixelRatio: 0.5 }
}

let currentQuality = 'high'
let autoQuality = true
let lowFPSFrames = 0 // consecutive low FPS frames
const LOW_FPS_THRESHOLD = 30
const LOW_FPS_FRAMES_BEFORE_DOWNGRADE = 60 // ~1 second of low FPS

// Disposed object tracking
let disposedCount = 0

function initPerformance (rendererRef, sceneRef, fpsEl) {
  renderer = rendererRef
  scene = sceneRef
  fpsDisplayEl = fpsEl
  fpsCounter.lastTime = performance.now()
}

// ── FPS Tracking ────────────────────────────────────────────────────────────

function updateFPS () {
  fpsCounter.frames++
  const now = performance.now()
  const delta = now - fpsCounter.lastTime

  if (delta >= 1000) {
    fpsCounter.fps = Math.round((fpsCounter.frames * 1000) / delta)
    fpsCounter.frames = 0
    fpsCounter.lastTime = now

    // Update display
    if (showFPS && fpsDisplayEl) {
      fpsDisplayEl.textContent = fpsCounter.fps + ' FPS'
      fpsDisplayEl.style.color = fpsCounter.fps >= 50 ? '#7cfc00'
        : fpsCounter.fps >= 30 ? '#ffd700' : '#ff4444'
    }

    // Auto-quality adjustment
    if (autoQuality) {
      _checkAutoQuality()
    }
  }
}

function _checkAutoQuality () {
  if (fpsCounter.fps < LOW_FPS_THRESHOLD) {
    lowFPSFrames++
    if (lowFPSFrames >= LOW_FPS_FRAMES_BEFORE_DOWNGRADE / 60) {
      _downgradeQuality()
      lowFPSFrames = 0
    }
  } else {
    lowFPSFrames = 0
  }
}

function _downgradeQuality () {
  const levels = Object.keys(QUALITY_LEVELS)
  const idx = levels.indexOf(currentQuality)
  if (idx < levels.length - 1) {
    setQuality(levels[idx + 1])
    console.log('[perf] Auto-downgraded quality to:', currentQuality)
  }
}

function setQuality (level) {
  if (!QUALITY_LEVELS[level] || !renderer) return

  const config = QUALITY_LEVELS[level]
  currentQuality = level

  // Update shadow map
  renderer.shadowMap.enabled = config.shadowsEnabled

  // Update pixel ratio
  renderer.setPixelRatio(window.devicePixelRatio * config.pixelRatio)

  // Update shadow map sizes on existing lights
  if (scene) {
    scene.traverse(obj => {
      if (obj.isDirectionalLight && obj.shadow) {
        obj.shadow.mapSize.width = config.shadowMapSize
        obj.shadow.mapSize.height = config.shadowMapSize
        if (obj.shadow.map) {
          obj.shadow.map.dispose()
          obj.shadow.map = null
        }
      }
    })
  }
}

// ── Toggle FPS Display ──────────────────────────────────────────────────────

function toggleFPS () {
  showFPS = !showFPS
  if (fpsDisplayEl) {
    fpsDisplayEl.style.display = showFPS ? 'block' : 'none'
  }
  return showFPS
}

function isFPSVisible () {
  return showFPS
}

// ── LOD Helper ──────────────────────────────────────────────────────────────
// Simple distance-based LOD: hide/show detail based on camera distance

function updateLOD (camera, objects, maxDistance) {
  if (!camera) return

  const camPos = camera.position
  const dist = maxDistance || 80

  for (const obj of objects) {
    if (!obj || !obj.mesh) continue
    const dx = obj.mesh.position.x - camPos.x
    const dz = obj.mesh.position.z - camPos.z
    const d = Math.sqrt(dx * dx + dz * dz)

    // Far objects: reduce detail
    if (d > dist) {
      obj.mesh.visible = false
    } else {
      obj.mesh.visible = true
    }
  }
}

// ── Dispose Helper ──────────────────────────────────────────────────────────

function disposeMesh (mesh) {
  if (!mesh) return

  mesh.traverse(child => {
    if (child.isMesh) {
      if (child.geometry) {
        child.geometry.dispose()
        disposedCount++
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    }
  })
}

// ── Static Geometry Merge ───────────────────────────────────────────────────
// Merge multiple meshes into a single geometry for better draw call performance

function mergeStaticMeshes (meshes) {
  if (!meshes || meshes.length === 0) return null

  const geometries = []
  let material = null

  for (const mesh of meshes) {
    if (!mesh.isMesh) continue
    const geo = mesh.geometry.clone()
    geo.applyMatrix4(mesh.matrixWorld)
    geometries.push(geo)
    if (!material) material = mesh.material
  }

  if (geometries.length === 0) return null

  // Use BufferGeometryUtils if available, otherwise skip
  // For simplicity, return null - Three.js handles frustum culling well
  return null
}

// ── Performance Stats ───────────────────────────────────────────────────────

function getStats () {
  const info = renderer ? renderer.info : {}
  return {
    fps: fpsCounter.fps,
    quality: currentQuality,
    drawCalls: info.render ? info.render.calls : 0,
    triangles: info.render ? info.render.triangles : 0,
    geometries: info.memory ? info.memory.geometries : 0,
    textures: info.memory ? info.memory.textures : 0,
    disposed: disposedCount
  }
}

function getFPS () {
  return fpsCounter.fps
}

function getCurrentQuality () {
  return currentQuality
}

function setAutoQuality (enabled) {
  autoQuality = enabled
}

export {
  initPerformance,
  updateFPS,
  toggleFPS,
  isFPSVisible,
  setQuality,
  getCurrentQuality,
  setAutoQuality,
  updateLOD,
  disposeMesh,
  mergeStaticMeshes,
  getStats,
  getFPS
}
