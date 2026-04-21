import test from 'node:test'
import assert from 'node:assert/strict'

import * as THREE from './three.module.min.js'
import { initDayNight, updateDayNight } from './daynight.js'

function createLights () {
  return {
    sun: new THREE.DirectionalLight(),
    ambient: new THREE.AmbientLight(),
    hemi: new THREE.HemisphereLight()
  }
}

function countDayNightGroups (scene) {
  let starsGroupCount = 0
  let firefliesGroupCount = 0

  for (const child of scene.children) {
    if (!child.isGroup) continue
    if (child.children.length === 200) starsGroupCount += 1
    if (child.children.length === 30) firefliesGroupCount += 1
  }

  return { starsGroupCount, firefliesGroupCount }
}

test('initDayNight replaces existing stars and fireflies when re-initialized on the same scene', () => {
  const scene = new THREE.Scene()
  const { sun, ambient, hemi } = createLights()

  initDayNight(scene, sun, ambient, hemi, {})
  initDayNight(scene, sun, ambient, hemi, {})
  updateDayNight(16)

  assert.deepEqual(countDayNightGroups(scene), {
    starsGroupCount: 1,
    firefliesGroupCount: 1
  })
})

test('initDayNight moves stars and fireflies cleanly to a new scene on re-init', () => {
  const firstScene = new THREE.Scene()
  const secondScene = new THREE.Scene()
  const firstLights = createLights()
  const secondLights = createLights()

  initDayNight(firstScene, firstLights.sun, firstLights.ambient, firstLights.hemi, {})
  initDayNight(secondScene, secondLights.sun, secondLights.ambient, secondLights.hemi, {})
  updateDayNight(16)

  assert.deepEqual(countDayNightGroups(firstScene), {
    starsGroupCount: 0,
    firefliesGroupCount: 0
  })
  assert.deepEqual(countDayNightGroups(secondScene), {
    starsGroupCount: 1,
    firefliesGroupCount: 1
  })
})
