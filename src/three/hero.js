import {
  Scene,
  PerspectiveCamera,
  Group,
  Mesh,
  Sprite,
  SpriteMaterial,
  Points,
  PointsMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  CylinderGeometry,
  CircleGeometry,
  PlaneGeometry,
  TorusGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  PointLight,
  AdditiveBlending,
  DoubleSide,
  SRGBColorSpace,
  Raycaster,
  Vector2,
  Vector3,
  MathUtils,
} from 'three'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  createRenderer,
  studioEnvironment,
  addStudioLights,
  ENV_INTENSITY,
  loadLogo,
  loadTexture,
  fontsReady,
  addLoop,
  autoResize,
  reducedMotion,
  lowPower,
  coarsePointer,
  idle,
  nextFrame,
  warmUp,
} from './core.js'
import { medallionRect } from '../ui/hero-layout.js'
import { circleTextTexture, coinBackTexture, glowTexture } from './textures.js'
import {
  normalize,
  pizzaSlice,
  friesCarton,
  sodaCan,
  tacos,
  tomatoSlice,
  basilLeaf,
  chili,
  onionRing,
  cheeseWedge,
  mushroomSlice,
} from './foods.js'

gsap.registerPlugin(ScrollTrigger)

const PI = Math.PI

/** Médaillon 3D : le logo en façade, tranche orange brillante, revers AK. */
function buildMedallion(logoTex, maxAniso) {
  const g = new Group()
  const R = 1
  const T = 0.17
  // matériaux « standard » brillants plutôt que « physical + vernis » : même rendu à cette taille,
  // shader bien plus léger à compiler (c'était l'essentiel de l'attente au chargement)
  const edge = new Mesh(
    new CylinderGeometry(R, R, T, 160, 1, true),
    new MeshStandardMaterial({ color: '#f07a12', roughness: 0.2, metalness: 0.25, envMapIntensity: 1.3 }),
  )
  edge.rotation.x = PI / 2
  g.add(edge)

  const rimMat = new MeshStandardMaterial({ color: '#fff3e2', roughness: 0.16, envMapIntensity: 1.3 })
  for (const s of [1, -1]) {
    const rim = new Mesh(new TorusGeometry(R, 0.05, 24, 180), rimMat)
    rim.position.z = (s * T) / 2
    g.add(rim)
  }

  logoTex.colorSpace = SRGBColorSpace
  logoTex.anisotropy = maxAniso
  // façade : couleurs exactes du logo (non éclairées) + vernis qui ne fait qu'ajouter les reflets
  const faceGeo = new CircleGeometry(R * 0.985, 160)
  const front = new Mesh(faceGeo, new MeshBasicMaterial({ map: logoTex, toneMapped: false }))
  front.position.z = T / 2 + 0.002
  g.add(front)
  const gloss = new Mesh(
    faceGeo,
    new MeshStandardMaterial({
      color: '#000000',
      roughness: 0.22,
      metalness: 0,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      envMapIntensity: 0.7,
    }),
  )
  gloss.position.z = T / 2 + 0.004
  g.add(gloss)

  const back = new Mesh(new CircleGeometry(R * 0.985, 160), new MeshStandardMaterial({ map: coinBackTexture(), roughness: 0.45 }))
  back.rotation.y = PI
  back.position.z = -T / 2 - 0.002
  g.add(back)
  return g
}

/** Texte circulaire qui tourne autour du médaillon, dans son plan. */
function buildRing() {
  const tex = circleTextTexture('ADAM & KHALIFA FOOD|PIZZA|TACOS|SANDWICHS|RIZ CROUSTY|ORAN')
  const ring = new Mesh(
    new PlaneGeometry(3.05, 3.05),
    new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, side: DoubleSide }),
  )
  return ring
}

