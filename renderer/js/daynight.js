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

// Midpoint of the 'noon' phase — used as the anchor for peak sun elevation.
// Keeping this derived from PHASE_RANGES means tweaks to phase timing
// automatically keep the sun overhead during the noon window.
const SUN_NOON_FRAC = (PHASE_RANGES.noon.start + PHASE_RANGES.noon.end) / 2

// Light configs per phase
// ambientColor uses proper colour temperature:
//   dawn/dusk  → warm deep orange-amber (CCT ~2000 K feel)
//   morning    → warm golden (CCT ~3500 K)
//   noon       → neutral warm white (CCT ~6000 K)
//   afternoon  → slightly warm white (CCT ~5000 K)
//   night      → cool blue-purple moonlight
// dirExposure is a per-phase renderer toneMappingExposure target so the whole
// scene brightens / dims naturally rather than just shifting one light channel.
const PHASE_CONFIGS = {
  dawn: {
    sunColor: new THREE.Color(0xff8822),      // deep orange sunrise
    sunIntensity: 0.55,
    ambientColor: new THREE.Color(0x7a3a18),  // warm deep amber (↑ from 0x553322)
    ambientIntensity: 0.38,
    skyColor: new THREE.Color(0xff7033),
    fogColor: new THREE.Color(0xff7744),
    hemiSky: new THREE.Color(0xff8033),
    hemiGround: new THREE.Color(0x4a2a12),
    hemiIntensity: 0.55,
    dirExposure: 0.85                         // dim exposure at horizon
  },
  morning: {
    sunColor: new THREE.Color(0xffe8a0),      // golden morning sun
    sunIntensity: 1.0,
    ambientColor: new THREE.Color(0x9a7240),  // warm golden-brown (↑ saturated)
    ambientIntensity: 0.55,
    skyColor: new THREE.Color(0x87ceeb),
    fogColor: new THREE.Color(0x90d0ee),
    hemiSky: new THREE.Color(0x87ceeb),
    hemiGround: new THREE.Color(0x556b2f),
    hemiIntensity: 1.0,
    dirExposure: 1.1
  },
  noon: {
    sunColor: new THREE.Color(0xffffff),      // pure white noon sun
    sunIntensity: 1.3,
    ambientColor: new THREE.Color(0xd8e8f8),  // cool near-white sky fill (↑ was gray)
    ambientIntensity: 0.65,
    skyColor: new THREE.Color(0x87ceeb),
    fogColor: new THREE.Color(0x87ceeb),
    hemiSky: new THREE.Color(0x87ceeb),
    hemiGround: new THREE.Color(0x556b2f),
    hemiIntensity: 1.4,
    dirExposure: 1.3                          // brightest point of day
  },
  afternoon: {
    sunColor: new THREE.Color(0xffe8cc),      // warm-white afternoon
    sunIntensity: 1.05,
    ambientColor: new THREE.Color(0xb09060),  // warm golden-tan (↑ was flat gray)
    ambientIntensity: 0.52,
    skyColor: new THREE.Color(0x7ab8d8),
    fogColor: new THREE.Color(0x7ab8d8),
    hemiSky: new THREE.Color(0x7ab8d8),
    hemiGround: new THREE.Color(0x556b2f),
    hemiIntensity: 1.1,
    dirExposure: 1.2
  },
  dusk: {
    sunColor: new THREE.Color(0xcc4422),      // deep red-orange sunset
    sunIntensity: 0.45,
    ambientColor: new THREE.Color(0x6a2a55),  // deep purple-magenta dusk (↑ richer)
    ambientIntensity: 0.32,
    skyColor: new THREE.Color(0x993366),
    fogColor: new THREE.Color(0x884466),
    hemiSky: new THREE.Color(0x884466),
    hemiGround: new THREE.Color(0x3a1a44),
    hemiIntensity: 0.45,
    dirExposure: 0.88                         // dusk dims slightly faster than dawn
  },
  night: {
    sunColor: new THREE.Color(0x2a3a66),      // moonlight blue
    sunIntensity: 0.12,
    ambientColor: new THREE.Color(0x0d1833),  // cool deep blue night (↑ was near-black)
    ambientIntensity: 0.18,
    skyColor: new THREE.Color(0x060a18),
    fogColor: new THREE.Color(0x06080f),
    hemiSky: new THREE.Color(0x0d1a33),
    hemiGround: new THREE.Color(0x03050e),
    hemiIntensity: 0.12,
    dirExposure: 0.60                         // night — deep exposure drop
  }
}

