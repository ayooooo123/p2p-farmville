# HTML-in-canvas spike for P2P FarmVille

Goal: use small HTML/CSS snippets as in-world labels/cards by rasterizing them into canvas-backed textures, then placing those textures on Three.js planes or sprites.

This is not for the main HUD. The existing DOM HUD is still the right choice for menus, inventory, market, chat, and panels. HTML-in-canvas is useful for world-space UI that should move with farm objects.

## What “HTML in canvas” actually means

Browsers do not let canvas directly draw live DOM nodes. The practical pattern is:

```text
HTML string + scoped CSS
  -> SVG <foreignObject>
  -> Image decode
  -> offscreen <canvas>.drawImage(image)
  -> THREE.CanvasTexture
  -> Sprite / plane in world
```

The result is a texture snapshot. It is not interactive DOM after rasterization.

## Best use cases in this game

Good:

- crop growth tags hovering over plots
- animal hunger/ready badges
- building crafting timers
- neighbor nameplates
- trade request cards above visiting players
- co-op mission markers
- market stall signs
- tutorial callouts anchored to farm objects

Bad:

- inventory panels
- chat input
- market UI
- draggable menus
- anything requiring text selection/input
- large constantly changing panels

## Proposed architecture

```text
renderer/js/html-canvas-texture.js
  createHtmlTexture(html, options)
  createHtmlSprite(THREE, html, options)
  disposeHtmlTextureSprite(sprite)

renderer/app.js or object modules
  when label state changes:
    dispose old texture
    create new texture
    attach sprite to object/group
  every frame:
    sprite faces camera automatically if THREE.Sprite
```

## Rendering pipeline

```js
const sprite = await createHtmlSprite(THREE, `
  <div class="farm-tag ready">
    <b>Tomatoes</b>
    <span>Ready</span>
  </div>
`, {
  width: 220,
  height: 88,
  css: FARM_TAG_CSS,
  scale: [2.2, 0.88, 1]
})

sprite.position.set(tileX, 1.8, tileZ)
scene.add(sprite)
```

## Performance rules

Do not rerasterize every frame.

Use this cache key:

```text
html + css + width + height + devicePixelRatioBucket
```

Refresh only when the visible text/state changes:

- crop stage changed
- timer display crosses a coarse boundary, e.g. every 5s or 10s
- ready/hungry state changed
- selected/hovered object changed

Safe budgets:

- < 50 active world labels
- < 10 rasterizations per second
- texture sizes around 256x128 or 512x256
- avoid 1024+ textures unless a card is very important

## Interaction model

Because the texture is a flat snapshot, hit testing should happen in Three.js:

- raycast sprite/plane
- map pointer UV to local pixel coordinate if needed
- trigger game action manually

For simple badges, treat the whole sprite as one button/hover target.

## Security / correctness

The helper must not accept raw remote HTML. For internal game UI, use template strings from trusted code and escape dynamic text.

Rules:

- escape player names, farm names, crop labels, chat snippets
- no `<script>`
- no remote images inside HTML snippets
- no unsanitized `style=` from network/P2P peers
- prefer generated class names + scoped CSS

## Decision

Use HTML-in-canvas as a *world-space label/card renderer*, not as a HUD replacement.

First production candidate: crop/animal/building hover cards. Those currently live as screen-space DOM tooltips; rendering a simplified world-space version would make the farm feel more alive without rewriting the main UI.
