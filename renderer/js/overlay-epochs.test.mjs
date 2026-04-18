import test from 'node:test'
import assert from 'node:assert/strict'

import { createOverlayEpochTracker, markOverlaySeen, sweepStaleOverlays } from './overlay-epochs.js'

test('markOverlaySeen stamps entries with the current epoch', () => {
  const tracker = createOverlayEpochTracker()
  const overlays = new Map([
    ['a', { id: 'a' }],
    ['b', { id: 'b' }]
  ])

  tracker.next()
  markOverlaySeen(overlays, 'b', tracker.current)

  assert.equal(overlays.get('b')._overlayEpoch, tracker.current)
  assert.equal(overlays.get('a')._overlayEpoch, undefined)
})

test('sweepStaleOverlays removes entries not seen in the latest pass', () => {
  const tracker = createOverlayEpochTracker()
  const removed = []
  const overlays = new Map([
    ['keep', { id: 'keep' }],
    ['drop', { id: 'drop' }]
  ])

  tracker.next()
  markOverlaySeen(overlays, 'keep', tracker.current)
  sweepStaleOverlays(overlays, tracker.current, (key, value) => {
    removed.push([key, value.id])
  })

  assert.deepEqual([...overlays.keys()], ['keep'])
  assert.deepEqual(removed, [['drop', 'drop']])
})
