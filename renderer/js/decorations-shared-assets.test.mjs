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

test('createDecoMesh reuses flower_box submesh assets while keeping stalk groups instance-local', () => {
  const firstFlowerBox = createDecoMesh('flower_box')
  const secondFlowerBox = createDecoMesh('flower_box')

  assert.equal(firstFlowerBox.children.length, 6)
  assert.equal(secondFlowerBox.children.length, 6)

  const firstBox = getMesh(firstFlowerBox, 0, 'first flower box planter')
  const secondBox = getMesh(secondFlowerBox, 0, 'second flower box planter')
  assert.notStrictEqual(firstBox, secondBox)
  assert.strictEqual(firstBox.geometry, secondBox.geometry)
  assert.strictEqual(firstBox.material, secondBox.material)

  for (let i = 1; i <= 5; i++) {
    const firstStalk = firstFlowerBox.children[i]
    const secondStalk = secondFlowerBox.children[i]

    assert.ok(firstStalk?.isGroup, `expected first stalk group at child index ${i}`)
    assert.ok(secondStalk?.isGroup, `expected second stalk group at child index ${i}`)
    assert.notStrictEqual(firstStalk, secondStalk)
    assert.equal(firstStalk.children.length, 2)
    assert.equal(secondStalk.children.length, 2)

    const firstStem = firstStalk.children[0]
    const secondStem = secondStalk.children[0]
    const firstFlower = firstStalk.children[1]
    const secondFlower = secondStalk.children[1]

    assert.ok(firstStem?.isMesh, `expected first stem mesh at child index ${i}`)
    assert.ok(secondStem?.isMesh, `expected second stem mesh at child index ${i}`)
    assert.ok(firstFlower?.isMesh, `expected first blossom mesh at child index ${i}`)
    assert.ok(secondFlower?.isMesh, `expected second blossom mesh at child index ${i}`)

    assert.notStrictEqual(firstStem, secondStem)
    assert.notStrictEqual(firstFlower, secondFlower)
    assert.strictEqual(firstStem.geometry, secondStem.geometry)
    assert.strictEqual(firstStem.material, secondStem.material)
    assert.strictEqual(firstFlower.geometry, secondFlower.geometry)
    assert.strictEqual(firstFlower.material, secondFlower.material)
  }
})
