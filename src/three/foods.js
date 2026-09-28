import {
  Group,
  Mesh,
  InstancedMesh,
  Object3D,
  Box3,
  Vector3,
  Vector2,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  DoubleSide,
  BackSide,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  LatheGeometry,
  ShapeGeometry,
  ExtrudeGeometry,
  TubeGeometry,
  PlaneGeometry,
  ConeGeometry,
  IcosahedronGeometry,
  Shape,
  CatmullRomCurve3,
  BufferAttribute,
} from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  rng,
  noiseTexture,
  crustTexture,
  pizzaTopTexture,
  grillTexture,
  flatbreadTexture,
  fillingTexture,
  riceTexture,
  crispyTexture,
  tomatoTexture,
  orangeSliceTexture,
  strawTexture,
  packagingTexture,
  canTexture,
  juiceLabelTexture,
  fruitMixTexture,
} from './textures.js'

/**
 * Modèles 3D procéduraux de la carte : chaque fonction renvoie un Group
 * posé au sol (y = 0), centré, et normalisé à une taille commune.
 */

const PI = Math.PI
const dummy = new Object3D()

// ---------------------------------------------------------------------------
// Matériaux partagés
// ---------------------------------------------------------------------------
const matCache = new Map()
function mat(key, make) {
  if (!matCache.has(key)) matCache.set(key, make())
  return matCache.get(key)
}
const std = (p) => new MeshStandardMaterial(p)

const M = {
  crust: () => mat('crust', () => std({ map: crustTexture(), roughness: 0.82, bumpMap: noiseTexture(3), bumpScale: 1.6 })),
  bread: () => mat('bread', () => std({ map: crustTexture(), color: '#f3c989', roughness: 0.7, bumpMap: noiseTexture(5), bumpScale: 1.2 })),
  pizzaTop: () => mat('pizzaTop', () => std({ map: pizzaTopTexture(false), roughness: 0.55, bumpMap: noiseTexture(8, 256, 1), bumpScale: 0.8 })),
  pepperoni: () => mat('pepperoni', () => std({ color: '#a82a1c', roughness: 0.42, bumpMap: noiseTexture(9), bumpScale: 1 })),
  olive: () => mat('olive', () => std({ color: '#231d1b', roughness: 0.25 })),
  leaf: () => mat('leaf', () => std({ color: '#2f8a3a', roughness: 0.45, side: DoubleSide })),
  mint: () => mat('mint', () => std({ color: '#46a84a', roughness: 0.45, side: DoubleSide })),
  pepper: () => mat('pepper', () => std({ color: '#3f9a2c', roughness: 0.35 })),
  cheese: () => mat('cheese', () => std({ color: '#f6c94c', roughness: 0.38 })),
  cream: () => mat('cream', () => std({ color: '#fff1d2', roughness: 0.3 })),
  spicy: () => mat('spicy', () => std({ color: '#e5531f', roughness: 0.3 })),
  chocolate: () => mat('chocolate', () => std({ color: '#43200f', roughness: 0.22 })),
  tomato: () => mat('tomato', () => std({ map: tomatoTexture(), roughness: 0.35 })),
  tomatoSkin: () => mat('tomatoSkin', () => std({ color: '#c8201b', roughness: 0.3 })),
  lettuce: () => mat('lettuce', () => std({ color: '#6cb33a', roughness: 0.5, side: DoubleSide })),
  chicken: () => mat('chicken', () => std({ color: '#c98b4e', roughness: 0.62, bumpMap: noiseTexture(12), bumpScale: 1.2 })),
  crispy: () => mat('crispy', () => std({ map: crispyTexture(), roughness: 0.7, bumpMap: noiseTexture(14, 128, 2), bumpScale: 2.4 })),
  fries: () => mat('fries', () => std({ color: '#f3c24f', roughness: 0.58, bumpMap: noiseTexture(15), bumpScale: 0.6 })),
  tortilla: () => mat('tortilla', () => std({ map: grillTexture(), roughness: 0.72, bumpMap: noiseTexture(16), bumpScale: 1 })),
  flatbread: () => mat('flatbread', () => std({ map: flatbreadTexture('wheat'), roughness: 0.75, side: DoubleSide, bumpMap: noiseTexture(17), bumpScale: 0.8 })),
  crepe: () => mat('crepe', () => std({ map: flatbreadTexture('crepe'), roughness: 0.6, bumpMap: noiseTexture(18), bumpScale: 0.7 })),
  filling: () => mat('filling', () => std({ map: fillingTexture(), roughness: 0.55 })),
  rice: () => mat('rice', () => {
    const t = riceTexture().clone()
    t.repeat.set(2, 2)
    t.needsUpdate = true
    return std({ map: t, roughness: 0.7, bumpMap: noiseTexture(19, 256, 2), bumpScale: 1.2 })
  }),
  redPaper: () => mat('redPaper', () => std({ color: '#c9241f', roughness: 0.55 })),
  paperInside: () => mat('paperInside', () => std({ color: '#f1e3cc', roughness: 0.8, side: BackSide })),
  rim: () => mat('rim', () => std({ color: '#fff4e6', roughness: 0.45 })),
  aluminium: () => mat('alu', () => std({ color: '#d9dde2', metalness: 1, roughness: 0.28 })),
  waffle: () => mat('waffle', () => std({ color: '#c9812c', roughness: 0.55, bumpMap: noiseTexture(20), bumpScale: 1.4 })),
  waffleRidge: () => mat('waffleRidge', () => std({ color: '#eaa94a', roughness: 0.48, bumpMap: noiseTexture(20), bumpScale: 1 })),
  strawberry: () => mat('strawberry', () => std({ color: '#d7263a', roughness: 0.28 })),
  banana: () => mat('banana', () => std({ color: '#f6e6ad', roughness: 0.5 })),
  kiwi: () => mat('kiwi', () => std({ color: '#7fb531', roughness: 0.35 })),
  orange: () => mat('orange', () => std({ color: '#ff9722', roughness: 0.35 })),
  grape: () => mat('grape', () => std({ color: '#5b2356', roughness: 0.2 })),
  glass: () =>
    mat('glass', () =>
      new MeshPhysicalMaterial({
        color: '#fff8f0',
        transparent: true,
        opacity: 0.14,
        roughness: 0.05,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        side: DoubleSide,
        depthWrite: false,
      }),
    ),
  juice: () => mat('juice', () => std({ color: '#ff7f0a', roughness: 0.15, emissive: '#ff4d00', emissiveIntensity: 0.28 })),
  ice: () =>
    mat('ice', () =>
      new MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, roughness: 0.1, clearcoat: 1, depthWrite: false }),
    ),
  onion: () => mat('onion', () => std({ color: '#a8457c', roughness: 0.35 })),
  onionIn: () => mat('onionIn', () => std({ color: '#f4e4ef', roughness: 0.4 })),
  chili: () => mat('chili', () => std({ color: '#d4231c', roughness: 0.22 })),
  stem: () => mat('stem', () => std({ color: '#3d7a25', roughness: 0.5 })),
  mushroom: () => mat('mushroom', () => std({ color: '#e9d8bd', roughness: 0.6 })),
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------
function instanced(geo, material, n, place) {
  const m = new InstancedMesh(geo, material, n)
  for (let i = 0; i < n; i++) {
    dummy.position.set(0, 0, 0)
    dummy.rotation.set(0, 0, 0)
    dummy.scale.set(1, 1, 1)
    place(dummy, i)
    dummy.updateMatrix()
    m.setMatrixAt(i, dummy.matrix)
  }
  m.instanceMatrix.needsUpdate = true
  m.computeBoundingBox()
  m.computeBoundingSphere()
  return m
}

