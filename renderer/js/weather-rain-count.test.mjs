import test from 'node:test'
import assert from 'node:assert/strict'

import * as THREE from './three.module.min.js'
import { initWeather, updateWeather } from './weather.js'

function getRainMesh (scene) {
  return scene.children.find(child => child.isInstancedMesh && child.geometry?.type === 'CylinderGeometry')
}

test('updateWeather limits active rain instance count to the current precipitation density', () => {
  const originalRandom = Math.random
  const originalDateNow = Date.now
  let randomValue = 0
  let now = 0

  Math.random = () => randomValue
  Date.now = () => now

  try {
    const scene = new THREE.Scene()
    initWeather(scene)

    const rainMesh = getRainMesh(scene)
    assert.ok(rainMesh, 'expected weather system to create a rain instanced mesh')
    assert.equal(rainMesh.count, 600)

    randomValue = 0.9 // clear -> rainy
    now = 300000
    updateWeather(16, null)

    assert.equal(rainMesh.visible, true)
    assert.equal(rainMesh.count, Math.floor(600 * 0.55))

    randomValue = 0.9 // rainy -> stormy
    now = 1140000
    updateWeather(16, null)

    assert.equal(rainMesh.visible, true)
    assert.equal(rainMesh.count, 600)
  } finally {
    Math.random = originalRandom
    Date.now = originalDateNow
  }
})
