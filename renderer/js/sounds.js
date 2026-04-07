// ── Sound System — synthesized Web Audio effects ─────────────────────────────
// No external files needed. All sounds are procedurally generated.

const STORAGE_KEY = 'p2p-farmville-sound'

export const SoundSystem = {
  _ctx: null,
  _enabled: localStorage.getItem(STORAGE_KEY) !== 'off',

  get enabled () { return this._enabled },

  // Call once after first user gesture to unlock AudioContext
  _ensureCtx () {
    if (this._ctx) return this._ctx
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)()
    } catch (_) {}
    return this._ctx
  },

  toggle () {
    this._enabled = !this._enabled
    localStorage.setItem(STORAGE_KEY, this._enabled ? 'on' : 'off')
    return this._enabled
  },

  // ── Core helpers ─────────────────────────────────────────────────────────

  // Oscillator tone: type, freq, gainPeak, durationSec, freqEnd (optional sweep)
  _tone (type, freq, gainPeak, dur, freqEnd) {
    const ctx = this._ensureCtx()
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur)
    }

    gain.gain.setValueAtTime(0.001, t)
    gain.gain.exponentialRampToValueAtTime(gainPeak, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur)

    osc.start(t)
    osc.stop(t + dur + 0.01)
  },

  // Schedule a sequence of notes: [[delay, freq, dur], ...]
  _sequence (type, gainPeak, notes) {
    const ctx = this._ensureCtx()
    if (!ctx) return
    const base = ctx.currentTime
    for (const [delay, freq, dur] of notes) {
      const t = base + delay
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = type
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.001, t)
      gain.gain.exponentialRampToValueAtTime(gainPeak, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
      osc.start(t)
      osc.stop(t + dur + 0.01)
    }
  },

  // Short noise burst (for water/natural sounds)
  _noise (freq, Q, gainPeak, dur) {
    const ctx = this._ensureCtx()
    if (!ctx) return
    const bufferSize = Math.floor(ctx.sampleRate * dur)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = freq
    filter.Q.value = Q

    const gain = ctx.createGain()
    const t = ctx.currentTime
    gain.gain.setValueAtTime(gainPeak, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur)

    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    source.start(t)
    source.stop(t + dur)
  },

  // ── Named sounds ─────────────────────────────────────────────────────────

  play (name) {
    if (!this._enabled) return
    this._ensureCtx()
    switch (name) {
      case 'harvest':
        // Ascending coin ding
        this._tone('sine', 660, 0.25, 0.18, 1320)
        break

      case 'water':
        // Water burble: two short noise bursts
        this._noise(800, 2, 0.15, 0.12)
        setTimeout(() => this._noise(600, 3, 0.10, 0.10), 80)
        break

      case 'plow':
        // Low earthy thud
        this._tone('triangle', 90, 0.35, 0.15, 40)
        break

      case 'plant':
        // Soft seed pop
        this._tone('sine', 320, 0.18, 0.12, 180)
        break

      case 'remove':
        // Short descending tone
        this._tone('sine', 400, 0.15, 0.14, 200)
        break

      case 'levelup':
        // C5 → E5 → G5 → C6 fanfare
        this._sequence('sine', 0.28, [
          [0.00, 523, 0.12],
          [0.12, 659, 0.12],
          [0.24, 784, 0.12],
          [0.36, 1047, 0.30]
        ])
        break

      case 'error':
        // Low buzz
        this._tone('sawtooth', 120, 0.12, 0.12)
        break

      case 'craft':
        // Quick mechanical click
        this._tone('square', 200, 0.10, 0.06, 100)
        break

      case 'wither':
        // Sad descending
        this._tone('sine', 440, 0.15, 0.30, 220)
        break

      case 'collect':
        // Animal product collect — cheerful up
        this._tone('sine', 440, 0.20, 0.15, 660)
        break

      case 'toast':
        // Notification chime
        this._tone('sine', 880, 0.10, 0.10, 1100)
        break

      case 'buy':
        // Satisfying coin-click purchase sound
        this._tone('sine', 523, 0.15, 0.08, 784)
        setTimeout(() => this._tone('sine', 784, 0.12, 0.10, 1046), 70)
        break

      case 'sell':
        // Coins clinking — two quick descending tones
        this._tone('sine', 1046, 0.18, 0.10, 659)
        setTimeout(() => this._tone('sine', 784, 0.14, 0.10, 523), 90)
        break

      case 'quest':
        // Short triumphant fanfare — 3 rising notes
        this._sequence('sine', 0.22, [
          [0.00, 659, 0.14],
          [0.14, 784, 0.14],
          [0.28, 1047, 0.32]
        ])
        break

      case 'feed':
        // Happy animal chirp — quick wobble
        this._tone('sine', 480, 0.15, 0.12, 600)
        setTimeout(() => this._tone('sine', 580, 0.10, 0.10, 480), 100)
        break
    }
  }
}
