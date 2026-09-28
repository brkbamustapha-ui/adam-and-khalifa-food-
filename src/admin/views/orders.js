import { call } from '../api.js'
import {
  $,
  esc,
  icon,
  formatDA,
  relTime,
  fmtTime,
  fmtDate,
  statusPill,
  prettyPhone,
  intlPhone,
  toast,
  busy,
  drawer,
  confirmDialog,
} from '../ui.js'

const FILTERS = [
  ['pending', 'En attente'],
  ['confirmed', 'Confirmées'],
  ['rejected', 'Refusées'],
  ['all', 'Toutes'],
]
const MODE_ICON = { emporter: 'storefront', livraison: 'motorcycle' }
const DONE_MSG = { confirmed: 'confirmée', rejected: 'refusée', pending: 'remise en attente' }

/** Change le statut d'une commande (utilisé aussi par le tableau de bord). Renvoie la commande ou null. */
export async function setStatus(id, status, ref = '') {
  if (status === 'rejected') {
    const ok = await confirmDialog({
      title: `Refuser la commande ${ref} ?`,
      text: 'Le client verra que sa commande n’est pas acceptée. Pense à le prévenir par téléphone ou WhatsApp.',
      confirm: 'Refuser la commande',
      danger: true,
    })
    if (!ok) return null
  }
  try {
    const { order } = await call(`/admin/orders/${id}/status`, { method: 'POST', body: { status } })
    toast(`Commande ${order.ref} ${DONE_MSG[status]}.`, {
      type: 'ok',
      action: status === 'pending' ? null : { label: 'Prévenir sur WhatsApp', run: () => window.open(waCustomer(order), '_blank', 'noopener') },
    })
    return order
  } catch (err) {
    toast(err.message, { type: 'error' })
    return null
  }
}

/** Message WhatsApp prêt à envoyer au client selon le statut. */
export function waCustomer(o) {
  const first = o.customerName.split(' ')[0]
  const text =
    o.status === 'confirmed'
      ? `Bonjour ${first}, c'est Adam & Khalifa Food. Ta commande ${o.ref} (${formatDA(o.total)}) est confirmée, on la prépare${o.mode === 'livraison' ? ' et on te la livre très vite' : ''}. Merci !`
      : o.status === 'rejected'
        ? `Bonjour ${first}, c'est Adam & Khalifa Food. Désolé, nous ne pouvons pas accepter ta commande ${o.ref} pour le moment. Appelle-nous si tu veux qu'on trouve une solution.`
        : `Bonjour ${first}, c'est Adam & Khalifa Food, à propos de ta commande ${o.ref}.`
  return `https://wa.me/${intlPhone(o.customerPhone)}?text=${encodeURIComponent(text)}`
}

const summary = (o) =>
  o.items
    .slice(0, 4)
    .map((i) => `${i.qty} x ${esc(i.name)}`)
    .join(', ') + (o.items.length > 4 ? `, +${o.items.length - 4}` : '')

function card(o, fresh = false) {
  return `<article class="card order${fresh ? ' is-new' : ''}" data-id="${o.id}" tabindex="0" aria-label="Commande ${esc(o.ref)}, ${esc(o.customerName)}, ${formatDA(o.total)}">
  <div class="order__top"><div><p class="order__ref">${esc(o.ref)}</p><p class="order__time">${esc(relTime(o.createdAt))}</p></div>${statusPill(o.status)}</div>
  <div class="order__who"><strong>${esc(o.customerName)}</strong><span class="order__phone">${esc(prettyPhone(o.customerPhone))}</span></div>
  <p class="order__mode">${icon(MODE_ICON[o.mode] ?? 'storefront')}${esc(o.modeLabel)}${o.pickupTime ? ` · ${esc(o.pickupTime)}` : ''}${o.address ? ` · ${esc(o.address)}` : ''}</p>
  <p class="order__items">${summary(o)}</p>
  <div class="order__foot"><span class="order__total">${formatDA(o.total)}</span>
    <div class="order__actions">${
      o.status === 'pending'
        ? `<button class="btn btn--sm btn--danger" type="button" data-set="rejected">${icon('x')}Refuser</button><button class="btn btn--sm btn--ok" type="button" data-set="confirmed">${icon('check')}Confirmer</button>`
        : `<a class="icon-btn icon-btn--sm" href="${esc(waCustomer(o))}" target="_blank" rel="noopener" aria-label="Écrire au client sur WhatsApp" data-stop>${icon('whatsapp-logo')}</a>`
    }</div>
  </div>
</article>`
}

