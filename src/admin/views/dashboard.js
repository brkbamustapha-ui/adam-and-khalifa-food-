import { call } from '../api.js'
import { $, esc, icon, formatDA, fmtNum, greeting, fmtLongDate, fmtDay, algDay, addDays, relTime, countUp, toast, busy } from '../ui.js'
import { columnChart, sparkline, hbars } from '../charts.js'
import { setStatus } from './orders.js'

const pct = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 100) : null)

function delta(now, before, label) {
  const p = pct(now, before)
  if (p === null) return `<span class="delta__label">Pas encore de comparaison avec le mois dernier</span>`
  const cls = p > 0 ? 'up' : p < 0 ? 'down' : 'flat'
  const ic = p > 0 ? 'arrow-up-right' : p < 0 ? 'arrow-down-right' : 'arrow-right'
  return `<span class="delta delta--${cls}">${icon(ic)}${p > 0 ? '+' : ''}${p} %</span><span class="delta__label">${esc(label)}</span>`
}

/** 14 derniers jours, jours sans vente compris. */
function lastDays(daily, n = 14) {
  const today = algDay()
  const byDay = new Map(daily.map((d) => [d.day, d]))
  return Array.from({ length: n }, (_, i) => {
    const day = addDays(today, i - (n - 1))
    const d = byDay.get(day)
    const title = fmtDay(day)
    return {
      day,
      label: i === n - 1 ? "Auj." : title.split(' ').slice(0, 2).join(' ').replace('.', ''),
      title,
      value: d?.revenue ?? 0,
      count: d?.orders ?? 0,
      sub: `${d?.orders ?? 0} commande${(d?.orders ?? 0) > 1 ? 's' : ''}`,
      highlight: i === n - 1,
    }
  })
}

function queueItem(o) {
  return `<li class="queue__item" data-id="${o.id}">
  <button class="queue__main" type="button" data-open="${o.id}">
    <span class="queue__top"><span class="queue__ref">${esc(o.ref)}</span><span class="queue__time">${esc(relTime(o.createdAt))}</span></span>
    <span class="queue__who">${esc(o.customerName)} · ${esc(o.modeLabel)} · ${o.itemCount} article${o.itemCount > 1 ? 's' : ''}</span>
  </button>
  <span class="queue__actions">
    <span class="queue__total">${formatDA(o.total)}</span>
    <button class="icon-btn icon-btn--ok" type="button" data-set="confirmed" aria-label="Confirmer ${esc(o.ref)}" title="Confirmer">${icon('check')}</button>
    <button class="icon-btn icon-btn--danger" type="button" data-set="rejected" aria-label="Refuser ${esc(o.ref)}" title="Refuser">${icon('x')}</button>
  </span>
</li>`
}

