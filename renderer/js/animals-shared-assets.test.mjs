import test from 'node:test'
import assert from 'node:assert/strict'

globalThis.window = {}

const { createAnimalMesh, updateAnimalState } = await import('./animals.js')

function getInteractiveMesh (group, index) {
  const mesh = group.userData.interactiveMeshes[index]
  assert.ok(mesh?.isMesh, `expected interactive mesh at index ${index}`)
  return mesh
}

test('createAnimalMesh reuses shared geometry and materials across repeated cows', () => {
  const cowA = createAnimalMesh('cow')
  const cowB = createAnimalMesh('cow')

  assert.notStrictEqual(cowA, cowB)
  assert.equal(cowA.userData.interactiveMeshes.length, 11)
  assert.equal(cowB.userData.interactiveMeshes.length, 11)

  const cowABody = getInteractiveMesh(cowA, 0)
  const cowBBody = getInteractiveMesh(cowB, 0)
  const cowAHead = getInteractiveMesh(cowA, 1)
  const cowBHead = getInteractiveMesh(cowB, 1)
  const cowALeg = getInteractiveMesh(cowA, 2)
  const cowBLeg = getInteractiveMesh(cowB, 2)
  const cowASpot = getInteractiveMesh(cowA, 6)
  const cowBSpot = getInteractiveMesh(cowB, 6)
  const cowAHorn = getInteractiveMesh(cowA, 9)
  const cowBHorn = getInteractiveMesh(cowB, 9)

  assert.notStrictEqual(cowABody, cowBBody)
  assert.strictEqual(cowABody.geometry, cowBBody.geometry)
  assert.strictEqual(cowABody.material, cowBBody.material)
  assert.strictEqual(cowAHead.geometry, cowBHead.geometry)
  assert.strictEqual(cowAHead.material, cowBHead.material)
  assert.strictEqual(cowALeg.geometry, cowBLeg.geometry)
  assert.strictEqual(cowALeg.material, cowBLeg.material)
  assert.strictEqual(cowASpot.geometry, cowBSpot.geometry)
  assert.strictEqual(cowASpot.material, cowBSpot.material)
  assert.strictEqual(cowAHorn.geometry, cowBHorn.geometry)
  assert.strictEqual(cowAHorn.material, cowBHorn.material)
})

test('createAnimalMesh keeps same-type feature assets shared but type-specific colors separate', () => {
  const rabbitA = createAnimalMesh('rabbit')
  const rabbitB = createAnimalMesh('rabbit')
  const duck = createAnimalMesh('duck')

  const rabbitAEar = getInteractiveMesh(rabbitA, 6)
  const rabbitBEar = getInteractiveMesh(rabbitB, 6)
  const rabbitAInnerEar = getInteractiveMesh(rabbitA, 7)
  const rabbitBInnerEar = getInteractiveMesh(rabbitB, 7)
  const rabbitABody = getInteractiveMesh(rabbitA, 0)
  const rabbitBBody = getInteractiveMesh(rabbitB, 0)
  const duckBody = getInteractiveMesh(duck, 0)

  assert.strictEqual(rabbitAEar.geometry, rabbitBEar.geometry)
  assert.strictEqual(rabbitAEar.material, rabbitBEar.material)
  assert.strictEqual(rabbitAInnerEar.geometry, rabbitBInnerEar.geometry)
  assert.strictEqual(rabbitAInnerEar.material, rabbitBInnerEar.material)
  assert.strictEqual(rabbitABody.material, rabbitBBody.material)
  assert.notStrictEqual(rabbitABody.material, duckBody.material)
})

test('createAnimalMesh groups chicken head accessories under a shared head pivot', () => {
  const chicken = createAnimalMesh('chicken')
  const headGroup = chicken.userData.headGroup

  assert.ok(headGroup?.isGroup, 'expected headGroup to be stored on userData')
  assert.equal(headGroup.children.length, 4, 'head pivot should include head, beak, and two comb meshes')
  assert.equal(headGroup.children[0], getInteractiveMesh(chicken, 1), 'head mesh should remain the second interactive mesh')
  assert.equal(headGroup.children[1], getInteractiveMesh(chicken, 4), 'beak should follow the head pivot')
  assert.equal(headGroup.children[2], getInteractiveMesh(chicken, 5), 'first comb should follow the head pivot')
  assert.equal(headGroup.children[3], getInteractiveMesh(chicken, 6), 'second comb should follow the head pivot')
})

test('updateAnimalState animates the stored head pivot for walking animals', () => {
  const chicken = createAnimalMesh('chicken')
  const animal = {
    type: 'chicken',
    mesh: chicken,
    x: 0,
    z: 0,
    homeX: 0,
    homeZ: 0,
    wanderTimer: 1000,
    walking: true,
    walkSpeed: 1,
    wanderAngle: 0,
    walkPhase: 0,
    bobPhase: 0,
    fed: false,
    productReady: false,
    lastFed: 0
  }

  const headGroup = chicken.userData.headGroup
  assert.ok(headGroup?.isGroup, 'expected headGroup to exist before animation update')
  const baseRotX = headGroup.rotation.x
  const baseY = headGroup.position.y

  updateAnimalState(animal, 100)

  assert.notEqual(headGroup.rotation.x, baseRotX, 'walking update should rotate the head pivot')
  assert.notEqual(headGroup.position.y, baseY, 'walking update should bob the head pivot')
})