function detailBody(o) {
  return `<div class="detail">
  <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px">${statusPill(o.status)}<span class="hint">Reçue ${esc(relTime(o.createdAt))}${o.decidedAt ? ` · traitée à ${fmtTime(o.decidedAt)}` : ''}</span></div>
  <section class="detail__section">
    <h3 class="detail__title">Client</h3>
    <dl class="kv"><dt>Prénom</dt><dd>${esc(o.customerName)}</dd><dt>Téléphone</dt><dd class="num">${esc(prettyPhone(o.customerPhone))}</dd></dl>
    <div class="contact">
      <a class="btn btn--sm btn--ghost" href="tel:${esc(o.customerPhone)}">${icon('phone')}Appeler</a>
      <a class="btn btn--sm btn--ghost" href="${esc(waCustomer(o))}" target="_blank" rel="noopener">${icon('whatsapp-logo')}WhatsApp</a>
    </div>
  </section>
  <section class="detail__section">
    <h3 class="detail__title">${esc(o.modeLabel)}</h3>
    <dl class="kv"><dt>Pour</dt><dd>${esc(o.pickupTime || 'Dès que possible')}</dd>${o.address ? `<dt>Adresse</dt><dd>${esc(o.address)}</dd>` : ''}<dt>Passée le</dt><dd>${esc(fmtDate(o.createdAt))} à ${fmtTime(o.createdAt)}</dd></dl>
    ${o.address ? `<a class="btn btn--sm btn--ghost" style="justify-self:start" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.address}, Oran`)}" target="_blank" rel="noopener">${icon('map-pin')}Ouvrir dans Maps</a>` : ''}
  </section>
  ${o.note ? `<section class="detail__section"><h3 class="detail__title">Remarque du client</h3><p class="note">${esc(o.note)}</p></section>` : ''}
  <section class="detail__section">
    <h3 class="detail__title">${o.itemCount} article${o.itemCount > 1 ? 's' : ''}</h3>
    <div class="detail__lines">${o.items
      .map(
        (i) => `<div class="line"><span class="line__qty">${i.qty}x</span><div><p class="line__name">${esc(i.name)}</p>${
          i.details?.length ? `<p class="line__details">${i.details.map(esc).join(' · ')}</p>` : ''
        }<p class="line__details">${formatDA(i.unit)} l'unité</p></div><span class="line__total">${formatDA(i.lineTotal)}</span></div>`,
      )
      .join('')}</div>
    <div class="detail__sum"><span>Total${o.mode === 'livraison' ? ' (hors livraison)' : ''}</span><strong>${formatDA(o.total)}</strong></div>
  </section>
</div>`
}

function detailFoot(o) {
  if (o.status === 'pending') {
    return `<button class="btn btn--danger" type="button" data-set="rejected">${icon('x')}Refuser</button><span class="spacer"></span><button class="btn btn--ok btn--lg" type="button" data-set="confirmed">${icon('check')}Confirmer la commande</button>`
  }
  return `<button class="btn btn--ghost" type="button" data-set="pending">${icon('arrow-counter-clockwise')}Remettre en attente</button><span class="spacer"></span>${
    o.status === 'confirmed'
      ? `<button class="btn btn--danger" type="button" data-set="rejected">${icon('x')}Refuser</button>`
      : `<button class="btn btn--ok" type="button" data-set="confirmed">${icon('check')}Confirmer</button>`
  }`
}

export default {
  mount(el, { pulse, refreshPulse }) {
    const params = new URLSearchParams(location.hash.split('?')[1] ?? '')
    const state = { status: pulse.pending ? 'pending' : 'all', q: '', orders: [], hasMore: false, loading: false, seen: new Set() }

    el.innerHTML = `<header class="head">
  <div><p class="head__kicker">Chaque commande doit être confirmée à la main</p><h1 class="head__title">Com<em>mandes</em></h1></div>
  <div class="head__actions"><button class="btn btn--ghost" type="button" data-refresh>${icon('arrows-clockwise')}Actualiser</button></div>
</header>
<div class="toolbar">
  <div class="seg" role="group" aria-label="Filtrer par statut">${FILTERS.map(
    ([k, label]) => `<button type="button" data-filter="${k}" aria-pressed="${k === state.status}">${label}${k === 'pending' ? ' <span class="count count--hot" data-count></span>' : ''}</button>`,
  ).join('')}</div>
  <label class="input-icon grow"><span class="sr-only">Rechercher</span>${icon('magnifying-glass')}<input class="input" type="search" data-search placeholder="Référence, prénom ou téléphone" autocomplete="off"></label>
