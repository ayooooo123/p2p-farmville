import test from 'node:test'
import assert from 'node:assert/strict'

globalThis.window = {}

const { createVehicleMesh } = await import('./vehicles.js')

function getMesh (group, index, label) {
  const mesh = group.children[index]
  assert.ok(mesh?.isMesh, `expected ${label} mesh at child index ${index}`)
  return mesh
}

test('createVehicleMesh reuses repeated tractor assets across repeated tractors', () => {
  const tractorA = createVehicleMesh('tractor')
  const tractorB = createVehicleMesh('tractor')

  assert.notStrictEqual(tractorA, tractorB)
  assert.equal(tractorA.children.length, 9)
  assert.equal(tractorB.children.length, 9)

  const bodyA = getMesh(tractorA, 0, 'tractor A body')
  const bodyB = getMesh(tractorB, 0, 'tractor B body')
  const cabinA = getMesh(tractorA, 1, 'tractor A cabin')
  const cabinB = getMesh(tractorB, 1, 'tractor B cabin')
  const rearWheelA = getMesh(tractorA, 2, 'tractor A rear wheel')
  const rearWheelB = getMesh(tractorB, 2, 'tractor B rear wheel')
  const rearHubA = getMesh(tractorA, 3, 'tractor A rear hub')
  const rearHubB = getMesh(tractorB, 3, 'tractor B rear hub')
  const frontWheelA = getMesh(tractorA, 6, 'tractor A front wheel')
  const frontWheelB = getMesh(tractorB, 6, 'tractor B front wheel')
  const exhaustA = getMesh(tractorA, 8, 'tractor A exhaust')
  const exhaustB = getMesh(tractorB, 8, 'tractor B exhaust')

  assert.notStrictEqual(bodyA, bodyB)
  assert.strictEqual(bodyA.geometry, bodyB.geometry)
  assert.strictEqual(bodyA.material, bodyB.material)
  assert.strictEqual(cabinA.geometry, cabinB.geometry)
  assert.strictEqual(cabinA.material, cabinB.material)
  assert.strictEqual(rearWheelA.geometry, rearWheelB.geometry)
  assert.strictEqual(rearWheelA.material, rearWheelB.material)
  assert.strictEqual(rearHubA.geometry, rearHubB.geometry)
  assert.strictEqual(rearHubA.material, rearHubB.material)
  assert.strictEqual(frontWheelA.geometry, frontWheelB.geometry)
  assert.strictEqual(frontWheelA.material, frontWheelB.material)
  assert.strictEqual(exhaustA.geometry, exhaustB.geometry)
  assert.strictEqual(exhaustA.material, exhaustB.material)
})

test('createVehicleMesh shares same-shape assets across vehicle types while keeping body colors separate', () => {
  const tractor = createVehicleMesh('tractor')
  const harvester = createVehicleMesh('harvester')

  const tractorBody = getMesh(tractor, 0, 'tractor body')
  const harvesterBody = getMesh(harvester, 0, 'harvester body')
  const tractorCabin = getMesh(tractor, 1, 'tractor cabin')
  const harvesterCabin = getMesh(harvester, 1, 'harvester cabin')
  const tractorRearWheel = getMesh(tractor, 2, 'tractor rear wheel')
  const harvesterRearWheel = getMesh(harvester, 2, 'harvester rear wheel')

  assert.strictEqual(tractorBody.geometry, harvesterBody.geometry)
  assert.notStrictEqual(tractorBody.material, harvesterBody.material)
  assert.strictEqual(tractorCabin.geometry, harvesterCabin.geometry)
  assert.strictEqual(tractorCabin.material, harvesterCabin.material)
  assert.strictEqual(tractorRearWheel.geometry, harvesterRearWheel.geometry)
  assert.strictEqual(tractorRearWheel.material, harvesterRearWheel.material)
})
