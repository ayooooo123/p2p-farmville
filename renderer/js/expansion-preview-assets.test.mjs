import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from './three.module.min.js'

const expansion = await import('./expansion.js')
const { initExpansion, showExpansionPreview, clearPreview } = expansion

function getPreviewMeshes (scene) {
  return scene.children.filter(child => child?.isMesh)
}

function getStripMeshes (meshes) {
  return meshes.filter(mesh => mesh.geometry?.type === 'BoxGeometry')
}

function getMarkerMeshes (meshes) {
  return meshes.filter(mesh => mesh.geometry?.type === 'CylinderGeometry')
}

function findMeshBySize (meshes, { width, depth, height }) {
  return meshes.find(mesh => {
    const params = mesh.geometry?.parameters
    return params?.width === width && params?.depth === depth && params?.height === height
  })
}

test('expansion preview reuses shared strip and marker assets across preview rebuilds', () => {
  const scene = new THREE.Scene()
  initExpansion(scene, 0)

  showExpansionPreview()
  const firstMeshes = getPreviewMeshes(scene)
  const firstStrips = getStripMeshes(firstMeshes)
  const firstMarkers = getMarkerMeshes(firstMeshes)

  assert.equal(firstStrips.length, 4, 'expected four preview strip meshes for the next expansion tier')
  assert.equal(firstMarkers.length, 4, 'expected four glowing corner markers for the next expansion tier')

  const firstSideStrip = findMeshBySize(firstStrips, { width: 4, height: 0.05, depth: 48 })
  const firstTopStrip = findMeshBySize(firstStrips, { width: 40, height: 0.05, depth: 4 })
  assert.ok(firstSideStrip, 'expected a side expansion strip sized for the tier-1 preview')
  assert.ok(firstTopStrip, 'expected a top/bottom expansion strip sized for the tier-1 preview')

  const otherFirstSideStrip = firstStrips.find(mesh => mesh !== firstSideStrip && mesh.geometry?.parameters?.width === 4)
  const otherFirstTopStrip = firstStrips.find(mesh => mesh !== firstTopStrip && mesh.geometry?.parameters?.depth === 4)
  assert.ok(otherFirstSideStrip)
  assert.ok(otherFirstTopStrip)

  assert.strictEqual(firstSideStrip.geometry, otherFirstSideStrip.geometry, 'matching side strips should reuse one shared geometry instance')
  assert.strictEqual(firstTopStrip.geometry, otherFirstTopStrip.geometry, 'matching top/bottom strips should reuse one shared geometry instance')
  assert.ok(firstStrips.every(mesh => mesh.material === firstStrips[0].material), 'all preview strips should share one translucent material')
  assert.ok(firstMarkers.every(mesh => mesh.geometry === firstMarkers[0].geometry), 'all corner markers should reuse one shared cylinder geometry')
  assert.ok(firstMarkers.every(mesh => mesh.material === firstMarkers[0].material), 'all corner markers should share one emissive material')

  const firstSideGeometry = firstSideStrip.geometry
  const firstTopGeometry = firstTopStrip.geometry
  const firstStripMaterial = firstStrips[0].material
  const firstMarkerGeometry = firstMarkers[0].geometry
  const firstMarkerMaterial = firstMarkers[0].material

  clearPreview()
  assert.equal(scene.children.length, 0, 'clearPreview should remove all preview meshes from the scene')

  showExpansionPreview()
  const secondMeshes = getPreviewMeshes(scene)
  const secondStrips = getStripMeshes(secondMeshes)
  const secondMarkers = getMarkerMeshes(secondMeshes)

  const secondSideStrip = findMeshBySize(secondStrips, { width: 4, height: 0.05, depth: 48 })
  const secondTopStrip = findMeshBySize(secondStrips, { width: 40, height: 0.05, depth: 4 })
  assert.ok(secondSideStrip)
  assert.ok(secondTopStrip)
  assert.equal(secondMarkers.length, 4)

  assert.strictEqual(secondSideStrip.geometry, firstSideGeometry, 'rebuilding the preview should reuse the cached side-strip geometry')
  assert.strictEqual(secondTopStrip.geometry, firstTopGeometry, 'rebuilding the preview should reuse the cached top/bottom geometry')
  assert.ok(secondStrips.every(mesh => mesh.material === firstStripMaterial), 'rebuilding the preview should reuse the shared strip material')
  assert.ok(secondMarkers.every(mesh => mesh.geometry === firstMarkerGeometry), 'rebuilding the preview should reuse the shared marker geometry')
  assert.ok(secondMarkers.every(mesh => mesh.material === firstMarkerMaterial), 'rebuilding the preview should reuse the shared marker material')

  clearPreview()
})