</div>
<div class="orders" data-list></div>
<div class="more" data-more hidden><button class="btn btn--ghost" type="button">Charger plus</button></div>`

    const list = $('[data-list]', el)
    const paintCount = () => {
      const c = $('[data-count]', el)
      c.textContent = pulse.pending
      c.hidden = !pulse.pending
    }
    paintCount()

    async function load({ append = false, quiet = false } = {}) {
      if (state.loading) return
      state.loading = true
      if (!append && !quiet) list.classList.add('is-refreshing')
      if (!append && !state.orders.length && !quiet) {
        list.innerHTML = Array.from({ length: 6 }, () => '<div class="skeleton" style="height:230px"></div>').join('')
      }
      try {
        const qs = new URLSearchParams({ status: state.status, limit: '24' })
        if (state.q) qs.set('q', state.q)
        if (append && state.orders.length) qs.set('before', state.orders.at(-1).createdAt)
        const res = await call(`/admin/orders?${qs}`)
        const known = new Set(state.orders.map((o) => o.id))
        state.orders = append ? [...state.orders, ...res.orders] : res.orders
        state.hasMore = res.hasMore
        render(append ? new Set() : new Set(res.orders.filter((o) => quiet && !known.has(o.id)).map((o) => o.id)))
      } catch (err) {
        toast(err.message, { type: 'error' })
        if (!state.orders.length) list.innerHTML = ''
      } finally {
        state.loading = false
        list.classList.remove('is-refreshing')
      }
    }

    function render(fresh = new Set()) {
      $('[data-more]', el).hidden = !state.hasMore
      if (!state.orders.length) {
        const txt = state.q
          ? ['Aucun résultat', `Aucune commande ne correspond à « ${esc(state.q)} ».`]
          : state.status === 'pending'
            ? ['Aucune commande en attente', 'Tout est traité. Les nouvelles commandes arrivent ici avec un son.']
            : ['Aucune commande', 'Les commandes passées sur le site apparaîtront ici.']
        list.innerHTML = `<div class="card empty" style="grid-column:1/-1">${icon(state.q ? 'magnifying-glass' : 'seal-check')}<strong>${txt[0]}</strong><span>${txt[1]}</span></div>`
        return
      }
      list.innerHTML = state.orders.map((o) => card(o, fresh.has(o.id))).join('')
    }

    function replace(order) {
      const i = state.orders.findIndex((o) => o.id === order.id)
      if (i < 0) return
      const stays = state.status === 'all' || state.status === order.status
      const node = list.querySelector(`[data-id="${order.id}"]`)
      if (stays) {
        state.orders[i] = order
        node?.insertAdjacentHTML('afterend', card(order))
        node?.remove()
      } else {
        state.orders.splice(i, 1)
        node?.classList.add('is-leaving')
        setTimeout(() => (state.orders.length ? node?.remove() : render()), 280)
      }
    }

    async function changeStatus(id, status, btn) {
      const o = state.orders.find((x) => x.id === id) ?? openOrder
      await busy(btn, async () => {
        const updated = await setStatus(id, status, o?.ref)
        if (!updated) return
        replace(updated)
        if (openOrder?.id === id) showDetail(updated)
        refreshPulse()
      })
    }

    // --- détail ---------------------------------------------------------------------------------------
    let openOrder = null
    let panel = null
    function showDetail(o) {
      openOrder = o
      if (panel?.el.isConnected) {
        panel.body = detailBody(o)
        panel.foot = detailFoot(o)
        return
      }
      panel = drawer({ title: o.ref, label: `Commande ${o.ref}`, body: detailBody(o), foot: detailFoot(o) })
      panel.el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-set]')
        if (b) changeStatus(openOrder.id, b.dataset.set, b)
      })
    }

    list.addEventListener('click', (e) => {
      const node = e.target.closest('[data-id]')
      if (!node || e.target.closest('[data-stop]')) return
      const b = e.target.closest('[data-set]')
      if (b) return changeStatus(node.dataset.id, b.dataset.set, b)
      const o = state.orders.find((x) => x.id === node.dataset.id)
      if (o) showDetail(o)
    })
    list.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !e.target.matches('[data-id]')) return
      const o = state.orders.find((x) => x.id === e.target.dataset.id)
      if (o) showDetail(o)
    })

    // --- filtres ---------------------------------------------------------------------------------------
    el.querySelector('.seg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]')
      if (!b || b.dataset.filter === state.status) return
      state.status = b.dataset.filter
      el.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
      state.orders = []
      load()
    })
    let debounce = 0
    $('[data-search]', el).addEventListener('input', (e) => {
      clearTimeout(debounce)
      debounce = setTimeout(() => {
        state.q = e.target.value.trim()
        load()
      }, 300)
    })
    $('[data-refresh]', el).addEventListener('click', (e) => busy(e.currentTarget, () => Promise.all([load(), refreshPulse()])))
    $('[data-more] button', el).addEventListener('click', (e) => busy(e.currentTarget, () => load({ append: true })))

    load().then(async () => {
      // ouverture directe d'une commande (#/commandes?id=…)
      const id = params.get('id')
      if (!id) return
      let o = state.orders.find((x) => x.id === id)
      if (!o) {
        const res = await call('/admin/orders?status=all&limit=100').catch(() => null)
        o = res?.orders.find((x) => x.id === id)
      }
      if (o) showDetail(o)
      history.replaceState(null, '', '#/commandes')
    })

    return {
      onPulse(_, fresh) {
        paintCount()
        if (fresh && ['pending', 'all'].includes(state.status) && !state.q) load({ quiet: true })
      },
      unmount() {
        clearTimeout(debounce)
        panel?.close()
      },
    }
  },
}

