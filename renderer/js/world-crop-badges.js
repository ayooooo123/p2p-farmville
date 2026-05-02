import { createHtmlSprite, disposeHtmlTextureSprite, escapeHtml, FARM_TAG_CSS } from './html-canvas-texture.js'

export const DEFAULT_MAX_CROP_BADGES = 48

export function getCropBadgeKey (plot) {
  return `${plot?.row ?? '?'}:${plot?.col ?? '?'}`
}

export function isReadyCropPlot (plot, cropDefinitions = {}) {
  if (!plot?.crop || plot.crop.withered) return false
  const def = cropDefinitions[plot.crop.type]
  if (!def) return false
  return Number(plot.crop.stage) >= Number(def.stages) - 1
}

export function makeReadyCropBadgeHtml (cropName) {
  return `<div class="farm-tag ready crop-ready-badge"><b>${escapeHtml(cropName)}</b><span>Ready</span></div>`
}

export function planCropBadgeChanges ({ plots = [], cropDefinitions = {}, activeKeys = new Set(), maxBadges = DEFAULT_MAX_CROP_BADGES } = {}) {
  const wanted = []
  const seen = new Set()
  const limit = Math.max(0, Math.floor(Number(maxBadges) || 0))

  for (const plot of plots) {
    if (wanted.length >= limit) break
    if (!isReadyCropPlot(plot, cropDefinitions)) continue
    const key = getCropBadgeKey(plot)
    if (seen.has(key)) continue
    seen.add(key)
    const cropDef = cropDefinitions[plot.crop.type]
    wanted.push({
      key,
      plot,
      cropType: plot.crop.type,
      cropName: cropDef?.name || plot.crop.type,
      x: Number(plot.x) || 0,
      y: Number(plot.y) || 0,
      z: Number(plot.z) || 0,
      html: makeReadyCropBadgeHtml(cropDef?.name || plot.crop.type)
    })
  }

  const wantedKeys = new Set(wanted.map(item => item.key))
  const create = wanted.filter(item => !activeKeys.has(item.key))
  const remove = [...activeKeys].filter(key => !wantedKeys.has(key))
  return { create, remove, wanted, wantedKeys }
}

export function createWorldCropBadgeManager ({ THREE, scene, createSprite = createHtmlSprite, disposeSprite = disposeHtmlTextureSprite, maxBadges = DEFAULT_MAX_CROP_BADGES } = {}) {
  if (!scene) throw new Error('createWorldCropBadgeManager requires a scene')
  const active = new Map()
  const pending = new Set()

  function removeBadge (key) {
    const entry = active.get(key)
    if (!entry) return
    scene.remove(entry.sprite)
    disposeSprite(entry.sprite)
    active.delete(key)
  }

  async function update (plots, cropDefinitions) {
    const activeKeys = new Set([...active.keys(), ...pending])
    const plan = planCropBadgeChanges({ plots, cropDefinitions, activeKeys, maxBadges })

    for (const key of plan.remove) {
      pending.delete(key)
      removeBadge(key)
    }

    for (const descriptor of plan.create) {
      if (pending.has(descriptor.key) || active.has(descriptor.key)) continue
      pending.add(descriptor.key)
      try {
        const sprite = await createSprite(THREE, descriptor.html, {
          css: FARM_TAG_CSS,
          width: 220,
          height: 88,
          scale: [1.65, 0.66, 1],
          depthTest: true
        })
        pending.delete(descriptor.key)
        const stillWanted = planCropBadgeChanges({ plots, cropDefinitions, activeKeys: new Set(active.keys()), maxBadges }).wantedKeys.has(descriptor.key)
        if (!stillWanted || active.has(descriptor.key)) {
          disposeSprite(sprite)
          continue
        }
        sprite.position.set(descriptor.x, 1.35, descriptor.z)
        sprite.userData.cropReadyBadge = true
        sprite.userData.cropBadgeKey = descriptor.key
        scene.add(sprite)
        active.set(descriptor.key, { sprite, descriptor })
      } catch (err) {
        pending.delete(descriptor.key)
        console.warn('[crop-badges] failed to create ready crop badge', err)
      }
    }

    return { activeCount: active.size, pendingCount: pending.size, planned: plan }
  }

  function disposeAll () {
    pending.clear()
    for (const key of [...active.keys()]) removeBadge(key)
  }

  return { update, disposeAll, getActiveCount: () => active.size, _active: active, _pending: pending }
}
