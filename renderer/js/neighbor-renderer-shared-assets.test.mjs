import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from './three.module.min.js'

function makeCanvasContext () {
  return {
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    roundRect () {},
    fill () {},
    fillText () {}
  }
}

globalThis.document = {
  createElement (tagName) {
    assert.equal(tagName, 'canvas')
    return {
      width: 0,
      height: 0,
      getContext () {
        return makeCanvasContext()
      }
    }
  }
}

const neighborRenderer = await import('./neighbor-renderer.js')
const { init, updateNeighbors, removeNeighborFarm, renderedNeighbors } = neighborRenderer

function cleanupNeighbors () {
  for (const key of [...renderedNeighbors.keys()]) {
    removeNeighborFarm(key)
  }
}

function findMeshes (root, predicate) {
  const matches = []
  root.traverse(child => {
    if (child?.isMesh && predicate(child)) matches.push(child)
  })
  return matches
}

test('neighbor renderer reuses repeated shell and plot preview assets across visible farms', () => {
  cleanupNeighbors()

  const scene = new THREE.Scene()
  init(scene)

  const farmState = {
    plots: [[
      { state: 'plowed', x: -2, z: 0 },
      { state: 'planted', x: 2, z: 0, crop: { stage: 2 } }
    ]]
  }

  updateNeighbors([
    { key: 'alpha', name: 'Alpha', position: { x: 1, z: 0 }, farmState },
    { key: 'beta', name: 'Beta', position: { x: -1, z: 0 }, farmState }
  ])

  assert.equal(renderedNeighbors.size, 2)

  const alphaGroup = renderedNeighbors.get('alpha')?.group
  const betaGroup = renderedNeighbors.get('beta')?.group
  assert.ok(alphaGroup)
  assert.ok(betaGroup)

  const alphaTerrain = findMeshes(alphaGroup, mesh => mesh.geometry?.type === 'PlaneGeometry' && mesh.geometry.parameters.width === 80 && mesh.geometry.parameters.height === 80)
  const betaTerrain = findMeshes(betaGroup, mesh => mesh.geometry?.type === 'PlaneGeometry' && mesh.geometry.parameters.width === 80 && mesh.geometry.parameters.height === 80)
  const alphaGrid = findMeshes(alphaGroup, mesh => mesh.geometry?.type === 'PlaneGeometry' && mesh.geometry.parameters.width === 40 && mesh.geometry.parameters.height === 40)
  const betaGrid = findMeshes(betaGroup, mesh => mesh.geometry?.type === 'PlaneGeometry' && mesh.geometry.parameters.width === 40 && mesh.geometry.parameters.height === 40)
  const alphaFencePosts = findMeshes(alphaGroup, mesh => mesh.geometry?.type === 'CylinderGeometry' && mesh.geometry.parameters.radiusTop === 0.12 && mesh.geometry.parameters.height === 1.2)
  const betaFencePosts = findMeshes(betaGroup, mesh => mesh.geometry?.type === 'CylinderGeometry' && mesh.geometry.parameters.radiusTop === 0.12 && mesh.geometry.parameters.height === 1.2)
  const alphaPlotTiles = findMeshes(alphaGroup, mesh => mesh.geometry?.type === 'BoxGeometry' && mesh.geometry.parameters.width === 1.9 && mesh.geometry.parameters.height === 0.06 && mesh.geometry.parameters.depth === 1.9)
  const betaPlotTiles = findMeshes(betaGroup, mesh => mesh.geometry?.type === 'BoxGeometry' && mesh.geometry.parameters.width === 1.9 && mesh.geometry.parameters.height === 0.06 && mesh.geometry.parameters.depth === 1.9)

  assert.equal(alphaTerrain.length, 1)
  assert.equal(betaTerrain.length, 1)
  assert.equal(alphaGrid.length, 1)
  assert.equal(betaGrid.length, 1)
  assert.ok(alphaFencePosts.length > 0)
  assert.ok(betaFencePosts.length > 0)
  assert.equal(alphaPlotTiles.length, 2)
  assert.equal(betaPlotTiles.length, 2)

  assert.strictEqual(alphaTerrain[0].geometry, betaTerrain[0].geometry)
  assert.strictEqual(alphaTerrain[0].material, betaTerrain[0].material)
  assert.strictEqual(alphaGrid[0].geometry, betaGrid[0].geometry)
  assert.strictEqual(alphaGrid[0].material, betaGrid[0].material)
  assert.strictEqual(alphaFencePosts[0].geometry, betaFencePosts[0].geometry)
  assert.strictEqual(alphaFencePosts[0].material, betaFencePosts[0].material)
  assert.strictEqual(alphaPlotTiles[0].geometry, alphaPlotTiles[1].geometry)
  assert.strictEqual(alphaPlotTiles[0].material, alphaPlotTiles[1].material)
  assert.strictEqual(alphaPlotTiles[0].geometry, betaPlotTiles[0].geometry)
  assert.strictEqual(alphaPlotTiles[0].material, betaPlotTiles[0].material)

  cleanupNeighbors()
})