let sunLight = null
let ambientLight = null
let hemiLight = null
let renderer = null   // optional — set in initDayNight to drive toneMappingExposure
let scene = null
let startTime = 0
let cycleDuration = DAY_CYCLE_MS
let currentPhase = 'noon'
let timeOfDay = 0.3 // fraction 0-1

// ── Seasonal lighting modifiers ─────────────────────────────────────────────
// Subtle per-season tint and intensity bias applied AFTER the per-phase lerp.
// `accent` is mixed into sun/ambient/hemi colors at strength `accentT`; intensity
// and exposure scale by their respective multipliers. Effect attenuates through
// night so winter does not crush moonlight to black.
const SEASON_MODIFIERS = {
  spring: { intensityMult: 1.00, exposureMult: 1.00, accent: new THREE.Color(0xddffe0), accentT: 0.04 },
  summer: { intensityMult: 1.06, exposureMult: 1.04, accent: new THREE.Color(0xfff2c8), accentT: 0.05 },
  autumn: { intensityMult: 0.94, exposureMult: 0.96, accent: new THREE.Color(0xffc080), accentT: 0.10 },
  winter: { intensityMult: 0.80, exposureMult: 0.85, accent: new THREE.Color(0xcfe0ff), accentT: 0.14 }
}
let currentSeasonKey = 'summer'
let currentSeasonMod = SEASON_MODIFIERS.summer

// Scratch Color objects reused every frame to avoid per-frame GC pressure.
// Each caller passes its own 'out' Color so there's no shared-reference aliasing risk.
const _tmpSun    = new THREE.Color()
const _tmpAmb    = new THREE.Color()
const _tmpHemSky = new THREE.Color()
const _tmpHemGnd = new THREE.Color()
const _tmpSky    = new THREE.Color()
const _tmpFog    = new THREE.Color()

// Stars
let starsGroup = null
const STAR_COUNT = 200
const STAR_BRIGHTNESS_BUCKETS = 8
const starMaterialCache = new Map()

// Fireflies
let firefliesGroup = null
const FIREFLY_COUNT = 30
const fireflyData = [] // per-firefly animation state

function _disposeMaterial (material) {
  if (!material) return
  if (Array.isArray(material)) {
    for (const entry of material) _disposeMaterial(entry)
    return
  }
  material.dispose?.()
}

function _disposeGroupResources (group, preserveMaterials = null) {
  if (!group) return

  const geometries = new Set()
  const materials = new Set()
  group.traverse(child => {
    if (!child.isMesh) return
    if (child.geometry) geometries.add(child.geometry)
    if (Array.isArray(child.material)) {
      for (const material of child.material) {
        if (material && !preserveMaterials?.has(material)) materials.add(material)
      }
      return
    }
    if (child.material && !preserveMaterials?.has(child.material)) {
      materials.add(child.material)
    }
  })

  for (const geometry of geometries) geometry.dispose?.()
  for (const material of materials) _disposeMaterial(material)
}

function _resetDayNightEffects () {
  starsGroup?.parent?.remove(starsGroup)
  firefliesGroup?.parent?.remove(firefliesGroup)

  _disposeGroupResources(starsGroup, new Set(starMaterialCache.values()))
  _disposeGroupResources(firefliesGroup)

  starsGroup = null
  firefliesGroup = null
  fireflyData.length = 0
}

