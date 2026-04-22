import test from 'node:test'
import assert from 'node:assert/strict'

globalThis.window = {}

const { createTreeMesh, setFarmTreeSeasonColors, TREE_DEFINITIONS } = await import('./trees.js')

function getCanopy (tree, index = 0) {
  const canopy = tree.userData.canopyMeshes[index]
  assert.ok(canopy?.isMesh, `expected canopy mesh at index ${index}`)
  return canopy
}

function getTrunk (tree, index = 0) {
  const trunk = tree.userData.trunkMeshes[index]
  assert.ok(trunk?.isMesh, `expected trunk mesh at index ${index}`)
  return trunk
}

function getFruitMeshes (tree) {
  // Fruits live under a per-canopy fruitPivot; the canonical list is userData.fruitMeshes.
  return Array.isArray(tree.userData.fruitMeshes) ? tree.userData.fruitMeshes : []
}

test('createTreeMesh reuses shared trunk + canopy assets across repeated same-type trees', () => {
  const oakA = createTreeMesh('oak', false, 1)
  const oakB = createTreeMesh('oak', false, 0.6)

  assert.notStrictEqual(oakA, oakB)

  const trunkA = getTrunk(oakA)
  const trunkB = getTrunk(oakB)
  assert.strictEqual(trunkA.geometry, trunkB.geometry, 'trunk geometry shared between oaks')
  assert.strictEqual(trunkA.material, trunkB.material, 'trunk material shared between oaks')
  assert.equal(trunkA.geometry.userData.sharedAsset, true)
  assert.equal(trunkA.material.userData.sharedAsset, true)

  const canopyA = getCanopy(oakA)
  const canopyB = getCanopy(oakB)
  assert.strictEqual(canopyA.geometry, canopyB.geometry, 'broadleaf canopy geometry shared')
  assert.strictEqual(canopyA.material, canopyB.material, 'broadleaf canopy material shared')

  // growthScale is encoded into mesh.scale, not geometry.
  assert.equal(trunkA.scale.x, 1)
  assert.equal(trunkB.scale.x, 0.6)
})

test('createTreeMesh shares trunk geometry across types but uses type-specific trunk material', () => {
  const oak = createTreeMesh('oak', false, 1)
  const cherry = createTreeMesh('cherry', false, 1)

  const oakTrunk = getTrunk(oak)
  const cherryTrunk = getTrunk(cherry)

  assert.strictEqual(oakTrunk.geometry, cherryTrunk.geometry, 'trunk geometry shared across types')
  assert.notStrictEqual(oakTrunk.material, cherryTrunk.material, 'trunk material differs by type')
  assert.equal(oakTrunk.material.color.getHex(), TREE_DEFINITIONS.oak.trunkColor)
  assert.equal(cherryTrunk.material.color.getHex(), TREE_DEFINITIONS.cherry.trunkColor)
})

test('createTreeMesh shares cone geometry + material across all pine layers and instances', () => {
  const pineA = createTreeMesh('pine', false, 1)
  const pineB = createTreeMesh('pine', false, 1)

  assert.equal(pineA.userData.canopyMeshes.length, 3, 'pine has 3 cone layers')
  assert.equal(pineB.userData.canopyMeshes.length, 3)

  const layer0A = getCanopy(pineA, 0)
  const layer1A = getCanopy(pineA, 1)
  const layer2A = getCanopy(pineA, 2)
  const layer0B = getCanopy(pineB, 0)

  // All three layers within one tree share geometry + material
  assert.strictEqual(layer0A.geometry, layer1A.geometry)
  assert.strictEqual(layer1A.geometry, layer2A.geometry)
  assert.strictEqual(layer0A.material, layer1A.material)
  assert.strictEqual(layer1A.material, layer2A.material)

  // And shared across pine instances
  assert.strictEqual(layer0A.geometry, layer0B.geometry)
  assert.strictEqual(layer0A.material, layer0B.material)

  // Per-mesh scale carries the radius/height variation
  assert.notEqual(layer0A.scale.x, layer2A.scale.x, 'cone layer radii differ via mesh.scale')
})

