import test from 'node:test'
import assert from 'node:assert/strict'

import * as THREE from './three.module.min.js'

const listenerRegistry = new Map()

globalThis.window = {
  addEventListener (type, handler) {
    if (!listenerRegistry.has(type)) listenerRegistry.set(type, new Set())
    listenerRegistry.get(type).add(handler)
  }
}

await import('./player.js')

const { initPlayer } = window.PlayerController

test('initPlayer avoids duplicate scene meshes and keyboard listeners on re-init', () => {
  const scene = new THREE.Scene()

  const firstPlayer = initPlayer(scene)
  const secondPlayer = initPlayer(scene)

  assert.notStrictEqual(firstPlayer, secondPlayer)
  assert.equal(
    scene.children.length,
    1,
    're-initializing the player should replace the previous mesh instead of leaking duplicate groups into the scene'
  )
  assert.strictEqual(scene.children[0], secondPlayer)
  assert.equal(
    listenerRegistry.get('keydown')?.size ?? 0,
    1,
    're-initializing the player should reuse the existing keydown listener instead of stacking duplicates'
  )
  assert.equal(
    listenerRegistry.get('keyup')?.size ?? 0,
    1,
    're-initializing the player should reuse the existing keyup listener instead of stacking duplicates'
  )
})