// Page de développement : aperçu de tous les modèles 3D et export des vignettes.
import '@fontsource/bebas-neue/latin-400.css'
import { Scene, PerspectiveCamera, Vector3, Box3, Sphere, Mesh, CircleGeometry, MeshBasicMaterial, ACESFilmicToneMapping, AgXToneMapping, NeutralToneMapping, NoToneMapping } from 'three'
import { createRenderer, studioEnvironment, addStudioLights, loadLogo, fontsReady } from '../src/three/core.js'
import { buildModel, MODEL_BUILDERS, pizzaSlice, sodaCan, tomatoSlice, basilLeaf, chili, onionRing, cheeseWedge, mushroomSlice, normalize } from '../src/three/foods.js'
import { shadowTexture } from '../src/three/textures.js'
import logoUrl from '../src/assets/logo-512.webp'

const params = new URLSearchParams(location.search)
const thumb = params.get('thumb')
const extras = { slice: pizzaSlice, can: sodaCan, tomato: tomatoSlice, basil: basilLeaf, chili, onion: onionRing, cheese: cheeseWedge, mushroom: mushroomSlice }

await fontsReady()
const logo = await loadLogo(logoUrl)
const canvas = document.getElementById('c')
const renderer = createRenderer(canvas)
const tm = params.get('tm')
if (tm) renderer.toneMapping = { aces: ACESFilmicToneMapping, agx: AgXToneMapping, neutral: NeutralToneMapping, none: NoToneMapping }[tm]
if (params.get('exp')) renderer.toneMappingExposure = Number(params.get('exp'))
const lightScale = Number(params.get('light') || 1)
const envI = Number(params.get('env') || 0.35)
if (thumb) {
  document.documentElement.classList.add('thumb')
  renderer.setPixelRatio(1)
}
const kinds = thumb ? [thumb] : [...Object.keys(MODEL_BUILDERS), ...Object.keys(extras)]
const cols = thumb ? 1 : 5
const rows = Math.ceil(kinds.length / cols)
const size = thumb ? Number(params.get('size') || 640) : 0
if (thumb) {
  canvas.style.width = canvas.style.height = `${size}px`
}
const W = thumb ? size : innerWidth
const H = thumb ? size : innerHeight
renderer.setSize(W, H, false)
renderer.setScissorTest(true)

const env = studioEnvironment(renderer)
const views = kinds.map((kind) => {
  const scene = new Scene()
  scene.environment = env
  scene.environmentIntensity = envI
  const L = addStudioLights(scene)
  for (const l of Object.values(L)) l.intensity *= lightScale
  const model = MODEL_BUILDERS[kind] ? buildModel(kind, logo) : normalize(extras[kind](), 1.4)
  scene.add(model)
  const shadow = new Mesh(new CircleGeometry(1.1, 40), new MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }))
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.002
  const foot = new Box3().setFromObject(model).getSize(new Vector3())
  shadow.scale.setScalar(Math.max(0.5, (Math.max(foot.x, foot.z) * 0.62) / 1.1))
  if (!thumb || params.get('shadow') !== '0') scene.add(shadow)
  const cam = new PerspectiveCamera(30, 1, 0.1, 50)
  const h = model.userData.height ?? 1
  const look = new Vector3(0, h * 0.45, 0)
  if (thumb) {
    // cadrage automatique : la sphère englobante tient dans l'image
    const sphere = new Box3().setFromObject(model).getBoundingSphere(new Sphere())
    const dist = (sphere.radius / Math.sin((cam.fov * Math.PI) / 360)) * 1.02
    const elev = 0.42
    cam.position.set(0, sphere.center.y + Math.sin(elev) * dist, Math.cos(elev) * dist)
    cam.lookAt(sphere.center)
  } else {
    cam.position.set(0, h * 0.45 + 2.2, 4.6)
    cam.lookAt(look)
  }
  return { kind, scene, cam, model }
})

const labels = document.getElementById('labels')
labels.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
if (!thumb) views.forEach((v) => labels.insertAdjacentHTML('beforeend', `<span>${v.kind}</span>`))

const spin = params.get('spin') !== '0'
renderer.setAnimationLoop((t) => {
  const cw = W / cols
  const ch = H / rows
  views.forEach((v, i) => {
    const x = (i % cols) * cw
    const y = H - (Math.floor(i / cols) + 1) * ch
    renderer.setViewport(x, y, cw, ch)
    renderer.setScissor(x, y, cw, ch)
    v.cam.aspect = cw / ch
    v.cam.updateProjectionMatrix()
    if (spin && !thumb) v.model.rotation.y = t * 0.0004
    renderer.render(v.scene, v.cam)
  })
  window.__ready = true
})
