import { gsap } from 'gsap'
import { reducedMotion } from './env.js'
import { lockScroll, scrollToTarget } from './smooth.js'

/** Barre de navigation : fond au défilement, lien actif, menu mobile. */
export function initNav() {
  const nav = document.querySelector('[data-nav]')
  const burger = document.querySelector('[data-burger]')
  const menu = document.querySelector('[data-mobile-menu]')

  // fond flouté dès qu'on quitte le haut de page
  const sentinel = document.createElement('div')
  sentinel.setAttribute('aria-hidden', 'true')
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:48px;pointer-events:none'
  document.body.prepend(sentinel)
  new IntersectionObserver(([e]) => nav.classList.toggle('is-scrolled', !e.isIntersecting)).observe(sentinel)

  // lien de la section visible
  const links = [...document.querySelectorAll('.nav__links a')]
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean)
  const seen = new Map()
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => seen.set(e.target, e.isIntersecting ? e.intersectionRatio : 0))
      let best = null
      let ratio = 0
      seen.forEach((r, el) => {
        if (r > ratio) {
          ratio = r
          best = el
        }
      })
      links.forEach((a) => a.classList.toggle('is-active', best && a.getAttribute('href') === `#${best.id}`))
    },
    { threshold: [0, 0.15, 0.35, 0.6], rootMargin: '-20% 0px -40% 0px' },
  )
  sections.forEach((s) => io.observe(s))

  // menu mobile
  const setOpen = (open) => {
    burger.setAttribute('aria-expanded', String(open))
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu')
    nav.classList.toggle('menu-open', open)
    lockScroll(open)
    if (open) {
      menu.hidden = false
      if (!reducedMotion.matches) {
        gsap.fromTo(
          menu.querySelectorAll('nav a, .mobile-menu__foot'),
          { rotationX: -80, y: 40, autoAlpha: 0 },
          { rotationX: 0, y: 0, autoAlpha: 1, duration: 0.7, ease: 'expo.out', stagger: 0.06 },
        )
        gsap.fromTo(menu, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 })
      }
      menu.querySelector('a')?.focus({ preventScroll: true })
    } else {
      menu.hidden = true
    }
  }
  burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'))
  menu.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]')
    if (!a) return
    e.preventDefault()
    setOpen(false)
    scrollToTarget(a.getAttribute('href'))
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      setOpen(false)
      burger.focus()
    }
  })
  window.matchMedia('(min-width: 1041px)').addEventListener('change', (e) => e.matches && setOpen(false))
}
