// HTML/CSS -> CanvasTexture helpers for world-space FarmVille UI.
//
// Canvas cannot draw live DOM directly. This module rasterizes trusted HTML via
// SVG <foreignObject>, draws the decoded SVG image into an offscreen canvas,
// then exposes it as a THREE.CanvasTexture/Sprite.

const SVG_NS = 'http://www.w3.org/2000/svg'
const XHTML_NS = 'http://www.w3.org/1999/xhtml'

export function escapeHtml (value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function makeHtmlCanvasSvg ({ html, css = '', width = 256, height = 128, background = 'transparent' } = {}) {
  const safeWidth = Math.max(1, Math.floor(Number(width) || 256))
  const safeHeight = Math.max(1, Math.floor(Number(height) || 128))
  const bgStyle = background && background !== 'transparent'
    ? `background:${escapeHtml(background)};`
    : 'background:transparent;'

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="${SVG_NS}" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">
  <foreignObject x="0" y="0" width="${safeWidth}" height="${safeHeight}">
    <div xmlns="${XHTML_NS}" style="width:${safeWidth}px;height:${safeHeight}px;${bgStyle}">
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; }
        ${css}
      </style>
      ${html || ''}
    </div>
  </foreignObject>
</svg>`
}

export function makeSvgDataUrl (svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export async function rasterizeHtmlToCanvas ({
  html,
  css = '',
  width = 256,
  height = 128,
  pixelRatio = (globalThis.devicePixelRatio || 1),
  background = 'transparent'
} = {}) {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    throw new Error('rasterizeHtmlToCanvas requires a browser-like renderer context')
  }

  const safeWidth = Math.max(1, Math.floor(Number(width) || 256))
  const safeHeight = Math.max(1, Math.floor(Number(height) || 128))
  const ratio = Math.max(1, Math.min(3, Number(pixelRatio) || 1))
  const svg = makeHtmlCanvasSvg({ html, css, width: safeWidth, height: safeHeight, background })
  const url = makeSvgDataUrl(svg)

  const img = new Image()
  img.decoding = 'async'
  img.src = url
  await img.decode()

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(safeWidth * ratio)
  canvas.height = Math.ceil(safeHeight * ratio)
  canvas.style.width = `${safeWidth}px`
  canvas.style.height = `${safeHeight}px`

  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(ratio, ratio)
  ctx.drawImage(img, 0, 0, safeWidth, safeHeight)

  return canvas
}

export async function createHtmlTexture (THREE, options = {}) {
  const canvas = await rasterizeHtmlToCanvas(options)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  texture.colorSpace = THREE.SRGBColorSpace
  texture.userData = {
    htmlCanvasTexture: true,
    width: options.width || 256,
    height: options.height || 128
  }
  return texture
}

export async function createHtmlSprite (THREE, html, options = {}) {
  const texture = await createHtmlTexture(THREE, { ...options, html })
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: options.depthTest !== false
  })
  const sprite = new THREE.Sprite(material)
  const scale = options.scale || [2.4, 1.2, 1]
  sprite.scale.set(scale[0], scale[1], scale[2] ?? 1)
  sprite.userData.htmlCanvasSprite = true
  return sprite
}

export function disposeHtmlTextureSprite (sprite) {
  if (!sprite) return
  const material = sprite.material
  const texture = material?.map
  texture?.dispose?.()
  material?.dispose?.()
}

export const FARM_TAG_CSS = `
.farm-tag {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 14px 18px;
  color: #f9ffe8;
  font: 700 20px/1.05 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  text-shadow: 0 2px 2px rgba(39, 28, 8, 0.45);
  border: 3px solid rgba(255,255,255,0.7);
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(46, 130, 65, 0.94), rgba(24, 91, 46, 0.94));
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.28), 0 14px 22px rgba(22, 35, 16, 0.30);
}
.farm-tag b { font-size: 24px; letter-spacing: -0.03em; }
.farm-tag span { font-size: 16px; color: #f7e9a6; }
.farm-tag.ready { background: linear-gradient(135deg, rgba(236, 143, 46, 0.96), rgba(167, 75, 30, 0.96)); }
.farm-tag.water { background: linear-gradient(135deg, rgba(60, 143, 218, 0.96), rgba(34, 82, 159, 0.96)); }
`
