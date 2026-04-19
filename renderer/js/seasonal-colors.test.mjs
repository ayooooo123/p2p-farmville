import test from 'node:test'
import assert from 'node:assert/strict'

import * as THREE from './three.module.min.js'
import { applySeasonalColors } from './seasonal-colors.js'

function makeCanopyMesh (baseColor, currentColor = 0xffffff, extras = {}) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.MeshStandardMaterial({ color: currentColor })
  )
  mesh.userData.baseColor = baseColor
  Object.assign(mesh.userData, extras)
  return mesh
}

test('applySeasonalColors restores base colors when blend is null', () => {
  const broadleaf = makeCanopyMesh(0x2d6b1e, 0xff00ff)
  applySeasonalColors([broadleaf], () => null)
  assert.equal(broadleaf.material.color.getHex(), 0x2d6b1e)
})

test('applySeasonalColors can pick per-mesh blends without mutating base colors', () => {
  const deciduous = makeCanopyMesh(0x228b22, 0xffffff, { isPine: false })
  const pine = makeCanopyMesh(0x1a5e1a, 0xffffff, { isPine: true })
  const deciduousBlend = { hex: 0xd4780a, t: 0.72 }
  const pineBlend = { hex: 0xccddcc, t: 0.15 }

  applySeasonalColors([deciduous, pine], (mesh) => mesh.userData.isPine ? pineBlend : deciduousBlend)

  const expectedDeciduous = new THREE.Color(deciduous.userData.baseColor).lerp(new THREE.Color(deciduousBlend.hex), deciduousBlend.t)
  const expectedPine = new THREE.Color(pine.userData.baseColor).lerp(new THREE.Color(pineBlend.hex), pineBlend.t)

  assert.equal(deciduous.material.color.getHex(), expectedDeciduous.getHex())
  assert.equal(pine.material.color.getHex(), expectedPine.getHex())
  assert.equal(deciduous.userData.baseColor, 0x228b22)
  assert.equal(pine.userData.baseColor, 0x1a5e1a)
})
