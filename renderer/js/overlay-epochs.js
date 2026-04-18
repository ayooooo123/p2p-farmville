function createOverlayEpochTracker (start = 0) {
  return {
    current: start,
    next () {
      this.current = this.current >= Number.MAX_SAFE_INTEGER ? 1 : this.current + 1
      return this.current
    }
  }
}

// Overlay map values are mutable objects / DOM nodes that can carry a tiny epoch tag.
function markOverlaySeen (overlayMap, key, epoch) {
  const overlay = overlayMap.get(key)
  if (overlay) overlay._overlayEpoch = epoch
  return overlay
}

function sweepStaleOverlays (overlayMap, epoch, onRemove = null) {
  for (const [key, overlay] of overlayMap) {
    if (!overlay || overlay._overlayEpoch !== epoch) {
      if (onRemove) onRemove(key, overlay)
      overlayMap.delete(key)
    }
  }
}

export { createOverlayEpochTracker, markOverlaySeen, sweepStaleOverlays }
