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

function collectMeshRefs (group) {
  const meshes = []
  group.traverse((child) => {
    if (!child.isMesh) return
    meshes.push({ geometry: child.geometry, material: child.material })
  })
  return meshes
}

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

test('initPlayer reuses shared player mesh assets across re-init', () => {
  const scene = new THREE.Scene()

  const firstPlayer = initPlayer(scene)
  const secondPlayer = initPlayer(scene)

  const firstMeshes = collectMeshRefs(firstPlayer)
  const secondMeshes = collectMeshRefs(secondPlayer)

  assert.equal(secondMeshes.length, firstMeshes.length)
  assert.ok(secondMeshes.length > 0, 'expected the player mesh to contain renderable child meshes')

  for (let i = 0; i < secondMeshes.length; i++) {
    assert.strictEqual(
      secondMeshes[i].geometry,
      firstMeshes[i].geometry,
      `mesh ${i} should reuse the same shared geometry on player re-init`
    )
    assert.strictEqual(
      secondMeshes[i].material,
      firstMeshes[i].material,
      `mesh ${i} should reuse the same shared material on player re-init`
    )
  }
})
