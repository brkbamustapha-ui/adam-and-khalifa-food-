import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { reducedMotion, coarsePointer } from './env.js'

gsap.registerPlugin(ScrollTrigger)

/**
 * Apparition des blocs au défilement : le JavaScript ne fait qu'ajouter une classe,
 * l'animation elle-même est en CSS (voir base.css).
 */
let revealIo = null
export function initReveals() {
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    observeReveals()
    return
  }
  document.documentElement.classList.add('js-motion')
  revealIo = new IntersectionObserver(
    (entries) => {
      let i = 0
      for (const e of entries) {
        if (!e.isIntersecting) continue
        revealIo.unobserve(e.target)
        e.target.style.setProperty('--d', `${(i++ * 0.09).toFixed(2)}s`)
        e.target.classList.add('is-in')
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
  )
  observeReveals()
}

/** (Re)branche les blocs [data-reveal] d'une zone, par exemple après la mise à jour de la carte. */
export function observeReveals(root = document) {
  for (const el of root.querySelectorAll('[data-reveal]:not(.is-in)')) {
    if (revealIo) revealIo.observe(el)
    else el.classList.add('is-in')
  }
}

/**
 * Inclinaison 3D des cartes qui suit la souris, avec un reflet lumineux (variables CSS).
 * Écoute déléguée : fonctionne aussi pour les cartes ajoutées après coup.
 */
export function initTilt() {
  if (coarsePointer || reducedMotion.matches) return
  let current = null
  let raf = 0
  const reset = (el) => {
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.('[data-tilt]') ?? null
    if (current && current !== el) {
      cancelAnimationFrame(raf)
      reset(current)
    }
    current = el
    if (!el) return
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      const max = el.classList.contains('bento__cell') ? 7 : 10
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height
      el.style.setProperty('--rx', `${((0.5 - py) * max).toFixed(2)}deg`)
      el.style.setProperty('--ry', `${((px - 0.5) * max).toFixed(2)}deg`)
      el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`)
      el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`)
    })
  })
  document.documentElement.addEventListener('pointerleave', () => {
    cancelAnimationFrame(raf)
    if (current) reset(current)
    current = null
  })
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