function scatterDisc(r, n, radius, minDist, avoid = []) {
  const pts = []
  let tries = 0
  while (pts.length < n && tries++ < n * 80) {
    const a = r() * PI * 2
    const d = Math.sqrt(r()) * radius
    const x = Math.cos(a) * d
    const z = Math.sin(a) * d
    const ok = [...pts, ...avoid].every((p) => (p[0] - x) ** 2 + (p[1] - z) ** 2 > minDist * minDist)
    if (ok) pts.push([x, z])
  }
  return pts
}

/** Déforme légèrement une géométrie pour un aspect organique (sans fissures). */
function lumpy(geo, r, amount = 0.2) {
  geo.deleteAttribute('normal')
  geo.deleteAttribute('uv')
  const g = mergeVertices(geo)
  const p = g.attributes.position
  const uv = new Float32Array(p.count * 2)
  const v = new Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const len = v.length() || 1
    uv[i * 2] = Math.atan2(v.z, v.x) / (2 * PI) + 0.5
    uv[i * 2 + 1] = Math.asin(Math.max(-1, Math.min(1, v.y / len))) / PI + 0.5
    v.multiplyScalar(1 + (r() - 0.5) * amount)
    p.setXYZ(i, v.x, v.y, v.z)
  }
  g.setAttribute('uv', new BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}

function leafGeometry(len = 0.32, width = 0.15, curl = 0.05) {
  const s = new Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(width * 1.15, len * 0.3, width * 0.55, len * 0.86, 0, len)
  s.bezierCurveTo(-width * 0.55, len * 0.86, -width * 1.15, len * 0.3, 0, 0)
  const g = new ShapeGeometry(s, 12)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    p.setZ(i, (Math.abs(x) / width) * curl + Math.sin((y / len) * PI) * curl * 0.8)
  }
  g.translate(0, -len / 2, 0)
  g.rotateX(-PI / 2)
  g.computeVertexNormals()
  return g
}

function drizzle(points, radius, material, segments = 120) {
  const curve = new CatmullRomCurve3(points)
  return new Mesh(new TubeGeometry(curve, segments, radius, 8, false), material)
}

/** Zigzag de sauce posé sur une surface décrite par heightAt(x, z). */
function zigzag(r, { width, depth, rows = 6, heightAt, lift = 0.02, angle = 0 }) {
  const pts = []
  const ca = Math.cos(angle)
  const sa = Math.sin(angle)
  for (let i = 0; i <= rows; i++) {
    const t = i / rows
    const u = -width / 2 + t * width
    for (const side of i % 2 ? [-1, 1] : [1, -1]) {
      const w = side * depth * (0.42 + r() * 0.08)
      const x = u * ca - w * sa
      const z = u * sa + w * ca
      pts.push(new Vector3(x, heightAt(x, z) + lift, z))
    }
  }
  return pts
}

/** Place le modèle au sol, centré, et à une taille commune. */
export function normalize(model, size = 1.6) {
  model.updateMatrixWorld(true)
  const box = new Box3().setFromObject(model)
  const dim = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  const s = size / Math.max(dim.x, dim.y, dim.z)
  const wrap = new Group()
  model.position.sub(new Vector3(center.x, box.min.y, center.z))
  wrap.add(model)
  wrap.scale.setScalar(s)
  wrap.userData.height = dim.y * s
  return wrap
}

