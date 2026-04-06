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

// Rain particles
let rainGroup = null
const MAX_RAIN_DROPS = 500
let rainDrops = []

// Cloud system
let cloudGroup = null
const MAX_CLOUDS = 8
let clouds = []

// Lightning
let lastLightningTime = 0

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

// ── Rain System ─────────────────────────────────────────────────────────────

function _createRainSystem () {
  rainGroup = new THREE.Group()
  rainGroup.visible = false

  const dropGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 3)
  const dropMat = new THREE.MeshBasicMaterial({ color: 0x6688cc, transparent: true, opacity: 0.6 })

  for (let i = 0; i < MAX_RAIN_DROPS; i++) {
    const drop = new THREE.Mesh(dropGeo, dropMat.clone())
    _resetRainDrop(drop)
    rainGroup.add(drop)
    rainDrops.push(drop)
  }

  if (scene) scene.add(rainGroup)
}

function _resetRainDrop (drop) {
  drop.position.set(
    (Math.random() - 0.5) * 100,
    20 + Math.random() * 30,
    (Math.random() - 0.5) * 100
  )
  drop.userData.speed = 15 + Math.random() * 10
}

function _updateRain (dtMs) {
  if (!rainGroup) return

  const isRaining = currentWeather === 'rainy' || currentWeather === 'stormy'
  rainGroup.visible = isRaining

  if (!isRaining) return

  const dt = dtMs / 1000
  const dropCount = currentWeather === 'stormy' ? MAX_RAIN_DROPS : Math.floor(MAX_RAIN_DROPS * 0.5)

  for (let i = 0; i < rainDrops.length; i++) {
    const drop = rainDrops[i]
    drop.visible = i < dropCount

    if (!drop.visible) continue

    drop.position.y -= drop.userData.speed * dt

    // Wind effect for storms
    if (currentWeather === 'stormy') {
      drop.position.x += 3 * dt
      drop.rotation.z = 0.3
    } else {
      drop.rotation.z = 0
    }

    if (drop.position.y < 0) {
      _resetRainDrop(drop)
    }
  }
}

// ── Cloud System ────────────────────────────────────────────────────────────

function _createCloudSystem () {
  cloudGroup = new THREE.Group()
  cloudGroup.visible = false

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
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    transparent: true,
    opacity: 0.7,
    roughness: 1,
    metalness: 0
  })

  // Cluster of spheres to form a cloud
  const puffCount = 4 + Math.floor(Math.random() * 4)
  for (let j = 0; j < puffCount; j++) {
    const r = 2 + Math.random() * 3
    const puffGeo = new THREE.SphereGeometry(r, 6, 6)
    const puff = new THREE.Mesh(puffGeo, cloudMat.clone())
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

  for (const cloud of clouds) {
    cloud.position.x += cloud.userData.speed * dt

    // Wrap around
    if (cloud.position.x > 100) {
      cloud.position.x = -100
      cloud.position.z = (Math.random() - 0.5) * 100
    }

    // Update cloud color/opacity
    cloud.traverse(child => {
      if (child.isMesh) {
        child.material.opacity = cloudOpacity
        child.material.color.setHex(cloudColor)
      }
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

// ── Snow (reuses rain group with modified behavior) ─────────────────────────

function _updateSnow (dtMs) {
  if (currentWeather !== 'snowy' || !rainGroup) return

  rainGroup.visible = true
  const dt = dtMs / 1000
  const snowCount = Math.floor(MAX_RAIN_DROPS * 0.4)

  for (let i = 0; i < rainDrops.length; i++) {
    const drop = rainDrops[i]
    drop.visible = i < snowCount

    if (!drop.visible) continue

    // Snow falls slowly and drifts
    drop.position.y -= 2 * dt
    drop.position.x += Math.sin(Date.now() * 0.001 + i) * 0.5 * dt
    drop.material.color.setHex(0xffffff)
    drop.material.opacity = 0.8
    drop.scale.set(3, 1, 3)
    drop.rotation.z = 0

    if (drop.position.y < 0) {
      _resetRainDrop(drop)
    }
  }
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

    // Reset rain appearance when switching from snow
    if (oldWeather === 'snowy') {
      for (const drop of rainDrops) {
        drop.material.color.setHex(0x6688cc)
        drop.material.opacity = 0.6
        drop.scale.set(1, 1, 1)
      }
    }

    // Notify listeners
    for (const listener of weatherListeners) {
      listener(currentWeather, oldWeather)
    }
  }

  // Update particles
  if (currentWeather === 'snowy') {
    _updateSnow(dtMs)
    _updateClouds(dtMs)
  } else {
    _updateRain(dtMs)
    _updateClouds(dtMs)
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
