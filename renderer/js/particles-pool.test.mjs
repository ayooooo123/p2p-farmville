import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from './three.module.min.js'

import {
  initParticles,
  createParticleEffect,
  updateParticles,
  getActiveEffectCount,
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
