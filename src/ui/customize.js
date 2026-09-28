import { SUPPLEMENTS, formatDA } from '../data/menu.js'
import { cart, unitPrice } from './store.js'
import { openOverlay, closeOverlay } from './dialog.js'
import { productImage } from './renders.js'
import { esc } from './env.js'

/** Fenêtre de personnalisation : taille, viande, parfums, suppléments, quantité. */
export function initCustomize({ onAdded } = {}) {
  const form = document.querySelector('[data-customize]')
  const optionsEl = form.querySelector('[data-cz-options]')
  const nameEl = form.querySelector('[data-cz-name]')
  const catEl = form.querySelector('[data-cz-cat]')
  const descEl = form.querySelector('[data-cz-desc]')
  const imgEl = form.querySelector('[data-cz-img]')
  const qtyEl = form.querySelector('[data-cz-count]')
  const totalEl = form.querySelector('[data-cz-total]')
  const errorEl = form.querySelector('[data-cz-error]')
  const noteEl = form.querySelector('#cz-note')

  let product = null
  let qty = 1
  let origin = null

  const choice = (type, name, value, label, extra = '', checked = false) =>
    `<label class="choice"><input type="${type}" name="${name}" value="${esc(value)}"${checked ? ' checked' : ''}><span><span>${esc(label)}</span>${extra ? `<small>${esc(extra)}</small>` : ''}</span></label>`

  const group = (title, hint, required, body, { compact = false, key = '' } = {}) =>
    `<fieldset class="option-group" data-group="${key}">
  <legend>${esc(title)}<span class="option-group__hint${required ? ' is-required' : ''}" data-hint="${key}">${esc(hint)}</span></legend>
  <div class="choices${compact ? ' choices--compact' : ''}">${body}</div>
</fieldset>`

  function buildOptions(p) {
    let html = ''
    if (p.sizes) {
      html += group('Taille', 'Obligatoire', true, p.sizes.map((s, i) => choice('radio', 'size', s.label, `Taille ${s.label}`, formatDA(s.price), i === 0)).join(''), { key: 'size' })
    }
    if (p.choice) {
      html += group(p.choice.label, 'Obligatoire', true, p.choice.options.map((o) => choice('radio', 'choice', o, o)).join(''), { key: 'choice' })
    }
    if (p.pick) {
      html += group(p.pick.label, `0 / ${p.pick.count}`, true, p.pick.options.map((o) => choice('checkbox', 'picks', o, o)).join(''), {
        compact: true,
        key: 'picks',
      })
    }
    if (p.category.supplements) {
      html += group('Suppléments', 'Facultatif', false, SUPPLEMENTS.map((s) => choice('checkbox', 'supp', s.id, s.label, `+ ${formatDA(s.price)}`)).join(''), {
        key: 'supp',
      })
    }
    return html
  }

  function readLine() {
    const fd = new FormData(form)
    return {
      id: product.id,
      qty,
      size: fd.get('size') || undefined,
      choice: fd.get('choice') || undefined,
      picks: fd.getAll('picks'),
      supplements: fd.getAll('supp'),
      note: String(fd.get('note') || '').trim(),
    }
  }

  function update() {
    if (!product) return
    const line = readLine()
    qtyEl.value = qty
    qtyEl.textContent = qty
    totalEl.textContent = formatDA(unitPrice(line) * qty)
    if (product.pick) {
      const n = line.picks.length
      const max = product.pick.count
      form.querySelector('[data-hint="picks"]').textContent = `${n} / ${max}`
      form.querySelectorAll('input[name="picks"]').forEach((input) => {
        input.disabled = !input.checked && n >= max
      })
    }
  }

  function open(p, originEl) {
    product = p
    qty = 1
    origin = originEl
    nameEl.textContent = p.name
    catEl.textContent = p.category.name
    descEl.textContent = p.desc ?? ''
    descEl.hidden = !p.desc
    imgEl.src = productImage(p)
    imgEl.classList.toggle('is-photo', Boolean(p.image))
    optionsEl.innerHTML = buildOptions(p)
    noteEl.value = ''
    noteEl.placeholder = p.category.id === 'jus' ? 'Ex\u00a0: fraise et banane' : 'Ex\u00a0: sans oignons, bien cuit'
    errorEl.textContent = ''
    update()
    openOverlay('customize', { focus: () => form.querySelector('input:checked, input') })
  }

  function validate(line) {
    if (product.sizes && !line.size) return ['size', 'Choisis une taille.']
    if (product.choice && !line.choice) return ['choice', `Choisis\u00a0: ${product.choice.options.join(' ou ').toLowerCase()}.`]
    if (product.pick && line.picks.length === 0) return ['picks', `Choisis au moins un parfum (jusqu'à ${product.pick.count}).`]
    return null
  }

  form.addEventListener('change', () => {
    errorEl.textContent = ''
    update()
  })
  form.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cz-qty]')
    if (!btn) return
    qty = Math.max(1, Math.min(20, qty + Number(btn.dataset.czQty)))
    update()
  })
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const line = readLine()
    const problem = validate(line)
    if (problem) {
      const [key, message] = problem
      errorEl.textContent = message
      const groupEl = form.querySelector(`[data-group="${key}"]`)
      groupEl?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      groupEl?.querySelector('input:not(:disabled)')?.focus({ preventScroll: true })
      return
    }
    cart.add(line)
    closeOverlay('customize')
    onAdded?.(product, line, origin)
  })

  return { open }
}
