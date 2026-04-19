import test from 'node:test'
import assert from 'node:assert/strict'

import * as THREE from './three.module.min.js'
import { initWeather } from './weather.js'

test('initWeather reuses one shared sphere geometry for all cloud puffs', () => {
  const scene = new THREE.Scene()
  initWeather(scene)

  const cloudGroup = scene.children.find(child => child.isGroup && child.children.length === 8)
  assert.ok(cloudGroup, 'expected cloud group to be added to the weather scene')

  const puffGeometries = []
  for (const cloud of cloudGroup.children) {
    for (const puff of cloud.children) {
      if (puff.isMesh) puffGeometries.push(puff.geometry)
    }
  }

  assert.ok(puffGeometries.length > 0, 'expected cloud puffs to be created')
  assert.equal(new Set(puffGeometries).size, 1, 'all cloud puffs should share a single sphere geometry instance')
})
