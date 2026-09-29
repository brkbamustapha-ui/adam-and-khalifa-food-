import {
  WebGLRenderer,
  PMREMGenerator,
  SRGBColorSpace,
  NeutralToneMapping,
  HemisphereLight,
  DirectionalLight,
  TextureLoader,
} from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { gsap } from 'gsap'

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
export const coarsePointer = window.matchMedia('(pointer: coarse)').matches
export const lowPower =
  (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 || window.innerWidth < 700

// ?3d dans l'adresse force la 3D même sans carte graphique (tests)
const FORCE_3D = new URLSearchParams(location.search).has('3d')

/** Rendu sans carte graphique (SwiftShader, llvmpipe…) : la 3D y serait saccadée. */
function softwareRendering(gl) {
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '')
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name)
}

let software = false
export function createRenderer(canvas) {
  if (software) throw new Error('Pas de carte graphique : les images remplacent la 3D.')
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  })
  if (!FORCE_3D && softwareRendering(renderer.getContext())) {
    renderer.dispose()
    renderer.forceContextLoss() // rend tout de suite la mémoire du contexte
    software = true
    try {
      sessionStorage.setItem('ak-3d', 'off') // pas de nouvel essai pendant la visite
    } catch {
      /* stockage indisponible */
    }
    throw new Error('Pas de carte graphique : les images remplacent la 3D.')
  }
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = NeutralToneMapping
  renderer.toneMappingExposure = 1
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2))
  renderer.setClearColor(0x000000, 0)
  return renderer
}

const envCache = new WeakMap()
/** Environnement de studio pour les reflets (PBR). */
export function studioEnvironment(renderer) {
  if (!envCache.has(renderer)) {
    const pmrem = new PMREMGenerator(renderer)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    envCache.set(renderer, env)
  }
  return envCache.get(renderer)
}

/** Éclairage chaud commun : lumière principale, contre-jour orange, ambiance. */
export const ENV_INTENSITY = 0.35

export function addStudioLights(scene, { rim = 2 } = {}) {
  const hemi = new HemisphereLight('#fff1e0', '#26160c', 0.5)
  const key = new DirectionalLight('#fff0dc', 2.3)
  key.position.set(3, 5, 4)
  const back = new DirectionalLight('#ff7a1a', rim)
  back.position.set(-4, 2.5, -3)
  const fill = new DirectionalLight('#ffd2a6', 0.32)
  fill.position.set(-3, 1, 4)
  scene.add(hemi, key, back, fill)
  return { hemi, key, back, fill }
}

let logoPromise
/** Charge l'image du logo (utilisée pour le médaillon et les emballages). */
export function loadLogo(url) {
  logoPromise ??= new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
  return logoPromise
}

export function loadTexture(url) {
  return new TextureLoader().loadAsync(url)
}

/** Laisse le navigateur respirer entre deux étapes lourdes (affichage, défilement, clics). */
export const idle = () =>
  new Promise((resolve) => (window.requestIdleCallback ? requestIdleCallback(() => resolve(), { timeout: 120 }) : setTimeout(resolve, 16)))
export const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Prépare les shaders d'une scène encore masquée, sans figer la page.
 * Si le navigateur compile en parallèle (KHR_parallel_shader_compile), compileAsync suffit.
 * Sinon, la scène est dessinée par petits groupes d'objets avec une pause entre chaque :
 * chaque compilation reste courte au lieu d'un long blocage au premier affichage.
 */
export async function warmUp(renderer, scene, camera) {
  if (renderer.extensions.has('KHR_parallel_shader_compile')) {
    await renderer.compileAsync(scene, camera)
    return
  }
  const objects = []
  scene.traverse((o) => o.material && objects.push(o))
  const saved = objects.map((o) => [o.visible, o.frustumCulled])
  objects.forEach((o) => (o.visible = false))
  for (let i = 0; i < objects.length; i += 6) {
    const batch = objects.slice(i, i + 6)
    batch.forEach((o, k) => {
      o.visible = saved[i + k][0]
      o.frustumCulled = false
    })
    renderer.render(scene, camera)
    batch.forEach((o) => (o.visible = false))
    await idle()
  }
  objects.forEach((o, k) => ([o.visible, o.frustumCulled] = saved[k]))
}

/** Attend que la police d'affichage soit prête (pour les textes dessinés en canvas). */
export async function fontsReady() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('64px "Bebas Neue"'), document.fonts.ready]),
      new Promise((r) => setTimeout(r, 1500)),
    ])
  } catch {
    /* police de secours */
  }
}

/**
 * Boucle d'animation partagée (une seule requestAnimationFrame via gsap.ticker).
 * Chaque scène n'est rendue que si son élément est visible à l'écran.
 */
export function addLoop(el, update) {
  const state = { visible: false, update }
  const io = new IntersectionObserver(
    ([entry]) => {
      state.visible = entry.isIntersecting
    },
    { rootMargin: '120px 0px' },
  )
  io.observe(el)
  const tick = (time, delta) => {
    if (!state.visible || document.hidden) return
    update(Math.min(delta / 1000, 0.05), time)
  }
  gsap.ticker.add(tick)
  return () => {
    io.disconnect()
    gsap.ticker.remove(tick)
  }
}

/** Redimensionne le renderer et la caméra en suivant la taille de l'élément. */
export function autoResize(el, renderer, camera, onResize) {
  const apply = () => {
    const w = Math.max(1, el.clientWidth)
    const h = Math.max(1, el.clientHeight)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    onResize?.(w, h)
  }
  const ro = new ResizeObserver(apply)
  ro.observe(el)
  apply()
  return () => ro.disconnect()
}
