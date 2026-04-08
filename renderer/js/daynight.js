import * as THREE from './three.module.min.js'

// ── Day/Night Cycle System ──────────────────────────────────────────────────
// Full day cycle in 10 minutes (600,000ms) by default

const DAY_CYCLE_MS = 600000 // 10 minutes per full day
const PHASES = ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night']

// Phase timing (fraction of full cycle)
const PHASE_RANGES = {
  dawn: { start: 0.0, end: 0.08 },
  morning: { start: 0.08, end: 0.25 },
  noon: { start: 0.25, end: 0.42 },
  afternoon: { start: 0.42, end: 0.58 },
  dusk: { start: 0.58, end: 0.70 },
  night: { start: 0.70, end: 1.0 }
}

// Light configs per phase
const PHASE_CONFIGS = {
  dawn: {
    sunColor: new THREE.Color(0xff9944),
    sunIntensity: 0.5,
    ambientColor: new THREE.Color(0x553322),
    ambientIntensity: 0.3,
    skyColor: new THREE.Color(0xff7744),
    fogColor: new THREE.Color(0xff8855),
    hemiSky: new THREE.Color(0xff8855),
    hemiGround: new THREE.Color(0x443322)
  },
  morning: {
    sunColor: new THREE.Color(0xffeebb),
    sunIntensity: 0.9,
    ambientColor: new THREE.Color(0x505050),
    ambientIntensity: 0.5,
    skyColor: new THREE.Color(0x87ceeb),
    fogColor: new THREE.Color(0x87ceeb),
    hemiSky: new THREE.Color(0x87ceeb),
    hemiGround: new THREE.Color(0x556b2f)
  },
  noon: {
    sunColor: new THREE.Color(0xffffff),
    sunIntensity: 1.2,
    ambientColor: new THREE.Color(0x606060),
    ambientIntensity: 0.6,
    skyColor: new THREE.Color(0x87ceeb),
    fogColor: new THREE.Color(0x87ceeb),
    hemiSky: new THREE.Color(0x87ceeb),
    hemiGround: new THREE.Color(0x556b2f)
  },
  afternoon: {
    sunColor: new THREE.Color(0xffeedd),
    sunIntensity: 1.0,
    ambientColor: new THREE.Color(0x555555),
    ambientIntensity: 0.5,
    skyColor: new THREE.Color(0x7ab8d8),
    fogColor: new THREE.Color(0x7ab8d8),
    hemiSky: new THREE.Color(0x7ab8d8),
    hemiGround: new THREE.Color(0x556b2f)
  },
  dusk: {
    sunColor: new THREE.Color(0xdd6644),
    sunIntensity: 0.5,
    ambientColor: new THREE.Color(0x443355),
    ambientIntensity: 0.3,
    skyColor: new THREE.Color(0x884466),
    fogColor: new THREE.Color(0x775566),
    hemiSky: new THREE.Color(0x884466),
    hemiGround: new THREE.Color(0x332244)
  },
  night: {
    sunColor: new THREE.Color(0x334466),
    sunIntensity: 0.15,
    ambientColor: new THREE.Color(0x111122),
    ambientIntensity: 0.15,
    skyColor: new THREE.Color(0x0a0a1a),
    fogColor: new THREE.Color(0x0a0a1a),
    hemiSky: new THREE.Color(0x111133),
    hemiGround: new THREE.Color(0x050510)
  }
}

let sunLight = null
let ambientLight = null
let hemiLight = null
let scene = null
let startTime = 0
let cycleDuration = DAY_CYCLE_MS
let currentPhase = 'noon'
let timeOfDay = 0.3 // fraction 0-1

// Stars
let starsGroup = null
const STAR_COUNT = 200

// Fireflies
let firefliesGroup = null
const FIREFLY_COUNT = 30
const fireflyData = [] // per-firefly animation state

function initDayNight (sceneRef, sunRef, ambientRef, hemiRef, options) {
  scene = sceneRef
  sunLight = sunRef
  ambientLight = ambientRef
  hemiLight = hemiRef
  startTime = Date.now()

  if (options && options.cycleDuration) {
    cycleDuration = options.cycleDuration
  }

  // Create stars group
  _createStars()

  // Create fireflies group
  _createFireflies()
}

