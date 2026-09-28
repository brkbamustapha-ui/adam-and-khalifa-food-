import { SITE, waLink } from '../config.js'
import { PRODUCTS, formatDA } from '../data/menu.js'
import { cart, unitPrice, describeLine } from './store.js'
import { closeOverlay } from './dialog.js'
import { timeSlots } from './status.js'
import { icons } from './icons.js'
import { esc } from './env.js'

const CUSTOMER_KEY = 'ak-customer-v1'

/** Numéros algériens : mobile (05, 06, 07), fixe (02, 03, 04), ou format international +213. */
export function normalizePhone(raw) {
  let d = String(raw).replace(/[^\d+]/g, '')
  if (d.startsWith('+213')) d = `0${d.slice(4)}`
  else if (d.startsWith('00213')) d = `0${d.slice(5)}`
  else if (d.startsWith('213') && d.length === 12) d = `0${d.slice(3)}`
  if (/^0[567]\d{8}$/.test(d) || /^0[234]\d{7,8}$/.test(d)) return d
  return null
}

const prettyPhone = (d) => d.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4')

function orderRef() {
  const n = (Date.now() % 1679616).toString(36).toUpperCase().padStart(4, '0')
  return `AK-${n}`
}

export function buildMessage({ name, phone, mode, address, time, note, ref }) {
  const rows = cart.lines.map((l) => {
    const p = PRODUCTS.get(l.id)
    const details = describeLine(l)
    const head = `• ${l.qty} x ${p.fullName} : ${formatDA(unitPrice(l) * l.qty)}`
    return details.length ? `${head}\n   ${details.join(', ')}` : head
  })
  const modeLabel = SITE.orderModes.find((m) => m.id === mode)?.label ?? mode
  return [
    `Bonjour ${SITE.name} ! Je souhaite commander :`,
    '',
    ...rows,
    '',
    `Total : ${formatDA(cart.total())}${mode === 'livraison' ? ' (hors livraison)' : ''}`,
    '',
    `Prénom : ${name}`,
    `Téléphone : ${prettyPhone(phone)}`,
    `Mode : ${modeLabel}`,
    ...(mode === 'livraison' ? [`Adresse : ${address}`] : []),
    `Pour : ${time}`,
    ...(note ? [`Remarque : ${note}`] : []),
    `Réf. ${ref}`,
  ].join('\n')
}

export function initCheckout({ showView }) {
  const form = document.querySelector('[data-checkout]')
  const modesEl = form.querySelector('[data-modes]')
  const addressField = form.querySelector('[data-address-field]')
  const timeEl = form.querySelector('[data-time]')
  const refEl = document.querySelector('[data-order-ref]')
  const retry = document.querySelector('[data-wa-retry]')

  modesEl.innerHTML = SITE.orderModes
    .map(
      (m, i) =>
        `<label class="choice"><input type="radio" name="mode" value="${m.id}"${i === 0 ? ' checked' : ''}><span><span>${icons[m.icon] ?? ''}${esc(m.label)}</span></span></label>`,
    )
    .join('')

  let saved = {}
  try {
    saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY) || '{}')
  } catch {
    saved = {}
  }
  for (const k of ['name', 'phone', 'address']) if (saved[k]) form.elements[k].value = saved[k]
  if (saved.mode && form.querySelector(`input[name="mode"][value="${saved.mode}"]`)) {
    form.querySelector(`input[name="mode"][value="${saved.mode}"]`).checked = true
  }

  const needsAddress = () => SITE.orderModes.find((m) => m.id === form.elements.mode.value)?.needsAddress
  const syncMode = () => {
    addressField.hidden = !needsAddress()
  }
  syncMode()
  form.addEventListener('change', (e) => {
    if (e.target.name === 'mode') syncMode()
  })

  const VALIDATED = ['name', 'phone', 'address']
  const setError = (field, message) => {
    const input = form.elements[field]
    const out = form.querySelector(`[data-error-for="${field}"]`)
    if (out) out.textContent = message || ''
    if (input instanceof Element) input.setAttribute('aria-invalid', message ? 'true' : 'false')
  }
  form.addEventListener('input', (e) => {
    if (VALIDATED.includes(e.target.name)) setError(e.target.name, '')
  })

  function fillTimes() {
    const current = timeEl.value
    timeEl.innerHTML = timeSlots()
      .map((t) => `<option>${esc(t)}</option>`)
      .join('')
    if ([...timeEl.options].some((o) => o.value === current)) timeEl.value = current
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (!cart.lines.length) return showView('cart')
    const name = form.elements.name.value.trim()
    const phone = normalizePhone(form.elements.phone.value)
    const mode = form.elements.mode.value
    const address = form.elements.address.value.trim()
    const errors = []
    if (name.length < 2) errors.push(['name', 'Indique ton prénom.'])
    if (!phone) errors.push(['phone', 'Numéro invalide. Exemple\u00a0: 0550 12 34 56.'])
    if (needsAddress() && address.length < 6) errors.push(['address', 'Indique ton adresse (quartier, rue, repère).'])
    VALIDATED.forEach((f) => setError(f, ''))
    if (errors.length) {
      errors.forEach(([f, m]) => setError(f, m))
      form.elements[errors[0][0]].focus()
      return
    }
    const ref = orderRef()
    const message = buildMessage({
      name,
      phone,
      mode,
      address,
      time: timeEl.value,
      note: form.elements.note.value.trim(),
      ref,
    })
    const url = waLink(message)
    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name, phone: form.elements.phone.value.trim(), mode, address }))
    } catch {
      /* ignoré */
    }
    // nouvel onglet (ou l'application WhatsApp sur mobile) ; si le navigateur bloque, on y va directement
    const win = window.open(url, '_blank')
    if (win) {
      try {
        win.opener = null
      } catch {
        /* ignoré */
      }
    } else {
      window.location.href = url
    }
    refEl.textContent = ref
    retry.href = url
    showView('done')
  })

  document.querySelector('[data-new-order]')?.addEventListener('click', () => {
    cart.clear()
    form.elements.note.value = ''
    closeOverlay('cart')
    showView('cart')
  })

  return {
    onShow(view) {
      if (view === 'checkout') fillTimes()
    },
  }
}
