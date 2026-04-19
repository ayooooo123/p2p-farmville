import * as THREE from './three.module.min.js'

const _defaultBaseScratch = new THREE.Color()
const _defaultTargetScratch = new THREE.Color()

export function createSeasonalColorScratch () {
  return {
    base: new THREE.Color(),
    target: new THREE.Color()
  }
}

export function applySeasonalColors (meshes, getBlendForMesh, scratch = null) {
  if (!Array.isArray(meshes) || typeof getBlendForMesh !== 'function') return

  const base = scratch?.base || _defaultBaseScratch
  const target = scratch?.target || _defaultTargetScratch

  for (const mesh of meshes) {
    if (!mesh?.material || mesh.userData?.baseColor == null) continue

    const blend = getBlendForMesh(mesh)
    base.set(mesh.userData.baseColor)

    if (!blend) {
      mesh.material.color.copy(base)
      continue
    }

    target.set(blend.hex)
    mesh.material.color.copy(base).lerp(target, blend.t)
  }
}