// ---------------------------------------------------------------------------
// Pizza entière
// ---------------------------------------------------------------------------
export function pizza(seed = 7) {
  const r = rng(seed)
  const g = new Group()
  const R = 1
  const base = new Mesh(new CylinderGeometry(R, R * 0.97, 0.08, 96), [M.crust(), M.pizzaTop(), M.crust()])
  base.position.y = 0.04
  g.add(base)

  const crust = new Mesh(new TorusGeometry(R * 0.96, 0.09, 18, 128), M.crust())
  crust.rotation.x = PI / 2
  crust.scale.z = 0.85
  crust.position.y = 0.085
  g.add(crust)

  const pep = scatterDisc(r, 10, 0.74, 0.3)
  g.add(
    instanced(new CylinderGeometry(0.125, 0.125, 0.022, 28), M.pepperoni(), pep.length, (d, i) => {
      d.position.set(pep[i][0], 0.094, pep[i][1])
      d.rotation.set((r() - 0.5) * 0.12, 0, (r() - 0.5) * 0.12)
    }),
  )
  const olives = scatterDisc(r, 9, 0.8, 0.16)
  g.add(
    instanced(new TorusGeometry(0.042, 0.02, 8, 18), M.olive(), olives.length, (d, i) => {
      d.position.set(olives[i][0], 0.1, olives[i][1])
      d.rotation.set(PI / 2 + (r() - 0.5) * 0.3, 0, 0)
    }),
  )
  const peppers = scatterDisc(r, 6, 0.75, 0.2)
  g.add(
    instanced(new TorusGeometry(0.08, 0.016, 6, 14, PI * 1.3), M.pepper(), peppers.length, (d, i) => {
      d.position.set(peppers[i][0], 0.1, peppers[i][1])
      d.rotation.set(PI / 2, 0, r() * PI * 2)
    }),
  )
  const leaves = scatterDisc(r, 4, 0.55, 0.3)
  g.add(
    instanced(leafGeometry(0.26, 0.12, 0.04), M.leaf(), leaves.length, (d, i) => {
      d.position.set(leaves[i][0], 0.115, leaves[i][1])
      d.rotation.y = r() * PI * 2
    }),
  )
  return g
}

// ---------------------------------------------------------------------------
// Part de pizza avec fromage filant (héros)
// ---------------------------------------------------------------------------
export function pizzaSlice(seed = 9) {
  const r = rng(seed)
  const g = new Group()
  const R = 1
  const theta = PI / 4.4
  const shape = new Shape()
  shape.moveTo(0, 0)
  shape.lineTo(R, 0)
  shape.absarc(0, 0, R, 0, theta, false)
  shape.lineTo(0, 0)

  const body = new ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 24,
  })
  body.rotateX(-PI / 2)
  g.add(new Mesh(body, M.crust()))

  const top = new ShapeGeometry(shape, 24)
  const p = top.attributes.position
  const uv = top.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * R) + 0.5, p.getY(i) / (2 * R) + 0.5)
  top.rotateX(-PI / 2)
  const topMesh = new Mesh(top, M.pizzaTop())
  topMesh.position.y = 0.075
  g.add(topMesh)

  const arc = new Mesh(new TorusGeometry(R * 0.965, 0.085, 14, 40, theta), M.crust())
  arc.rotation.x = -PI / 2
  arc.scale.z = 0.85
  arc.position.y = 0.07
  g.add(arc)

  const inWedge = (dMin, dMax) => {
    const a = theta * (0.22 + r() * 0.56)
    const d = dMin + r() * (dMax - dMin)
    return [Math.cos(a) * d, -Math.sin(a) * d]
  }
  const pep = [inWedge(0.62, 0.72), inWedge(0.38, 0.45), inWedge(0.78, 0.84)]
  g.add(
    instanced(new CylinderGeometry(0.1, 0.1, 0.02, 24), M.pepperoni(), pep.length, (d, i) => {
      d.position.set(pep[i][0], 0.09, pep[i][1])
    }),
  )
  const ol = [inWedge(0.28, 0.35), inWedge(0.55, 0.6)]
  g.add(
    instanced(new TorusGeometry(0.036, 0.017, 8, 16), M.olive(), ol.length, (d, i) => {
      d.position.set(ol[i][0], 0.095, ol[i][1])
      d.rotation.x = PI / 2
    }),
  )
  const leaf = new Mesh(leafGeometry(0.2, 0.09, 0.03), M.leaf())
  const lp = inWedge(0.5, 0.56)
  leaf.position.set(lp[0], 0.1, lp[1])
  leaf.rotation.y = 0.8
  g.add(leaf)

  // fromage qui file depuis la pointe
  for (let k = 0; k < 2; k++) {
    const off = k * 0.05
    g.add(
      drizzle(
        [
          new Vector3(0.05 + off, 0.07, -0.01 - off * 0.3),
          new Vector3(-0.02 + off, -0.12, 0.02),
          new Vector3(-0.08 + off * 0.5, -0.32 - k * 0.08, 0.05),
        ],
        0.012 - k * 0.003,
        M.cheese(),
        24,
      ),
    )
  }
  return g
}

