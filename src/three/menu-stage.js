import {
  Scene,
  PerspectiveCamera,
  Group,
  Mesh,
  CylinderGeometry,
  TorusGeometry,
  CircleGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  AdditiveBlending,
  Fog,
  Raycaster,
  Vector2,
  Vector3,
  MathUtils,
} from 'three'
import { gsap } from 'gsap'
import {
  createRenderer,
  studioEnvironment,
  addStudioLights,
  ENV_INTENSITY,
  loadLogo,
  fontsReady,
  addLoop,
  autoResize,
  reducedMotion,
  idle as breathe,
  warmUp,
} from './core.js'
import { buildModel } from './foods.js'
import { glowTexture, shadowTexture } from './textures.js'

const PI = Math.PI

/**
 * Carrousel 3D de la carte : chaque catégorie est un plat posé sur un socle,
 * disposé en cercle. On le fait tourner au doigt, à la souris ou via les onglets.
 */
export async function initMenuStage({ container, canvas, categories, logoUrl, onChange, initial = 0 }) {
  const N = categories.length
  const step = (PI * 2) / N
  const RADIUS = 3.6

  const renderer = createRenderer(canvas)
  const scene = new Scene()
  await breathe()
  scene.environment = studioEnvironment(renderer)
  scene.environmentIntensity = ENV_INTENSITY
  scene.fog = new Fog('#141211', 7.5, 13)
  addStudioLights(scene, { rim: 2.4 })

  const camera = new PerspectiveCamera(34, 1, 0.1, 40)
  const look = new Vector3(0, 0.1, 0)

  await fontsReady()
  const logo = await loadLogo(logoUrl)

  const carousel = new Group()
  carousel.position.z = -RADIUS
  scene.add(carousel)

  const pedestalGeo = new CylinderGeometry(1.05, 1.12, 0.2, 72)
  const pedestalMat = new MeshStandardMaterial({ color: '#221d1a', roughness: 0.45, metalness: 0.3 })
  const ringGeo = new TorusGeometry(1.06, 0.018, 8, 96)
  const shadowMat = new MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.8 })

  const slots = categories.map((cat, i) => {
    const slot = new Group()
    const a = i * step
    slot.position.set(Math.sin(a) * RADIUS, 0, Math.cos(a) * RADIUS)
    slot.rotation.y = a
    const pedestal = new Mesh(pedestalGeo, pedestalMat)
    pedestal.position.y = 0.1
    slot.add(pedestal)
    const ringMat = new MeshBasicMaterial({ color: '#ff7a1a', transparent: true, opacity: 0.35, toneMapped: false })
    const ring = new Mesh(ringGeo, ringMat)
    ring.rotation.x = PI / 2
    ring.position.y = 0.2
    slot.add(ring)
    const shadow = new Mesh(new CircleGeometry(0.95, 40), shadowMat)
    shadow.rotation.x = -PI / 2
    shadow.position.y = 0.202
    slot.add(shadow)
    const turntable = new Group()
    turntable.position.y = 0.2
    slot.add(turntable)
    slot.userData.index = i
    carousel.add(slot)
    return { slot, turntable, ringMat, kind: cat.model }
  })

  // les plats sont construits un par un (le plus proche d'abord) et leurs shaders compilés en
  // arrière-plan avant d'être posés sur leur socle : aucun à-coup pendant le défilement
  const ringDistance = (i) => Math.min(Math.abs(i - initial), N - Math.abs(i - initial))
  const queue = slots.map((_, i) => i).sort((a, b) => ringDistance(a) - ringDistance(b))
  let alive = true
  const buildSlot = (i) => {
    const s = slots[i]
    s.ready ??= (async () => {
      const model = buildModel(s.kind, logo)
      await renderer.compileAsync(model, camera, scene)
      if (alive) s.turntable.add(model)
    })().catch((err) => console.warn('Plat 3D non construit :', err))
    return s.ready
  }
  const pump = async () => {
    while (alive && queue.length) {
      await breathe()
      await buildSlot(queue.shift())
    }
  }

  // halo orange au sol sous le plat actif
  const floorGlow = new Mesh(
    new CircleGeometry(1.9, 48),
    new MeshBasicMaterial({ map: glowTexture(), color: '#ff6a00', transparent: true, opacity: 0.4, blending: AdditiveBlending, depthWrite: false }),
  )
  floorGlow.rotation.x = -PI / 2
  floorGlow.position.y = 0.01
  scene.add(floorGlow)

  // premier plat posé tout de suite, puis toute la scène préparée pendant que le canvas est masqué
  const first = slots[queue.shift()]
  first.turntable.add(buildModel(first.kind, logo))
  first.ready = Promise.resolve()
  await warmUp(renderer, scene, camera)
  pump()

  // --- cadrage responsive --------------------------------------------------------
  const stopResize = autoResize(container, renderer, camera, (w, h) => {
    const aspect = w / h
    // plus l'écran est étroit, plus la caméra recule pour garder le plat entier
    const dist = aspect < 1 ? 5.3 + (1 - aspect) * 3.2 : 5.1
    camera.fov = 34
    camera.position.set(0, 2.25, dist)
    camera.lookAt(look)
    camera.updateProjectionMatrix()
    renderer.render(scene, camera)
  })

  // --- état de rotation ------------------------------------------------------------
  const state = { angle: initial, active: initial }
  const norm = (i) => ((i % N) + N) % N
  let tween

  function goTo(target, { instant = false, notify = true } = {}) {
    tween?.kill()
    const idx = norm(Math.round(target))
    // le plat visé et ses voisins sont construits tout de suite s'ils ne le sont pas encore
    ;[idx, norm(idx + 1), norm(idx - 1)].forEach(buildSlot)
    const changed = idx !== state.active
    state.active = idx
    if (instant || reducedMotion.matches) state.angle = target
    else tween = gsap.to(state, { angle: target, duration: 0.9, ease: 'power3.out' })
    // l'interface (onglets, liste) est prévenue dès le début de la rotation
    if (changed && notify) onChange?.(idx)
  }

  function setActive(index, opts = {}) {
    const current = state.angle
    const base = Math.round(current)
    let delta = norm(index) - norm(base)
    if (delta > N / 2) delta -= N
    if (delta < -N / 2) delta += N
    goTo(base + delta, { ...opts, notify: opts.notify ?? false })
  }

  // --- glisser pour tourner ----------------------------------------------------------
  const drag = { on: false, x0: 0, a0: 0, t0: 0, lastX: 0, lastT: 0, v: 0, moved: 0 }
  const listening = new AbortController()
  const { signal } = listening
  const raycaster = new Raycaster()
  const ndc = new Vector2()

  canvas.addEventListener('pointerdown', (e) => {
    drag.on = true
    drag.x0 = drag.lastX = e.clientX
    drag.a0 = state.angle
    drag.t0 = drag.lastT = performance.now()
    drag.v = 0
    drag.moved = 0
    tween?.kill()
    canvas.setPointerCapture(e.pointerId)
    container.classList.add('is-grabbing')
  }, { signal })
  canvas.addEventListener('pointermove', (e) => {
    if (!drag.on) return
    const dx = e.clientX - drag.x0
    drag.moved = Math.max(drag.moved, Math.abs(dx))
    const w = container.clientWidth || 1
    state.angle = drag.a0 - (dx / w) * 2.4
    const now = performance.now()
    const dt = Math.max(1, now - drag.lastT)
    drag.v = -((e.clientX - drag.lastX) / w) * 2.4 / (dt / 1000)
    drag.lastX = e.clientX
    drag.lastT = now
  }, { signal })
  const release = (e) => {
    if (!drag.on) return
    drag.on = false
    container.classList.remove('is-grabbing')
    if (drag.moved < 6 && performance.now() - drag.t0 < 400) {
      // simple tap : sélectionne le plat touché
      const rect = canvas.getBoundingClientRect()
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      const hit = raycaster.intersectObjects(
        slots.map((s) => s.slot),
        true,
      )[0]
      if (hit) {
        let o = hit.object
        while (o && o.userData.index === undefined) o = o.parent
        if (o) setActive(o.userData.index, { notify: true })
        return
      }
      goTo(Math.round(state.angle))
      return
    }
    const target = Math.round(state.angle + MathUtils.clamp(drag.v * 0.25, -2, 2))
    goTo(target)
  }
  canvas.addEventListener('pointerup', release, { signal })
  canvas.addEventListener('pointercancel', release, { signal })

  // --- boucle -----------------------------------------------------------------------
  let t = 0
  const stopLoop = addLoop(container, (dt) => {
    t += dt
    carousel.rotation.y = -state.angle * step
    const fractional = state.angle
    slots.forEach((s, i) => {
      // distance angulaire au plat de face (en nombre de crans)
      let d = i - fractional
      d = ((((d + N / 2) % N) + N) % N) - N / 2
      const focus = Math.max(0, 1 - Math.abs(d))
      s.slot.visible = Math.abs(d) < 3.2
      s.ringMat.opacity = 0.18 + focus * 0.7
      const target = focus > 0.5 && !reducedMotion.matches ? s.turntable.rotation.y + dt * 0.45 : s.turntable.rotation.y * (1 - dt * 3)
      s.turntable.rotation.y = target
      const lift = focus * 0.12 + (focus > 0.5 ? Math.sin(t * 1.4) * 0.03 : 0)
      s.turntable.position.y = 0.2 + lift
      const sc = 0.82 + focus * 0.18
      s.turntable.scale.setScalar(sc)
    })
    floorGlow.material.opacity = 0.35 + Math.sin(t * 1.6) * 0.05
    renderer.render(scene, camera)
  })

  return {
    setActive,
    next: () => goTo(Math.round(state.angle) + 1),
    prev: () => goTo(Math.round(state.angle) - 1),
    /** Libère le plateau (la carte a changé de catégories : un nouveau plateau est construit). */
    destroy() {
      alive = false
      queue.length = 0
      tween?.kill()
      stopLoop()
      stopResize()
      listening.abort()
      scene.traverse((o) => {
        o.geometry?.dispose()
        for (const m of [o.material].flat()) m?.dispose()
      })
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
