import * as THREE from './three.module.min.js'

// ── Weather System ──────────────────────────────────────────────────────────

const WEATHER_STATES = ['clear', 'cloudy', 'rainy', 'stormy', 'snowy']

// Weather change interval: 5-15 minutes
const MIN_WEATHER_INTERVAL = 300000
const MAX_WEATHER_INTERVAL = 900000

// Probability weights for next weather
const WEATHER_WEIGHTS = {
  clear: { clear: 0.3, cloudy: 0.5, rainy: 0.15, stormy: 0.03, snowy: 0.02 },
  cloudy: { clear: 0.3, cloudy: 0.3, rainy: 0.3, stormy: 0.08, snowy: 0.02 },
  rainy: { clear: 0.15, cloudy: 0.35, rainy: 0.3, stormy: 0.15, snowy: 0.05 },
  stormy: { clear: 0.1, cloudy: 0.3, rainy: 0.4, stormy: 0.15, snowy: 0.05 },
  snowy: { clear: 0.25, cloudy: 0.35, rainy: 0.2, stormy: 0.05, snowy: 0.15 }
}

let scene = null
let currentWeather = 'clear'
let nextWeatherChange = 0
let weatherListeners = []

// Rain particles — InstancedMesh for one draw call regardless of drop count
let rainMesh = null       // InstancedMesh for rain streaks
let snowMesh = null       // InstancedMesh for snow flakes
const MAX_RAIN_DROPS = 600
const MAX_SNOW_FLAKES = 300

// Per-instance state stored in typed arrays (no per-frame GC)
const rainX   = new Float32Array(MAX_RAIN_DROPS)
const rainY   = new Float32Array(MAX_RAIN_DROPS)
const rainZ   = new Float32Array(MAX_RAIN_DROPS)
const rainSpd = new Float32Array(MAX_RAIN_DROPS)
const snowX   = new Float32Array(MAX_SNOW_FLAKES)
const snowY   = new Float32Array(MAX_SNOW_FLAKES)
const snowZ   = new Float32Array(MAX_SNOW_FLAKES)
const snowAngle = new Float32Array(MAX_SNOW_FLAKES) // wander angle

// Reusable matrix + color for instanced updates
const _iMat = new THREE.Matrix4()
const _iPos = new THREE.Vector3()
const _iQuat = new THREE.Quaternion()
const _iScl = new THREE.Vector3(1, 1, 1)
const _xAxis = new THREE.Vector3(1, 0, 0)
const _zAxis = new THREE.Vector3(0, 0, 1)
// Reuse immutable weather quaternions instead of allocating them in hot loops.
const _rainTilt = new THREE.Quaternion().setFromAxisAngle(_zAxis, -0.26)
const _stormRainTilt = new THREE.Quaternion().setFromAxisAngle(_zAxis, -0.45)
const _snowFlatRot = new THREE.Quaternion().setFromAxisAngle(_xAxis, -Math.PI / 2)

// Cloud system
let cloudGroup = null
const MAX_CLOUDS = 8
let clouds = []
let cloudPuffGeometry = null
let cloudPuffMaterial = null
let lastCloudVisualOpacity = -1
let lastCloudVisualColor = null

// Lightning
let lastLightningTime = 0

// Puddle system
const MAX_PUDDLES = 12
let puddleGroup  = null
let puddleMeshes = []
let puddleMat    = null  // shared material — one opacity write per frame

// Auto-water callback
let autoWaterCallback = null

function initWeather (sceneRef, options) {
  scene = sceneRef
  currentWeather = 'clear'
  nextWeatherChange = Date.now() + _randomInterval()

  if (options && options.onAutoWater) {
    autoWaterCallback = options.onAutoWater
  }

  _createRainSystem()
  _createCloudSystem()
  _createPuddleSystem()
}

function _randomInterval () {
  return MIN_WEATHER_INTERVAL + Math.random() * (MAX_WEATHER_INTERVAL - MIN_WEATHER_INTERVAL)
}

function _pickNextWeather () {
  const weights = WEATHER_WEIGHTS[currentWeather]
  const r = Math.random()
  let cumulative = 0
  for (const [weather, weight] of Object.entries(weights)) {
    cumulative += weight
    if (r <= cumulative) return weather
  }
  return 'clear'
}

// ── Rain System — InstancedMesh (one draw call for all drops) ────────────────

function _initRainInstance (i) {
  rainX[i]   = (Math.random() - 0.5) * 120
  rainY[i]   = 5 + Math.random() * 30
  rainZ[i]   = (Math.random() - 0.5) * 120
  rainSpd[i] = 18 + Math.random() * 12
}