test('neighbor renderer reuses repeated crop preview assets for matching stages', () => {
  cleanupNeighbors()

  const scene = new THREE.Scene()
  init(scene)

  const farmState = {
    plots: [[
      { state: 'planted', x: -4, z: 0, crop: { stage: 2 } },
      { state: 'planted', x: -1, z: 0, crop: { stage: 2 } },
      { state: 'planted', x: 2, z: 0, crop: { stage: 3 } },
      { state: 'planted', x: 5, z: 0, crop: { stage: 2, withered: true } }
    ]]
  }

  updateNeighbors([
    { key: 'alpha', name: 'Alpha', position: { x: 1, z: 0 }, farmState },
    { key: 'beta', name: 'Beta', position: { x: -1, z: 0 }, farmState }
  ])

  const alphaGroup = renderedNeighbors.get('alpha')?.group
  const betaGroup = renderedNeighbors.get('beta')?.group
  assert.ok(alphaGroup)
  assert.ok(betaGroup)

  const alphaCropStems = findMeshes(alphaGroup, mesh => mesh.geometry?.type === 'CylinderGeometry' && mesh.geometry.parameters.radiusTop >= 0.2)
  const betaCropStems = findMeshes(betaGroup, mesh => mesh.geometry?.type === 'CylinderGeometry' && mesh.geometry.parameters.radiusTop >= 0.2)
  const alphaCropCanopies = findMeshes(alphaGroup, mesh => mesh.geometry?.type === 'SphereGeometry' && mesh.geometry.parameters.radius >= 0.25)
  const betaCropCanopies = findMeshes(betaGroup, mesh => mesh.geometry?.type === 'SphereGeometry' && mesh.geometry.parameters.radius >= 0.25)

  const alphaStage2Stems = alphaCropStems.filter(mesh => mesh.geometry.parameters.height === 0.6 && mesh.material.color.getHex() !== 0x808080)
  const betaStage2Stems = betaCropStems.filter(mesh => mesh.geometry.parameters.height === 0.6 && mesh.material.color.getHex() !== 0x808080)
  const alphaStage3Stem = alphaCropStems.find(mesh => mesh.geometry.parameters.height === 0.85)
  const alphaWitheredStage2Stem = alphaCropStems.find(mesh => mesh.material.color.getHex() === 0x808080)

  const alphaStage2Canopies = alphaCropCanopies.filter(mesh => mesh.geometry.parameters.radius === 0.25 && mesh.material.color.getHex() === 0x32cd32)
  const betaStage2Canopies = betaCropCanopies.filter(mesh => mesh.geometry.parameters.radius === 0.25 && mesh.material.color.getHex() === 0x32cd32)
  const alphaStage3Canopy = alphaCropCanopies.find(mesh => mesh.geometry.parameters.radius > 0.25 && mesh.material.color.getHex() === 0x32cd32)
  const alphaWitheredStage2Canopy = alphaCropCanopies.find(mesh => mesh.geometry.parameters.radius === 0.25 && mesh.material.color.getHex() === 0x666666)

  assert.equal(alphaStage2Stems.length, 2)
  assert.equal(betaStage2Stems.length, 2)
  assert.equal(alphaStage2Canopies.length, 2)
  assert.equal(betaStage2Canopies.length, 2)
  assert.ok(alphaStage3Stem)
  assert.ok(alphaStage3Canopy)
  assert.ok(alphaWitheredStage2Stem)
  assert.ok(alphaWitheredStage2Canopy)

  assert.strictEqual(alphaStage2Stems[0].geometry, alphaStage2Stems[1].geometry)
  assert.strictEqual(alphaStage2Stems[0].material, alphaStage2Stems[1].material)
  assert.strictEqual(alphaStage2Stems[0].geometry, betaStage2Stems[0].geometry)
  assert.strictEqual(alphaStage2Stems[0].material, betaStage2Stems[0].material)
  assert.notStrictEqual(alphaStage2Stems[0].geometry, alphaStage3Stem.geometry)
  assert.notStrictEqual(alphaStage2Stems[0].material, alphaWitheredStage2Stem.material)

  assert.strictEqual(alphaStage2Canopies[0].geometry, alphaStage2Canopies[1].geometry)
  assert.strictEqual(alphaStage2Canopies[0].material, alphaStage2Canopies[1].material)
  assert.strictEqual(alphaStage2Canopies[0].geometry, betaStage2Canopies[0].geometry)
  assert.strictEqual(alphaStage2Canopies[0].material, betaStage2Canopies[0].material)
  assert.notStrictEqual(alphaStage2Canopies[0].geometry, alphaStage3Canopy.geometry)
  assert.notStrictEqual(alphaStage2Canopies[0].material, alphaWitheredStage2Canopy.material)

  cleanupNeighbors()
})

