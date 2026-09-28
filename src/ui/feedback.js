import { gsap } from 'gsap'
import { icons } from './icons.js'
import { reducedMotion } from './env.js'

let timer
export function hideToast() {
  clearTimeout(timer)
  document.querySelector('[data-toast]')?.classList.remove('is-shown')
}

/** Petite notification en bas de l'écran. */
export function toast(message) {
  const el = document.querySelector('[data-toast]')
  if (!el) return
  el.innerHTML = `${icons.check}<span></span>`
  el.querySelector('span').textContent = message
  el.classList.add('is-shown')
  clearTimeout(timer)
  timer = setTimeout(() => el.classList.remove('is-shown'), 2600)
}

function bump() {
  const btn = document.querySelector('.cart-btn')
  if (!btn) return
  btn.classList.remove('is-bumped')
  void btn.offsetWidth
  btn.classList.add('is-bumped')
}

/** Vignette du plat qui "vole" en arc jusqu'au bouton panier. */
export function flyToCart(fromEl, imgUrl) {
  const target = document.querySelector('.cart-btn')
  if (!fromEl || !target || reducedMotion.matches || !fromEl.isConnected) return bump()
  const a = fromEl.getBoundingClientRect()
  const b = target.getBoundingClientRect()
  if (!a.width) return bump()
  const el = document.createElement('div')
  el.className = 'fly'
  el.innerHTML = `<img src="${imgUrl}" alt="">`
  document.body.appendChild(el)
  const x0 = a.left + a.width / 2 - 32
  const y0 = a.top + a.height / 2 - 32
  const x1 = b.left + b.width / 2 - 32
  const y1 = b.top + b.height / 2 - 32
  gsap.set(el, { left: 0, top: 0, x: x0, y: y0, scale: 0.3 })
  gsap
    .timeline({
      onComplete: () => {
        el.remove()
        bump()
      },
    })
    .to(el, { scale: 1.15, duration: 0.25, ease: 'back.out(2)' })
    .to(el, { x: x1, duration: 0.8, ease: 'power1.inOut' }, 0.12)
    .to(el, { y: Math.min(y0, y1) - 110, duration: 0.38, ease: 'power2.out' }, 0.12)
    .to(el, { y: y1, duration: 0.42, ease: 'power2.in' }, 0.5)
    .to(el, { scale: 0.35, rotation: 160, autoAlpha: 0.3, duration: 0.3, ease: 'power1.in' }, 0.66)
}
