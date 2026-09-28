import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { reducedMotion, coarsePointer } from './env.js'

gsap.registerPlugin(ScrollTrigger)

/**
 * Apparition des blocs au défilement : le JavaScript ne fait qu'ajouter une classe,
 * l'animation elle-même est en CSS (voir base.css).
 */
export function initReveals() {
  const els = [...document.querySelectorAll('[data-reveal]')]
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'))
    return
  }
  document.documentElement.classList.add('js-motion')
  const io = new IntersectionObserver(
    (entries) => {
      let i = 0
      for (const e of entries) {
        if (!e.isIntersecting) continue
        io.unobserve(e.target)
        e.target.style.setProperty('--d', `${(i++ * 0.09).toFixed(2)}s`)
        e.target.classList.add('is-in')
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
  )
  els.forEach((el) => io.observe(el))
}

/** Inclinaison 3D des cartes qui suit la souris, avec un reflet lumineux (variables CSS). */
export function initTilt() {
  if (coarsePointer || reducedMotion.matches) return
  for (const el of document.querySelectorAll('[data-tilt]')) {
    const max = el.classList.contains('bento__cell') ? 7 : 10
    let raf = 0
    el.addEventListener('pointermove', (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width
        const py = (e.clientY - r.top) / r.height
        el.style.setProperty('--rx', `${((0.5 - py) * max).toFixed(2)}deg`)
        el.style.setProperty('--ry', `${((px - 0.5) * max).toFixed(2)}deg`)
        el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`)
        el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`)
      })
    })
    el.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf)
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
    })
  }
}

/** Visuels AK Juice : profondeur au défilement et léger flottement. */
export function initJuiceParallax() {
  const imgs = gsap.utils.toArray('[data-juice-visual] [data-depth]')
  if (!imgs.length || reducedMotion.matches) return
  imgs.forEach((img, i) => {
    const depth = Number(img.dataset.depth)
    gsap.fromTo(
      img,
      { yPercent: depth * 18 },
      {
        yPercent: depth * -18,
        ease: 'none',
        scrollTrigger: { trigger: '[data-juice-visual]', start: 'top bottom', end: 'bottom top', scrub: true },
      },
    )
    gsap.to(img, { rotation: i % 2 ? 4 : -4, duration: 3 + i * 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1 })
  })
}
