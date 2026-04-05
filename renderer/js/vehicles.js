import * as THREE from './three.module.min.js'

// ── Vehicle Definitions ─────────────────────────────────────────────────────
export const VEHICLE_DEFINITIONS = {
  tractor: {
    name: 'Tractor', level: 3, cost: 2000,
    effect: 'action_speed_3x', speedMultiplier: 3,
    bodyColor: 0x228b22, wheelColor: 0x333333, accentColor: 0xffd700
  },
  seeder: {
    name: 'Seeder', level: 7, cost: 3500,
    effect: 'plant_speed_3x', speedMultiplier: 3,
    bodyColor: 0x4169e1, wheelColor: 0x333333, accentColor: 0xc0c0c0
  },
  harvester: {
    name: 'Harvester', level: 12, cost: 6000,
    effect: 'harvest_speed_3x', speedMultiplier: 3,
    bodyColor: 0xb22222, wheelColor: 0x333333, accentColor: 0xffd700
  }
}

/**
 * Create a simple vehicle mesh
 * @param {string} vehicleType - key in VEHICLE_DEFINITIONS
 * @returns {THREE.Group}
 */
export function createVehicleMesh (vehicleType) {
  const def = VEHICLE_DEFINITIONS[vehicleType]
  if (!def) return new THREE.Group()

  const group = new THREE.Group()
  group.userData.objectType = 'vehicle'
  group.userData.vehicleType = vehicleType

  const bodyMat = new THREE.MeshStandardMaterial({ color: def.bodyColor })
  const wheelMat = new THREE.MeshStandardMaterial({ color: def.wheelColor })
  const accentMat = new THREE.MeshStandardMaterial({ color: def.accentColor })

  // Main body
  const bodyGeo = new THREE.BoxGeometry(1.4, 0.8, 2.0)
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = 0.9
  body.castShadow = true
  group.add(body)

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.2, 0.7, 1.0)
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.7 })
  const cabin = new THREE.Mesh(cabinGeo, cabinMat)
  cabin.position.set(0, 1.65, -0.3)
  cabin.castShadow = true
  group.add(cabin)

  // Rear wheels (larger)
  for (const side of [-1, 1]) {
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 12)
    const wheel = new THREE.Mesh(wheelGeo, wheelMat)
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(side * 0.8, 0.4, 0.5)
    wheel.castShadow = true
    group.add(wheel)
    // Hub cap
    const hubGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.22, 8)
    const hub = new THREE.Mesh(hubGeo, accentMat)
    hub.rotation.z = Math.PI / 2
    hub.position.set(side * 0.8, 0.4, 0.5)
    group.add(hub)
  }

  // Front wheels (smaller)
  for (const side of [-1, 1]) {
    const wheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 10)
    const wheel = new THREE.Mesh(wheelGeo, wheelMat)
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(side * 0.65, 0.25, -0.7)
    wheel.castShadow = true
    group.add(wheel)
  }

  // Exhaust pipe (tractor specific)
  if (vehicleType === 'tractor') {
    const pipeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6)
    const pipe = new THREE.Mesh(pipeGeo, new THREE.MeshStandardMaterial({ color: 0x555555 }))
    pipe.position.set(0.5, 1.6, 0.5)
    pipe.castShadow = true
    group.add(pipe)
  }

  // Harvester header
  if (vehicleType === 'harvester') {
    const headerGeo = new THREE.BoxGeometry(2.0, 0.3, 0.4)
    const header = new THREE.Mesh(headerGeo, accentMat)
    header.position.set(0, 0.5, -1.3)
    header.castShadow = true
    group.add(header)
    // Reel
    const reelGeo = new THREE.CylinderGeometry(0.3, 0.3, 2.0, 8)
    const reel = new THREE.Mesh(reelGeo, bodyMat)
    reel.rotation.z = Math.PI / 2
    reel.position.set(0, 0.8, -1.3)
    group.add(reel)
  }

  // Seeder bins
  if (vehicleType === 'seeder') {
    for (let i = -1; i <= 1; i++) {
      const binGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.5, 8)
      const bin = new THREE.Mesh(binGeo, accentMat)
      bin.position.set(i * 0.4, 1.6, 0.4)
      bin.castShadow = true
      group.add(bin)
    }
  }

  return group
}

/**
 * Get effective speed multiplier from owned vehicles
 */
export function getVehicleSpeedMultiplier (ownedVehicles, action) {
  let multiplier = 1
  for (const vKey of ownedVehicles) {
    const def = VEHICLE_DEFINITIONS[vKey]
    if (!def) continue

    if (def.effect === 'action_speed_3x') {
      multiplier = Math.max(multiplier, def.speedMultiplier)
    } else if (def.effect === 'plant_speed_3x' && action === 'plant') {
      multiplier = Math.max(multiplier, def.speedMultiplier)
    } else if (def.effect === 'harvest_speed_3x' && action === 'harvest') {
      multiplier = Math.max(multiplier, def.speedMultiplier)
    }
  }
  return multiplier
}

window.VehicleSystem = { VEHICLE_DEFINITIONS, createVehicleMesh, getVehicleSpeedMultiplier }
