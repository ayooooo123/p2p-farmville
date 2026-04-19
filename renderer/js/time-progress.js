function formatTimeRemaining (msLeft, { readyLabel = 'Ready!' } = {}) {
  const remaining = Math.max(0, msLeft)
  if (remaining <= 0) return readyLabel
  if (remaining < 60000) return Math.ceil(remaining / 1000) + 's'
  if (remaining < 3600000) return Math.ceil(remaining / 60000) + 'm'
  return (remaining / 3600000).toFixed(1) + 'h'
}

function getTimedProgress ({ now, startedAt, durationMs, readyLabel = 'Ready!' }) {
  const safeDuration = Math.max(0, durationMs)
  const elapsed = Math.max(0, now - startedAt)
  const msLeft = Math.max(0, safeDuration - elapsed)
  const pct = safeDuration === 0
    ? 100
    : Math.min(100, Math.round((elapsed / safeDuration) * 100))

  return {
    elapsed,
    msLeft,
    pct,
    timeLabel: formatTimeRemaining(msLeft, { readyLabel })
  }
}

export { formatTimeRemaining, getTimedProgress }