/** Aliments en orbite : position relative au médaillon (en rayons). */
function itemDefs(logo) {
  return [
    { make: pizzaSlice, pos: [-1.25, 1.05, 0.7], mpos: [-1.3, 0.95, 0.7], size: 1.15, rot: [0.95, 0.5, 0.25], spin: [0.1, 0.22, 0.04] },
    { make: () => friesCarton(logo), pos: [1.45, -0.95, 0.75], mpos: [1.4, -0.7, 0.75], size: 0.95, rot: [0.12, -0.55, 0.18], spin: [0, 0.3, 0] },
    { make: sodaCan, pos: [1.4, 1.1, -0.35], mpos: [1.35, 0.95, -0.35], size: 0.82, rot: [0.25, 0, -0.38], spin: [0, 0.55, 0] },
    { make: tacos, pos: [-1.4, -0.95, 0.95], mpos: [-1.4, -0.65, 0.95], size: 1.0, rot: [0.55, 0.65, 0.1], spin: [0.08, 0.18, 0.04] },
    { make: tomatoSlice, pos: [-0.2, 1.62, 0.95], mpos: [-0.15, 1.55, 0.95], size: 0.44, rot: [1.1, 0, 0.3], spin: [0.35, 0.22, 0] },
    { make: tomatoSlice, pos: [0.55, -1.62, 1.25], size: 0.38, rot: [0.6, 0, -0.6], spin: [0.3, 0.45, 0], mobile: false },
    { make: chili, pos: [0.85, 1.6, 0.6], mpos: [0.75, 1.5, 0.6], size: 0.6, rot: [0.2, 0.3, 1.15], spin: [0.2, 0.55, 0.3] },
    { make: cheeseWedge, pos: [-0.75, -1.62, 0.6], mpos: [-1.6, 0.15, 0.4], size: 0.5, rot: [0.3, 0.9, 0.2], spin: [0.3, 0.4, 0.1] },
    { make: basilLeaf, pos: [1.85, 0.15, 0.95], size: 0.5, rot: [0.4, 0.8, 0.5], spin: [0.45, 0.3, 0.2], mobile: false },
    { make: onionRing, pos: [1.95, -0.1, -0.5], size: 0.44, rot: [1.2, 0.4, 0], spin: [0.45, 0.2, 0.3], mobile: false },
    { make: mushroomSlice, pos: [-1.2, 0.05, -0.9], size: 0.36, rot: [0.5, 0, 0.6], spin: [0.4, 0.3, 0.2], mobile: false },
  ]
}

/**
 * Le logo est déjà affiché en image au même endroit : la scène 3D se construit par petites étapes
 * (la page reste fluide), ses shaders sont compilés en arrière-plan, puis elle remplace l'image
 * en fondu et les aliments, le texte circulaire et les braises entrent en scène.
 */
