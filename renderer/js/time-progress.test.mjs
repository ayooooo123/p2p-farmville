import test from 'node:test'
import assert from 'node:assert/strict'

import { formatTimeRemaining, getTimedProgress } from './time-progress.js'

test('formatTimeRemaining formats ready, seconds, minutes, and hours', () => {
  assert.equal(formatTimeRemaining(0), 'Ready!')
  assert.equal(formatTimeRemaining(3200), '4s')
  assert.equal(formatTimeRemaining(61000), '2m')
  assert.equal(formatTimeRemaining(5400000), '1.5h')
})

test('formatTimeRemaining can keep pending countdowns numeric with a custom ready label', () => {
  assert.equal(formatTimeRemaining(0, { readyLabel: '1s' }), '1s')
  assert.equal(formatTimeRemaining(-250, { readyLabel: '1s' }), '1s')
})

test('getTimedProgress clamps elapsed progress and exposes a short time label', () => {
  const progress = getTimedProgress({ now: 8_000, startedAt: 2_000, durationMs: 10_000 })

  assert.equal(progress.elapsed, 6_000)
  assert.equal(progress.msLeft, 4_000)
  assert.equal(progress.pct, 60)
  assert.equal(progress.timeLabel, '4s')
})

test('getTimedProgress handles completed and zero-duration timers safely', () => {
  const completed = getTimedProgress({ now: 15_000, startedAt: 2_000, durationMs: 10_000 })
  assert.equal(completed.msLeft, 0)
  assert.equal(completed.pct, 100)
  assert.equal(completed.timeLabel, 'Ready!')

  const instant = getTimedProgress({ now: 15_000, startedAt: 15_000, durationMs: 0 })
  assert.equal(instant.elapsed, 0)
  assert.equal(instant.msLeft, 0)
  assert.equal(instant.pct, 100)
  assert.equal(instant.timeLabel, 'Ready!')
})