test('createTreeMesh shares fruit geometry + material across mature trees of the same type', () => {
  const matureA = createTreeMesh('apple', true, 1)
  const matureB = createTreeMesh('apple', true, 1)

  const fruitsA = getFruitMeshes(matureA)
  const fruitsB = getFruitMeshes(matureB)

  assert.ok(fruitsA.length > 0, 'mature apple tree A should have fruit meshes')
  assert.ok(fruitsB.length > 0, 'mature apple tree B should have fruit meshes')

  const firstFruitA = fruitsA[0]
  const firstFruitB = fruitsB[0]

  // Fruit geometry is shared across all fruits (single global)
  for (const f of fruitsA) {
    assert.strictEqual(f.geometry, firstFruitA.geometry, 'all apple fruits share geometry')
    assert.strictEqual(f.material, firstFruitA.material, 'all apple fruits share material')
  }
  assert.strictEqual(firstFruitA.geometry, firstFruitB.geometry, 'fruit geometry shared between apple instances')
  assert.strictEqual(firstFruitA.material, firstFruitB.material, 'fruit material shared between apple instances')

  // Scene-graph invariant: fruits must be parented under the canopy's fruitPivot,
  // and that pivot must live under the tree group — otherwise wind animation breaks.
  const canopyA = getCanopy(matureA)
  const pivotA = canopyA.userData.fruitPivot
  assert.ok(pivotA, 'broadleaf canopy should expose a fruitPivot')
  assert.ok(matureA.children.includes(pivotA), 'fruitPivot should be a child of the tree group')
  for (const f of fruitsA) {
    assert.strictEqual(f.parent, pivotA, 'each fruit should be parented to the fruitPivot')
  }
})

test('setFarmTreeSeasonColors propagates through shared canopy material to all same-type trees', () => {
  const oakA = createTreeMesh('oak', false, 1)
  const oakB = createTreeMesh('oak', false, 1)
  const canopyA = getCanopy(oakA)
  const canopyB = getCanopy(oakB)

  // Sanity: shared material means both canopies point at the same Color object
  assert.strictEqual(canopyA.material, canopyB.material)

  const placedTrees = [{ mesh: oakA }, { mesh: oakB }]

  // Apply autumn — should shift the shared material toward autumn orange
  setFarmTreeSeasonColors(placedTrees, 'autumn')
  const autumnHex = canopyA.material.color.getHex()
  assert.notEqual(autumnHex, TREE_DEFINITIONS.oak.canopyColor, 'autumn shift moved canopy color')
  assert.equal(canopyB.material.color.getHex(), autumnHex, 'shared material reflects same color on both trees')

  // Restore summer — should snap back to the canopyColor base
  setFarmTreeSeasonColors(placedTrees, 'summer')
  assert.equal(canopyA.material.color.getHex(), TREE_DEFINITIONS.oak.canopyColor)
  assert.equal(canopyB.material.color.getHex(), TREE_DEFINITIONS.oak.canopyColor)
})

test('setFarmTreeSeasonColors tints cached materials for tree types absent from placedTrees', () => {
  // Establish a cache entry for 'banana' before any season change.
  const banana1 = createTreeMesh('banana', false, 1)
  const bananaCanopy1 = getCanopy(banana1)
  assert.equal(bananaCanopy1.material.color.getHex(), TREE_DEFINITIONS.banana.canopyColor)

  // Move to autumn while passing an EMPTY placed-trees array — earlier code
  // only walked placedTrees, so the cached banana canopy material would have
  // stayed summer-green. The cache walk should now tint it directly.
  setFarmTreeSeasonColors([], 'autumn')
  const autumnHex = bananaCanopy1.material.color.getHex()
  assert.notEqual(autumnHex, TREE_DEFINITIONS.banana.canopyColor, 'cached banana material shifted to autumn')

  // A freshly-spawned banana while the season is still autumn should pick up
  // the same shared material — already autumn-tinted.
  const banana2 = createTreeMesh('banana', false, 1)
  const bananaCanopy2 = getCanopy(banana2)
  assert.strictEqual(bananaCanopy1.material, bananaCanopy2.material)
  assert.equal(bananaCanopy2.material.color.getHex(), autumnHex)
})

test('createTreeMesh seeds new canopy materials with the active season tint', () => {
  // Switch to winter with no relevant placed trees.
  setFarmTreeSeasonColors([], 'winter')

  // First-ever creation of 'pomegranate' while in winter — its canopy material
  // does not exist yet. The factory should seed it with the winter blend.
  const pomA = createTreeMesh('pomegranate', false, 1)
  const pomCanopy = getCanopy(pomA)
  assert.notEqual(pomCanopy.material.color.getHex(), TREE_DEFINITIONS.pomegranate.canopyColor,
    'newly created pomegranate canopy should already carry the winter tint')

  // Reset to summer to keep the cross-test global state clean.
  setFarmTreeSeasonColors([], 'summer')
  assert.equal(pomCanopy.material.color.getHex(), TREE_DEFINITIONS.pomegranate.canopyColor)
})