export async function initHero({ section, canvas, logoUrl, logoTexUrl, onReady }) {
  const renderer = createRenderer(canvas)
  const scene = new Scene()
  await idle()
  scene.environment = studioEnvironment(renderer)
  scene.environmentIntensity = ENV_INTENSITY + 0.15
  addStudioLights(scene, { rim: 2.4 })
  const sweep = new PointLight('#fff2de', 7, 12, 2)
  scene.add(sweep)

  const camera = new PerspectiveCamera(32, 1, 0.1, 60)
  camera.position.set(0, 0, 10)

  const [logo, logoTex] = await Promise.all([loadLogo(logoUrl), loadTexture(logoTexUrl), fontsReady()])
  await idle()

  // --- composition -------------------------------------------------------
  const stage = new Group() // centre du médaillon, mis à l'échelle selon l'écran
  scene.add(stage)

  const glow = new Sprite(
    new SpriteMaterial({ map: glowTexture(), color: '#ff6a00', transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false }),
  )
  glow.scale.setScalar(5.2)
  glow.position.z = -1.2
  stage.add(glow)

  const coinPivot = new Group()
  const coin = buildMedallion(logoTex, renderer.capabilities.getMaxAnisotropy())
  coinPivot.add(coin)
  stage.add(coinPivot)

  const ring = buildRing()
  coinPivot.add(ring)
  await idle()

  // aliments construits un par un, sans bloquer la page
  const small = lowPower
  const defs = itemDefs(logo).filter((d) => !(small && d.mobile === false))
  const items = []
  for (const [i, d] of defs.entries()) {
    const obj = normalize(d.make(), d.size)
    const inner = new Group()
    inner.add(obj)
    obj.position.y -= obj.userData.height / 2
    inner.rotation.set(...d.rot)
    const holder = new Group()
    holder.add(inner)
    holder.position.set(...d.pos)
    holder.scale.setScalar(0.001)
    stage.add(holder)
    items.push({ ...d, holder, inner, phase: i * 1.37, base: holder.position.clone(), mbase: new Vector3(...(d.mpos ?? d.pos)) })
    if (i % 2 === 1) await idle()
  }

  // braises lumineuses qui montent
  const EMBERS = small ? 40 : 90
  const ePos = new Float32Array(EMBERS * 3)
  const eSpeed = new Float32Array(EMBERS)
  for (let i = 0; i < EMBERS; i++) {
    ePos[i * 3] = (Math.random() - 0.5) * 7
    ePos[i * 3 + 1] = (Math.random() - 0.5) * 5
    ePos[i * 3 + 2] = (Math.random() - 0.5) * 3
    eSpeed[i] = 0.12 + Math.random() * 0.35
  }
  const eGeo = new BufferGeometry()
  eGeo.setAttribute('position', new Float32BufferAttribute(ePos, 3))
  const embers = new Points(
    eGeo,
    new PointsMaterial({
      map: glowTexture(),
      color: '#ff8a2a',
      size: 0.09,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  )
  stage.add(embers)

  // shaders prêts (sans figer la page) avant la première image
  await warmUp(renderer, scene, camera)

  // --- mise en page responsive : exactement la place du logo affiché en image ------------------
  const layout = { portrait: false }
  autoResize(section, renderer, camera, (w, h) => {
    const k = (2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.position.z) / h // unités 3D par pixel
    const r = medallionRect(w, h)
    layout.portrait = r.portrait
    stage.scale.setScalar((r.d * k) / 2)
    stage.position.set((r.x - w / 2) * k, (h / 2 - r.y) * k, 0)
    layout.baseY = stage.position.y
    renderer.render(scene, camera)
  })

  // --- interactions ---------------------------------------------------------
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
  const onPointer = (e) => {
    const rect = section.getBoundingClientRect()
    pointer.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.ty = ((e.clientY - rect.top) / rect.height) * 2 - 1
  }
  if (!coarsePointer) section.addEventListener('pointermove', onPointer, { passive: true })
  const onTilt = (e) => {
    if (e.gamma == null) return
    pointer.tx = MathUtils.clamp(e.gamma / 30, -1, 1)
    pointer.ty = MathUtils.clamp((e.beta - 45) / 30, -1, 1)
  }
  if (coarsePointer && typeof DeviceOrientationEvent !== 'undefined' && !DeviceOrientationEvent.requestPermission) {
    window.addEventListener('deviceorientation', onTilt, { passive: true })
  }

  // un clic sur le médaillon le fait tourner
  const raycaster = new Raycaster()
  const ndc = new Vector2()
  const spin = { y: 0 }
  let spinning = false
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    if (!spinning && raycaster.intersectObject(coin, true).length) {
      spinning = true
      gsap.to(spin, { y: spin.y + PI * 2, duration: 1.4, ease: 'power3.inOut', onComplete: () => (spinning = false) })
    }
  })

  // progression du scroll dans le héros
  const scroll = { p: 0 }
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom top',
    scrub: 0.6,
    onUpdate: (self) => (scroll.p = self.progress),
  })

  // --- animation d'entrée -----------------------------------------------------
  // le médaillon est déjà à l'écran (image) : il apparaît de face, à sa taille, puis s'anime
  const intro = { coin: 1, items: 0, ring: 0 }
  const still = reducedMotion.matches
  if (still) intro.items = intro.ring = 1

  // --- boucle --------------------------------------------------------------------
  let t = 0
  addLoop(section, (dt) => {
    t += still ? 0 : dt
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3)
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3)
    const p = scroll.p

    // médaillon : l'inclinaison suit le pointeur, la pièce tourne sur elle-même
    const s = Math.max(0.001, intro.coin)
    coinPivot.scale.setScalar(s)
    coinPivot.rotation.y = pointer.x * 0.4 + Math.sin(t * 0.6) * 0.06
    coinPivot.rotation.x = pointer.y * 0.26 + Math.sin(t * 0.8) * 0.03 - p * 0.3
    coinPivot.position.y = Math.sin(t * 1.1) * 0.05 + p * 0.9
    coin.rotation.y = (1 - intro.coin) * -PI * 2.6 + spin.y + p * PI * 0.8
    ring.rotation.z = -t * 0.18 - p * 1.5
    ring.scale.setScalar(0.8 + intro.ring * 0.2)
    ring.material.opacity = intro.ring
    glow.material.opacity = 0.5 * intro.coin * (1 - p * 0.6)

    // aliments
    for (const it of items) {
      const k = MathUtils.clamp(intro.items * 1.15 - (it.phase % 1) * 0.15, 0, 1)
      const spread = 1 + p * 0.7
      const base = layout.portrait ? it.mbase : it.base
      it.holder.visible = !(layout.portrait && it.mobile === false)
      it.holder.position.set(
        base.x * k * spread + pointer.x * base.z * 0.18,
        base.y * k * spread - pointer.y * base.z * 0.14 + Math.sin(t * 0.9 + it.phase) * 0.06,
        base.z,
      )
      it.holder.scale.setScalar(Math.max(0.001, k))
      it.inner.rotation.x = it.rot[0] + t * it.spin[0]
      it.inner.rotation.y = it.rot[1] + t * it.spin[1]
      it.inner.rotation.z = it.rot[2] + t * it.spin[2]
    }

    // braises
    const pos = eGeo.attributes.position
    for (let i = 0; i < EMBERS; i++) {
      let y = pos.getY(i) + eSpeed[i] * dt
      if (y > 2.6) y = -2.6
      pos.setY(i, y)
      pos.setX(i, pos.getX(i) + Math.sin(t + i) * 0.0015)
    }
    pos.needsUpdate = true
    embers.material.opacity = 0.9 * intro.ring

    // lumière qui balaie la façade (reflet sur le vernis)
    sweep.position.set(stage.position.x + Math.sin(t * 0.7) * 3, stage.position.y + 1.6, 3.2)

    stage.position.y = layout.baseY ?? 0
    renderer.render(scene, camera)
  })

  // une image complète est dessinée avant le fondu avec le logo
  await nextFrame()
  onReady?.()
  if (!still) {
    gsap
      .timeline({ delay: 0.25 })
      .to(intro, { items: 1, duration: 1.6, ease: 'back.out(1.4)' }, 0)
      .to(intro, { ring: 1, duration: 1.2, ease: 'power2.out' }, 0.2)
  }
  return { renderer }
}