function _createStars () {
  starsGroup = new THREE.Group()
  starsGroup.visible = false

  const starGeo = new THREE.SphereGeometry(0.15, 4, 4)
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff })

  for (let i = 0; i < STAR_COUNT; i++) {
    const star = new THREE.Mesh(starGeo, starMat)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI * 0.4 + 0.1 // upper hemisphere
    const r = 120 + Math.random() * 50
    star.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    )
    // Vary brightness
    const brightness = 0.5 + Math.random() * 0.5
    star.material = starMat.clone()
    star.material.color.setRGB(brightness, brightness, brightness * 0.9)
    starsGroup.add(star)
  }

  if (scene) scene.add(starsGroup)
}

function _createFireflies () {
  firefliesGroup = new THREE.Group()
  firefliesGroup.visible = false

  const ffGeo = new THREE.SphereGeometry(0.12, 5, 5)

  for (let i = 0; i < FIREFLY_COUNT; i++) {
    // Randomise color between yellow-green and cool green
    const hue = 0.18 + Math.random() * 0.15 // 0.18–0.33 (yellow-green to green)
    const col = new THREE.Color().setHSL(hue, 1.0, 0.6)
    const mat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0
    })
    const mesh = new THREE.Mesh(ffGeo, mat)

    // Spawn within the farm grid (±18 units) and low altitude
    const x = (Math.random() - 0.5) * 36
    const z = (Math.random() - 0.5) * 36
    const y = 0.5 + Math.random() * 1.5
    mesh.position.set(x, y, z)
    firefliesGroup.add(mesh)

    // Per-firefly random phase state
    fireflyData.push({
      mesh,
      // Drift velocity
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.1,
      vz: (Math.random() - 0.5) * 0.3,
      // Blink params
      blinkPhase: Math.random() * Math.PI * 2,
      blinkSpeed: 0.8 + Math.random() * 1.5,
      // Base position for gentle wandering
      baseX: x, baseY: y, baseZ: z,
      // Wander angle
      angle: Math.random() * Math.PI * 2,
      angleSpeed: (Math.random() - 0.5) * 0.5
    })
  }

  if (scene) scene.add(firefliesGroup)
}

function _updateFireflies (dtMs, nightStrength) {
  if (!firefliesGroup) return
  const dt = dtMs / 1000 // seconds

  for (const ff of fireflyData) {
    // Slow circular drift around base position
    ff.angle += ff.angleSpeed * dt
    const radius = 3 + Math.sin(ff.blinkPhase * 0.3) * 1.5
    ff.mesh.position.x = ff.baseX + Math.cos(ff.angle) * radius
    ff.mesh.position.z = ff.baseZ + Math.sin(ff.angle) * radius

    // Gentle vertical bob
    ff.blinkPhase += ff.blinkSpeed * dt
    ff.mesh.position.y = ff.baseY + Math.sin(ff.blinkPhase * 0.7) * 0.4

    // Blink: sinusoidal opacity pulse
    const blink = (Math.sin(ff.blinkPhase * ff.blinkSpeed) + 1) / 2
    ff.mesh.material.opacity = blink * nightStrength * 0.9

    // Keep within farm bounds
    ff.baseX = Math.max(-18, Math.min(18, ff.baseX + ff.vx * dt))
    ff.baseZ = Math.max(-18, Math.min(18, ff.baseZ + ff.vz * dt))
  }
}

function _getPhase (t) {
  for (const phase of PHASES) {
    const range = PHASE_RANGES[phase]
    if (t >= range.start && t < range.end) return phase
  }
  return 'night'
}

function _lerpColor (a, b, t) {
  const result = new THREE.Color()
  result.r = a.r + (b.r - a.r) * t
  result.g = a.g + (b.g - a.g) * t
  result.b = a.b + (b.b - a.b) * t
  return result
}

function _lerp (a, b, t) {
  return a + (b - a) * t
}