// ---------------------------------------------------------------------------
// Sandwich baguette
// ---------------------------------------------------------------------------
export function sandwich(seed = 13) {
  const r = rng(seed)
  const g = new Group()
  const L = 1.5

  const bottom = new Mesh(new CapsuleGeometry(0.3, L, 10, 28), M.bread())
  bottom.rotation.z = PI / 2
  bottom.scale.set(0.45, 1, 0.95)
  bottom.position.y = 0.14
  g.add(bottom)

  // garniture
  const sauce = new Mesh(new CapsuleGeometry(0.3, L * 0.98, 8, 24), M.cheese())
  sauce.rotation.z = PI / 2
  sauce.scale.set(0.12, 1, 1.02)
  sauce.position.y = 0.26
  g.add(sauce)

  const lettuceGeo = new PlaneGeometry(L + 0.35, 0.2, 60, 4)
  const lp = lettuceGeo.attributes.position
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i)
    const y = lp.getY(i)
    lp.setZ(i, Math.sin(x * 22) * 0.025 + Math.sin(x * 7 + 1) * 0.02 + (y > 0 ? 0 : 0.02))
  }
  lettuceGeo.computeVertexNormals()
  for (const side of [1, -1]) {
    const lettuce = new Mesh(lettuceGeo, M.lettuce())
    lettuce.rotation.x = side * -1.2
    lettuce.position.set(0, 0.29, side * 0.25)
    g.add(lettuce)
  }

  g.add(
    instanced(new CylinderGeometry(0.14, 0.14, 0.03, 28), [M.tomatoSkin(), M.tomato(), M.tomato()], 5, (d, i) => {
      d.position.set(-0.62 + i * 0.31, 0.32, 0.2 + (r() - 0.5) * 0.04)
      d.rotation.set(1.15 + (r() - 0.5) * 0.2, 0, (r() - 0.5) * 0.3)
    }),
  )

  g.add(
    instanced(new RoundedBoxGeometry(0.22, 0.07, 0.1, 2, 0.03), M.chicken(), 12, (d, i) => {
      d.position.set(-0.7 + (i / 11) * 1.4 + (r() - 0.5) * 0.08, 0.33 + r() * 0.03, (r() - 0.5) * 0.3)
      d.rotation.set((r() - 0.5) * 0.4, r() * PI, (r() - 0.5) * 0.3)
    }),
  )

  // pain du dessus légèrement ouvert
  const hinge = new Group()
  hinge.position.set(0, 0.34, -0.28)
  hinge.rotation.x = -0.14
  const top = new Mesh(new CapsuleGeometry(0.32, L, 10, 28), M.bread())
  top.rotation.z = PI / 2
  top.scale.set(0.58, 1, 1)
  top.position.set(0, 0.12, 0.28)
  hinge.add(top)
  // entailles de la baguette
  for (let k = 0; k < 4; k++) {
    const cut = new Mesh(new CapsuleGeometry(0.03, 0.22, 4, 8), M.crust())
    cut.rotation.set(0, 0.5, PI / 2)
    cut.position.set(-0.54 + k * 0.36, 0.3, 0.3)
    cut.scale.set(0.5, 1, 1)
    hinge.add(cut)
  }
  g.add(hinge)
  return g
}

// ---------------------------------------------------------------------------
// Tacos (coupé en deux)
// ---------------------------------------------------------------------------
export function tacos() {
  const g = new Group()
  // une moitié : la face coupée (garniture) est tournée vers la caméra (+z)
  const half = () => {
    const h = new Group()
    const body = new Mesh(new RoundedBoxGeometry(0.95, 0.36, 0.6, 5, 0.1), M.tortilla())
    h.add(body)
    const cut = new Mesh(new PlaneGeometry(0.84, 0.28), M.filling())
    cut.position.z = 0.302
    h.add(cut)
    for (let k = 0; k < 4; k++) {
      const drip = new Mesh(new SphereGeometry(0.055, 14, 10), M.cheese())
      drip.scale.set(1.4, 1, 0.45)
      drip.position.set(-0.33 + k * 0.22, -0.13 + (k % 2) * 0.03, 0.305)
      h.add(drip)
    }
    return h
  }
  const a = half()
  a.position.set(-0.28, 0.18, 0.05)
  a.rotation.y = 0.28
  g.add(a)
  const b = half()
  b.position.set(0.36, 0.34, -0.22)
  b.rotation.set(-0.42, -0.32, -0.08)
  g.add(b)
  return g
}

// ---------------------------------------------------------------------------
// Fajitas (deux wraps roulés)
// ---------------------------------------------------------------------------
export function fajitas() {
  const g = new Group()
  const roll = (len) => {
    const w = new Group()
    const tube = new Mesh(new CylinderGeometry(0.26, 0.26, len, 44, 1, true), M.flatbread())
    tube.rotation.z = PI / 2
    w.add(tube)
    const cap = new Mesh(new CircleGeometry(0.25, 44), M.filling())
    cap.rotation.y = PI / 2
    cap.position.x = len / 2 - 0.02
    w.add(cap)
    const lip = new Mesh(new TorusGeometry(0.255, 0.014, 8, 44), M.flatbread())
    lip.rotation.y = PI / 2
    lip.position.x = len / 2
    w.add(lip)
    const end = new Mesh(new SphereGeometry(0.26, 32, 16, 0, PI * 2, 0, PI / 2), M.flatbread())
    end.rotation.z = PI / 2
    end.scale.y = 0.55
    end.position.x = -len / 2
    w.add(end)
    return w
  }
  const a = roll(1.4)
  a.position.set(0, 0.26, -0.24)
  a.rotation.y = 0.18
  g.add(a)
  const b = roll(1.3)
  b.position.set(0.12, 0.26, 0.3)
  b.rotation.set(0.6, -0.12, 0)
  g.add(b)
  const c = roll(1.2)
  c.position.set(-0.02, 0.66, 0.04)
  c.rotation.set(1.2, 0.35, 0.05)
  g.add(c)
  return g
}

