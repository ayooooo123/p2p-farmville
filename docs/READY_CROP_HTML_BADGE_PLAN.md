# Task: Ready crop HTML-canvas badge

## Goal

Wire the HTML-in-canvas spike into one small production-facing game feature: a floating world-space badge above mature/ready crops.

## Context

`renderer/js/html-canvas-texture.js` can rasterize trusted HTML/CSS into a Three.js sprite. This task should prove the helper in the actual game loop with minimal scope.

The game already has crop meshes, crop state, tooltips, and per-frame crop growth updates in `renderer/app.js`. The badge should not replace existing DOM HUD/tooltips. It should be an in-world visual cue.

## Scope

Implement a small module, likely:

```text
renderer/js/world-crop-badges.js
renderer/js/world-crop-badges.test.mjs
```

And wire it into `renderer/app.js`.

## Required behavior

- When a crop becomes mature/ready, show a small floating HTML-canvas badge above it.
- Badge text should include crop name and `Ready`.
- Dynamic crop names must be escaped before embedding in HTML.
- Badge should be a Three.js Sprite created from `createHtmlSprite`.
- Badge should be added only once per ready crop.
- Badge should be removed/disposed when crop is harvested/removed or no longer ready.
- Do not rerasterize every animation frame.
- Keep maximum active badges bounded to avoid texture spam.
- No networking, no external images, no raw peer HTML.

## Acceptance criteria

- Helper tests pass.
- New badge module tests pass for:
  - ready crop creates badge descriptor/state
  - non-ready crop does not create badge
  - harvested/removed crop schedules disposal
  - crop name is escaped in badge HTML
  - active badge count is bounded
- Full existing JS test suite passes.
- App build is attempted; if blocked by local missing Electrobun binary, note that separately.

## Non-goals

- No interactive click handling on badges.
- No badges for animals/buildings yet.
- No full texture cache beyond what is needed for this first feature.
- No HUD/menu rewrite.

## Handoff to coder

Keep changes tightly scoped. Prefer a testable pure planning function plus a thin Three.js async apply function. Do not change P2P/networking. Do not touch Electron/Electrobun config unless absolutely necessary.
