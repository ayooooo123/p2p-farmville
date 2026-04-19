import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from './three.module.min.js'

import {
  initParticles,
  createParticleEffect,
  updateParticles,
  getActiveEffectCount,
  prepareEffectConfigs,
  dispose
} from './particles.js'

const POSITION = { x: 0, y: 0.1, z: 0 }

function withFakeNow (start, fn) {
  const originalNow = Date.now
  let now = start
  Date.now = () => now
  try {
    return fn({
      advance (ms) {
        now += ms
      }
    })
  } finally {
    Date.now = originalNow
  }
}

test('particle pool tracks active slots and reuses freed capacity after expiry', () => {
  withFakeNow(1_000, ({ advance }) => {
    initParticles(new THREE.Scene())

    for (let i = 0; i < 6; i++) {
      createParticleEffect('levelup', POSITION)
    }
    assert.equal(getActiveEffectCount(), 300)

    createParticleEffect('harvest', POSITION)
    assert.equal(getActiveEffectCount(), 300)

    advance(2_500)
    updateParticles(2_500)
    assert.equal(getActiveEffectCount(), 0)

    createParticleEffect('harvest', POSITION)
    assert.equal(getActiveEffectCount(), 28)

    dispose()
  })
})

test('initParticles resets stale pool bookkeeping between scene mounts', () => {
  withFakeNow(5_000, () => {
    const firstScene = new THREE.Scene()
    const secondScene = new THREE.Scene()

    initParticles(firstScene)
    createParticleEffect('harvest', POSITION)
    assert.equal(getActiveEffectCount(), 28)
    assert.equal(firstScene.children.length, 1)

    initParticles(secondScene)
    assert.equal(getActiveEffectCount(), 0)
    assert.equal(firstScene.children.length, 0)
    assert.equal(secondScene.children.length, 1)

    initParticles(secondScene)
    assert.equal(secondScene.children.length, 1)

    dispose()
    assert.equal(secondScene.children.length, 0)
  })
})

test('prepareEffectConfigs precomputes reusable RGB color data', () => {
  const prepared = prepareEffectConfigs({
    demo: {
      color: 0x336699,
      colorVariance: 0x112233,
      colorPalette: [0xff0000, 0x00ff00],
      count: 2,
      size: 1,
      speed: 1,
      spread: 1,
      lifetime: 100,
      gravity: 0,
      direction: { x: 0, y: 0, z: 0 },
      fadeOut: true
    }
  })

  const baseColor = new THREE.Color(0x336699)
  const varianceColor = new THREE.Color(0x112233)
  const paletteA = new THREE.Color(0xff0000)
  const paletteB = new THREE.Color(0x00ff00)

  assert.deepEqual(prepared.demo.baseColorRGB, [baseColor.r, baseColor.g, baseColor.b])
  assert.deepEqual(prepared.demo.varianceColorRGB, [varianceColor.r, varianceColor.g, varianceColor.b])
  assert.deepEqual(prepared.demo.paletteRGB, [
    [paletteA.r, paletteA.g, paletteA.b],
    [paletteB.r, paletteB.g, paletteB.b]
  ])
})