function initDayNight (sceneRef, sunRef, ambientRef, hemiRef, options) {
  _resetDayNightEffects()

  scene = sceneRef
  sunLight = sunRef
  ambientLight = ambientRef
  hemiLight = hemiRef
  startTime = Date.now()
  cycleDuration = options?.cycleDuration ?? DAY_CYCLE_MS

  // Accept optional renderer ref so we can drive toneMappingExposure per-phase.
  // Reset to null on re-init when a renderer is not supplied so we don't keep a stale ref.
  renderer = options?.renderer ?? null

  // Create stars group
  _createStars()

  // Create fireflies group
  _createFireflies()
}

function _getStarBrightnessBucket (brightness) {
  return Math.max(0, Math.min(
    STAR_BRIGHTNESS_BUCKETS - 1,
    Math.round((brightness - 0.3) / 0.7 * (STAR_BRIGHTNESS_BUCKETS - 1))
  ))
}

function _getStarMaterialForBucket (bucket) {
  if (!starMaterialCache.has(bucket)) {
    const brightness = 0.3 + (bucket / (STAR_BRIGHTNESS_BUCKETS - 1)) * 0.7
    starMaterialCache.set(bucket, new THREE.MeshBasicMaterial({
      color: new THREE.Color(brightness, brightness, brightness * 0.9),
      fog: false
    }))
  }
  return starMaterialCache.get(bucket)
}

function _setStarMaterialOpacity (opacity) {
  const transparent = opacity < 1
  for (const material of starMaterialCache.values()) {
    material.opacity = opacity
    material.transparent = transparent
  }
}

function _createStars () {
  starsGroup = new THREE.Group()
  starsGroup.visible = false

  const starGeo = new THREE.SphereGeometry(0.15, 4, 4)

  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI * 0.4 + 0.1 // upper hemisphere
    const r = 120 + Math.random() * 50
    const brightness = 0.5 + Math.random() * 0.5
    const brightnessBucket = _getStarBrightnessBucket(brightness)
    const star = new THREE.Mesh(starGeo, _getStarMaterialForBucket(brightnessBucket))
    star.userData.starBrightnessBucket = brightnessBucket
    star.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    )
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
      opacity: 0,
      fog: false  // don't let scene fog wash out firefly glow
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

function _lerpColor (out, a, b, t) {
  // Write into caller-supplied 'out' Color — no shared mutable scratch, no aliasing risk
  out.r = a.r + (b.r - a.r) * t
  out.g = a.g + (b.g - a.g) * t
  out.b = a.b + (b.b - a.b) * t
  return out
}

function _lerp (a, b, t) {
  return a + (b - a) * t
}

function setSeason (season) {
  if (!SEASON_MODIFIERS[season] || season === currentSeasonKey) return
  currentSeasonKey = season
  currentSeasonMod = SEASON_MODIFIERS[season]
}

