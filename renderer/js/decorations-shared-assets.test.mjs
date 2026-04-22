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

function getFlowerStalks (group) {
  return group.children.filter(child => child.isGroup)
}

test('createDecoMesh reuses shared assets across repeated flower decorations of the same type', () => {
  const firstTulips = createDecoMesh('tulips', 101)
  const secondTulips = createDecoMesh('tulips', 202)

  const firstStalks = getFlowerStalks(firstTulips)
  const secondStalks = getFlowerStalks(secondTulips)
  assert.ok(firstStalks.length >= 3, 'expected at least 3 tulip stalks')
  assert.ok(secondStalks.length >= 3, 'expected at least 3 tulip stalks')

  const firstStem = firstStalks[0].children[0]
  const firstPetal = firstStalks[0].children[1]
  const secondStem = secondStalks[0].children[0]
  const secondPetal = secondStalks[0].children[1]

  assert.strictEqual(firstStem.geometry, secondStem.geometry)
  assert.strictEqual(firstStem.material, secondStem.material)
  assert.strictEqual(firstPetal.geometry, secondPetal.geometry)
  assert.strictEqual(firstPetal.material, secondPetal.material)
  assert.equal(firstStem.geometry.userData?.sharedAsset, true)
  assert.equal(firstStem.material.userData?.sharedAsset, true)
  assert.equal(firstPetal.geometry.userData?.sharedAsset, true)
  assert.equal(firstPetal.material.userData?.sharedAsset, true)

  // Every stalk in both tulip decorations should reference the same shared assets.
  for (const stalk of [...firstStalks, ...secondStalks]) {
    assert.strictEqual(stalk.children[0].geometry, firstStem.geometry)
    assert.strictEqual(stalk.children[0].material, firstStem.material)
    assert.strictEqual(stalk.children[1].geometry, firstPetal.geometry)
    assert.strictEqual(stalk.children[1].material, firstPetal.material)
  }
})

test('flower decorations share stem geometry across types but keep per-color materials distinct', () => {
  const tulips = createDecoMesh('tulips', 303)
  const roses = createDecoMesh('roses', 404)

  const tulipStalk = getFlowerStalks(tulips)[0]
  const roseStalk = getFlowerStalks(roses)[0]

  const tulipStem = tulipStalk.children[0]
  const roseStem = roseStalk.children[0]
  const tulipPetal = tulipStalk.children[1]
  const rosePetal = roseStalk.children[1]

  // Stem geometry is shared (same shape), but colors diverge so materials differ.
  assert.strictEqual(tulipStem.geometry, roseStem.geometry)
  assert.notStrictEqual(tulipStem.material, roseStem.material)
  assert.notStrictEqual(tulipPetal.material, rosePetal.material)
  // Both tulips and roses are short flowers, so petal geometry is shared.
  assert.strictEqual(tulipPetal.geometry, rosePetal.geometry)
})

test('tall vs short flowers use different shared petal geometries', () => {
  const sunflowers = createDecoMesh('sunflowers', 505)
  const tulips = createDecoMesh('tulips', 606)

  const sunflowerPetal = getFlowerStalks(sunflowers)[0].children[1]
  const tulipPetal = getFlowerStalks(tulips)[0].children[1]

  // Tall (sunflowers) and short (tulips) use distinct shared petal geometries.
  assert.notStrictEqual(sunflowerPetal.geometry, tulipPetal.geometry)
  assert.equal(sunflowerPetal.geometry.userData?.sharedAsset, true)
  assert.equal(tulipPetal.geometry.userData?.sharedAsset, true)
})

test('flower stalk heights still vary across seeds despite shared unit-height stem geometry', () => {
  // Two different seeds must still produce meaningfully different per-stalk
  // heights; catches regressions where the shared geometry accidentally
  // collapses all stalks to the same fixed height.
  const first = createDecoMesh('tulips', 12345)
  const second = createDecoMesh('tulips', 67890)

  const firstHeights = getFlowerStalks(first).map(stalk => stalk.children[0].scale.y)
  const secondHeights = getFlowerStalks(second).map(stalk => stalk.children[0].scale.y)

  // Within a single decoration, stalks should not all collapse to one height.
  const firstUnique = new Set(firstHeights.map(h => h.toFixed(4)))
  assert.ok(firstUnique.size > 1, 'expected varied stalk heights within one flower decoration')

  // Two different seeds should not produce the exact same height sequence.
  const firstKey = firstHeights.map(h => h.toFixed(4)).join('|')
  const secondKey = secondHeights.map(h => h.toFixed(4)).join('|')
  assert.notStrictEqual(firstKey, secondKey)

  // Petal y-positions track stem height, so variance must flow through there too.
  const firstPetalYs = getFlowerStalks(first).map(stalk => stalk.children[1].position.y)
  const firstPetalUnique = new Set(firstPetalYs.map(y => y.toFixed(4)))
  assert.ok(firstPetalUnique.size > 1, 'expected varied petal heights within one flower decoration')
})
