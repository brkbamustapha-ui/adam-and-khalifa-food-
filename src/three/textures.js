import { CanvasTexture, SRGBColorSpace, RepeatWrapping, NoColorSpace } from 'three'

/**
 * Textures procédurales dessinées dans un <canvas>.
 * Aucune image à télécharger : tout est généré au chargement de la page.
 */

// Générateur pseudo-aléatoire déterministe (le rendu est identique à chaque visite).
export function rng(seed = 1) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const cache = new Map()

function canvas(w, h = w) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

function toTexture(c, { color = true, repeat = false } = {}) {
  const t = new CanvasTexture(c)
  t.colorSpace = color ? SRGBColorSpace : NoColorSpace
  if (repeat) t.wrapS = t.wrapT = RepeatWrapping
  t.anisotropy = 4
  return t
}

function memo(key, make) {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key)
}

function blobs(ctx, r, { count, x0 = 0, y0 = 0, w, h, rMin, rMax, colors, alpha = [0.5, 1] }) {
  for (let i = 0; i < count; i++) {
    const x = x0 + r() * w
    const y = y0 + r() * h
    const rad = rMin + r() * (rMax - rMin)
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
    const col = colors[Math.floor(r() * colors.length)]
    const a = alpha[0] + r() * (alpha[1] - alpha[0])
    g.addColorStop(0, withAlpha(col, a))
    g.addColorStop(1, withAlpha(col, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, rad, 0, Math.PI * 2)
    ctx.fill()
  }
}

function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function speckle(ctx, r, w, h, count, colors, size = [0.6, 2.2]) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(r() * colors.length)]
    const s = size[0] + r() * (size[1] - size[0])
    ctx.beginPath()
    ctx.ellipse(r() * w, r() * h, s, s * (0.5 + r() * 0.8), r() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Bruit gris pour les bump maps (relief). */
export const noiseTexture = (seed = 3, size = 256, scale = 1) =>
  memo(`noise${seed}-${size}-${scale}`, () => {
    const [c, ctx] = canvas(size)
    const r = rng(seed)
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, size, size)
    blobs(ctx, r, { count: 260 * scale, w: size, h: size, rMin: 2, rMax: 14, colors: ['#ffffff', '#000000'], alpha: [0.08, 0.25] })
    speckle(ctx, r, size, size, 900 * scale, ['#ffffff55', '#00000055'], [0.4, 1.4])
    return toTexture(c, { color: false, repeat: true })
  })

/** Croûte dorée (pâte à pizza, pain). */
export const crustTexture = () =>
  memo('crust', () => {
    const S = 512
    const [c, ctx] = canvas(S)
    const r = rng(11)
    ctx.fillStyle = '#d9a25b'
    ctx.fillRect(0, 0, S, S)
    blobs(ctx, r, { count: 180, w: S, h: S, rMin: 10, rMax: 60, colors: ['#e9bd78', '#c98a3f', '#b87433'], alpha: [0.2, 0.55] })
    blobs(ctx, r, { count: 40, w: S, h: S, rMin: 6, rMax: 22, colors: ['#8a4d1f', '#6f3b16'], alpha: [0.25, 0.6] })
    speckle(ctx, r, S, S, 1400, ['#f3dcae', '#a86a2c', '#7a4218'])
    return toTexture(c, { repeat: true })
  })

/** Dessus de pizza : sauce, fromage fondu, zones gratinées. */
export const pizzaTopTexture = (white = false) =>
  memo(`pizzaTop${white}`, () => {
    const S = 1024
    const [c, ctx] = canvas(S)
    const r = rng(white ? 21 : 7)
    const cx = S / 2
    ctx.fillStyle = '#d9a25b'
    ctx.fillRect(0, 0, S, S)
    // sauce
    ctx.fillStyle = white ? '#f1e2bf' : '#b8321c'
    ctx.beginPath()
    ctx.arc(cx, cx, S * 0.49, 0, Math.PI * 2)
    ctx.fill()
    if (!white) blobs(ctx, r, { count: 90, w: S, h: S, rMin: 20, rMax: 70, colors: ['#9f2716', '#cc4a26'], alpha: [0.3, 0.7] })
    // fromage fondu
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cx, S * 0.46, 0, Math.PI * 2)
    ctx.clip()
    blobs(ctx, r, { count: 420, w: S, h: S, rMin: 28, rMax: 90, colors: ['#f7d774', '#f4c95a', '#fbe39a'], alpha: [0.6, 1] })
    blobs(ctx, r, { count: 70, w: S, h: S, rMin: 10, rMax: 40, colors: ['#d98d2b', '#c2741f'], alpha: [0.25, 0.55] })
    blobs(ctx, r, { count: 40, w: S, h: S, rMin: 4, rMax: 12, colors: ['#8e4b18'], alpha: [0.3, 0.6] })
    speckle(ctx, r, S, S, 500, ['#3b7d2a', '#2c6420'], [1, 3]) // origan
    ctx.restore()
    return toTexture(c)
  })