function getCurrentSeason () {
  return currentSeasonKey
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

  // Seasonal lighting attenuation: full strength in daylight, partially gated through
  // night so e.g. winter doesn't drag night-time exposure into total black. Dusk
  // ramps INTO night (factor rises with t); dawn ramps OUT of night (factor falls).
  const nightFactor =
    phase === 'night' ? 1 :
      phase === 'dusk' ? t :
        phase === 'dawn' ? 1 - t :
          0
  const seasonGate = 1 - nightFactor * 0.7
  const aT     = currentSeasonMod.accentT       * seasonGate
  const iMult  = 1 + (currentSeasonMod.intensityMult - 1) * seasonGate
  const eMult  = 1 + (currentSeasonMod.exposureMult  - 1) * seasonGate

  // Update sun light
  sunLight.color.copy(_lerpColor(_tmpSun, current.sunColor, next.sunColor, t))
  sunLight.color.lerp(currentSeasonMod.accent, aT * 0.5)   // half-strength on direct sun
  sunLight.intensity = _lerp(current.sunIntensity, next.sunIntensity, t) * iMult

  // Move sun position based on time. Anchor the elevation peak to the actual
  // noon midpoint so the sun is overhead during the noon phase (not during
  // dusk, as the previous formula did). Use sin for the east→west swing.
  const sunAngle = (timeOfDay - SUN_NOON_FRAC) * Math.PI * 2
  const sunY = Math.cos(sunAngle) * 50 + 10
  sunLight.position.set(
    -Math.sin(sunAngle) * 50,  // east (+x) at sunrise → west (-x) at sunset
    sunY,                       // peaks at noon, dips below ground at midnight
    30
  )
  // Skip the shadow pass while the sun is below the horizon — saves the
  // shadow render and avoids spurious upward shadow artifacts at night.
  sunLight.castShadow = sunY > 0

  // Update ambient light — color temperature shifts:
  //   dawn/dusk → warm orange-amber, noon → near-white, night → cool blue
  if (ambientLight) {
    ambientLight.color.copy(_lerpColor(_tmpAmb, current.ambientColor, next.ambientColor, t))
    ambientLight.color.lerp(currentSeasonMod.accent, aT)
    ambientLight.intensity = _lerp(current.ambientIntensity, next.ambientIntensity, t) * iMult
  }

  // Drive renderer toneMappingExposure to match phase brightness:
  //   noon → 1.3 (peak bright), night → 0.60 (deep dark), dawn/dusk → 0.85–0.88
  // Smooth lerp prevents jarring jumps at phase boundaries.
  if (renderer && current.dirExposure !== undefined && next.dirExposure !== undefined) {
    const targetExposure = _lerp(current.dirExposure, next.dirExposure, t) * eMult
    // Soft-lerp renderer exposure toward target (avoids 1-frame snap)
    renderer.toneMappingExposure += (targetExposure - renderer.toneMappingExposure) * 0.05
  }

  // Update hemisphere light — color temperature + intensity follow day/night arc
  if (hemiLight) {
    hemiLight.color.copy(_lerpColor(_tmpHemSky, current.hemiSky, next.hemiSky, t))
    hemiLight.color.lerp(currentSeasonMod.accent, aT * 0.7)
    hemiLight.groundColor.copy(_lerpColor(_tmpHemGnd, current.hemiGround, next.hemiGround, t))
    hemiLight.groundColor.lerp(currentSeasonMod.accent, aT * 0.3)
    hemiLight.intensity = _lerp(current.hemiIntensity, next.hemiIntensity, t) * iMult
  }

  // Update sky/fog — each uses its own dedicated scratch Color, no aliasing possible
  if (!scene.background || !(scene.background instanceof THREE.Color)) {
    scene.background = new THREE.Color()
  }
  scene.background.copy(_lerpColor(_tmpSky, current.skyColor, next.skyColor, t))
  if (scene.fog) {
    scene.fog.color.copy(_lerpColor(_tmpFog, current.fogColor, next.fogColor, t))
  }

  // Stars visibility - show during night and dusk/dawn edges
  if (starsGroup) {
    const isNightish = phase === 'night' || phase === 'dusk' ||
      (phase === 'dawn' && phaseProgress < 0.5)
    starsGroup.visible = isNightish

    if (isNightish) {
      // Twinkle effect — occasionally swap a star to another shared brightness bucket.
      const children = starsGroup.children
      for (let i = 0; i < children.length; i++) {
        if (Math.random() < 0.02) {
          const brightness = 0.3 + Math.random() * 0.7
          const bucket = _getStarBrightnessBucket(brightness)
          children[i].userData.starBrightnessBucket = bucket
          children[i].material = _getStarMaterialForBucket(bucket)
        }
      }
      // Fade stars based on how "night" it is.
      let starOpacity = 1
      if (phase === 'dusk') starOpacity = phaseProgress
      else if (phase === 'dawn') starOpacity = 1 - phaseProgress * 2
      _setStarMaterialOpacity(Math.max(0, starOpacity))
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
  getLightMultiplier,
  setSeason,
  getCurrentSeason
}
