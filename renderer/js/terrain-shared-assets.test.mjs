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

test('createPlotGrid reuses shared plot and furrow assets without leaking watered state between plots', () => {
  const scene = new THREE.Scene()
  const terrain = createPlotGrid(scene)

  const grassA = terrain.getPlotAt(0, 0)
  const grassB = terrain.getPlotAt(0, 2)
  const grassOdd = terrain.getPlotAt(0, 1)

  assert.equal(grassA.mesh.geometry, grassB.mesh.geometry, 'same-parity grass plots should reuse one shared plot geometry')
  assert.equal(grassA.mesh.material, grassB.mesh.material, 'same-parity grass plots should reuse one shared grass material')
  assert.equal(grassA.mesh.geometry, grassOdd.mesh.geometry, 'all plots should reuse one shared plot geometry')
  assert.notEqual(grassA.mesh.material, grassOdd.mesh.material, 'opposite-parity grass plots should keep distinct checkerboard materials')

  terrain.setPlotState(1, 1, PLOT_STATES.PLOWED)
  terrain.setPlotState(1, 2, PLOT_STATES.PLOWED)

  const dryA = terrain.getPlotAt(1, 1)
  const dryB = terrain.getPlotAt(1, 2)
  const dryFurrowA = dryA._furrows.children[0]
  const dryFurrowB = dryB._furrows.children[0]

  assert.equal(dryA.mesh.material, dryB.mesh.material, 'dry plowed plots should reuse one shared soil material')
  assert.equal(dryFurrowA.geometry, dryFurrowB.geometry, 'furrow stripes should reuse one shared geometry')
  assert.equal(dryFurrowA.material, dryFurrowB.material, 'dry furrows should reuse one shared material')

  terrain.setPlotWatered(1, 1, true)

  assert.notEqual(dryA.mesh.material, dryB.mesh.material, 'watering one plot should switch only that plot to the wet shared soil material')
  assert.notEqual(dryA._furrows.children[0].material, dryB._furrows.children[0].material, 'watering one plot should switch only that plot to the wet shared furrow material')
})