/** Tortilla grillée avec marques de grill (tacos). */
export const grillTexture = () =>
  memo('grill', () => {
    const S = 512
    const [c, ctx] = canvas(S)
    const r = rng(33)
    ctx.fillStyle = '#e2ae62'
    ctx.fillRect(0, 0, S, S)
    blobs(ctx, r, { count: 120, w: S, h: S, rMin: 10, rMax: 50, colors: ['#f0cc8c', '#c98a3e', '#b06f2a'], alpha: [0.3, 0.7] })
    ctx.save()
    ctx.translate(S / 2, S / 2)
    ctx.rotate(-0.5)
    for (let i = -6; i <= 6; i++) {
      const g = ctx.createLinearGradient(0, i * 46 - 12, 0, i * 46 + 12)
      g.addColorStop(0, 'rgba(110,55,20,0)')
      g.addColorStop(0.5, 'rgba(110,55,20,0.75)')
      g.addColorStop(1, 'rgba(110,55,20,0)')
      ctx.fillStyle = g
      ctx.fillRect(-S, i * 46 - 12, S * 2, 24)
    }
    ctx.restore()
    speckle(ctx, r, S, S, 700, ['#a0602a', '#f6e2b8', '#7c4318'])
    return toTexture(c, { repeat: true })
  })

/** Galette légèrement toastée (fajitas, crêpes). */
export const flatbreadTexture = (tone = 'wheat') =>
  memo(`flat${tone}`, () => {
    const S = 512
    const [c, ctx] = canvas(S)
    const r = rng(tone === 'crepe' ? 5 : 44)
    const base = tone === 'crepe' ? '#e7b765' : '#f0d9a6'
    ctx.fillStyle = base
    ctx.fillRect(0, 0, S, S)
    blobs(ctx, r, { count: 160, w: S, h: S, rMin: 6, rMax: 30, colors: tone === 'crepe' ? ['#c98a3c', '#b0712c', '#f0c67e'] : ['#c79a5b', '#a8733a', '#fbe9c4'], alpha: [0.25, 0.7] })
    speckle(ctx, r, S, S, 600, ['#8a5626', '#fff1d0'])
    return toTexture(c, { repeat: true })
  })

/** Coupe d'un tacos / fajitas : frites, viande, sauce fromagère. */
export const fillingTexture = () =>
  memo('filling', () => {
    const W = 512
    const H = 256
    const [c, ctx] = canvas(W, H)
    const r = rng(55)
    ctx.fillStyle = '#f4b83a'
    ctx.fillRect(0, 0, W, H)
    // frites (bâtonnets)
    for (let i = 0; i < 70; i++) {
      ctx.save()
      ctx.translate(r() * W, r() * H)
      ctx.rotate((r() - 0.5) * 0.8)
      ctx.fillStyle = r() > 0.5 ? '#ffd65a' : '#f6c342'
      ctx.fillRect(-26, -6, 52, 12)
      ctx.restore()
    }
    blobs(ctx, r, { count: 70, w: W, h: H, rMin: 10, rMax: 26, colors: ['#7a3d19', '#5e2d12', '#98501f'], alpha: [0.85, 1] })
    blobs(ctx, r, { count: 50, w: W, h: H, rMin: 8, rMax: 24, colors: ['#ffcf3a', '#ffb52a'], alpha: [0.6, 0.95] })
    blobs(ctx, r, { count: 18, w: W, h: H, rMin: 5, rMax: 12, colors: ['#3f8f2f', '#d23a2a'], alpha: [0.7, 0.95] })
    return toTexture(c)
  })

