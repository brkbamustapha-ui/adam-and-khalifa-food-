import '@fontsource/bebas-neue/latin-400.css'
import '@fontsource-variable/outfit/wght.css'
import './admin.css'

import logo from '../assets/logo-512.webp'
import { call, session, onUnauthorized } from './api.js'
import { $, $$, esc, icon, toast, chime, unlockAudio, soundOn, setSound, busy, formatDA } from './ui.js'
import dashboard from './views/dashboard.js'
import orders from './views/orders.js'
import revenue from './views/revenue.js'
import menu from './views/menu.js'
import settings from './views/settings.js'

const ROUTES = {
  '': { view: dashboard, label: 'Tableau de bord', short: 'Accueil', icon: 'squares-four' },
  commandes: { view: orders, label: 'Commandes', short: 'Commandes', icon: 'receipt', badge: true },
  recettes: { view: revenue, label: 'Recettes', short: 'Recettes', icon: 'chart-line-up' },
  carte: { view: menu, label: 'La carte', short: 'Carte', icon: 'book-open-text' },
  parametres: { view: settings, label: 'Paramètres', short: 'Compte', icon: 'gear-six' },
}
const app = $('#app')
const BASE_TITLE = 'Espace gérant | Adam & Khalifa Food'

// l'audio ne peut démarrer qu'après un geste de l'utilisateur
document.addEventListener('pointerdown', unlockAudio, { passive: true })
document.addEventListener('keydown', unlockAudio)

// ---------------------------------------------------------------------------------------------------------
// Connexion
// ---------------------------------------------------------------------------------------------------------
function showLogin(message) {
  stopPulse()
  mounted?.unmount?.()
  mounted = null
  document.title = BASE_TITLE
  app.innerHTML = `<main class="login">
  <form class="card login__card" data-login novalidate>
    <div class="login__logo"><img src="${logo}" width="96" height="96" alt="Adam & Khalifa Food"></div>
    <h1 class="login__title">Espace gérant</h1>
    <p class="login__sub">Adam & Khalifa Food, Bir El Djir</p>
    ${message ? `<p class="form-error" role="alert" style="margin-bottom:16px">${esc(message)}</p>` : ''}
    <div class="field">
      <label for="l-user">Identifiant</label>
      <div class="input-icon">${icon('user')}<input class="input" id="l-user" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>
    </div>
    <div class="field">
      <label for="l-pass">Mot de passe</label>
      <div class="input-icon">${icon('lock-key')}<input class="input" id="l-pass" name="password" type="password" autocomplete="current-password" required>
        <button class="reveal" type="button" data-reveal aria-label="Afficher le mot de passe">${icon('eye')}</button></div>
    </div>
    <div class="login__row">
      <label class="switch"><input type="checkbox" name="remember" checked><span class="switch__track"></span>Rester connecté 30 jours</label>
    </div>
    <p class="form-error" data-error role="alert" hidden></p>
    <button class="btn btn--primary btn--lg btn--block" type="submit" style="margin-top:14px">Se connecter${icon('arrow-right')}</button>
    <p class="login__foot"><a href="../">Retour au site</a></p>
  </form>
</main>`
  const form = $('[data-login]')
  const err = $('[data-error]', form)
  $('#l-user', form).focus()
  $('[data-reveal]', form).addEventListener('click', (e) => {
    const input = $('#l-pass', form)
    const show = input.type === 'password'
    input.type = show ? 'text' : 'password'
    e.currentTarget.innerHTML = icon(show ? 'eye-slash' : 'eye')
    e.currentTarget.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe')
  })
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    err.hidden = true
    const username = form.elements.username.value.trim()
    const password = form.elements.password.value
    if (!username || !password) {
      err.textContent = 'Indique ton identifiant et ton mot de passe.'
      err.hidden = false
      return
    }
    busy(form.querySelector('[type="submit"]'), async () => {
      try {
        const res = await call('/admin/login', { method: 'POST', body: { username, password, remember: form.elements.remember.checked } })
        session.save(res, form.elements.remember.checked)
        showShell()
      } catch (ex) {
        err.textContent = ex.message
        err.hidden = false
        form.elements.password.select()
      }
    })
  })
}

onUnauthorized((message) => showLogin(message || 'Session expirée, reconnecte-toi.'))

// ---------------------------------------------------------------------------------------------------------
// Coque de l'application
// ---------------------------------------------------------------------------------------------------------
const navLinks = (cls = '') =>
  Object.entries(ROUTES)
    .map(
      ([key, r]) =>
        `<a class="nav__item ${cls}" href="#/${key}" data-route="${key}">${icon(r.icon)}<span>${cls ? r.short : r.label}</span>${r.badge ? '<span class="badge" data-pending hidden></span>' : ''}</a>`,
    )
    .join('')

