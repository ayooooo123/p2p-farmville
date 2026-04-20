import test from 'node:test'
import assert from 'node:assert/strict'

globalThis.window = {}

async function loadBuildingsModule () {
  return import('../renderer/js/buildings.js')
}

test('building meshes cache shared window glow materials per building type', async () => {
  const { createBuildingMesh } = await loadBuildingsModule()
  const firstBarn = createBuildingMesh('barn')
  const secondBarn = createBuildingMesh('barn')

  assert.ok(Array.isArray(firstBarn.userData.windowPanes))
  assert.ok(firstBarn.userData.windowPanes.length > 0)
  assert.ok(Array.isArray(firstBarn.userData.windowGlowMaterials), 'expected cached window glow materials on building mesh')
  assert.equal(firstBarn.userData.windowGlowMaterials.length, 1, 'barn should cache one shared glow material')

  const [firstPane] = firstBarn.userData.windowPanes
  const [secondPane] = secondBarn.userData.windowPanes
  assert.equal(firstPane.material, secondPane.material, 'same-type buildings should reuse the same glow material instance')
  assert.equal(firstBarn.userData.windowGlowMaterials[0], firstPane.material)
})

test('different building types keep distinct window glow material palettes', async () => {
  const { createBuildingMesh } = await loadBuildingsModule()
  const barn = createBuildingMesh('barn')
  const bakery = createBuildingMesh('bakery')

  assert.ok(Array.isArray(barn.userData.windowGlowMaterials))
  assert.ok(Array.isArray(bakery.userData.windowGlowMaterials))
  assert.notEqual(barn.userData.windowGlowMaterials[0], bakery.userData.windowGlowMaterials[0], 'different building types should not share glow material instances')
})

test('building meshes reuse shared window pane geometries for identical window sizes', async () => {
  const { createBuildingMesh } = await loadBuildingsModule()
  const firstBarn = createBuildingMesh('barn')
  const secondBarn = createBuildingMesh('barn')

  assert.ok(firstBarn.userData.windowPanes.length >= 3, 'expected multiple barn window panes')
  assert.equal(
    firstBarn.userData.windowPanes[0].geometry,
    firstBarn.userData.windowPanes[1].geometry,
    'matching barn window panes should reuse one geometry instance within a building'
  )
  assert.equal(
    firstBarn.userData.windowPanes[0].geometry,
    secondBarn.userData.windowPanes[0].geometry,
    'same-type buildings should reuse pane geometry across instances'
  )
})