/** Riz blanc (bol Riz Crousty). */
export const riceTexture = () =>
  memo('rice', () => {
    const S = 512
    const [c, ctx] = canvas(S)
    const r = rng(66)
    ctx.fillStyle = '#e9dcc0'
    ctx.fillRect(0, 0, S, S)
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = r() > 0.5 ? '#fbf6ea' : '#f3ead6'
      ctx.beginPath()
      ctx.ellipse(r() * S, r() * S, 5 + r() * 3, 2 + r(), r() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    return toTexture(c, { repeat: true })
  })

/** Panure croustillante (poulet pané, nuggets). */
export const crispyTexture = () =>
  memo('crispy', () => {
    const S = 256
    const [c, ctx] = canvas(S)
    const r = rng(77)
    ctx.fillStyle = '#d88a33'
    ctx.fillRect(0, 0, S, S)
    blobs(ctx, r, { count: 140, w: S, h: S, rMin: 4, rMax: 16, colors: ['#f0b25a', '#b8641f', '#9c4f16'], alpha: [0.4, 0.9] })
    speckle(ctx, r, S, S, 500, ['#ffd48a', '#7a3a10'], [0.6, 1.8])
    return toTexture(c, { repeat: true })
  })

/** Tranche de tomate. */
export const tomatoTexture = () =>
  memo('tomato', () => {
    const S = 256
    const [c, ctx] = canvas(S)
    const cx = S / 2
    ctx.fillStyle = '#c8201b'
    ctx.fillRect(0, 0, S, S)
    ctx.fillStyle = '#e8412f'
    ctx.beginPath()
    ctx.arc(cx, cx, S * 0.44, 0, Math.PI * 2)
    ctx.fill()
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4
      ctx.fillStyle = '#f4a07a'
      ctx.beginPath()
      ctx.ellipse(cx + Math.cos(a) * S * 0.22, cx + Math.sin(a) * S * 0.22, S * 0.13, S * 0.08, a, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f7e2a1'
      for (let s = 0; s < 5; s++) {
        ctx.beginPath()
        ctx.ellipse(cx + Math.cos(a) * S * (0.16 + s * 0.028), cx + Math.sin(a) * S * (0.16 + s * 0.028) + (s % 2 ? 6 : -6), 4, 2.5, a, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.fillStyle = '#ef6a4a'
    ctx.beginPath()
    ctx.arc(cx, cx, S * 0.09, 0, Math.PI * 2)
    ctx.fill()
    return toTexture(c)
  })

/** Tranche d'orange (coupe). */
export const orangeSliceTexture = () =>
  memo('orangeSlice', () => {
    const S = 256
    const [c, ctx] = canvas(S)
    const cx = S / 2
    ctx.fillStyle = '#f08a12'
    ctx.fillRect(0, 0, S, S)
    ctx.fillStyle = '#fff1d6'
    ctx.beginPath()
    ctx.arc(cx, cx, S * 0.46, 0, Math.PI * 2)
    ctx.fill()
    for (let k = 0; k < 10; k++) {
      const a0 = (k / 10) * Math.PI * 2 + 0.05
      const a1 = ((k + 1) / 10) * Math.PI * 2 - 0.05
      const g = ctx.createRadialGradient(cx, cx, S * 0.04, cx, cx, S * 0.42)
      g.addColorStop(0, '#ffc15a')
      g.addColorStop(1, '#ff9a1e')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos((a0 + a1) / 2) * S * 0.04, cx + Math.sin((a0 + a1) / 2) * S * 0.04)
      ctx.arc(cx, cx, S * 0.42, a0, a1)
      ctx.closePath()
      ctx.fill()
    }
    return toTexture(c)
  })

/** Mélange de fruits coupés (vu à travers le verre). */
export const fruitMixTexture = () =>
  memo('fruitMix', () => {
    const S = 512
    const [c, ctx] = canvas(S)
    const r = rng(71)
    ctx.fillStyle = '#f6a21f'
    ctx.fillRect(0, 0, S, S)
    blobs(ctx, r, { count: 140, w: S, h: S, rMin: 14, rMax: 38, colors: ['#d7263a', '#7fb531', '#f6e6ad', '#ff9722', '#5b2356', '#ffd24a'], alpha: [0.85, 1] })
    return toTexture(c, { repeat: true })
  })

/** Paille rayée. */
export const strawTexture = () =>
  memo('straw', () => {
    const [c, ctx] = canvas(64, 256)
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : '#ff7a1a'
      ctx.fillRect(0, i * 16, 64, 16)
    }
    const t = toTexture(c, { repeat: true })
    t.repeat.set(1, 3)
    return t
  })

/** Halo lumineux radial (sprites additifs, lueurs). */
export const glowTexture = () =>
  memo('glow', () => {
    const S = 128
    const [c, ctx] = canvas(S)
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
    return toTexture(c)
  })

/** Ombre de contact douce. */
export const shadowTexture = () =>
  memo('shadow', () => {
    const S = 128
    const [c, ctx] = canvas(S)
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    g.addColorStop(0, 'rgba(0,0,0,0.75)')
    g.addColorStop(0.5, 'rgba(0,0,0,0.35)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
    return toTexture(c)
  })

const DISPLAY_FONT = '"Bebas Neue", Impact, "Arial Narrow", sans-serif'

function drawLogo(ctx, logo, x, y, size) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, size / 2 + size * 0.045, 0, Math.PI * 2)
  ctx.fillStyle = '#fff6ea'
  ctx.fill()
  if (logo) ctx.drawImage(logo, x - size / 2, y - size / 2, size, size)
  ctx.restore()
}

/**
 * Étiquette d'emballage rouge façon Adam & Khalifa
 * (bol Riz Crousty, box, cornet de frites).
 */
export const packagingTexture = (logo, variant = 'bowl') =>
  memo(`pack-${variant}`, () => {
    const W = variant === 'bowl' ? 2048 : 1024
    const H = 512
    const [c, ctx] = canvas(W, H)
    const r = rng(90)
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#e2332b')
    g.addColorStop(1, '#b81f1c')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    speckle(ctx, r, W, H, 900, ['#ffffff10', '#00000014'], [0.8, 2.4])
    ctx.fillStyle = '#fff6ea'
    ctx.textBaseline = 'middle'
    if (variant === 'bowl') {
      // deux faces : slogan + logo, répétés autour du bol
      for (let k = 0; k < 2; k++) {
        const ox = k * (W / 2)
        drawLogo(ctx, logo, ox + W * 0.37, H * 0.52, H * 0.62)
        ctx.font = `${H * 0.15}px ${DISPLAY_FONT}`
        ctx.textAlign = 'left'
        ctx.fillText('LE GOÛT DU BONHEUR,', ox + W * 0.05, H * 0.4)
        ctx.fillText('DANS UN BOL.', ox + W * 0.05, H * 0.56)
      }
      ctx.fillStyle = '#ffffffcc'
      ctx.fillRect(0, H * 0.9, W, H * 0.03)
    } else if (variant === 'box') {
      // 4 faces : logo sur les grandes faces, texte sur les côtés
      for (let k = 0; k < 4; k++) {
        const ox = k * (W / 4) + W / 8
        if (k % 2 === 0) {
          drawLogo(ctx, logo, ox, H * 0.46, H * 0.5)
        } else {
          ctx.font = `${H * 0.13}px ${DISPLAY_FONT}`
          ctx.textAlign = 'center'
          ctx.fillStyle = '#ffd24a'
          ctx.fillText('FRITES', ox, H * 0.34)
          ctx.fillText('CHICKEN', ox, H * 0.5)
          ctx.fillText('FROMAGE', ox, H * 0.66)
          ctx.fillStyle = '#fff6ea'
        }
      }
    } else {
      // cornet de frites : logo devant et derrière
      drawLogo(ctx, logo, W * 0.25, H * 0.55, H * 0.46)
      drawLogo(ctx, logo, W * 0.75, H * 0.55, H * 0.46)
      ctx.fillStyle = '#ffd24a'
      ctx.fillRect(0, H * 0.06, W, H * 0.05)
    }
    const t = toTexture(c)
    t.anisotropy = 8
    return t
  })

/** Canette générique rouge. */
export const canTexture = () =>
  memo('can', () => {
    const W = 1024
    const H = 512
    const [c, ctx] = canvas(W, H)
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#d61f26')
    g.addColorStop(1, '#a3131a')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 26
    ctx.lineCap = 'round'
    for (const off of [0, W / 2]) {
      ctx.beginPath()
      ctx.moveTo(off - 40, H * 0.72)
      ctx.bezierCurveTo(off + W * 0.12, H * 0.42, off + W * 0.3, H * 0.95, off + W * 0.54, H * 0.6)
      ctx.stroke()
    }
    ctx.fillStyle = '#ffffff'
    ctx.font = `italic ${H * 0.26}px ${DISPLAY_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SODA', W * 0.25, H * 0.4)
    ctx.fillText('SODA', W * 0.75, H * 0.4)
    return toTexture(c)
  })

/** Étiquette ronde AK Juice (gobelet). */
export const juiceLabelTexture = () =>
  memo('juiceLabel', () => {
    const W = 256
    const H = 256
    const [c, ctx] = canvas(W, H)
    ctx.clearRect(0, 0, W, H)
    const cx = W / 2
    const cy = H / 2
    ctx.fillStyle = '#fff8ec'
    ctx.beginPath()
    ctx.arc(cx, cy, H * 0.44, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#f07a12'
    ctx.lineWidth = 10
    ctx.stroke()
    ctx.fillStyle = '#f07a12'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `${H * 0.34}px ${DISPLAY_FONT}`
    ctx.fillText('AK', cx, cy - H * 0.07)
    ctx.fillStyle = '#2f7d3a'
    ctx.font = `${H * 0.17}px ${DISPLAY_FONT}`
    ctx.fillText('JUICE', cx, cy + H * 0.18)
    return toTexture(c)
  })

/** Texte circulaire autour du médaillon (fond transparent). */
export const circleTextTexture = (text) =>
  memo(`circle-${text}`, () => {
    const S = 1536
    const [c, ctx] = canvas(S)
    const cx = S / 2
    const R = S * 0.43
    const fs = S * 0.064
    ctx.font = `${fs}px ${DISPLAY_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const tokens = []
    for (const word of text.split('|')) {
      for (const ch of word) tokens.push({ ch, w: ctx.measureText(ch).width + fs * 0.07 })
      tokens.push({ sep: true, w: fs * 1.1 })
    }
    const circ = Math.PI * 2 * R
    const once = tokens.reduce((sum, t) => sum + t.w, 0)
    const seq = Array.from({ length: Math.max(1, Math.floor(circ / once)) }, () => tokens).flat()
    const scale = circ / seq.reduce((sum, t) => sum + t.w, 0)
    let a = -Math.PI / 2
    for (const t of seq) {
      const da = (t.w * scale) / R
      const mid = a + da / 2
      ctx.save()
      ctx.translate(cx + Math.cos(mid) * R, cx + Math.sin(mid) * R)
      ctx.rotate(mid + Math.PI / 2)
      if (t.sep) {
        ctx.fillStyle = '#ff7a1a'
        const k = fs * 0.16
        ctx.beginPath()
        ctx.moveTo(0, -k)
        ctx.lineTo(k, 0)
        ctx.lineTo(0, k)
        ctx.lineTo(-k, 0)
        ctx.closePath()
        ctx.fill()
      } else {
        ctx.fillStyle = '#fff4e4'
        ctx.fillText(t.ch, 0, fs * 0.04)
      }
      ctx.restore()
      a += da
    }
    const tex = toTexture(c)
    tex.anisotropy = 8
    return tex
  })

/** Revers du médaillon : monogramme AK et texte circulaire. */
export const coinBackTexture = () =>
  memo('coinBack', () => {
    const S = 1024
    const [c, ctx] = canvas(S)
    const cx = S / 2
    const g = ctx.createRadialGradient(cx, cx * 0.8, 0, cx, cx, S * 0.5)
    g.addColorStop(0, '#2a2522')
    g.addColorStop(1, '#161312')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
    ctx.strokeStyle = '#ff7a1a'
    ctx.lineWidth = 14
    ctx.beginPath()
    ctx.arc(cx, cx, S * 0.35, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#ff7a1a'
    ctx.font = `${S * 0.36}px ${DISPLAY_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('AK', cx, cx + S * 0.02)
    ctx.fillStyle = '#fff4e4'
    ctx.font = `${S * 0.06}px ${DISPLAY_FONT}`
    const label = 'ADAM & KHALIFA FOOD  •  ORAN  •  ADAM & KHALIFA FOOD  •  ORAN  •  '
    const rad = S * 0.42
    const total = label.length
    for (let i = 0; i < total; i++) {
      const a = (i / total) * Math.PI * 2 - Math.PI / 2
      ctx.save()
      ctx.translate(cx + Math.cos(a) * rad, cx + Math.sin(a) * rad)
      ctx.rotate(a + Math.PI / 2)
      ctx.fillText(label[i], 0, 0)
      ctx.restore()
    }
    return toTexture(c)
  })
