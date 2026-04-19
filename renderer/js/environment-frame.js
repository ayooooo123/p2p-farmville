const WEATHER_WIND = {
  clear: { str: 0.6, freq: 0.0012, treeStr: 0.6 },
  cloudy: { str: 0.85, freq: 0.0014, treeStr: 0.85 },
  rainy: { str: 1.3, freq: 0.0018, treeStr: 1.3 },
  stormy: { str: 2.6, freq: 0.0028, treeStr: 2.5 },
  snowy: { str: 0.45, freq: 0.0008, treeStr: 0.4 }
}

function getWeatherWindParams (weather = 'clear') {
  return WEATHER_WIND[weather] || WEATHER_WIND.clear
}

function getNightFactor (timeOfDay) {
  const sunAngle = timeOfDay * Math.PI * 2 - Math.PI / 2
  const elevation = Math.sin(sunAngle)
  return Math.max(0, Math.min(1, (1 - elevation) / 2))
}

function advanceWindState ({ weather = 'clear', windDriftAngle = 0, windGustPhase = 0 }) {
  let nextWindDriftAngle = windDriftAngle
  let nextWindGustPhase = windGustPhase

  if (weather === 'stormy') {
    nextWindDriftAngle = (nextWindDriftAngle + 0.000035) % (Math.PI * 2)
    nextWindGustPhase = (nextWindGustPhase + 0.000031) % (Math.PI * 2)
  } else {
    nextWindDriftAngle *= 0.9998
    nextWindGustPhase *= 0.9995
  }

  return {
    windDriftAngle: nextWindDriftAngle,
    windGustPhase: nextWindGustPhase,
    windSinDrift: Math.sin(nextWindDriftAngle),
    windCosDrift: Math.cos(nextWindDriftAngle)
  }
}

function buildEnvironmentFrame ({
  time,
  timeOfDay,
  weather = 'clear',
  windDriftAngle = 0,
  windGustPhase = 0,
  lastDecorationAnimMs = 0
}) {
  const windState = advanceWindState({ weather, windDriftAngle, windGustPhase })

  return {
    time,
    timeOfDay,
    weather,
    windParams: getWeatherWindParams(weather),
    nightFactor: getNightFactor(timeOfDay),
    lampWeatherBoost: weather === 'stormy' ? 1.14 : weather === 'rainy' ? 1.08 : 1.0,
    decorationDtMs: lastDecorationAnimMs > 0
      ? Math.max(0, Math.min(50, time - lastDecorationAnimMs))
      : 16.67,
    isNightTime: timeOfDay > 0.62 || timeOfDay < 0.08,
    ...windState
  }
}

export {
  WEATHER_WIND,
  advanceWindState,
  buildEnvironmentFrame,
  getNightFactor,
  getWeatherWindParams
}
