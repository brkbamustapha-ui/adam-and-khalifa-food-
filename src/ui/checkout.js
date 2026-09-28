import { SITE, waLink } from '../config.js'
import { PRODUCTS, formatDA } from '../data/menu.js'
import { normalizePhone } from '../../supabase/functions/ak-api/menu-core.js'
import { cart, unitPrice, describeLine } from './store.js'
import { closeOverlay } from './dialog.js'
import { timeSlots } from './status.js'
import { icons } from './icons.js'
import { esc } from './env.js'
import { api } from './api.js'
import { initTracker, doneHTML } from './order-track.js'
import { toast } from './feedback.js'

export { normalizePhone }

const CUSTOMER_KEY = 'ak-customer-v1'

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

export function initCheckout({ showView, isVisible, onMenuError }) {
  const form = document.querySelector('[data-checkout]')
  const modesEl = form.querySelector('[data-modes]')
  const addressField = form.querySelector('[data-address-field]')
  const timeEl = form.querySelector('[data-time]')
  const submitBtn = form.querySelector('[data-submit]')
  const errorEl = form.querySelector('[data-checkout-error]')
  const fallbackEl = form.querySelector('[data-fallback]')
  const doneEl = document.querySelector('[data-done]')

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
  const formError = (message) => {
    errorEl.textContent = message || ''
    errorEl.hidden = !message
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

  // --- confirmation et suivi -------------------------------------------------------------
  const tracker = initTracker({
    onUpdate(order, changed) {
      if (tracker?.current?.id === order.id && doneEl.dataset.order === order.id) doneEl.innerHTML = doneHTML(order)
      if (changed && !isVisible('done')) {
        toast(order.status === 'confirmed' ? `Commande ${order.ref} confirmée, on la prépare !` : `Commande ${order.ref} non acceptée, appelle-nous.`)
      }
    },
  })

  function showOrder(order) {
    doneEl.dataset.order = order.id
    doneEl.innerHTML = doneHTML(order)
    showView('done')
  }

  let lastWhatsApp = null
  function sendWhatsApp(details) {
    const ref = orderRef()
    const url = waLink(buildMessage({ ...details, ref }))
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
    showOrder({ id: `wa-${ref}`, channel: 'whatsapp', ref, waUrl: url })
  }

  function setBusy(busy) {
    submitBtn.disabled = busy
    submitBtn.classList.toggle('is-busy', busy)
    submitBtn.querySelector('span').textContent = busy ? 'Envoi en cours…' : 'Envoyer la commande'
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (submitBtn.disabled) return
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
    formError('')
    fallbackEl.hidden = true
    if (errors.length) {
      errors.forEach(([f, m]) => setError(f, m))
      form.elements[errors[0][0]].focus()
      return
    }
    const details = { name, phone, mode, address, time: timeEl.value, note: form.elements.note.value.trim() }
    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name, phone: form.elements.phone.value.trim(), mode, address }))
    } catch {
      /* ignoré */
    }

    setBusy(true)
    const res = await api('/orders', {
      method: 'POST',
      timeout: 15000,
      body: {
        customer: details,
        website: form.elements.website.value,
        lines: cart.lines.map(({ id, qty, size, choice, picks, supplements, note }) => ({ id, qty, size, choice, picks, supplements, note })),
      },
    })
    setBusy(false)

    if (res.ok) {
      const order = { id: res.data.id, token: res.data.token, ref: res.data.ref, total: res.data.total, status: res.data.status, mode, createdAt: res.data.createdAt }
      cart.clear()
      form.elements.note.value = ''
      tracker.start(order)
      showOrder(order)
      return
    }
    if (res.status >= 400 && res.status < 500 && res.error) {
      // commande refusée par le serveur (plat épuisé, numéro invalide…) : on explique
      formError(res.error)
      if (res.status === 400) onMenuError?.()
      return
    }
    // service injoignable : la commande peut toujours partir par WhatsApp
    lastWhatsApp = details
    fallbackEl.hidden = false
    fallbackEl.querySelector('button')?.focus()
  })

  fallbackEl.querySelector('[data-wa-fallback]').addEventListener('click', () => {
    if (lastWhatsApp) sendWhatsApp(lastWhatsApp)
  })

  doneEl.addEventListener('click', (e) => {
    if (!e.target.closest('[data-new-order]')) return
    if (tracker.current?.channel === 'whatsapp' || doneEl.dataset.order?.startsWith('wa-')) {
      cart.clear()
      form.elements.note.value = ''
    }
    closeOverlay('cart')
    showView('cart')
  })

  return {
    onShow(view) {
      if (view === 'checkout') {
        fillTimes()
        formError('')
        fallbackEl.hidden = true
      }
    },
    /** Dernière commande encore suivie (affichée dans le panier vide). */
    lastOrder: () => tracker.current,
    showOrder,
  }
}