// ---------------------------------------------------------------------------
// Bol Riz Crousty
// ---------------------------------------------------------------------------
export function riceBowl(logo, seed = 19) {
  const r = rng(seed)
  const g = new Group()
  const H = 0.74
  const R0 = 0.52
  const R1 = 0.74
  const sideGeo = new LatheGeometry([new Vector2(R0, 0), new Vector2(R1, H)], 72)
  const outer = new Mesh(sideGeo, std({ map: packagingTexture(logo, 'bowl'), roughness: 0.5 }))
  g.add(outer)
  g.add(new Mesh(sideGeo, M.paperInside()))
  const lip = new Mesh(new TorusGeometry(R1, 0.022, 10, 72), M.rim())
  lip.rotation.x = PI / 2
  lip.position.y = H
  g.add(lip)

  const domeR = 0.72
  const domeH = 0.26
  const dome = new Mesh(new SphereGeometry(domeR, 56, 18, 0, PI * 2, 0, PI / 2), M.rice())
  dome.scale.y = domeH / domeR
  dome.position.y = H - 0.08
  g.add(dome)
  const heightAt = (x, z) => {
    const d = Math.min(1, Math.hypot(x, z) / domeR)
    return H - 0.08 + domeH * Math.sqrt(1 - d * d)
  }

  const pieces = scatterDisc(r, 26, 0.58, 0.14)
  const nugget = lumpy(new IcosahedronGeometry(0.085, 1), r, 0.35)
  g.add(
    instanced(nugget, M.crispy(), pieces.length, (d, i) => {
      const [x, z] = pieces[i]
      d.position.set(x, heightAt(x, z) + 0.03, z)
      d.rotation.set(r() * PI, r() * PI, r() * PI)
      d.scale.set(1.2, 0.8, 1)
    }),
  )
  g.add(drizzle(zigzag(r, { width: 1.0, depth: 1.0, rows: 7, heightAt, lift: 0.07, angle: 0.3 }), 0.018, M.cream()))
  g.add(drizzle(zigzag(r, { width: 0.9, depth: 0.9, rows: 5, heightAt, lift: 0.09, angle: -0.9 }), 0.014, M.spicy()))
  const greens = scatterDisc(r, 18, 0.55, 0.08)
  g.add(
    instanced(new TorusGeometry(0.025, 0.009, 6, 12), M.pepper(), greens.length, (d, i) => {
      const [x, z] = greens[i]
      d.position.set(x, heightAt(x, z) + 0.1, z)
      d.rotation.set(PI / 2 + (r() - 0.5), 0, 0)
    }),
  )
  return g
}

// ---------------------------------------------------------------------------
// Box frites / poulet / fromage
// ---------------------------------------------------------------------------
export function chickenBox(logo, seed = 23) {
  const r = rng(seed)
  const g = new Group()
  const H = 0.78
  const rt = 0.62
  const rb = 0.5
  const geo = new CylinderGeometry(rt, rb, H, 4, 1, true)
  geo.rotateY(PI / 4)
  geo.translate(0, H / 2, 0)
  g.add(new Mesh(geo, std({ map: packagingTexture(logo, 'box'), roughness: 0.55 })))
  g.add(new Mesh(geo, M.paperInside()))

  const half = rt * Math.SQRT1_2
  for (let k = 0; k < 4; k++) {
    const pivot = new Group()
    const a = (k * PI) / 2
    pivot.position.set(Math.sin(a) * half, H, Math.cos(a) * half)
    pivot.rotation.y = a
    const flap = new Mesh(new BoxGeometry(half * 2, 0.22, 0.012), M.redPaper())
    flap.position.y = 0.11
    const hinge = new Group()
    hinge.rotation.x = 0.55 + (k % 2) * 0.15
    hinge.add(flap)
    pivot.add(hinge)
    g.add(pivot)
  }

  const inner = half - 0.08
  g.add(
    instanced(new BoxGeometry(0.052, 0.6, 0.052), M.fries(), 34, (d) => {
      d.position.set((r() - 0.5) * 2 * inner, H - 0.14 + r() * 0.14, (r() - 0.5) * 2 * inner)
      d.rotation.set((r() - 0.5) * 0.7, r() * PI, (r() - 0.5) * 0.7)
    }),
  )
  const nug = lumpy(new IcosahedronGeometry(0.1, 1), r, 0.3)
  const nPts = scatterDisc(r, 9, inner * 0.9, 0.16)
  g.add(
    instanced(nug, M.crispy(), nPts.length, (d, i) => {
      d.position.set(nPts[i][0], H + 0.1 + r() * 0.06, nPts[i][1])
      d.rotation.set(r() * PI, r() * PI, r() * PI)
      d.scale.set(1.25, 0.85, 1)
    }),
  )
  g.add(
    drizzle(zigzag(r, { width: inner * 2, depth: inner * 2, rows: 6, heightAt: () => H + 0.16, angle: 0.5 }), 0.02, M.cheese()),
  )
  return g
}

// ---------------------------------------------------------------------------
// Cornet de frites
// ---------------------------------------------------------------------------
export function friesCarton(logo, seed = 29) {
  const r = rng(seed)
  const g = new Group()
  const H = 0.95
  const geo = new CylinderGeometry(0.5, 0.36, H, 56, 8, true)
  geo.rotateY(-PI / 2)
  geo.scale(1, 1, 0.56)
  const p = geo.attributes.position
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i)
    const t = (y + H / 2) / H
    const x = p.getX(i)
    const dip = 0.16 * Math.max(0, 1 - (Math.abs(x) / 0.46) ** 2)
    p.setY(i, y - dip * t * t)
  }
  geo.computeVertexNormals()
  geo.translate(0, H / 2, 0)
  g.add(new Mesh(geo, std({ map: packagingTexture(logo, 'fries'), roughness: 0.5 })))
  g.add(new Mesh(geo, M.paperInside()))

  g.add(
    instanced(new BoxGeometry(0.056, 0.72, 0.056), M.fries(), 38, (d) => {
      const x = (r() - 0.5) * 0.74
      const z = (r() - 0.5) * 0.3
      d.position.set(x, H + 0.02 + r() * 0.2, z)
      d.rotation.set((r() - 0.5) * 0.35, r() * PI, x * 0.6 + (r() - 0.5) * 0.25)
    }),
  )
  return g
}

