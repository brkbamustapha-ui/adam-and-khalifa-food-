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

export function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return Boolean(window.WebGL2RenderingContext && c.getContext('webgl2'))
  } catch {
    return false
  }
}

export function createRenderer(canvas) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  })
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
