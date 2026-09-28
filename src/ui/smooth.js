import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { reducedMotion, coarsePointer, navHeight } from './env.js'

gsap.registerPlugin(ScrollTrigger)

/** Défilement fluide (souris / pavé tactile). Le tactile garde le défilement natif. */
export let lenis = null

export function initSmoothScroll() {
  if (reducedMotion.matches || coarsePointer) return null
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    anchors: { offset: -(navHeight() + 12) },
    autoRaf: false,
  })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}

export function scrollToTarget(target, { immediate = false } = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (!el) return
  if (lenis) {
    lenis.scrollTo(el, { offset: -(navHeight() + 12), immediate })
  } else {
    const y = el.getBoundingClientRect().top + window.scrollY - navHeight() - 12
    window.scrollTo({ top: y, behavior: immediate || reducedMotion.matches ? 'auto' : 'smooth' })
  }
}

export function lockScroll(lock) {
  document.documentElement.classList.toggle('scroll-locked', lock)
  if (lenis) lock ? lenis.stop() : lenis.start()
}
