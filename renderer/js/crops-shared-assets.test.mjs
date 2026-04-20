import test from 'node:test'
import assert from 'node:assert/strict'

globalThis.window = {}

// crops.js makes canvas-backed crop sprites via document.createElement.
// A minimal stub is enough for the module to load and for createCropMesh
// to build the group without a real DOM.
globalThis.document = {
  createElement () {
    return {
      width: 128,
      height: 128,
      getContext () {
        return {
          clearRect () {},
          fillRect () {},
          beginPath () {},
          closePath () {},
          moveTo () {},
          lineTo () {},
          quadraticCurveTo () {},
          arc () {},
          ellipse () {},
          stroke () {},
          fill () {},
          createRadialGradient () {
            return { addColorStop () {} }
          },
          getImageData () { return { data: new Uint8ClampedArray(0) } },
          putImageData () {},
          set fillStyle (_v) {},
          set strokeStyle (_v) {},
          set lineWidth (_v) {},
          set lineCap (_v) {}
        }
      }
    }
  }
}

const { createCropMesh, setCropWitherWarn, setReadyGlowOpacity } = await import('./crops.js')

function findChild (group, predicate) {
  return group.children.find(predicate) || null
}

test('createCropMesh reuses shared glow-ring assets across repeated mature wheat', () => {
  const a = createCropMesh('wheat', 3) // wheat has 4 stages (0..3) so 3 is ready
  const b = createCropMesh('wheat', 3)

  assert.notStrictEqual(a, b)
  assert.equal(a.userData.isReady, true)
  assert.equal(b.userData.isReady, true)

  const ringA = a.userData.glowRingMeshes[0]
  const ringB = b.userData.glowRingMeshes[0]
  assert.ok(ringA?.isMesh)
  assert.ok(ringB?.isMesh)
  assert.notStrictEqual(ringA, ringB)
  assert.strictEqual(ringA.geometry, ringB.geometry)
  assert.strictEqual(ringA.material, ringB.material)
  assert.equal(ringA.geometry.userData.sharedAsset, true)
  assert.equal(ringA.material.userData.sharedAsset, true)
})

test('createCropMesh reuses progress-arc geometry for crops at the same stage fraction', () => {
  // wheat: maxStage=3. Two wheat at stage 1 share geometry.
  const w1 = createCropMesh('wheat', 1)
  const w2 = createCropMesh('wheat', 1)

  const arc1 = findChild(w1, c => c.userData?.isProgressArc)
  const arc2 = findChild(w2, c => c.userData?.isProgressArc)
  assert.ok(arc1 && arc2, 'expected progress arc meshes on growing wheat')
  assert.strictEqual(arc1.geometry, arc2.geometry)
  assert.strictEqual(arc1.material, arc2.material)
  assert.equal(arc1.geometry.userData.sharedAsset, true)
  assert.equal(arc1.material.userData.sharedAsset, true)

  // Different fraction (corn: maxStage=4, stage 1 -> different arcLen) should get a different
  // cached geometry but still share the material.
  const c1 = createCropMesh('corn', 1)
  const arcCorn = findChild(c1, c => c.userData?.isProgressArc)
  assert.ok(arcCorn)
  assert.notStrictEqual(arc1.geometry, arcCorn.geometry)
  assert.strictEqual(arc1.material, arcCorn.material)
})

test('setCropWitherWarn swaps shared material reference without mutating colors', () => {
  const ready = createCropMesh('wheat', 3)
  const ring = ready.userData.glowRingMeshes[0]
  const normalMat = ring.material

  setCropWitherWarn(ready, true)
  const warnMat = ring.material
  assert.notStrictEqual(normalMat, warnMat)
  assert.equal(warnMat.userData.sharedAsset, true)

  // Reverting returns the same shared normal reference.
  setCropWitherWarn(ready, false)
  assert.strictEqual(ring.material, normalMat)
})

test('setReadyGlowOpacity mutates the shared materials used by every ready crop', () => {
  const a = createCropMesh('wheat', 3)
  const b = createCropMesh('wheat', 3)
  const ringA = a.userData.glowRingMeshes[0]
  const ringB = b.userData.glowRingMeshes[0]

  setReadyGlowOpacity(0.42)
  assert.equal(ringA.material.opacity, 0.42)
  assert.equal(ringB.material.opacity, 0.42)

  // Warn material tracks the same opacity.
  setCropWitherWarn(a, true)
  setReadyGlowOpacity(0.17)
  assert.equal(ringA.material.opacity, 0.17)
  assert.equal(ringB.material.opacity, 0.17)
})
