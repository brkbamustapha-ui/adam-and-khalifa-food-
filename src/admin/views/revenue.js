import { call } from '../api.js'
import { $, $$, esc, icon, formatDA, fmtNum, fmtDay, fmtMonth, fmtFullDate, algDay, addDays, dayStart, countUp, toast, busy } from '../ui.js'
import { columnChart, hbars } from '../charts.js'

/** Périodes prêtes à l'emploi (jours de l'Algérie, fin exclue). */
function presetRange(key) {
  const today = algDay()
  const [y, m] = today.split('-').map(Number)
  const first = (yy, mm) => algDay(new Date(Date.UTC(yy, mm - 1, 1, 12)))
  switch (key) {
    case 'today':
      return [today, addDays(today, 1)]
    case 'yesterday':
      return [addDays(today, -1), today]
    case '7d':
      return [addDays(today, -6), addDays(today, 1)]
    case '30d':
      return [addDays(today, -29), addDays(today, 1)]
    case 'lastmonth':
      return [first(y, m - 1), first(y, m)]
    case 'year':
      return [`${y}-01-01`, addDays(today, 1)]
    default:
      return [first(y, m), addDays(today, 1)]
  }
}
const PRESETS = [
  ['today', "Aujourd'hui"],
  ['yesterday', 'Hier'],
  ['7d', '7 jours'],
  ['30d', '30 jours'],
  ['month', 'Ce mois'],
  ['lastmonth', 'Mois dernier'],
  ['year', 'Cette année'],
]

const daysBetween = (a, b) => Math.round((dayStart(b) - dayStart(a)) / 86400000)

/** Jour par jour (jusqu'à 62 jours), sinon mois par mois. */
function series(daily, from, to) {
  const n = daysBetween(from, to)
  const byDay = new Map(daily.map((d) => [d.day, d]))
  if (n <= 62) {
    return Array.from({ length: n }, (_, i) => {
      const day = addDays(from, i)
      const d = byDay.get(day)
      const title = fmtDay(day)
      return { label: title.split(' ').slice(1, 2).join(''), title, value: d?.revenue ?? 0, count: d?.orders ?? 0, sub: `${d?.orders ?? 0} commande${(d?.orders ?? 0) > 1 ? 's' : ''}` }
    })
  }
  const months = new Map()
  for (let i = 0; i < n; i++) {
    const day = addDays(from, i)
    const key = day.slice(0, 7)
    const d = byDay.get(day)
    const g = months.get(key) ?? { value: 0, count: 0 }
    g.value += d?.revenue ?? 0
    g.count += d?.orders ?? 0
    months.set(key, g)
  }
  return [...months].map(([key, g]) => {
    const title = fmtMonth(key)
    return { label: title.slice(0, 4).replace(/\.$/, ''), title, value: g.value, count: g.count, sub: `${g.count} commandes` }
  })
}

