import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildEnvironmentFrame,
  getNightFactor,
  getWeatherWindParams
} from './environment-frame.js'

test('getWeatherWindParams returns per-weather tuning and falls back to clear', () => {
  assert.deepEqual(getWeatherWindParams('stormy'), { str: 2.6, freq: 0.0028, treeStr: 2.5 })
  assert.deepEqual(getWeatherWindParams('unknown'), { str: 0.6, freq: 0.0012, treeStr: 0.6 })
})

test('getNightFactor is darkest at noon and brightest at midnight', () => {
  assert.equal(getNightFactor(0.5), 0)
  assert.equal(getNightFactor(0), 1)
  assert.ok(getNightFactor(0.2) > 0 && getNightFactor(0.2) < 1)
})

test('buildEnvironmentFrame advances storm wind state and shares derived values', () => {
  const frame = buildEnvironmentFrame({
    time: 12_000,
    timeOfDay: 0.9,
    weather: 'stormy',
    windDriftAngle: 0,
    windGustPhase: 0,
    lastDecorationAnimMs: 11_980
  })

  assert.equal(frame.weather, 'stormy')
  assert.deepEqual(frame.windParams, { str: 2.6, freq: 0.0028, treeStr: 2.5 })
  assert.equal(frame.lampWeatherBoost, 1.14)
  assert.equal(frame.isNightTime, true)
  assert.equal(frame.decorationDtMs, 20)
  assert.ok(frame.windDriftAngle > 0)
  assert.ok(frame.windGustPhase > 0)
  assert.equal(frame.windSinDrift, Math.sin(frame.windDriftAngle))
  assert.equal(frame.windCosDrift, Math.cos(frame.windDriftAngle))
})

test('buildEnvironmentFrame decays non-storm wind state and clamps decoration delta', () => {
  const frame = buildEnvironmentFrame({
    time: 9_000,
    timeOfDay: 0.4,
    weather: 'clear',
    windDriftAngle: 2,
    windGustPhase: 3,
    lastDecorationAnimMs: 8_000
  })

  assert.equal(frame.lampWeatherBoost, 1)
  assert.equal(frame.isNightTime, false)
  assert.equal(frame.decorationDtMs, 50)
  assert.equal(frame.windDriftAngle, 2 * 0.9998)
  assert.equal(frame.windGustPhase, 3 * 0.9995)
})
