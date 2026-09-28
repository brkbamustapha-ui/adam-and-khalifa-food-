/**
 * Outils d'interface du tableau de bord : icônes, formats (heure d'Algérie), notifications,
 * fenêtres de confirmation, tiroir latéral, son des nouvelles commandes.
 */
import set from 'virtual:icons:squares-four,receipt,chart-line-up,book-open-text,gear-six,sign-out,bell-ringing,bell-slash,magnifying-glass,check,x,clock,phone,whatsapp-logo,motorcycle,storefront,plus,trash,pencil-simple,image,upload-simple,caret-up,caret-down,caret-right,arrow-right,arrow-up-right,arrow-down-right,eye,eye-slash,download-simple,arrows-clockwise,calendar-blank,user,lock-key,warning-circle,sparkle,star,pepper,users-three,arrow-square-out,check-circle,x-circle,hourglass-medium,map-pin,wallet,shield-check,floppy-disk,arrow-counter-clockwise,sliders-horizontal,cube,coins,seal-check,chart-bar,note,fire,arrow-left,speaker-high,speaker-slash'
import { formatDA } from '../../supabase/functions/ak-api/menu-core.js'

export const icon = (name) => set[name] ?? ''
export { formatDA }

export const esc = (s = '') =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export const $ = (sel, root = document) => root.querySelector(sel)
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]

export const fmtNum = (n) => Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/ | /g, ' ')
/** Montant compact pour les axes : 12 k, 1,2 M. */
export const fmtShort = (n) => {
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`
  if (n >= 1e3) return `${(n / 1e3).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k`
  return String(Math.round(n))
}

// --- dates (heure d'Algérie, quel que soit le fuseau de l'appareil) --------------------------------------
const TZ = 'Africa/Algiers'
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
/** 'AAAA-MM-JJ' du jour (Algérie) de l'instant donné. */
export const algDay = (d = new Date()) => dayFmt.format(new Date(d))
const OFFSET_MS = (() => {
  const d = new Date()
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
      .formatToParts(d)
      .map((x) => [x.type, Number(x.value)]),
  )
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(d.getTime() / 60000) * 60000
})()
/** Minuit (Algérie) d'un jour 'AAAA-MM-JJ' décalé de `add` jours, en objet Date. */
export function dayStart(day, add = 0) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + add) - OFFSET_MS)
}
export const addDays = (day, n) => algDay(dayStart(day, n).getTime() + 3 * 3600 * 1000)

const timeFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
const dateFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })
const longFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
const fullFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' })
const monthFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'long', year: 'numeric' })
const shortDayFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })

export const fmtTime = (iso) => timeFmt.format(new Date(iso))
export const fmtDate = (iso) => dateFmt.format(new Date(iso))
export const fmtLongDate = (d = new Date()) => cap(longFmt.format(d))
export const fmtFullDate = (d) => fullFmt.format(d)
/** 'AAAA-MM' -> 'septembre 2026' */
export const fmtMonth = (ym) => cap(monthFmt.format(new Date(`${ym}-01T12:00:00Z`)))
/** 'AAAA-MM-JJ' -> 'lun. 22 sept.' */
export const fmtDay = (day) => shortDayFmt.format(new Date(`${day}T12:00:00Z`))
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export function relTime(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 50) return "à l'instant"
  if (diff < 3600) return `il y a ${Math.max(1, Math.round(diff / 60))} min`
  const today = algDay()
  const day = algDay(iso)
  if (day === today) return `aujourd'hui, ${fmtTime(iso)}`
  if (day === addDays(today, -1)) return `hier, ${fmtTime(iso)}`
  return `${fmtDate(iso)}, ${fmtTime(iso)}`
}

export const greeting = () => {
  const h = Number(new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
  return h >= 5 && h < 18 ? 'Bonjour' : 'Bonsoir'
}

export const prettyPhone = (d) => String(d ?? '').replace(/^(\d{4})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4')
export const intlPhone = (d) => `213${String(d ?? '').replace(/^0/, '')}`

export const STATUS = {
  pending: { label: 'En attente', icon: 'hourglass-medium' },
  confirmed: { label: 'Confirmée', icon: 'check-circle' },
  rejected: { label: 'Refusée', icon: 'x-circle' },
}
export const statusPill = (s) => `<span class="status status--${s}">${icon(STATUS[s]?.icon)}${STATUS[s]?.label ?? esc(s)}</span>`

/** Nombre qui défile jusqu'à sa valeur (sauf si l'utilisateur limite les animations). */
export function countUp(el, value, format = fmtNum) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const from = Number(el.dataset.value ?? 0)
  el.dataset.value = value
  if (reduce || from === value) {
    el.textContent = format(value)
    return
  }
  const t0 = performance.now()
  const dur = 900
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur)
    const e = 1 - Math.pow(1 - k, 4)
    el.textContent = format(from + (value - from) * e)
    if (k < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

// --- notifications -------------------------------------------------------------------------------------------
export function toast(message, { type = 'ok', title, action, duration = 4200 } = {}) {
  const box = $('[data-toasts]')
  const el = document.createElement('div')
  el.className = `toast toast--${type}`
  el.setAttribute('role', type === 'error' ? 'alert' : 'status')
  const ic = { ok: 'check-circle', error: 'warning-circle', order: 'bell-ringing', info: 'sparkle' }[type]
  el.innerHTML = `${icon(ic)}<div class="toast__body">${title ? `<strong>${esc(title)}</strong>` : ''}<span>${esc(message)}</span>${
    action ? `<div class="toast__action"><button class="btn btn--sm btn--ghost" type="button">${esc(action.label)}</button></div>` : ''
  }</div><button class="icon-btn icon-btn--sm" type="button" aria-label="Fermer">${icon('x')}</button>`
  const close = () => {
    el.classList.add('is-out')
    setTimeout(() => el.remove(), 300)
  }
  el.querySelector('[aria-label="Fermer"]').addEventListener('click', close)
  if (action) {
    el.querySelector('.toast__action button').addEventListener('click', () => {
      action.run()
      close()
    })
  }
  box.prepend(el)
  while (box.children.length > 4) box.lastElementChild.remove()
  if (duration) setTimeout(close, duration)
  return close
}

// --- couches : tiroir latéral et fenêtre de confirmation -------------------------------------------------------
const layers = []
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && layers.length) layers.at(-1).close()
})

