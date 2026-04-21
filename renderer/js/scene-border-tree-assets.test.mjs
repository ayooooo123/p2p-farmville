import test from 'node:test'
import assert from 'node:assert/strict'

globalThis.window = {}

const { createBorderTreeGroup } = await import('./scene.js')

test('createBorderTreeGroup reuses shared trunk/canopy geometry and shared trunk material', () => {
  const treeA = createBorderTreeGroup({
    x: -24,
    z: -24,
    offsetX: 0,
    offsetZ: 0,
    canopyRadius: 1.25,
    trunkHeight: 1.1,
    canopyColor: 0x2d7a1e,
    windPhaseJitter: 0.1
  })
  const treeB = createBorderTreeGroup({
    x: 24,
    z: 24,
    offsetX: 0,
    offsetZ: 0,
    canopyRadius: 1.85,
    trunkHeight: 1.35,
    canopyColor: 0x3d8a2e,
    windPhaseJitter: 0.4
  })

  const trunkA = treeA.userData.trunkMeshes[0]
  const trunkB = treeB.userData.trunkMeshes[0]
  const canopyA = treeA.userData.canopyMeshes[0]
  const canopyB = treeB.userData.canopyMeshes[0]

  assert.ok(trunkA && trunkB && canopyA && canopyB, 'expected both border trees to expose cached trunk/canopy refs')
  assert.strictEqual(trunkA.geometry, trunkB.geometry, 'border tree trunks should reuse one shared cylinder geometry')
  assert.strictEqual(trunkA.material, trunkB.material, 'border tree trunks should reuse one shared bark material')
  assert.strictEqual(canopyA.geometry, canopyB.geometry, 'border tree canopies should reuse one shared sphere geometry')
  assert.notStrictEqual(canopyA.material, canopyB.material, 'border tree canopies should keep per-tree materials for unique tinting')
  assert.equal(trunkA.scale.y, 1.1, 'trunk height should still be represented by mesh scale')
  assert.equal(canopyB.scale.x, 1.85, 'canopy radius should still be represented by mesh scale')
})