function updateDayNight (dtMs) {
  if (!sunLight || !scene) return

  const elapsed = (Date.now() - startTime) % cycleDuration
  timeOfDay = elapsed / cycleDuration

  const phase = _getPhase(timeOfDay)
  currentPhase = phase

  // Get current and next phase for smooth transitions
  const phaseIdx = PHASES.indexOf(phase)
  const nextPhase = PHASES[(phaseIdx + 1) % PHASES.length]
  const range = PHASE_RANGES[phase]
  const phaseProgress = (timeOfDay - range.start) / (range.end - range.start)

  const current = PHASE_CONFIGS[phase]
  const next = PHASE_CONFIGS[nextPhase]

  // Smooth transition between phases
  const t = Math.min(1, Math.max(0, phaseProgress))

  // Update sun light
  sunLight.color.copy(_lerpColor(current.sunColor, next.sunColor, t))
  sunLight.intensity = _lerp(current.sunIntensity, next.sunIntensity, t)

  // Move sun position based on time
  const sunAngle = timeOfDay * Math.PI * 2 - Math.PI / 2
  sunLight.position.set(
    Math.cos(sunAngle) * 50,
    Math.sin(sunAngle) * 50 + 10,
    30
  )

  // Update ambient light
  if (ambientLight) {
    ambientLight.color.copy(_lerpColor(current.ambientColor, next.ambientColor, t))
    ambientLight.intensity = _lerp(current.ambientIntensity, next.ambientIntensity, t)
  }

  // Update hemisphere light
  if (hemiLight) {
    hemiLight.color.copy(_lerpColor(current.hemiSky, next.hemiSky, t))
    hemiLight.groundColor.copy(_lerpColor(current.hemiGround, next.hemiGround, t))
  }

  // Update sky/fog
  const skyColor = _lerpColor(current.skyColor, next.skyColor, t)
  scene.background = skyColor
  if (scene.fog) {
    scene.fog.color.copy(_lerpColor(current.fogColor, next.fogColor, t))
  }

  // Stars visibility - show during night and dusk/dawn edges
  if (starsGroup) {
    const isNightish = phase === 'night' || phase === 'dusk' ||
      (phase === 'dawn' && phaseProgress < 0.5)
    starsGroup.visible = isNightish

    if (isNightish) {
      // Twinkle effect
      const children = starsGroup.children
      for (let i = 0; i < children.length; i++) {
        if (Math.random() < 0.02) {
          const b = 0.3 + Math.random() * 0.7
          children[i].material.color.setRGB(b, b, b * 0.9)
        }
      }
      // Fade stars based on how "night" it is
      let starOpacity = 1
      if (phase === 'dusk') starOpacity = phaseProgress
      else if (phase === 'dawn') starOpacity = 1 - phaseProgress * 2
      starsGroup.children.forEach(s => {
        s.material.opacity = Math.max(0, starOpacity)
        s.material.transparent = starOpacity < 1
      })
    }
  }

  // Fireflies — appear at dusk/night, wander and blink
  if (firefliesGroup) {
    const isNightish = phase === 'night' || phase === 'dusk' ||
      (phase === 'dawn' && phaseProgress < 0.5)
    firefliesGroup.visible = isNightish

    if (isNightish) {
      let ffStrength = 1
      if (phase === 'dusk') ffStrength = Math.min(1, phaseProgress * 2)
      else if (phase === 'dawn') ffStrength = Math.max(0, 1 - phaseProgress * 2)
      _updateFireflies(dtMs || 16, ffStrength)
    }
  }
}

function getTimeOfDay () {
  return timeOfDay
}

function getCurrentPhase () {
  return currentPhase
}

function getGameClockString () {
  // Convert timeOfDay fraction to 24h clock
  const hours = Math.floor(timeOfDay * 24)
  const minutes = Math.floor((timeOfDay * 24 - hours) * 60)
  const h = String(hours).padStart(2, '0')
  const m = String(minutes).padStart(2, '0')
  return h + ':' + m
}

function getPhaseIcon () {
  switch (currentPhase) {
    case 'dawn': return '\u{1F305}' // sunrise
    case 'morning': return '\u{2600}' // sun
    case 'noon': return '\u{1F31E}' // sun with face
    case 'afternoon': return '\u{26C5}' // sun behind cloud
    case 'dusk': return '\u{1F307}' // sunset
    case 'night': return '\u{1F319}' // crescent moon
    default: return '\u{2600}'
  }
}

function isNight () {
  return currentPhase === 'night'
}

// Return the current light intensity multiplier (for weather dimming)
function getLightMultiplier () {
  const config = PHASE_CONFIGS[currentPhase]
  return config ? config.sunIntensity / 1.2 : 1
}

export {
  initDayNight,
  updateDayNight,
  getTimeOfDay,
  getCurrentPhase,
  getGameClockString,
  getPhaseIcon,
  isNight,
  getLightMultiplier
}