function showShell() {
  app.innerHTML = `<div class="shell">
  <aside class="side">
    <a class="brand" href="#/"><span class="brand__logo"><img src="${logo}" width="46" height="46" alt=""></span><span class="brand__name"><strong>Adam & Khalifa</strong><span>Espace gérant</span></span></a>
    <nav class="nav" aria-label="Menu principal">${navLinks()}</nav>
    <div class="side__foot">
      <span class="live" data-live><span class="live__dot"></span><span>En direct</span></span>
      <div class="me"><span class="me__avatar" data-avatar></span><span class="me__name" data-username></span>
        <button class="icon-btn icon-btn--sm" type="button" data-sound aria-label="Son des nouvelles commandes"></button>
        <button class="icon-btn icon-btn--sm" type="button" data-logout aria-label="Se déconnecter">${icon('sign-out')}</button></div>
    </div>
  </aside>
  <header class="topbar">
    <span class="brand__logo"><img src="${logo}" width="36" height="36" alt=""></span>
    <span class="topbar__title" data-top-title></span>
    <button class="icon-btn" type="button" data-sound aria-label="Son des nouvelles commandes"></button>
  </header>
  <main class="main" id="main"><div class="view" data-view></div></main>
  <nav class="tabbar" aria-label="Menu principal">${navLinks('tab')}</nav>
</div>`
  $$('[data-username]').forEach((el) => (el.textContent = session.username))
  $$('[data-avatar]').forEach((el) => (el.textContent = session.username.slice(0, 1)))
  $$('[data-logout]').forEach((b) =>
    b.addEventListener('click', () => {
      session.clear()
      showLogin()
    }),
  )
  const paintSound = () =>
    $$('[data-sound]').forEach((b) => {
      b.innerHTML = icon(soundOn() ? 'speaker-high' : 'speaker-slash')
      b.setAttribute('aria-pressed', String(soundOn()))
      b.title = soundOn() ? 'Son activé pour les nouvelles commandes' : 'Son coupé'
    })
  paintSound()
  $$('[data-sound]').forEach((b) =>
    b.addEventListener('click', () => {
      setSound(!soundOn())
      paintSound()
      unlockAudio()
      if (soundOn()) chime()
      toast(soundOn() ? 'Un son sera joué à chaque nouvelle commande.' : 'Son des nouvelles commandes coupé.', { type: 'info', duration: 2500 })
    }),
  )
  lastLatest = undefined
  route()
  startPulse()
}

// ---------------------------------------------------------------------------------------------------------
// Navigation (#/commandes, #/recettes…)
// ---------------------------------------------------------------------------------------------------------
let mounted = null
let currentKey = null

async function route() {
  if (!session.token) return showLogin()
  const key = location.hash.replace(/^#\/?/, '').split('?')[0]
  const r = ROUTES[key] ?? ROUTES['']
  const k = ROUTES[key] ? key : ''
  if (mounted?.canLeave && k !== currentKey && !(await mounted.canLeave())) {
    history.replaceState(null, '', `#/${currentKey}`)
    return
  }
  mounted?.unmount?.()
  currentKey = k
  $$('[data-route]').forEach((a) => (a.dataset.route === k ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')))
  const top = $('[data-top-title]')
  if (top) top.textContent = r.label
  const host = $('[data-view]')
  const fresh = host.cloneNode(false)
  host.replaceWith(fresh)
  scrollTo({ top: 0 })
  mounted = r.view.mount(fresh, { pulse, go: (hash) => (location.hash = hash), refreshPulse: pollNow }) ?? null
  paintBadges()
}
window.addEventListener('hashchange', route)
window.addEventListener('beforeunload', (e) => {
  if (mounted?.isDirty?.()) e.preventDefault()
})

// ---------------------------------------------------------------------------------------------------------
// Pouls : commandes en attente et arrivée des nouvelles commandes
// ---------------------------------------------------------------------------------------------------------
const pulse = { pending: 0, latest: null }
let lastLatest
let pulseTimer = 0
let pulseOn = false

function paintBadges() {
  $$('[data-pending]').forEach((b) => {
    b.hidden = !pulse.pending
    b.textContent = pulse.pending > 99 ? '99+' : pulse.pending
  })
  document.title = pulse.pending ? `(${pulse.pending}) ${BASE_TITLE}` : BASE_TITLE
}

async function poll() {
  pulseTimer = 0
  if (!pulseOn) return
  try {
    const p = await call('/admin/pulse', { timeout: 12000 })
    $$('[data-live]').forEach((el) => el.classList.remove('is-off'))
    const fresh = lastLatest !== undefined && p.latest && p.latest.id !== lastLatest && p.latest.status === 'pending'
    lastLatest = p.latest?.id ?? null
    const changed = p.pending !== pulse.pending
    Object.assign(pulse, p)
    paintBadges()
    if (fresh) announce(p.latest)
    if (fresh || changed) mounted?.onPulse?.(pulse, fresh)
  } catch (err) {
    if (err.status === 401) return
    $$('[data-live]').forEach((el) => el.classList.add('is-off'))
  }
  if (pulseOn) pulseTimer = setTimeout(poll, document.hidden ? 45000 : 15000)
}
function pollNow() {
  clearTimeout(pulseTimer)
  return poll()
}
function startPulse() {
  pulseOn = true
  pollNow()
}
function stopPulse() {
  pulseOn = false
  clearTimeout(pulseTimer)
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && pulseOn) pollNow()
})

function announce(order) {
  chime()
  toast(`${order.ref} · ${formatDA(order.total)}`, {
    type: 'order',
    title: 'Nouvelle commande',
    duration: 9000,
    action: currentKey === 'commandes' ? null : { label: 'Voir la commande', run: () => (location.hash = `#/commandes?id=${order.id}`) },
  })
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Nouvelle commande', { body: `${order.ref} · ${formatDA(order.total)}`, icon: '/icon-192.png', tag: order.id })
    } catch {
      /* notifications indisponibles */
    }
  }
}

// ---------------------------------------------------------------------------------------------------------
if (session.token) showShell()
else showLogin()
