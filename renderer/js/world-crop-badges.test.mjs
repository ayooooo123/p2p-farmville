import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createWorldCropBadgeManager,
  makeReadyCropBadgeHtml,
  planCropBadgeChanges
} from './world-crop-badges.js'

const defs = {
  tomato: { name: 'Tomato', stages: 4 },
  evil: { name: '<img src=x onerror=alert(1)> & "Bad"', stages: 2 }
}

function plot (overrides = {}) {
  return {
    row: 1,
    col: 2,
    x: 3,
    z: 4,
    state: 'planted',
    crop: { type: 'tomato', stage: 3, withered: false },
    ...overrides
  }
}

test('ready crop creates badge descriptor/state', () => {
  const plan = planCropBadgeChanges({ plots: [plot()], cropDefinitions: defs, activeKeys: new Set() })
  assert.equal(plan.create.length, 1)
  assert.equal(plan.create[0].key, '1:2')
  assert.match(plan.create[0].html, /Tomato/)
  assert.match(plan.create[0].html, /Ready/)
})

test('non-ready crop does not create badge', () => {
  const plan = planCropBadgeChanges({ plots: [plot({ crop: { type: 'tomato', stage: 1 } })], cropDefinitions: defs })
  assert.equal(plan.create.length, 0)
  assert.equal(plan.wanted.length, 0)
})

test('harvested/removed crop schedules disposal', () => {
  const plan = planCropBadgeChanges({ plots: [], cropDefinitions: defs, activeKeys: new Set(['1:2']) })
  assert.deepEqual(plan.remove, ['1:2'])
})

test('crop name is escaped in badge HTML', () => {
  const html = makeReadyCropBadgeHtml(defs.evil.name)
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt; &amp; &quot;Bad&quot;/)
  assert.doesNotMatch(html, /<img/)
})

test('active badge count is bounded', () => {
  const plots = Array.from({ length: 5 }, (_, i) => plot({ row: 0, col: i, x: i }))
  const plan = planCropBadgeChanges({ plots, cropDefinitions: defs, maxBadges: 2 })
  assert.equal(plan.wanted.length, 2)
  assert.equal(plan.create.length, 2)
})

test('manager adds once and disposes removed badges', async () => {
  const added = []
  const removed = []
  const disposed = []
  const scene = { add: s => added.push(s), remove: s => removed.push(s) }
  const makeSprite = async () => ({
    userData: {},
    position: { set (x, y, z) { this.x = x; this.y = y; this.z = z } }
  })
  const manager = createWorldCropBadgeManager({ scene, THREE: {}, createSprite: makeSprite, disposeSprite: s => disposed.push(s) })

  await manager.update([plot()], defs)
  await manager.update([plot()], defs)
  assert.equal(added.length, 1)
  assert.equal(manager.getActiveCount(), 1)

  await manager.update([], defs)
  assert.equal(removed.length, 1)
  assert.equal(disposed.length, 1)
  assert.equal(manager.getActiveCount(), 0)
})
