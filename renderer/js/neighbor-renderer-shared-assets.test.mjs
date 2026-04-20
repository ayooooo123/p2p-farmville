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
