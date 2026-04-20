import test from 'node:test'
import assert from 'node:assert/strict'

globalThis.window = {}

const { createBuildingMesh } = await import('./buildings.js')

function getRootMesh (group, index, label) {
  const mesh = group.children[index]
  assert.ok(mesh?.isMesh, `expected ${label} mesh at child index ${index}`)
  return mesh
}

test('createBuildingMesh reuses deterministic barn meshes across repeated barns', () => {
  const barnA = createBuildingMesh('barn')
  const barnB = createBuildingMesh('barn')

  const slabA = getRootMesh(barnA, 0, 'barn A slab')
  const slabB = getRootMesh(barnB, 0, 'barn B slab')
  const wallsA = getRootMesh(barnA, 1, 'barn A walls')
  const wallsB = getRootMesh(barnB, 1, 'barn B walls')
  const roofA = getRootMesh(barnA, 2, 'barn A roof')
  const roofB = getRootMesh(barnB, 2, 'barn B roof')
  const doorA = getRootMesh(barnA, 4, 'barn A door')
  const doorB = getRootMesh(barnB, 4, 'barn B door')
  const chimneyA = getRootMesh(barnA, 11, 'barn A chimney')
  const chimneyB = getRootMesh(barnB, 11, 'barn B chimney')

  assert.notStrictEqual(slabA, slabB)
  assert.strictEqual(slabA.geometry, slabB.geometry)
  assert.strictEqual(slabA.material, slabB.material)
  assert.strictEqual(wallsA.geometry, wallsB.geometry)
  assert.strictEqual(wallsA.material, wallsB.material)
  assert.strictEqual(roofA.geometry, roofB.geometry)
  assert.strictEqual(roofA.material, roofB.material)
  assert.strictEqual(doorA.geometry, doorB.geometry)
  assert.strictEqual(doorA.material, doorB.material)
  assert.strictEqual(chimneyA.geometry, chimneyB.geometry)
  assert.strictEqual(chimneyA.material, chimneyB.material)
})

test('same-shape buildings share geometry but keep type-specific wall and roof materials separate', () => {
  const barn = createBuildingMesh('barn')
  const winery = createBuildingMesh('winery')

  const barnWalls = getRootMesh(barn, 1, 'barn walls')
  const wineryWalls = getRootMesh(winery, 1, 'winery walls')
  const barnRoof = getRootMesh(barn, 2, 'barn roof')
  const wineryRoof = getRootMesh(winery, 2, 'winery roof')
  const barnChimney = getRootMesh(barn, 11, 'barn chimney')
  const wineryChimney = getRootMesh(winery, 11, 'winery chimney')

  assert.strictEqual(barnWalls.geometry, wineryWalls.geometry)
  assert.notStrictEqual(barnWalls.material, wineryWalls.material)
  assert.strictEqual(barnRoof.geometry, wineryRoof.geometry)
  assert.notStrictEqual(barnRoof.material, wineryRoof.material)
  assert.strictEqual(barnChimney.geometry, wineryChimney.geometry)
  assert.strictEqual(barnChimney.material, wineryChimney.material)
})

test('greenhouse shared materials preserve glass settings across repeated greenhouses', () => {
  const greenhouseA = createBuildingMesh('greenhouse')
  const greenhouseB = createBuildingMesh('greenhouse')

  const wallsA = getRootMesh(greenhouseA, 1, 'greenhouse A walls')
  const wallsB = getRootMesh(greenhouseB, 1, 'greenhouse B walls')
  const roofA = getRootMesh(greenhouseA, 2, 'greenhouse A roof')
  const roofB = getRootMesh(greenhouseB, 2, 'greenhouse B roof')

  assert.strictEqual(wallsA.material, wallsB.material)
  assert.strictEqual(roofA.material, roofB.material)
  assert.equal(wallsA.material.transparent, true)
  assert.equal(wallsA.material.opacity, 0.45)
  assert.equal(wallsA.material.depthWrite, false)
  assert.equal(roofA.material.transparent, true)
  assert.equal(roofA.material.opacity, 0.55)
  assert.equal(roofA.material.depthWrite, false)
})