// ---------------------------------------------------------------------------
// Canette
// ---------------------------------------------------------------------------
export function sodaCan() {
  const g = new Group()
  const body = new Mesh(
    new CylinderGeometry(0.3, 0.3, 0.86, 56, 1, true),
    std({ map: canTexture(), metalness: 0.55, roughness: 0.28 }),
  )
  body.position.y = 0.5
  g.add(body)
  const top = new Mesh(new CylinderGeometry(0.25, 0.3, 0.07, 56), M.aluminium())
  top.position.y = 0.965
  g.add(top)
  const bottom = new Mesh(new CylinderGeometry(0.3, 0.24, 0.07, 56), M.aluminium())
  bottom.position.y = 0.035
  g.add(bottom)
  const lid = new Mesh(new TorusGeometry(0.25, 0.016, 8, 56), M.aluminium())
  lid.rotation.x = PI / 2
  lid.position.y = 1.0
  g.add(lid)
  const tab = new Mesh(new RoundedBoxGeometry(0.12, 0.012, 0.2, 2, 0.005), M.aluminium())
  tab.position.set(0, 1.0, 0.04)
  g.add(tab)
  return g
}

// ---------------------------------------------------------------------------
// Gobelet de jus AK Juice
// ---------------------------------------------------------------------------
export function juiceCup() {
  const g = new Group()
  const H = 1.25
  const cup = new LatheGeometry([new Vector2(0.34, 0), new Vector2(0.47, H)], 56)
  g.add(new Mesh(cup, M.glass()))
  const rim = new Mesh(new TorusGeometry(0.47, 0.014, 8, 56), M.glass())
  rim.rotation.x = PI / 2
  rim.position.y = H
  g.add(rim)

  const juice = new Mesh(new CylinderGeometry(0.445, 0.33, 1.02, 56), M.juice())
  juice.position.y = 0.52
  g.add(juice)

  const label = new Mesh(
    new CylinderGeometry(0.43, 0.4, 0.44, 32, 1, true, -0.55, 1.1),
    std({ map: juiceLabelTexture(), transparent: true, roughness: 0.4, alphaTest: 0.05 }),
  )
  label.position.y = 0.55
  g.add(label)

  const straw = drizzle(
    [new Vector3(0.08, 0.3, 0.02), new Vector3(0.12, 1.1, 0.03), new Vector3(0.18, 1.42, 0.04), new Vector3(0.42, 1.62, 0.06)],
    0.034,
    std({ map: strawTexture(), roughness: 0.35 }),
    40,
  )
  g.add(straw)

  const r = rng(51)
  g.add(
    instanced(new RoundedBoxGeometry(0.17, 0.17, 0.17, 2, 0.03), M.ice(), 3, (d, i) => {
      d.position.set(-0.16 + i * 0.13, 1.0 + (i % 2) * 0.04, -0.08 + (i % 2) * 0.12)
      d.rotation.set(r(), r(), r())
    }),
  )

  // tranche d'orange sur le bord
  const slice = new Group()
  const disc = new Mesh(new CylinderGeometry(0.3, 0.3, 0.05, 40, 1, false, 0, PI), [
    M.orange(),
    std({ map: orangeSliceTexture(), roughness: 0.35 }),
    std({ map: orangeSliceTexture(), roughness: 0.35 }),
  ])
  disc.rotation.x = PI / 2
  slice.add(disc)
  slice.position.set(-0.44, H - 0.02, 0.05)
  slice.rotation.set(0, 0.3, PI / 2 - 0.2)
  g.add(slice)
  return g
}

// ---------------------------------------------------------------------------
// Salade de fruits
// ---------------------------------------------------------------------------
export function fruitSalad(seed = 37) {
  const r = rng(seed)
  const g = new Group()
  const R = 0.72
  const bowl = new Mesh(new SphereGeometry(R, 56, 24, 0, PI * 2, PI / 2, PI / 2), M.glass())
  bowl.scale.y = 0.78
  bowl.position.y = R * 0.78 + 0.06
  g.add(bowl)
  const foot = new Mesh(new CylinderGeometry(0.22, 0.3, 0.07, 40), M.glass())
  foot.position.y = 0.035
  g.add(foot)

  const top = bowl.position.y
  const heightAt = (x, z) => top + 0.14 * Math.max(0, 1 - (x * x + z * z) / (R * R * 0.7))
  const place = (n, radius) => scatterDisc(r, n, radius, 0.13)
  const put = (geo, material, n, radius, extra) => {
    const pts = place(n, radius)
    g.add(
      instanced(geo, material, pts.length, (d, i) => {
        const [x, z] = pts[i]
        d.position.set(x, heightAt(x, z) - r() * 0.05, z)
        d.rotation.set(r() * PI, r() * PI, r() * PI)
        extra?.(d)
      }),
    )
  }
  put(new ConeGeometry(0.075, 0.16, 12), M.strawberry(), 7, 0.55)
  put(new CylinderGeometry(0.085, 0.085, 0.035, 20), M.kiwi(), 6, 0.55)
  put(new CylinderGeometry(0.075, 0.075, 0.045, 20), M.banana(), 7, 0.55)
  put(new RoundedBoxGeometry(0.12, 0.1, 0.1, 2, 0.02), M.orange(), 7, 0.55)
  put(new SphereGeometry(0.058, 16, 12), M.grape(), 7, 0.55)
  // masse de fruits visible à travers le verre
  const fillMat = std({ map: fruitMixTexture(), roughness: 0.4 })
  const fill = new Mesh(new SphereGeometry(R * 0.93, 48, 20, 0, PI * 2, PI / 2, PI / 2), fillMat)
  fill.scale.y = 0.78
  fill.position.y = top
  g.add(fill)
  const cap = new Mesh(new CircleGeometry(R * 0.93, 48), fillMat)
  cap.rotation.x = -PI / 2
  cap.position.y = top - 0.005
  g.add(cap)
  for (let k = 0; k < 2; k++) {
    const leaf = new Mesh(leafGeometry(0.2, 0.1, 0.04), M.mint())
    leaf.position.set(-0.05 + k * 0.1, top + 0.2, 0.02)
    leaf.rotation.set(0.3, k * 2.2, 0)
    g.add(leaf)
  }
  return g
}

