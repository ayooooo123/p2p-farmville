import test from 'node:test'
import assert from 'node:assert/strict'

import * as THREE from './three.module.min.js'

function createFakeContext (canvas) {
  return {
    fillStyle: '#000',
    beginPath () {},
    ellipse () {},
    fillRect () {},
    fill () {},
    getImageData () {
      return { data: new Uint8ClampedArray(canvas.width * canvas.height * 4) }
    },
    putImageData () {}
  }
}

globalThis.window = {}

globalThis.document = {
  createElement (tag) {
    if (tag !== 'canvas') throw new Error('unexpected element: ' + tag)
    const canvas = {
      width: 0,
      height: 0,
      getContext (kind) {
        if (kind !== '2d') throw new Error('unexpected context: ' + kind)
        return createFakeContext(canvas)
      }
    }
    return canvas
  }
}

const { createPlotGrid, PLOT_STATES } = await import('./terrain.js')

test('createPlotGrid removes prior terrain objects and furrows when re-initialized on the same scene', () => {
  const scene = new THREE.Scene()
  const terrain = createPlotGrid(scene)
  const baselineCount = scene.children.length

  terrain.setPlotState(0, 0, PLOT_STATES.PLOWED)
  const originalPlot = terrain.getPlotAt(0, 0)
  assert.equal(originalPlot._furrows?.children.length, 4, 'plowing should attach a 4-mesh furrow group to the plot before re-init')

  createPlotGrid(scene)

  assert.equal(originalPlot._furrows, null, 're-initializing terrain should clear furrow refs from the previous plot objects')
  assert.equal(
    scene.children.length,
    baselineCount,
    're-initializing terrain on the same scene should replace prior plots, borders, hover mesh, and grid lines instead of stacking duplicates'
  )
})

test('createPlotGrid moves terrain cleanly to a new scene on re-init', () => {
  const firstScene = new THREE.Scene()
  const secondScene = new THREE.Scene()
  const firstTerrain = createPlotGrid(firstScene)
  const baselineCount = firstScene.children.length

  firstTerrain.setPlotState(0, 0, PLOT_STATES.PLOWED)
  const originalPlot = firstTerrain.getPlotAt(0, 0)
  assert.equal(originalPlot._furrows?.children.length, 4, 'plowing should attach a furrow group before migration')

  createPlotGrid(secondScene)

  assert.equal(originalPlot._furrows, null, 'moving terrain to a new scene should clear furrow refs from the old scene state')
  assert.equal(firstScene.children.length, 0, 're-initializing terrain on a new scene should detach all prior terrain-owned objects from the old scene')
  assert.equal(secondScene.children.length, baselineCount, 'the new scene should receive exactly one full terrain set after re-init')
})
