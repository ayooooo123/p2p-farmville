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

function withFixedRandom (value, fn) {
  const originalRandom = Math.random
  Math.random = () => value
  try {
    return fn()
  } finally {
    Math.random = originalRandom
  }
}

function getInstanceTranslation (scene, index = 0) {
  const mesh = scene.children[0]
  const matrix = new THREE.Matrix4()
  const position = new THREE.Vector3()
  mesh.getMatrixAt(index, matrix)
  position.setFromMatrixPosition(matrix)
  return position
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

test('smoke particles drift farther in the configured ambient wind direction', async () => {
  const {
    setParticleWind,
    initParticles,
    createParticleEffect,
    updateParticles,
    dispose
  } = await import('./particles.js')

  withFakeNow(10_000, ({ advance }) => {
    withFixedRandom(0.5, () => {
      const calmScene = new THREE.Scene()
      initParticles(calmScene)
      setParticleWind(0, 0)
      createParticleEffect('smoke', POSITION)
      advance(1_000)
      updateParticles(1_000)
      const calmX = getInstanceTranslation(calmScene, 0).x
      dispose()

      const windyScene = new THREE.Scene()
      initParticles(windyScene)
      setParticleWind(2, 0)
      createParticleEffect('smoke', POSITION)
      advance(1_000)
      updateParticles(1_000)
      const windyX = getInstanceTranslation(windyScene, 0).x
      dispose()

      assert.ok(windyX > calmX + 0.5, `expected wind drift to push smoke farther along +X (calm=${calmX}, windy=${windyX})`)
    })
  })
})

test('reused particle slots clear smoke wind drag before spawning non-wind effects', async () => {
  const {
    setParticleWind,
    initParticles,
    createParticleEffect,
    updateParticles,
    dispose
  } = await import('./particles.js')

  withFakeNow(20_000, ({ advance }) => {
    withFixedRandom(0.5, () => {
      const reusedScene = new THREE.Scene()
      initParticles(reusedScene)
      setParticleWind(2, 0)
      createParticleEffect('smoke', POSITION)
      advance(2_000)
      updateParticles(2_000)
      createParticleEffect('harvest', POSITION)
      advance(100)
      updateParticles(100)
      const reusedHarvestX = getInstanceTranslation(reusedScene, 4).x
      dispose()

      const cleanScene = new THREE.Scene()
      initParticles(cleanScene)
      setParticleWind(2, 0)
      createParticleEffect('harvest', POSITION)
      advance(100)
      updateParticles(100)
      const cleanHarvestX = getInstanceTranslation(cleanScene, 0).x
      dispose()

      assert.equal(reusedHarvestX, cleanHarvestX)
    })
  })
})