test('neighbor renderer reuses tree preview assets across growth scales', () => {
  cleanupNeighbors()

  const scene = new THREE.Scene()
  init(scene)

  const farmState = {
    trees: [
      { x: -3, z: 0, growthScale: 1 },
      { x: 3, z: 0, growthScale: 1.6 }
    ]
  }

  updateNeighbors([
    { key: 'alpha', name: 'Alpha', position: { x: 1, z: 0 }, farmState },
    { key: 'beta', name: 'Beta', position: { x: -1, z: 0 }, farmState }
  ])

  const alphaGroup = renderedNeighbors.get('alpha')?.group
  const betaGroup = renderedNeighbors.get('beta')?.group
  assert.ok(alphaGroup)
  assert.ok(betaGroup)

  const alphaTrunks = findMeshes(alphaGroup, mesh => mesh.geometry?.type === 'CylinderGeometry' && mesh.material?.color?.getHex() === 0x5c3a1e)
  const betaTrunks = findMeshes(betaGroup, mesh => mesh.geometry?.type === 'CylinderGeometry' && mesh.material?.color?.getHex() === 0x5c3a1e)
  const alphaCanopies = findMeshes(alphaGroup, mesh => mesh.geometry?.type === 'SphereGeometry' && mesh.material?.color?.getHex() === 0x228b22)
  const betaCanopies = findMeshes(betaGroup, mesh => mesh.geometry?.type === 'SphereGeometry' && mesh.material?.color?.getHex() === 0x228b22)

  assert.equal(alphaTrunks.length, 2)
  assert.equal(betaTrunks.length, 2)
  assert.equal(alphaCanopies.length, 2)
  assert.equal(betaCanopies.length, 2)

  assert.strictEqual(alphaTrunks[0].geometry, alphaTrunks[1].geometry)
  assert.strictEqual(alphaTrunks[0].material, alphaTrunks[1].material)
  assert.strictEqual(alphaTrunks[0].geometry, betaTrunks[0].geometry)
  assert.strictEqual(alphaTrunks[0].material, betaTrunks[0].material)
  assert.deepEqual(new Set(alphaTrunks.map(mesh => mesh.scale.y)), new Set([1, 1.6]))

  assert.strictEqual(alphaCanopies[0].geometry, alphaCanopies[1].geometry)
  assert.strictEqual(alphaCanopies[0].material, alphaCanopies[1].material)
  assert.strictEqual(alphaCanopies[0].geometry, betaCanopies[0].geometry)
  assert.strictEqual(alphaCanopies[0].material, betaCanopies[0].material)
  assert.deepEqual(new Set(alphaCanopies.map(mesh => mesh.scale.x)), new Set([1, 1.6]))

  cleanupNeighbors()
})

