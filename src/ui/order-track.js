import { SITE, waLink } from '../config.js'
import { formatDA } from '../data/menu.js'
import { api } from './api.js'
import { icons } from './icons.js'
import { esc } from './env.js'

/**
 * Suivi de la dernière commande : le restaurant la confirme (ou la refuse) depuis son
 * tableau de bord, la page interroge l'API pour afficher le statut en direct.
 */
const KEY = 'ak-last-order-v1'
const FINAL = ['confirmed', 'rejected']
const KEEP_MS = 6 * 3600 * 1000

export function readLastOrder() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || 'null')
    return o?.id && Date.now() - new Date(o.createdAt).getTime() < KEEP_MS ? o : null
  } catch {
    return null
  }
}

function persist(o) {
  try {
    localStorage.setItem(KEY, JSON.stringify(o))
  } catch {
    /* navigation privée */
  }
}

const STATES = {
  pending: {
    icon: 'clock',
    title: 'Commande envoyée !',
    pill: 'En attente de confirmation',
    text: () => "Le restaurant vérifie ta commande. Cette page se met à jour toute seule dès qu'elle est confirmée.",
  },
  confirmed: {
    icon: 'check',
    title: 'Commande confirmée !',
    pill: 'Confirmée',
    text: (o) =>
      o.mode === 'livraison'
        ? "On prépare ta commande. Le livreur t'appellera à son arrivée, prévois l'appoint si possible."
        : "On prépare ta commande. Passe la récupérer à l'heure choisie, elle sera prête.",
  },
  rejected: {
    icon: 'x',
    title: 'Commande non acceptée',
    pill: 'Refusée',
    text: () => `Le restaurant n'a pas pu accepter cette commande. Appelle-nous au ${SITE.phoneDisplay} pour trouver une solution.`,
  },
}

export function doneHTML(o) {
  if (o.channel === 'whatsapp') {
    return `<span class="done__icon">${icons.check}</span>
<p class="done__title">C'est presque fini&nbsp;!</p>
<p>WhatsApp s'est ouvert avec ton récapitulatif. Appuie sur «&nbsp;Envoyer&nbsp;» pour nous transmettre la commande.</p>
<p class="done__ref">Référence&nbsp;: <strong>${esc(o.ref)}</strong></p>
<p class="done__help">Rien ne s'est ouvert&nbsp;? <a class="text-link" href="${esc(o.waUrl)}" target="_blank" rel="noopener">Réessayer</a> ou appelle le <a class="text-link" href="tel:${SITE.phoneIntl}">${SITE.phoneDisplay}</a>.</p>
<div class="done__actions"><button class="btn btn--primary" type="button" data-new-order>Nouvelle commande</button></div>`
  }
  const st = STATES[o.status] ?? STATES.pending
  const ask = waLink(`Bonjour ${SITE.name}, à propos de ma commande ${o.ref}.`)
  return `<span class="done__icon done__icon--${o.status}">${icons[st.icon]}</span>
<p class="done__title">${st.title}</p>
<p class="done__pill done__pill--${o.status}"><span class="done__dot" aria-hidden="true"></span>${st.pill}</p>
<p class="done__text">${esc(st.text(o))}</p>
<dl class="done__meta">
  <div><dt>Référence</dt><dd>${esc(o.ref)}</dd></div>
  <div><dt>Total</dt><dd>${formatDA(o.total)}</dd></div>
</dl>
<p class="done__help">Une question&nbsp;? <a class="text-link" href="tel:${SITE.phoneIntl}">${SITE.phoneDisplay}</a> ou <a class="text-link" href="${esc(ask)}" target="_blank" rel="noopener">WhatsApp</a>.</p>
<div class="done__actions"><button class="btn btn--primary" type="button" data-new-order>${o.status === 'rejected' ? 'Revenir à la carte' : 'Nouvelle commande'}</button></div>`
}

export function initTracker({ onUpdate }) {
  let order = readLastOrder()
  let timer = 0

  const active = () => order && order.channel !== 'whatsapp' && !FINAL.includes(order.status) && Date.now() - new Date(order.createdAt).getTime() < 3 * 3600 * 1000

  async function poll() {
    timer = 0
    if (!active()) return
    if (!document.hidden) {
      const res = await api(`/orders/status?id=${encodeURIComponent(order.id)}&t=${encodeURIComponent(order.token)}`, { timeout: 8000 })
      if (res.ok && res.data.status !== order.status) {
        order = { ...order, status: res.data.status }
        persist(order)
        onUpdate(order, true)
      } else if (res.status === 404) {
        order = null
        return
      }
    }
    schedule()
  }
  const schedule = () => {
    clearTimeout(timer)
    if (active()) timer = setTimeout(poll, document.hidden ? 30000 : 6000)
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && active()) {
      clearTimeout(timer)
      poll()
    }
  })
  schedule()

  return {
    get current() {
      return order
    },
    start(o) {
      order = o
      persist(o)
      onUpdate(o, false)
      schedule()
    },
  }
}