// ---------------------------------------------------------------------------
// Gaufres
// ---------------------------------------------------------------------------
export function waffle(seed = 41) {
  const r = rng(seed)
  const g = new Group()
  const W = 1.25
  const D = 0.92
  const T = 0.12
  const one = (y, rot) => {
    const w = new Group()
    w.add(new Mesh(new RoundedBoxGeometry(W, T, D, 3, 0.035), M.waffle()))
    const nx = 7
    const nz = 5
    const ridges = []
    for (let i = 0; i <= nx; i++) ridges.push(['z', -W / 2 + 0.04 + (i / nx) * (W - 0.08)])
    for (let j = 0; j <= nz; j++) ridges.push(['x', -D / 2 + 0.04 + (j / nz) * (D - 0.08)])
    w.add(
      instanced(new BoxGeometry(1, 1, 1), M.waffleRidge(), ridges.length, (d, i) => {
        const [axis, v] = ridges[i]
        if (axis === 'z') {
          d.position.set(v, T / 2 + 0.03, 0)
          d.scale.set(0.035, 0.06, D - 0.05)
        } else {
          d.position.set(0, T / 2 + 0.03, v)
          d.scale.set(W - 0.05, 0.06, 0.035)
        }
      }),
    )
    w.position.y = y
    w.rotation.y = rot
    return w
  }
  g.add(one(T / 2, 0.25))
  const topW = one(T / 2 + T + 0.07, -0.08)
  g.add(topW)
  const topY = T / 2 + T + 0.07 + T / 2 + 0.06
  for (let k = 0; k < 5; k++) {
    const pts = []
    const z0 = -D * 0.42 + k * (D * 0.21)
    for (let s2 = 0; s2 <= 12; s2++) {
      const t = s2 / 12
      const x = -W * 0.46 + t * W * 0.92
      const z = z0 + Math.sin(t * PI * 2.2 + k * 1.7) * 0.05 + (t - 0.5) * 0.18
      pts.push(new Vector3(x, topY + 0.012, z))
    }
    g.add(drizzle(pts, 0.016, M.chocolate(), 48))
  }
  g.add(
    instanced(new SphereGeometry(0.1, 16, 12), M.strawberry(), 4, (d, i) => {
      d.position.set(-0.35 + i * 0.23, topY + 0.05, (r() - 0.5) * 0.3)
      d.scale.set(0.8, 0.55, 1.05)
      d.rotation.y = r() * PI
    }),
  )
  g.add(
    instanced(new CylinderGeometry(0.08, 0.08, 0.04, 20), M.banana(), 4, (d, i) => {
      d.position.set(-0.25 + i * 0.2, topY + 0.03, 0.22 - (i % 2) * 0.44)
      d.rotation.set((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3)
    }),
  )
  return g
}

// ---------------------------------------------------------------------------
// Crêpe pliée
// ---------------------------------------------------------------------------
export function crepe(seed = 43) {
  const r = rng(seed)
  const g = new Group()
  const R = 1
  const sector = () => {
    const s = new Shape()
    s.moveTo(0, 0)
    s.lineTo(R, 0)
    s.absarc(0, 0, R, 0, PI / 2, false)
    s.lineTo(0, 0)
    return s
  }
  const layer = (y, puff, rot) => {
    const geo = new ExtrudeGeometry(sector(), {
      depth: 0.03,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.03,
      bevelSegments: 4,
      curveSegments: 40,
    })
    geo.rotateX(-PI / 2)
    const p = geo.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const z = p.getZ(i)
      const d = Math.hypot(x, z)
      p.setY(i, p.getY(i) + puff * Math.sin(Math.min(1, d / R) * PI) * (0.6 + 0.4 * Math.sin(Math.atan2(-z, x) * 2)))
    }
    geo.computeVertexNormals()
    const m = new Mesh(geo, M.crepe())
    m.position.y = y
    m.rotation.y = rot
    return m
  }
  g.add(layer(0.02, 0.05, 0))
  g.add(layer(0.08, 0.1, 0.04))
  const topAt = (x, z) => 0.2 + 0.1 * Math.sin(Math.min(1, Math.hypot(x, z) / R) * PI)
  // chocolat en lignes
  for (let k = 0; k < 4; k++) {
    const a0 = 0.18 + k * 0.33
    const pts = []
    for (let s = 0; s <= 10; s++) {
      const t = s / 10
      const d = 0.15 + t * 0.75
      const a = a0 + Math.sin(t * PI * 3 + k) * 0.08
      const x = Math.cos(a) * d
      const z = -Math.sin(a) * d
      pts.push(new Vector3(x, topAt(x, z) + 0.02, z))
    }
    g.add(drizzle(pts, 0.016, M.chocolate(), 40))
  }
  const fruits = []
  for (let k = 0; k < 4; k++) {
    const a = 0.3 + k * 0.32
    const d = 0.45 + (k % 2) * 0.2
    fruits.push([Math.cos(a) * d, -Math.sin(a) * d])
  }
  g.add(
    instanced(new CylinderGeometry(0.075, 0.075, 0.035, 20), M.banana(), 2, (d, i) => {
      const [x, z] = fruits[i * 2]
      d.position.set(x, topAt(x, z) + 0.04, z)
      d.rotation.set((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3)
    }),
  )
  g.add(
    instanced(new SphereGeometry(0.09, 16, 12), M.strawberry(), 2, (d, i) => {
      const [x, z] = fruits[i * 2 + 1]
      d.position.set(x, topAt(x, z) + 0.05, z)
      d.scale.set(0.8, 0.5, 1.05)
    }),
  )
  return g
}

// ---------------------------------------------------------------------------
// Petits éléments flottants du héros
// ---------------------------------------------------------------------------
export function tomatoSlice() {
  const m = new Mesh(new CylinderGeometry(0.22, 0.22, 0.05, 40), [M.tomatoSkin(), M.tomato(), M.tomato()])
  return new Group().add(m)
}

export function basilLeaf() {
  return new Group().add(new Mesh(leafGeometry(0.5, 0.15, 0.06), M.leaf()))
}

export function chili() {
  const g = new Group()
  const geo = new CylinderGeometry(0.07, 0.012, 0.7, 16, 16)
  const p = geo.attributes.position
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i)
    const t = (0.35 - y) / 0.7
    p.setX(i, p.getX(i) + t * t * 0.22)
  }
  geo.computeVertexNormals()
  g.add(new Mesh(geo, M.chili()))
  const stem = new Mesh(new CylinderGeometry(0.018, 0.03, 0.12, 10), M.stem())
  stem.position.y = 0.4
  stem.rotation.z = 0.3
  g.add(stem)
  const cap = new Mesh(new SphereGeometry(0.075, 16, 8, 0, PI * 2, 0, PI / 2), M.stem())
  cap.position.y = 0.34
  cap.scale.y = 0.5
  g.add(cap)
  return g
}

