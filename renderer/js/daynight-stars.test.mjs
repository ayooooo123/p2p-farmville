import test from 'node:test'
import assert from 'node:assert/strict'

import * as THREE from './three.module.min.js'
import { initDayNight } from './daynight.js'

test('initDayNight reuses a small shared material palette for stars', () => {
  const scene = new THREE.Scene()
  const sun = new THREE.DirectionalLight()
  const ambient = new THREE.AmbientLight()
  const hemi = new THREE.HemisphereLight()

  initDayNight(scene, sun, ambient, hemi, {})

  const starsGroup = scene.children.find(child => child.isGroup && child.children.length === 200)
  assert.ok(starsGroup, 'expected stars group to be added to the scene')

  const starMaterials = starsGroup.children
    .filter(child => child.isMesh)
    .map(child => child.material)

  assert.equal(starMaterials.length, 200, 'expected 200 star meshes')
  assert.ok(
    new Set(starMaterials).size <= 8,
    'stars should reuse a small shared material palette instead of cloning one material per star'
  )
})