function openLayer(html, { center = false, onClose } = {}) {
  const previous = document.activeElement
  const el = document.createElement('div')
  el.className = `layer${center ? ' layer--center' : ''}`
  el.innerHTML = `<div class="layer__backdrop" data-dismiss></div>${html}`
  document.body.append(el)
  document.body.style.overflow = 'hidden'
  const layer = {
    el,
    close(result) {
      if (!el.isConnected) return
      el.remove()
      layers.splice(layers.indexOf(layer), 1)
      if (!layers.length) document.body.style.overflow = ''
      previous?.focus?.({ preventScroll: true })
      onClose?.(result)
    },
  }
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-dismiss]')) layer.close()
  })
  // piège de focus simple
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return
    const f = $$('button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])', el).filter(
      (x) => x.offsetParent !== null,
    )
    if (!f.length) return
    if (e.shiftKey && document.activeElement === f[0]) {
      e.preventDefault()
      f.at(-1).focus()
    } else if (!e.shiftKey && document.activeElement === f.at(-1)) {
      e.preventDefault()
      f[0].focus()
    }
  })
  layers.push(layer)
  return layer
}

/** Tiroir latéral (plein écran en bas sur mobile). */
export function drawer({ title, body = '', foot = '', label }) {
  const layer = openLayer(`<aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(label ?? title)}">
  <header class="drawer__head"><h2 class="drawer__title">${esc(title)}</h2><button class="icon-btn" type="button" data-dismiss aria-label="Fermer">${icon('x')}</button></header>
  <div class="drawer__body">${body}</div>
  ${foot ? `<footer class="drawer__foot">${foot}</footer>` : ''}
</aside>`)
  const panel = $('.drawer', layer.el)
  setTimeout(() => ($('.drawer__body input, .drawer__body button, .drawer__foot button', panel) ?? $('[data-dismiss].icon-btn', panel))?.focus({ preventScroll: true }), 60)
  return {
    el: panel,
    close: layer.close,
    set body(html) {
      $('.drawer__body', panel).innerHTML = html
    },
    set foot(html) {
      const f = $('.drawer__foot', panel)
      if (f) f.innerHTML = html
    },
  }
}

/** Fenêtre de confirmation : renvoie une promesse (true si confirmé). */
export function confirmDialog({ title, text = '', confirm = 'Confirmer', cancel = 'Annuler', danger = false }) {
  return new Promise((resolve) => {
    const layer = openLayer(
      `<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 class="modal__title" id="modal-title">${esc(title)}</h2>
  ${text ? `<p class="modal__text">${esc(text)}</p>` : ''}
  <div class="modal__actions">
    <button class="btn btn--ghost" type="button" data-dismiss>${esc(cancel)}</button>
    <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" type="button" data-ok>${esc(confirm)}</button>
  </div>
</div>`,
      { center: true, onClose: (r) => resolve(r === true) },
    )
    const ok = $('[data-ok]', layer.el)
    ok.addEventListener('click', () => layer.close(true))
    setTimeout(() => ok.focus(), 40)
  })
}

/** Bouton occupé pendant une action asynchrone. */
export async function busy(btn, fn) {
  if (!btn || btn.classList.contains('is-busy')) return
  btn.classList.add('is-busy')
  btn.disabled = true
  try {
    return await fn()
  } finally {
    btn.classList.remove('is-busy')
    btn.disabled = false
  }
}

// --- son des nouvelles commandes (synthétisé, sans fichier) ------------------------------------------------------
let audio = null
const SOUND_KEY = 'ak-admin-sound'
export const soundOn = () => {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}
export const setSound = (on) => {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off')
  } catch {
    /* ignoré */
  }
}
export function unlockAudio() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)()
    if (audio.state === 'suspended') audio.resume()
  } catch {
    audio = null
  }
}
export function chime() {
  if (!soundOn() || !audio) return
  const t = audio.currentTime + 0.02
  ;[
    [880, 0],
    [1318.5, 0.16],
    [1760, 0.32],
  ].forEach(([f, dt]) => {
    const o = audio.createOscillator()
    const g = audio.createGain()
    o.type = 'sine'
    o.frequency.value = f
    g.gain.setValueAtTime(0.0001, t + dt)
    g.gain.exponentialRampToValueAtTime(0.28, t + dt + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.55)
    o.connect(g).connect(audio.destination)
    o.start(t + dt)
    o.stop(t + dt + 0.6)
  })
}