function _initSnowInstance (i) {
  snowX[i]     = (Math.random() - 0.5) * 120
  snowY[i]     = 5 + Math.random() * 25
  snowZ[i]     = (Math.random() - 0.5) * 120
  snowAngle[i] = Math.random() * Math.PI * 2
}

function _createRainSystem () {
  // ── Rain: thin elongated capsule (streak) ──────────────────────────────────
  // CylinderGeometry gives a clean streak that reads well from top-down
  const dropGeo = new THREE.CylinderGeometry(0.025, 0.012, 0.65, 4, 1)
  const dropMat = new THREE.MeshBasicMaterial({
    color: 0x88aadd,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    fog: false  // weather VFX should not be washed out by atmospheric fog
  })
  rainMesh = new THREE.InstancedMesh(dropGeo, dropMat, MAX_RAIN_DROPS)
  rainMesh.visible = false
  rainMesh.frustumCulled = false // spans the whole map, skip frustum test

  // Initialise all instance positions
  for (let i = 0; i < MAX_RAIN_DROPS; i++) {
    _initRainInstance(i)
    // Push instances into buffer
    _iPos.set(rainX[i], rainY[i], rainZ[i])
    _iMat.compose(_iPos, _rainTilt, _iScl)
    rainMesh.setMatrixAt(i, _iMat)
  }
  rainMesh.instanceMatrix.needsUpdate = true
  if (scene) scene.add(rainMesh)

  // ── Snow: flat disc (seen from top-down as a dot / flake) ─────────────────
  const flakeGeo = new THREE.CircleGeometry(0.18, 5)
  const flakeMat = new THREE.MeshBasicMaterial({
    color: 0xeeeeff,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false  // weather VFX should not be washed out by atmospheric fog
  })
  snowMesh = new THREE.InstancedMesh(flakeGeo, flakeMat, MAX_SNOW_FLAKES)
  snowMesh.visible = false
  snowMesh.frustumCulled = false

  for (let i = 0; i < MAX_SNOW_FLAKES; i++) {
    _initSnowInstance(i)
    _iPos.set(snowX[i], snowY[i], snowZ[i])
    _iMat.compose(_iPos, _snowFlatRot, _iScl)
    snowMesh.setMatrixAt(i, _iMat)
  }
  snowMesh.instanceMatrix.needsUpdate = true
  if (scene) scene.add(snowMesh)
}

function _updateRain (dtMs) {
  if (!rainMesh) return

  const isRaining = currentWeather === 'rainy' || currentWeather === 'stormy'
  rainMesh.visible = isRaining
  if (!isRaining) return

  const dt = dtMs / 1000
  const activeCount = currentWeather === 'stormy' ? MAX_RAIN_DROPS : Math.floor(MAX_RAIN_DROPS * 0.55)
  const windX = currentWeather === 'stormy' ? 4 * dt : 0

  // Storm tilt is steeper; normal rain uses _rainTilt
  const tilt = currentWeather === 'stormy'
    ? _stormRainTilt
    : _rainTilt

  for (let i = 0; i < MAX_RAIN_DROPS; i++) {
    if (i >= activeCount) {
      // Park invisible instances far below ground
      _iPos.set(0, -100, 0)
      _iMat.compose(_iPos, tilt, _iScl)
      rainMesh.setMatrixAt(i, _iMat)
      continue
    }

    rainY[i] -= rainSpd[i] * dt
    rainX[i] += windX

    if (rainY[i] < -1) {
      _initRainInstance(i)
    }

    _iPos.set(rainX[i], rainY[i], rainZ[i])
    _iMat.compose(_iPos, tilt, _iScl)
    rainMesh.setMatrixAt(i, _iMat)
  }
  rainMesh.instanceMatrix.needsUpdate = true
}

// ── Puddle System ────────────────────────────────────────────────────────────

function _createPuddleSystem () {
  if (puddleGroup) return  // idempotent — don't double-create on re-init

  puddleGroup = new THREE.Group()
  puddleGroup.visible = false

  // Shared material — opacity is uniform across all puddles, updated once per frame.
  // MeshStandardMaterial gives a lit specular "wet" look from the scene's directional light.
  puddleMat = new THREE.MeshStandardMaterial({
    color: 0x6f9fbb,
    roughness: 0.2,
    metalness: 0.0,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    fog: false
  })

  // One base unit-radius geometry; per-puddle size is set via mesh.scale
  const baseGeo = new THREE.CircleGeometry(1, 10)

  for (let i = 0; i < MAX_PUDDLES; i++) {
    const r = 0.7 + Math.random() * 0.7              // 0.7–1.4 world units (base scale)
    const mesh = new THREE.Mesh(baseGeo, puddleMat)
    mesh.rotation.x = -Math.PI / 2                   // flat on XZ plane, face up
    mesh.position.set(
      (Math.random() - 0.5) * 44,                    // ±22 — covers farm + perimeter
      0.025,                                          // above plots (0.01), below grid lines (0.03)
      (Math.random() - 0.5) * 44
    )
    mesh.scale.set(r, 1.0, r)                        // base radius baked into scale
    mesh.renderOrder = 1                              // draw after opaque terrain
    mesh.raycast = () => {}                           // never intercept plot clicks
    mesh.userData.baseScale = r
    mesh.userData.phase = Math.random() * Math.PI * 2
    puddleGroup.add(mesh)
    puddleMeshes.push(mesh)
  }

  if (scene) scene.add(puddleGroup)
}