export function onionRing() {
  const g = new Group()
  g.add(new Mesh(new TorusGeometry(0.2, 0.035, 12, 40), M.onion()))
  const inner = new Mesh(new TorusGeometry(0.155, 0.018, 10, 40), M.onionIn())
  g.add(inner)
  return g
}

export function cheeseWedge() {
  const s = new Shape()
  s.moveTo(0, 0)
  s.lineTo(0.5, 0)
  s.lineTo(0.5, 0.26)
  s.lineTo(0, 0)
  const geo = new ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 })
  geo.center()
  const g = new Group().add(new Mesh(geo, M.cheese()))
  const r = rng(61)
  const holes = [
    [0.12, -0.08, 0.04],
    [0.19, -0.02, 0.03],
    [0.03, -0.095, 0.025],
    [0.2, 0.06, 0.022],
  ]
  for (const [x, y, rad] of holes) {
    const hole = new Mesh(new SphereGeometry(rad + r() * 0.01, 12, 8), std({ color: '#d9a72f', roughness: 0.5 }))
    hole.position.set(x, y, 0.165)
    hole.scale.z = 0.3
    g.add(hole)
  }
  return g
}

export function mushroomSlice() {
  const g = new Group()
  const cap = new Mesh(new SphereGeometry(0.16, 20, 10, 0, PI * 2, 0, PI / 2), M.mushroom())
  cap.scale.y = 0.6
  g.add(cap)
  const stem = new Mesh(new CylinderGeometry(0.05, 0.06, 0.14, 12), M.mushroom())
  stem.position.y = -0.07
  g.add(stem)
  return g
}

// ---------------------------------------------------------------------------
// Catalogue : modèle associé à chaque catégorie de la carte
// ---------------------------------------------------------------------------
export const MODEL_BUILDERS = {
  pizza: () => pizza(),
  sandwich: () => sandwich(),
  tacos: () => tacos(),
  fajitas: () => fajitas(),
  bowl: (logo) => riceBowl(logo),
  box: (logo) => chickenBox(logo),
  fries: (logo) => friesCarton(logo),
  juice: () => juiceCup(),
  fruitsalad: () => fruitSalad(),
  waffle: () => waffle(),
  crepe: () => crepe(),
}

/** Orientation de présentation de chaque modèle face à la caméra. */
export const MODEL_POSE = {
  pizza: { rx: 0.12, ry: 0, size: 1.9 },
  sandwich: { rx: 0, ry: -0.35, size: 1.9 },
  tacos: { rx: 0, ry: 0, size: 1.7 },
  fajitas: { rx: 0, ry: -0.9, size: 1.7 },
  bowl: { rx: 0, ry: 2.4, size: 1.55 },
  box: { rx: 0, ry: -1.05, size: 1.5 },
  fries: { rx: 0, ry: 0, size: 1.55 },
  juice: { rx: 0, ry: 0.4, size: 1.7 },
  fruitsalad: { rx: 0, ry: 0, size: 1.5 },
  waffle: { rx: 0.1, ry: -0.3, size: 1.7 },
  crepe: { rx: 0.1, ry: 2.3, size: 1.7 },
}

export function buildModel(kind, logo) {
  const raw = MODEL_BUILDERS[kind](logo)
  const pose = MODEL_POSE[kind] ?? { rx: 0, ry: 0, size: 1.6 }
  raw.rotation.set(pose.rx, pose.ry, 0)
  return normalize(raw, pose.size)
}