export default {
  mount(el) {
    const state = { preset: 'month', from: null, to: null }
    ;[state.from, state.to] = presetRange('month')

    el.innerHTML = `<header class="head">
  <div><p class="head__kicker">Calculateur de recette</p><h1 class="head__title">Re<em>cettes</em></h1></div>
  <div class="head__actions"><button class="btn btn--ghost" type="button" data-export>${icon('download-simple')}Exporter (Excel)</button></div>
</header>
<div class="toolbar" style="align-items:flex-end">
  <div class="chips" role="group" aria-label="Période">${PRESETS.map(([k, l]) => `<button class="chip" type="button" data-preset="${k}" aria-pressed="${k === state.preset}">${l}</button>`).join('')}</div>
  <form class="chips" data-custom style="align-items:flex-end">
    <label class="field" style="gap:4px"><span class="hint">Du</span><input class="input input--sm" type="date" name="from" required></label>
    <label class="field" style="gap:4px;margin:0"><span class="hint">Au</span><input class="input input--sm" type="date" name="to" required></label>
    <button class="btn btn--ghost btn--sm" type="submit" style="height:40px">${icon('calendar-blank')}Calculer</button>
  </form>
</div>
<section class="kpis" data-kpis>
  <article class="card stat stat--hero">
    <p class="stat__label">${icon('coins')}Argent reçu (commandes confirmées)</p>
    <p class="stat__value"><span data-k="revenue">0</span> <small>DA</small></p>
    <p class="stat__sub" data-k="period">&nbsp;</p>
  </article>
  <article class="card stat"><p class="stat__label">${icon('check-circle')}Commandes confirmées</p><p class="stat__value" data-k="confirmed">0</p><p class="stat__sub" data-k="confirmed-sub">&nbsp;</p></article>
  <article class="card stat"><p class="stat__label">${icon('receipt')}Panier moyen</p><p class="stat__value"><span data-k="average">0</span> <small>DA</small></p><p class="stat__sub">Par commande confirmée</p></article>
  <article class="card stat"><p class="stat__label">${icon('hourglass-medium')}En attente</p><p class="stat__value"><span data-k="pending">0</span> <small>DA</small></p><p class="stat__sub" data-k="pending-sub">Pas encore compté dans la recette</p></article>
</section>
<section class="grid">
  <article class="card">
    <div class="card__head"><div><h2 class="card__title" data-chart-title>Recette par jour</h2><p class="card__sub">Commandes confirmées, en dinars</p></div>
      <button class="chart-toggle" type="button" data-table-toggle>Voir les chiffres</button></div>
    <div data-chart></div>
  </article>
</section>
<section class="dash dash--split" data-split>
  <article class="card">
    <div class="card__head"><div><h2 class="card__title">Retrait ou livraison</h2><p class="card__sub">Recette sur la période</p></div></div>
    <div data-modes></div>
  </article>
  <article class="card">
    <div class="card__head"><div><h2 class="card__title">Meilleures ventes</h2><p class="card__sub">Quantités vendues sur la période</p></div></div>
    <div data-top></div>
  </article>
</section>
<article class="card" style="margin-top:18px">
  <div class="card__head"><div><h2 class="card__title">Mois par mois</h2><p class="card__sub">Touche un mois pour le détailler</p></div></div>
  <div data-monthly><div class="skeleton" style="height:180px"></div></div>
</article>`

    const form = $('[data-custom]', el)
    const chart = columnChart($('[data-chart]', el), { points: series([], state.from, state.to), empty: 'Aucune recette sur cette période.', tableHead: ['Période', 'Commandes', 'Recette'] })
    $('[data-table-toggle]', el).addEventListener('click', (e) => {
      e.currentTarget.textContent = chart.toggleTable() ? 'Voir le graphique' : 'Voir les chiffres'
    })

    let seq = 0
    async function load() {
      const my = ++seq
      form.elements.from.value = state.from
      form.elements.to.value = addDays(state.to, -1)
      $$('[data-preset]', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preset === state.preset)))
      $$('.grid, [data-split]', el).forEach((x) => x.classList.add('is-refreshing'))
      $('[data-kpis]', el).classList.add('is-refreshing')
      try {
        const qs = new URLSearchParams({ from: dayStart(state.from).toISOString(), to: dayStart(state.to).toISOString() })
        const { stats: s } = await call(`/admin/stats?${qs}`)
        if (my !== seq) return
        countUp($('[data-k="revenue"]', el), s.revenue)
        const last = addDays(state.to, -1)
        $('[data-k="period"]', el).textContent =
          state.from === last ? `Le ${fmtFullDate(dayStart(state.from, 0.5))}` : `Du ${fmtFullDate(dayStart(state.from, 0.5))} au ${fmtFullDate(dayStart(last, 0.5))}`
        countUp($('[data-k="confirmed"]', el), s.confirmed)
        $('[data-k="confirmed-sub"]', el).textContent = `Sur ${fmtNum(s.orders)} reçue${s.orders > 1 ? 's' : ''} · ${fmtNum(s.rejected)} refusée${s.rejected > 1 ? 's' : ''}`
        countUp($('[data-k="average"]', el), s.average)
        countUp($('[data-k="pending"]', el), s.pendingAmount)
        $('[data-k="pending-sub"]', el).textContent = s.pending
          ? `${s.pending} commande${s.pending > 1 ? 's' : ''}, pas encore comptée${s.pending > 1 ? 's' : ''}`
          : 'Pas encore compté dans la recette'
        const points = series(s.daily, state.from, state.to)
        $('[data-chart-title]', el).textContent = daysBetween(state.from, state.to) <= 62 ? 'Recette par jour' : 'Recette par mois'
        chart.update(points)
        const LABEL = { emporter: 'À emporter', livraison: 'Livraison' }
        const total = s.modes.reduce((n, x) => n + x.revenue, 0)
        $('[data-modes]', el).innerHTML = hbars(
          ['emporter', 'livraison'].map((mode) => {
            const x = s.modes.find((y) => y.mode === mode) ?? { orders: 0, revenue: 0 }
            return { name: LABEL[mode], value: x.revenue, text: `<strong>${formatDA(x.revenue)}</strong> · ${total ? Math.round((x.revenue / total) * 100) : 0} %` }
          }),
        )
        $('[data-top]', el).innerHTML = hbars(
          s.top.map((p) => ({ name: p.name, value: p.qty, text: `<strong>${fmtNum(p.qty)}</strong> · ${formatDA(p.revenue)}` })),
          { empty: 'Aucune vente confirmée sur cette période.' },
        )
      } catch (err) {
        if (my === seq) toast(err.message, { type: 'error' })
      } finally {
        if (my === seq) $$('.grid, [data-split], [data-kpis]', el).forEach((x) => x.classList.remove('is-refreshing'))
      }
    }

    async function loadMonthly() {
      try {
        const { months } = await call('/admin/monthly')
        const box = $('[data-monthly]', el)
        if (!months.length) {
          box.innerHTML = `<p class="hint">Le récapitulatif mensuel apparaîtra dès la première commande.</p>`
          return
        }
        const cur = algDay().slice(0, 7)
        const sum = months.reduce((a, m) => ({ orders: a.orders + m.orders, confirmed: a.confirmed + m.confirmed, revenue: a.revenue + m.revenue }), { orders: 0, confirmed: 0, revenue: 0 })
        box.innerHTML = `<div class="table-wrap"><table class="table">
  <thead><tr><th>Mois</th><th class="r">Commandes reçues</th><th class="r">Confirmées</th><th class="r">Panier moyen</th><th class="r">Recette</th></tr></thead>
  <tbody>${months
    .map(
      (m) => `<tr data-month="${m.month}"${m.month === cur ? ' class="is-current"' : ''} tabindex="0"><td>${esc(fmtMonth(m.month))}${m.month === cur ? ' (en cours)' : ''}</td><td class="r">${fmtNum(m.orders)}</td><td class="r">${fmtNum(
        m.confirmed,
      )}</td><td class="r">${m.confirmed ? formatDA(m.revenue / m.confirmed) : '0 DA'}</td><td class="r"><strong>${formatDA(m.revenue)}</strong></td></tr>`,
    )
    .join('')}</tbody>
  <tfoot><tr><td>Total ${months.length > 1 ? `(${months.length} mois)` : ''}</td><td class="r">${fmtNum(sum.orders)}</td><td class="r">${fmtNum(sum.confirmed)}</td><td class="r"></td><td class="r">${formatDA(sum.revenue)}</td></tr></tfoot>
</table></div>`
      } catch (err) {
        toast(err.message, { type: 'error' })
      }
    }

    el.addEventListener('click', (e) => {
      const p = e.target.closest('[data-preset]')
      if (p) {
        state.preset = p.dataset.preset
        ;[state.from, state.to] = presetRange(state.preset)
        load()
        return
      }
      const row = e.target.closest('[data-month]')
      if (row) pickMonth(row.dataset.month)
    })
    el.addEventListener('keydown', (e) => {
      const row = e.key === 'Enter' && e.target.closest('[data-month]')
      if (row) pickMonth(row.dataset.month)
    })
    function pickMonth(ym) {
      const [y, m] = ym.split('-').map(Number)
      state.preset = 'custom'
      state.from = `${ym}-01`
      state.to = algDay(new Date(Date.UTC(y, m, 1, 12)))
      load()
      scrollTo({ top: 0, behavior: 'smooth' })
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const from = form.elements.from.value
      const last = form.elements.to.value
      if (!from || !last || last < from) return toast('Choisis une date de début avant la date de fin.', { type: 'error' })
      state.preset = 'custom'
      state.from = from
      state.to = addDays(last, 1)
      load()
    })
    $('[data-export]', el).addEventListener('click', (e) =>
      busy(e.currentTarget, async () => {
        try {
          const qs = new URLSearchParams({ from: dayStart(state.from).toISOString(), to: dayStart(state.to).toISOString() })
          const res = await call(`/admin/export?${qs}`, { raw: true })
          const url = URL.createObjectURL(await res.blob())
          const a = Object.assign(document.createElement('a'), { href: url, download: `commandes-${state.from}-au-${addDays(state.to, -1)}.csv` })
          a.click()
          setTimeout(() => URL.revokeObjectURL(url), 2000)
        } catch (err) {
          toast(err.message, { type: 'error' })
        }
      }),
    )

    load()
    loadMonthly()
    return {
      onPulse: () => {
        load()
        loadMonthly()
      },
      unmount: () => chart.destroy(),
    }
  },
}