function _updatePuddles (dtMs) {
  if (!puddleMat || !puddleGroup) return

  const isWet = currentWeather === 'rainy' || currentWeather === 'stormy'
  const targetOpacity = currentWeather === 'stormy' ? 0.70 : isWet ? 0.55 : 0.0

  // Frame-rate-independent damping: fast fill (k=2.8 ≈ 0.7s), slow drain (k=0.2 ≈ 7s)
  const k = isWet ? 2.8 : 0.2
  const factor = 1 - Math.exp(-k * dtMs / 1000)
  puddleMat.opacity += (targetOpacity - puddleMat.opacity) * factor

  // Skip render when fully transparent
  puddleGroup.visible = puddleMat.opacity > 0.005

  if (!puddleGroup.visible) return

  // Per-puddle scale ripple — gentle expansion pulse with individual phase offsets.
  // Ripple is applied on top of baseScale so puddle sizes stay proportional.
  const now = Date.now() * 0.0025
  for (const mesh of puddleMeshes) {
    const ripple = 1.0 + 0.06 * Math.sin(now + mesh.userData.phase)
    const s = mesh.userData.baseScale * ripple
    mesh.scale.set(s, 1.0, s)
  }
}

// ── Cloud System ────────────────────────────────────────────────────────────

function _createCloudSystem () {
  cloudGroup = new THREE.Group()
  cloudGroup.visible = false
  clouds = []
  lastCloudVisualOpacity = -1
  lastCloudVisualColor = null

  if (!cloudPuffGeometry) {
    cloudPuffGeometry = new THREE.SphereGeometry(1, 6, 6)
  }

  if (!cloudPuffMaterial) {
    cloudPuffMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.7,
      roughness: 1,
      metalness: 0
    })
  }

  for (let i = 0; i < MAX_CLOUDS; i++) {
    const cloud = _makeCloud()
    cloud.position.set(
      (Math.random() - 0.5) * 150,
      25 + Math.random() * 15,
      (Math.random() - 0.5) * 100
    )
    cloud.userData.speed = 1 + Math.random() * 2
    cloudGroup.add(cloud)
    clouds.push(cloud)
  }

  if (scene) scene.add(cloudGroup)
}

function _makeCloud () {
  const group = new THREE.Group()
  group.userData.usesSharedPuffMaterial = true

  // Cluster of spheres to form a cloud
  const puffCount = 4 + Math.floor(Math.random() * 4)
  for (let j = 0; j < puffCount; j++) {
    const r = 2 + Math.random() * 3
    const puff = new THREE.Mesh(cloudPuffGeometry, cloudPuffMaterial)
    puff.scale.setScalar(r)
    puff.position.set(
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 3
    )
    group.add(puff)
  }

  return group
}

function _updateClouds (dtMs) {
  if (!cloudGroup) return

  const hasClouds = currentWeather !== 'clear'
  cloudGroup.visible = hasClouds

  if (!hasClouds) return

  const dt = dtMs / 1000

  // Set cloud darkness based on weather
  let cloudOpacity = 0.6
  let cloudColor = 0xcccccc
  if (currentWeather === 'rainy') {
    cloudOpacity = 0.8
    cloudColor = 0x888888
  } else if (currentWeather === 'stormy') {
    cloudOpacity = 0.9
    cloudColor = 0x555555
  } else if (currentWeather === 'snowy') {
    cloudOpacity = 0.75
    cloudColor = 0xaaaaaa
  }

  if (cloudPuffMaterial && (cloudOpacity !== lastCloudVisualOpacity || cloudColor !== lastCloudVisualColor)) {
    cloudPuffMaterial.opacity = cloudOpacity
    cloudPuffMaterial.color.setHex(cloudColor)
    lastCloudVisualOpacity = cloudOpacity
    lastCloudVisualColor = cloudColor
  }

  for (const cloud of clouds) {
    cloud.position.x += cloud.userData.speed * dt

    // Wrap around
    if (cloud.position.x > 100) {
      cloud.position.x = -100
      cloud.position.z = (Math.random() - 0.5) * 100
    }

    // Fallback for any cloud variants that do not use the shared puff material/cache.
    if (cloud.userData.usesSharedPuffMaterial) continue

    cloud.traverse(child => {
      if (!child.isMesh) return
      child.material.opacity = cloudOpacity
      child.material.color.setHex(cloudColor)
    })
  }
}