test('neighbor renderer reuses animal and building preview assets for matching previews', () => {
  cleanupNeighbors()

  const scene = new THREE.Scene()
  init(scene)

  const farmState = {
    animals: [
      { x: -5, z: 0 },
      { x: -2, z: 0 }
    ],
    buildings: [
      { x: 2, z: 0, width: 4, height: 3, depth: 4, wallColor: 0xb22222, roofColor: 0x8b0000 },
      { x: 6, z: 0, width: 4, height: 3, depth: 4, wallColor: 0xb22222, roofColor: 0x8b0000 },
      { x: 10, z: 0, width: 5, height: 4, depth: 5, wallColor: 0x556b2f, roofColor: 0x2f4f4f }
    ]
  }

  updateNeighbors([
    { key: 'alpha', name: 'Alpha', position: { x: 1, z: 0 }, farmState },
    { key: 'beta', name: 'Beta', position: { x: -1, z: 0 }, farmState }
  ])

  const alphaGroup = renderedNeighbors.get('alpha')?.group
  const betaGroup = renderedNeighbors.get('beta')?.group
  assert.ok(alphaGroup)
  assert.ok(betaGroup)

  const alphaAnimalBodies = findMeshes(alphaGroup, mesh => mesh.geometry?.type === 'BoxGeometry' && mesh.geometry.parameters.width === 0.8 && mesh.geometry.parameters.height === 0.5 && mesh.geometry.parameters.depth === 1.2)
  const betaAnimalBodies = findMeshes(betaGroup, mesh => mesh.geometry?.type === 'BoxGeometry' && mesh.geometry.parameters.width === 0.8 && mesh.geometry.parameters.height === 0.5 && mesh.geometry.parameters.depth === 1.2)
  const alphaAnimalHeads = findMeshes(alphaGroup, mesh => mesh.geometry?.type === 'BoxGeometry' && mesh.geometry.parameters.width === 0.4 && mesh.geometry.parameters.height === 0.4 && mesh.geometry.parameters.depth === 0.4)
  const betaAnimalHeads = findMeshes(betaGroup, mesh => mesh.geometry?.type === 'BoxGeometry' && mesh.geometry.parameters.width === 0.4 && mesh.geometry.parameters.height === 0.4 && mesh.geometry.parameters.depth === 0.4)

  assert.equal(alphaAnimalBodies.length, 2)
  assert.equal(betaAnimalBodies.length, 2)
  assert.equal(alphaAnimalHeads.length, 2)
  assert.equal(betaAnimalHeads.length, 2)
  assert.strictEqual(alphaAnimalBodies[0].geometry, alphaAnimalBodies[1].geometry)
  assert.strictEqual(alphaAnimalBodies[0].material, alphaAnimalBodies[1].material)
  assert.strictEqual(alphaAnimalBodies[0].geometry, betaAnimalBodies[0].geometry)
  assert.strictEqual(alphaAnimalBodies[0].material, betaAnimalBodies[0].material)
  assert.strictEqual(alphaAnimalHeads[0].geometry, alphaAnimalHeads[1].geometry)
  assert.strictEqual(alphaAnimalHeads[0].material, alphaAnimalHeads[1].material)
  assert.strictEqual(alphaAnimalHeads[0].geometry, betaAnimalHeads[0].geometry)
  assert.strictEqual(alphaAnimalHeads[0].material, betaAnimalHeads[0].material)

  const alphaBuildingWalls = findMeshes(alphaGroup, mesh => mesh.geometry?.type === 'BoxGeometry' && mesh.geometry.parameters.width >= 4 && mesh.geometry.parameters.height >= 3 && mesh.geometry.parameters.depth >= 4 && mesh.position.y > 1)
  const betaBuildingWalls = findMeshes(betaGroup, mesh => mesh.geometry?.type === 'BoxGeometry' && mesh.geometry.parameters.width >= 4 && mesh.geometry.parameters.height >= 3 && mesh.geometry.parameters.depth >= 4 && mesh.position.y > 1)
  const alphaBuildingRoofs = findMeshes(alphaGroup, mesh => mesh.geometry?.type === 'ConeGeometry')
  const betaBuildingRoofs = findMeshes(betaGroup, mesh => mesh.geometry?.type === 'ConeGeometry')

  const alphaRepeatedWalls = alphaBuildingWalls.filter(mesh => mesh.geometry.parameters.width === 4 && mesh.material.color.getHex() === 0xb22222)
  const betaRepeatedWalls = betaBuildingWalls.filter(mesh => mesh.geometry.parameters.width === 4 && mesh.material.color.getHex() === 0xb22222)
  const alphaDistinctWall = alphaBuildingWalls.find(mesh => mesh.geometry.parameters.width === 5)
  const alphaRepeatedRoofs = alphaBuildingRoofs.filter(mesh => mesh.geometry.parameters.radius === 2.8 && mesh.material.color.getHex() === 0x8b0000)
  const betaRepeatedRoofs = betaBuildingRoofs.filter(mesh => mesh.geometry.parameters.radius === 2.8 && mesh.material.color.getHex() === 0x8b0000)
  const alphaDistinctRoof = alphaBuildingRoofs.find(mesh => mesh.geometry.parameters.radius === 3.5)

  assert.equal(alphaRepeatedWalls.length, 2)
  assert.equal(betaRepeatedWalls.length, 2)
  assert.ok(alphaDistinctWall)
  assert.equal(alphaRepeatedRoofs.length, 2)
  assert.equal(betaRepeatedRoofs.length, 2)
  assert.ok(alphaDistinctRoof)

  assert.strictEqual(alphaRepeatedWalls[0].geometry, alphaRepeatedWalls[1].geometry)
  assert.strictEqual(alphaRepeatedWalls[0].material, alphaRepeatedWalls[1].material)
  assert.strictEqual(alphaRepeatedWalls[0].geometry, betaRepeatedWalls[0].geometry)
  assert.strictEqual(alphaRepeatedWalls[0].material, betaRepeatedWalls[0].material)
  assert.notStrictEqual(alphaRepeatedWalls[0].geometry, alphaDistinctWall.geometry)
  assert.notStrictEqual(alphaRepeatedWalls[0].material, alphaDistinctWall.material)

  assert.strictEqual(alphaRepeatedRoofs[0].geometry, alphaRepeatedRoofs[1].geometry)
  assert.strictEqual(alphaRepeatedRoofs[0].material, alphaRepeatedRoofs[1].material)
  assert.strictEqual(alphaRepeatedRoofs[0].geometry, betaRepeatedRoofs[0].geometry)
  assert.strictEqual(alphaRepeatedRoofs[0].material, betaRepeatedRoofs[0].material)
  assert.notStrictEqual(alphaRepeatedRoofs[0].geometry, alphaDistinctRoof.geometry)
  assert.notStrictEqual(alphaRepeatedRoofs[0].material, alphaDistinctRoof.material)

  cleanupNeighbors()
})
