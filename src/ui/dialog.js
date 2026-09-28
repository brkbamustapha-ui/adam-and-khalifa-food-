import { lockScroll, scrollToTarget } from './smooth.js'
import { hideToast } from './feedback.js'

/**
 * Ouverture / fermeture des fenêtres (panier, personnalisation) :
 * accessible au clavier (Échap, focus conservé), reste de la page rendu inerte.
 */
const stack = []
const listeners = new Set()
export const onOverlayChange = (fn) => listeners.add(fn)
export const isOverlayOpen = () => stack.length > 0

export function openOverlay(name, { focus } = {}) {
  const el = document.querySelector(`[data-overlay="${name}"]`)
  if (!el || stack.some((s) => s.name === name)) return
  const panel = el.querySelector('[role="dialog"]')
  const previous = document.activeElement
  if (name === 'cart') hideToast()
  el.hidden = false
  void el.offsetWidth // force le recalcul pour lancer la transition
  el.classList.add('is-open')

  for (const sib of document.body.children) {
    if (sib === el || sib.matches('script, [data-toast], .grain') || sib.hasAttribute('inert')) continue
    sib.setAttribute('inert', '')
    sib.dataset.inertBy = name
  }

  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      closeOverlay(name)
    }
  }
  const onClick = (e) => {
    const closer = e.target.closest('[data-close]')
    if (!closer || !el.contains(closer)) return
    const hash = closer.tagName === 'A' ? closer.getAttribute('href') : null
    if (hash?.startsWith('#')) e.preventDefault()
    closeOverlay(name)
    if (hash?.startsWith('#')) setTimeout(() => scrollToTarget(hash), 380)
  }
  el.addEventListener('keydown', onKey)
  el.addEventListener('click', onClick)
  stack.push({ name, el, previous, onKey, onClick })
  if (stack.length === 1) lockScroll(true)
  listeners.forEach((fn) => fn())
  setTimeout(() => (focus?.() ?? panel)?.focus({ preventScroll: true }), 80)
}

export function closeOverlay(name) {
  const idx = stack.findIndex((s) => s.name === name)
  if (idx === -1) return
  const [entry] = stack.splice(idx, 1)
  const { el, previous, onKey, onClick } = entry
  el.classList.remove('is-open')
  el.removeEventListener('keydown', onKey)
  el.removeEventListener('click', onClick)
  for (const sib of document.querySelectorAll(`[data-inert-by="${name}"]`)) {
    sib.removeAttribute('inert')
    delete sib.dataset.inertBy
  }
  setTimeout(() => {
    if (!el.classList.contains('is-open')) el.hidden = true
  }, 420)
  if (!stack.length) lockScroll(false)
  if (previous && document.contains(previous)) previous.focus({ preventScroll: true })
  listeners.forEach((fn) => fn())
}