export default {
  mount(el, { go, refreshPulse }) {
    el.innerHTML = `<header class="head">
  <div><p class="head__kicker">${greeting()}, ${fmtLongDate()}</p><h1 class="head__title">Tableau de <em>bord</em></h1></div>
  <div class="head__actions"><a class="btn btn--ghost" href="../" target="_blank" rel="noopener">${icon('arrow-square-out')}Voir le site</a></div>
</header>
<section class="kpis" data-kpis>
  <article class="card stat stat--hero">
    <p class="stat__label">${icon('coins')}Recette du jour</p>
    <div class="stat__row"><p class="stat__value"><span data-k="today">0</span> <small>DA</small></p><span data-spark></span></div>
    <p class="stat__sub" data-k="today-sub">&nbsp;</p>
  </article>
  <article class="card stat">
    <p class="stat__label">${icon('receipt')}Commandes aujourd'hui</p>
    <p class="stat__value" data-k="orders">0</p>
    <p class="stat__sub" data-k="orders-sub">&nbsp;</p>
  </article>
  <article class="card stat stat--action" data-go="#/commandes" tabindex="0" role="link" aria-label="Voir les commandes à traiter">
    <p class="stat__label">${icon('hourglass-medium')}À traiter</p>
    <p class="stat__value" data-k="pending">0</p>
    <p class="stat__sub" data-k="pending-sub">&nbsp;</p>
  </article>
  <article class="card stat">
    <p class="stat__label">${icon('wallet')}Recette du mois</p>
    <p class="stat__value"><span data-k="month">0</span> <small>DA</small></p>
    <p class="stat__sub" data-k="month-sub">&nbsp;</p>
  </article>
</section>
<section class="dash">
  <article class="card">
    <div class="card__head"><div><h2 class="card__title">Recette des 14 derniers jours</h2><p class="card__sub">Commandes confirmées, en dinars</p></div>
      <button class="chart-toggle" type="button" data-table-toggle>Voir les chiffres</button></div>
    <div data-chart></div>
  </article>
  <article class="card">
    <div class="card__head"><div><h2 class="card__title">À traiter</h2><p class="card__sub">Les plus récentes en haut</p></div><a class="card__link" href="#/commandes">Tout voir${icon('arrow-right')}</a></div>
    <ul class="queue" data-queue></ul>
  </article>
  <article class="card">
    <div class="card__head"><div><h2 class="card__title">Meilleures ventes du mois</h2><p class="card__sub">Quantités vendues (commandes confirmées)</p></div></div>
    <div data-top></div>
  </article>
  <article class="card">
    <div class="card__head"><div><h2 class="card__title">Retrait ou livraison</h2><p class="card__sub">Ce mois-ci, commandes confirmées</p></div></div>
    <div data-modes></div>
  </article>
</section>`

    const chart = columnChart($('[data-chart]', el), { points: lastDays([]), empty: 'Pas encore de recette ces 14 derniers jours.' })
    $('[data-table-toggle]', el).addEventListener('click', (e) => {
      e.currentTarget.textContent = chart.toggleTable() ? 'Voir le graphique' : 'Voir les chiffres'
    })
    const goTo = (t) => t && go(t.dataset.go)
    el.addEventListener('click', (e) => goTo(e.target.closest('[data-go]')))
    el.addEventListener('keydown', (e) => e.key === 'Enter' && goTo(e.target.closest('[data-go]')))

    let alive = true
    let timer = 0
    async function load() {
      clearTimeout(timer)
      const kpis = $('[data-kpis]', el)
      kpis.classList.add('is-refreshing')
      try {
        const d = await call('/admin/overview')
        if (!alive) return
        render(d)
      } catch (err) {
        if (alive) toast(err.message, { type: 'error' })
      } finally {
        kpis.classList.remove('is-refreshing')
        if (alive) timer = setTimeout(load, 60000)
      }
    }

    function render(d) {
      const t = d.today
      const m = d.month
      countUp($('[data-k="today"]', el), t.revenue)
      $('[data-k="today-sub"]', el).textContent = t.confirmed
        ? `${t.confirmed} commande${t.confirmed > 1 ? 's' : ''} confirmée${t.confirmed > 1 ? 's' : ''} · panier moyen ${formatDA(t.average)}`
        : 'Aucune commande confirmée pour le moment'
      const days = lastDays(d.last14.daily)
      $('[data-spark]', el).innerHTML = sparkline(days.map((x) => x.value))
      countUp($('[data-k="orders"]', el), t.orders)
      $('[data-k="orders-sub"]', el).textContent = `${t.confirmed} confirmée${t.confirmed > 1 ? 's' : ''} · ${t.rejected} refusée${t.rejected > 1 ? 's' : ''}`
      countUp($('[data-k="pending"]', el), d.pendingCount)
      $('[data-k="pending-sub"]', el).innerHTML = d.pendingCount
        ? `<span style="color:var(--accent-2);font-weight:600">À confirmer maintenant</span>`
        : 'Tout est traité'
      countUp($('[data-k="month"]', el), m.revenue)
      $('[data-k="month-sub"]', el).innerHTML = delta(m.revenue, d.prevMonth.revenue, 'par rapport au mois dernier, même période')

      chart.update(days)
      const queue = $('[data-queue]', el)
      queue.innerHTML = d.pending.length
        ? d.pending.map(queueItem).join('')
        : `<li class="empty">${icon('seal-check')}<strong>Aucune commande en attente</strong><span>Les nouvelles commandes apparaissent ici avec un son.</span></li>`
      $('[data-top]', el).innerHTML = hbars(
        m.top.map((p) => ({ name: p.name, value: p.qty, text: `<strong>${fmtNum(p.qty)}</strong> · ${formatDA(p.revenue)}` })),
        { empty: 'Les meilleures ventes apparaîtront dès les premières commandes confirmées.' },
      )
      const LABEL = { emporter: 'À emporter', livraison: 'Livraison' }
      const totalOrders = m.modes.reduce((s, x) => s + x.orders, 0)
      $('[data-modes]', el).innerHTML = hbars(
        ['emporter', 'livraison'].map((mode) => {
          const x = m.modes.find((y) => y.mode === mode) ?? { orders: 0, revenue: 0 }
          const share = totalOrders ? Math.round((x.orders / totalOrders) * 100) : 0
          return { name: LABEL[mode], value: x.orders, text: `<strong>${share} %</strong> · ${x.orders} cmd · ${formatDA(x.revenue)}` }
        }),
      )
    }

    // confirmer / refuser directement depuis la liste
    $('[data-queue]', el).addEventListener('click', async (e) => {
      const li = e.target.closest('[data-id]')
      if (!li) return
      if (e.target.closest('[data-open]')) return go(`#/commandes?id=${li.dataset.id}`)
      const btn = e.target.closest('[data-set]')
      if (!btn) return
      await busy(btn, async () => {
        const ok = await setStatus(li.dataset.id, btn.dataset.set)
        if (ok) {
          refreshPulse()
          load()
        }
      })
    })

    load()
    return {
      onPulse: () => load(),
      unmount() {
        alive = false
        clearTimeout(timer)
        chart.destroy()
      },
    }
  },
}
