// ── Sound System (Procedural Web Audio API) ────────────────────────────────
// All sounds generated procedurally - no external audio files needed

let audioCtx = null
let masterGain = null
let soundEnabled = true
let volume = 0.4

function initAudio () {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    masterGain = audioCtx.createGain()
    masterGain.gain.value = volume
    masterGain.connect(audioCtx.destination)
  } catch (e) {
    console.warn('[audio] Web Audio API not available:', e.message)
  }
}

function _ensureContext () {
  if (!audioCtx) return false
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx.state !== 'closed'
}

// ── Core sound primitives ───────────────────────────────────────────────────

function _playTone (freq, duration, type, gainValue, detune) {
  if (!_ensureContext() || !soundEnabled) return

  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()

  osc.type = type || 'sine'
  osc.frequency.value = freq
  if (detune) osc.detune.value = detune

  gain.gain.setValueAtTime(gainValue || 0.3, audioCtx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration)

  osc.connect(gain)
  gain.connect(masterGain)

  osc.start(audioCtx.currentTime)
  osc.stop(audioCtx.currentTime + duration)
}

function _playNoise (duration, gainValue, highPass) {
  if (!_ensureContext() || !soundEnabled) return

  const bufferSize = audioCtx.sampleRate * duration
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const source = audioCtx.createBufferSource()
  source.buffer = buffer

  const gain = audioCtx.createGain()
  gain.gain.setValueAtTime(gainValue || 0.2, audioCtx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration)

  if (highPass) {
    const filter = audioCtx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = highPass
    source.connect(filter)
    filter.connect(gain)
  } else {
    source.connect(gain)
  }

  gain.connect(masterGain)
  source.start(audioCtx.currentTime)
}

// ── Sound Effects ───────────────────────────────────────────────────────────

function playHarvest () {
  // Pleasant 'ding' - sine wave with harmonics
  _playTone(880, 0.3, 'sine', 0.25)
  _playTone(1320, 0.2, 'sine', 0.15)
  setTimeout(() => _playTone(1100, 0.15, 'sine', 0.1), 80)
}

function playPlant () {
  // Soft 'thud' - low frequency pulse
  _playTone(120, 0.2, 'sine', 0.3)
  _playTone(80, 0.15, 'triangle', 0.2)
  _playNoise(0.08, 0.1, 200)
}

function playWater () {
  // Gentle 'splash' - noise burst + high pass
  _playNoise(0.15, 0.15, 2000)
  _playTone(600, 0.1, 'sine', 0.08)
  setTimeout(() => _playNoise(0.1, 0.08, 3000), 50)
}

function playCoin () {
  // 'Ching' - high sine + harmonics
  _playTone(1200, 0.15, 'sine', 0.2)
  _playTone(1800, 0.12, 'sine', 0.15)
  setTimeout(() => {
    _playTone(2400, 0.1, 'sine', 0.12)
  }, 60)
}

function playLevelUp () {
  // Ascending arpeggio - C E G C
  const notes = [523, 659, 784, 1047]
  notes.forEach((freq, i) => {
    setTimeout(() => {
      _playTone(freq, 0.3, 'sine', 0.2)
      _playTone(freq * 1.5, 0.25, 'sine', 0.08)
    }, i * 120)
  })
}

function playAchievement () {
  // Fanfare - major chord arpeggio with sustain
  const notes = [523, 659, 784, 1047, 1319]
  notes.forEach((freq, i) => {
    setTimeout(() => {
      _playTone(freq, 0.5, 'sine', 0.2)
      _playTone(freq * 0.5, 0.4, 'triangle', 0.1)
    }, i * 100)
  })
  // Finishing chord
  setTimeout(() => {
    _playTone(1047, 0.6, 'sine', 0.15)
    _playTone(1319, 0.6, 'sine', 0.12)
    _playTone(1568, 0.6, 'sine', 0.1)
  }, 550)
}

function playClick () {
  // Short tap
  _playTone(800, 0.05, 'square', 0.1)
}

function playError () {
  // Low buzz
  _playTone(200, 0.2, 'sawtooth', 0.15)
  _playTone(180, 0.25, 'sawtooth', 0.1)
}

function playPlow () {
  // Scraping sound
  _playNoise(0.15, 0.12, 400)
  _playTone(150, 0.1, 'triangle', 0.15)
}

function playWither () {
  // Sad descending tone
  if (!_ensureContext() || !soundEnabled) return

  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(400, audioCtx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.4)
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4)
  osc.connect(gain)
  gain.connect(masterGain)
  osc.start(audioCtx.currentTime)
  osc.stop(audioCtx.currentTime + 0.4)
}

function playThunder () {
  // Deep rumble for storms
  _playNoise(0.8, 0.25, 80)
  _playTone(60, 0.6, 'sine', 0.2)
  setTimeout(() => _playNoise(0.5, 0.15, 60), 300)
}

// ── Controls ────────────────────────────────────────────────────────────────

function toggleSound () {
  soundEnabled = !soundEnabled
  if (masterGain) {
    masterGain.gain.value = soundEnabled ? volume : 0
  }
  return soundEnabled
}

function isSoundEnabled () {
  return soundEnabled
}

function setVolume (v) {
  volume = Math.max(0, Math.min(1, v))
  if (masterGain && soundEnabled) {
    masterGain.gain.value = volume
  }
}

function getVolume () {
  return volume
}

// Play a sound by name
function playSound (name) {
  switch (name) {
    case 'harvest': playHarvest(); break
    case 'plant': playPlant(); break
    case 'water': playWater(); break
    case 'coin': playCoin(); break
    case 'levelup': playLevelUp(); break
    case 'achievement': playAchievement(); break
    case 'click': playClick(); break
    case 'error': playError(); break
    case 'plow': playPlow(); break
    case 'wither': playWither(); break
    case 'thunder': playThunder(); break
  }
}

export {
  initAudio,
  playSound,
  playHarvest,
  playPlant,
  playWater,
  playCoin,
  playLevelUp,
  playAchievement,
  playClick,
  playError,
  playPlow,
  playWither,
  playThunder,
  toggleSound,
  isSoundEnabled,
  setVolume,
  getVolume
}
