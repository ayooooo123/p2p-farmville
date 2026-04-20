import test from 'node:test'
import assert from 'node:assert/strict'

globalThis.window = {}

const { createDecoMesh } = await import('./decorations.js')

function getMesh (group, index, label) {
  const mesh = group.children[index]
  assert.ok(mesh?.isMesh, `expected ${label} mesh at child index ${index}`)
  return mesh
}

test('createDecoMesh reuses shared bench assets across repeated benches', () => {
  const firstBench = createDecoMesh('bench')
  const secondBench = createDecoMesh('bench')

  assert.notStrictEqual(firstBench, secondBench)
  assert.equal(firstBench.children.length, 4)
  assert.equal(secondBench.children.length, 4)

  const firstSeat = getMesh(firstBench, 0, 'first seat')
  const secondSeat = getMesh(secondBench, 0, 'second seat')
  const firstBack = getMesh(firstBench, 1, 'first back')
  const secondBack = getMesh(secondBench, 1, 'second back')
  const firstLeg = getMesh(firstBench, 2, 'first leg')
  const secondLeg = getMesh(secondBench, 2, 'second leg')

  assert.notStrictEqual(firstSeat, secondSeat)
  assert.strictEqual(firstSeat.geometry, secondSeat.geometry)
  assert.strictEqual(firstSeat.material, secondSeat.material)
  assert.strictEqual(firstBack.geometry, secondBack.geometry)
  assert.strictEqual(firstBack.material, secondBack.material)
  assert.strictEqual(firstLeg.geometry, secondLeg.geometry)
  assert.strictEqual(firstLeg.material, secondLeg.material)
})

test('same-shape fence decorations share geometry while keeping color-specific materials separate', () => {
  const whiteFence = createDecoMesh('white_fence')
  const woodenFence = createDecoMesh('wooden_fence')

  assert.equal(whiteFence.children.length, 4)
  assert.equal(woodenFence.children.length, 4)

  const whitePost = getMesh(whiteFence, 0, 'white fence post')
  const woodenPost = getMesh(woodenFence, 0, 'wooden fence post')
  const whiteRail = getMesh(whiteFence, 2, 'white fence rail')
  const woodenRail = getMesh(woodenFence, 2, 'wooden fence rail')

  assert.strictEqual(whitePost.geometry, woodenPost.geometry)
  assert.strictEqual(whiteRail.geometry, woodenRail.geometry)
  assert.notStrictEqual(whitePost.material, woodenPost.material)
  assert.notStrictEqual(whiteRail.material, woodenRail.material)
})
