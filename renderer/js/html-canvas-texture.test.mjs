import assert from 'node:assert/strict'
import test from 'node:test'
import { escapeHtml, makeHtmlCanvasSvg, makeSvgDataUrl, FARM_TAG_CSS } from './html-canvas-texture.js'

test('escapeHtml protects dynamic text before embedding in snippets', () => {
  assert.equal(
    escapeHtml('<Cow & "Pig" \'Farm\'>'),
    '&lt;Cow &amp; &quot;Pig&quot; &#39;Farm&#39;&gt;'
  )
})

test('makeHtmlCanvasSvg wraps HTML in a bounded foreignObject', () => {
  const svg = makeHtmlCanvasSvg({
    width: 220,
    height: 88,
    css: FARM_TAG_CSS,
    html: `<div class="farm-tag ready"><b>${escapeHtml('Tomatoes')}</b><span>Ready</span></div>`
  })

  assert.match(svg, /<svg[^>]+width="220"[^>]+height="88"/)
  assert.match(svg, /<foreignObject x="0" y="0" width="220" height="88">/)
  assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/)
  assert.match(svg, /farm-tag ready/)
  assert.match(svg, /Tomatoes/)
})

test('makeSvgDataUrl encodes the generated SVG for Image decoding', () => {
  const svg = makeHtmlCanvasSvg({ html: '<div>Hi</div>' })
  const url = makeSvgDataUrl(svg)

  assert.ok(url.startsWith('data:image/svg+xml;charset=utf-8,'))
  assert.ok(url.includes('%3Csvg'))
  assert.ok(!url.includes('<svg'))
})