// ── Lightning (storms) ──────────────────────────────────────────────────────

function _updateLightning (dtMs, sunLight) {
  if (currentWeather !== 'stormy' || !sunLight) return

  const now = Date.now()
  if (now - lastLightningTime > 4000 + Math.random() * 8000) {
    // Flash!
    lastLightningTime = now
    const origIntensity = sunLight.intensity
    sunLight.intensity = 3
    sunLight.color.setHex(0xffffff)
    setTimeout(() => {
      sunLight.intensity = origIntensity
    }, 100)
    setTimeout(() => {
      sunLight.intensity = 2
      setTimeout(() => { sunLight.intensity = origIntensity }, 80)
    }, 200)
  }
}

// ── Snow — InstancedMesh flat disc flakes ────────────────────────────────────

function _updateSnow (dtMs) {
  if (!snowMesh) return
  const isSnowing = currentWeather === 'snowy'
  snowMesh.visible = isSnowing
  if (!isSnowing) return

  const dt = dtMs / 1000

  for (let i = 0; i < MAX_SNOW_FLAKES; i++) {
    // Slow fall + gentle circular drift
    snowY[i] -= 1.8 * dt
    snowAngle[i] += 0.35 * dt
    snowX[i] += Math.cos(snowAngle[i]) * 0.4 * dt
    snowZ[i] += Math.sin(snowAngle[i]) * 0.4 * dt

    if (snowY[i] < -1) {
      _initSnowInstance(i)
    }

    _iPos.set(snowX[i], snowY[i], snowZ[i])
    _iMat.compose(_iPos, _snowFlatRot, _iScl)
    snowMesh.setMatrixAt(i, _iMat)
  }
  snowMesh.instanceMatrix.needsUpdate = true
}

// ── Main Update ─────────────────────────────────────────────────────────────

let hasAutoWateredThisCycle = false

function updateWeather (dtMs, sunLight) {
  if (!scene) return

  const now = Date.now()

  // Check for weather change
  if (now >= nextWeatherChange) {
    const oldWeather = currentWeather
    currentWeather = _pickNextWeather()
    nextWeatherChange = now + _randomInterval()
    hasAutoWateredThisCycle = false

    // Notify listeners
    for (const listener of weatherListeners) {
      listener(currentWeather, oldWeather)
    }
  }

  // Update precipitation — both meshes manage their own visibility
  _updateRain(dtMs)
  _updateSnow(dtMs)
  _updateClouds(dtMs)
  _updatePuddles(dtMs)
  if (currentWeather !== 'snowy') {
    _updateLightning(dtMs, sunLight)
  }

  // Auto-water crops when raining (once per rain cycle)
  if ((currentWeather === 'rainy' || currentWeather === 'stormy') &&
      !hasAutoWateredThisCycle && autoWaterCallback) {
    hasAutoWateredThisCycle = true
    autoWaterCallback()
  }
}

function getCurrentWeather () {
  return currentWeather
}

function getWeatherIcon () {
  switch (currentWeather) {
    case 'clear': return '\u{2600}\u{FE0F}' // sun
    case 'cloudy': return '\u{2601}\u{FE0F}' // cloud
    case 'rainy': return '\u{1F327}\u{FE0F}' // rain
    case 'stormy': return '\u{26C8}\u{FE0F}' // thunder cloud
    case 'snowy': return '\u{1F328}\u{FE0F}' // snow
    default: return '\u{2600}\u{FE0F}'
  }
}

function getWeatherName () {
  return currentWeather.charAt(0).toUpperCase() + currentWeather.slice(1)
}

// Returns a light dimming factor for weather (1 = full light, <1 = dimmer)
function getWeatherLightFactor () {
  switch (currentWeather) {
    case 'clear': return 1.0
    case 'cloudy': return 0.75
    case 'rainy': return 0.55
    case 'stormy': return 0.35
    case 'snowy': return 0.65
    default: return 1.0
  }
}

function onWeatherChange (callback) {
  weatherListeners.push(callback)
}

export {
  initWeather,
  updateWeather,
  getCurrentWeather,
  getWeatherIcon,
  getWeatherName,
  getWeatherLightFactor,
  onWeatherChange
}
