import test from 'node:test'
import assert from 'node:assert/strict'

import * as THREE from './three.module.min.js'
import { initWeather } from './weather.js'

function countWeatherNodes (scene) {
  let rainCount = 0
  let snowCount = 0
  let cloudGroupCount = 0
  let puddleGroupCount = 0

  for (const child of scene.children) {
    if (child.isInstancedMesh && child.count === 600) rainCount += 1
    if (child.isInstancedMesh && child.count === 300) snowCount += 1
    if (child.isGroup && child.children.length === 8) cloudGroupCount += 1
    if (child.isGroup && child.children.length === 12) puddleGroupCount += 1
  }

  return { rainCount, snowCount, cloudGroupCount, puddleGroupCount }
}

test('initWeather resets weather systems before re-initializing the same scene', () => {
  const scene = new THREE.Scene()

  initWeather(scene)
  initWeather(scene)

  assert.deepEqual(countWeatherNodes(scene), {
    rainCount: 1,
    snowCount: 1,
    cloudGroupCount: 1,
    puddleGroupCount: 1
  })
})

test('initWeather moves weather systems cleanly to a new scene on re-init', () => {
  const firstScene = new THREE.Scene()
  const secondScene = new THREE.Scene()

  initWeather(firstScene)
  initWeather(secondScene)

  assert.deepEqual(countWeatherNodes(firstScene), {
    rainCount: 0,
    snowCount: 0,
    cloudGroupCount: 0,
    puddleGroupCount: 0
  })
  assert.deepEqual(countWeatherNodes(secondScene), {
    rainCount: 1,
    snowCount: 1,
    cloudGroupCount: 1,
    puddleGroupCount: 1
  })
})
