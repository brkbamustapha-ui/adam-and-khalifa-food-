/**
 * Graphiques du tableau de bord (SVG fait main, aucune bibliothèque).
 * Une seule série (la recette) : une couleur, pas de légende, info-bulle au survol et au clavier,
 * et une vue tableau équivalente pour lire tous les chiffres.
 */
import { esc, fmtShort, fmtNum } from './ui.js'

const NS = 'http://www.w3.org/2000/svg'

/** Graduations "rondes" de l'axe : 0, 5 000, 10 000… */
function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1]
  const raw = max / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)
  const ticks = []
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v)
  if (ticks.at(-1) < max) ticks.push(ticks.at(-1) + step)
  return ticks
}

/** Chemin d'une colonne : bout arrondi (4 px) côté valeur, carré sur la ligne de base. */
function colPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

/**
 * Colonnes. points : [{ label, title, value, sub, highlight }]
 * Renvoie { update(points) } ; le rendu suit la largeur du conteneur.
 */
export function columnChart(root, { points, format = (v) => `${fmtNum(v)} DA`, height = 230, empty = 'Aucune donnée sur cette période.', tableHead = ['Jour', 'Commandes', 'Recette'] }) {
  root.classList.add('chart')
  root.innerHTML = `<div data-plot></div><div class="tip" hidden><div class="tip__value"></div><div class="tip__label"></div></div><div data-table hidden></div>`
  const plot = root.querySelector('[data-plot]')
  const tip = root.querySelector('.tip')
  const tableBox = root.querySelector('[data-table]')
  let data = points
  let first = true

  function render() {
    const W = Math.max(280, plot.clientWidth || root.clientWidth || 600)
    const AXIS_W = 46
    const TOP = 22
    const X_BAND = 30
    const H = height
    const plotH = H - TOP - X_BAND
    const n = data.length
    const band = (W - AXIS_W) / Math.max(1, n)
    const barW = Math.max(3, Math.min(24, band * 0.62))
    const max = Math.max(0, ...data.map((p) => p.value))
    const ticks = niceTicks(max)
    const top = ticks.at(-1) || 1
    const y = (v) => TOP + plotH - (v / top) * plotH
    const every = Math.max(1, Math.ceil(34 / band))
    const maxIdx = data.findIndex((p) => p.value === max && max > 0)

    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    svg.setAttribute('height', H)
    svg.setAttribute('role', 'group')
    let html = ''
    for (const t of ticks) {
      const ty = Math.round(y(t)) + 0.5
      html += `<line class="chart__grid" x1="${AXIS_W}" x2="${W}" y1="${ty}" y2="${ty}"/>`
      html += `<text class="chart__tick" x="${AXIS_W - 10}" y="${ty + 4}" text-anchor="end">${fmtShort(t)}</text>`
    }
    data.forEach((p, i) => {
      const cx = AXIS_W + band * i + band / 2
      const h = Math.max(p.value > 0 ? 2 : 0, (p.value / top) * plotH)
      const by = TOP + plotH - h
      const aria = `${p.title} : ${format(p.value)}${p.sub ? `, ${p.sub}` : ''}`
      html += `<g class="chart__col${p.highlight ? ' is-today' : ''}" tabindex="0" role="img" aria-label="${esc(aria)}" data-i="${i}">
  <rect class="chart__hit" x="${AXIS_W + band * i + 1}" y="${TOP - 8}" width="${Math.max(1, band - 2)}" height="${plotH + 8}" rx="8"/>
  ${h ? `<path class="chart__bar${first ? ' chart__grow' : ''}" style="animation-delay:${first ? i * 25 : 0}ms" d="${colPath(cx - barW / 2, by, barW, h)}"/>` : ''}
</g>`
      // l'étiquette du dernier jour est toujours affichée : on évite qu'elle chevauche la précédente
      if (i === n - 1 || (i % every === 0 && n - 1 - i >= every)) {
        html += `<text class="chart__tick" x="${cx}" y="${H - 8}" text-anchor="middle">${esc(p.label)}</text>`
      }
      if (i === maxIdx) {
        html += `<text class="chart__label" x="${cx}" y="${by - 8}" text-anchor="middle">${fmtShort(p.value)}</text>`
      }
    })
    svg.innerHTML = html
    plot.replaceChildren(svg)
    if (max === 0) {
      const note = document.createElement('p')
      note.className = 'hint'
      note.style.cssText = 'position:absolute;inset:0 0 30px 46px;display:grid;place-items:center;text-align:center'
      note.textContent = empty
      plot.append(note)
    }
    first = false
  }

  function showTip(g) {
    const p = data[Number(g.dataset.i)]
    const bar = g.querySelector('.chart__bar') ?? g.querySelector('.chart__hit')
    const box = bar.getBoundingClientRect()
    const host = root.getBoundingClientRect()
    tip.querySelector('.tip__value').textContent = format(p.value)
    tip.querySelector('.tip__label').textContent = p.sub ? `${p.title} · ${p.sub}` : p.title
    tip.hidden = false
    const x = Math.min(host.width - 80, Math.max(80, box.left - host.left + box.width / 2))
    tip.style.left = `${x}px`
    tip.style.top = `${Math.max(56, box.top - host.top)}px`
  }
  plot.addEventListener('pointerover', (e) => {
    const g = e.target.closest('.chart__col')
    if (g) showTip(g)
  })
  plot.addEventListener('pointerleave', () => (tip.hidden = true))
  plot.addEventListener('focusin', (e) => {
    const g = e.target.closest('.chart__col')
    if (g) showTip(g)
  })
  plot.addEventListener('focusout', () => (tip.hidden = true))

  function renderTable() {
    tableBox.innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>${tableHead[0]}</th><th class="r">${tableHead[1]}</th><th class="r">${tableHead[2]}</th></tr></thead><tbody>${data
      .map((p) => `<tr><td>${esc(p.title)}</td><td class="r">${p.count ?? ''}</td><td class="r">${format(p.value)}</td></tr>`)
      .join('')}</tbody></table></div>`
  }

  const ro = new ResizeObserver(() => render())
  ro.observe(root)
  render()

  return {
    update(points) {
      data = points
      render()
      if (!tableBox.hidden) renderTable()
    },
    /** Bascule graphique / tableau ; renvoie true si le tableau est affiché. */
    toggleTable() {
      const show = tableBox.hidden
      if (show) renderTable()
      tableBox.hidden = !show
      plot.hidden = show
      tip.hidden = true
      return show
    },
    destroy: () => ro.disconnect(),
  }
}

/** Mini-courbe de tendance : période en gris, dernier point (aujourd'hui) en couleur d'accent. */
export function sparkline(values, { width = 132, height = 44 } = {}) {
  if (values.length < 2) return ''
  const max = Math.max(1, ...values)
  const step = (width - 8) / (values.length - 1)
  const pts = values.map((v, i) => [4 + i * step, height - 5 - (v / max) * (height - 12)])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')
  const [lx, ly] = pts.at(-1)
  return `<svg class="spark" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">
  <path d="${d}" fill="none" stroke="var(--text-3)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity="0.7"/>
  <circle cx="${lx}" cy="${ly}" r="6" fill="var(--card-solid)"/>
  <circle cx="${lx}" cy="${ly}" r="4" fill="var(--series-1)"/>
</svg>`
}

/** Barres horizontales (classements). rows : [{ name, value, text }] */
export function hbars(rows, { empty = 'Rien à afficher pour le moment.' } = {}) {
  if (!rows.length) return `<p class="hint">${esc(empty)}</p>`
  const max = Math.max(1, ...rows.map((r) => r.value))
  return `<div class="bars">${rows
    .map(
      (r, i) => `<div class="bars__row">
  <span class="bars__name">${esc(r.name)}</span><span class="bars__value">${r.text}</span>
  <div class="bars__track"><div class="bars__fill" style="width:${((r.value / max) * 100).toFixed(1)}%;animation-delay:${i * 60}ms"></div></div>
</div>`,
    )
    .join('')}</div>`
}
