import { PRODUCTS, formatDA } from '../data/menu.js'
import { cart, unitPrice, describeLine } from './store.js'
import { openOverlay, onOverlayChange, isOverlayOpen } from './dialog.js'
import { productImage } from './renders.js'
import { icons } from './icons.js'
import { esc } from './env.js'

/** Tiroir du panier : liste des articles, quantités, totaux et étapes (panier, validation, confirmation). */
const STATUS_LABEL = { pending: 'en attente de confirmation', confirmed: 'confirmée', rejected: 'non acceptée' }

export function initCartView({ onShowView, getLastOrder, onOpenLastOrder } = {}) {
  const list = document.querySelector('[data-cart-list]')
  const empty = document.querySelector('[data-cart-empty]')
  const foot = document.querySelector('[data-cart-foot]')
  const counts = document.querySelectorAll('[data-cart-count]')
  const totals = document.querySelectorAll('[data-cart-total]')
  const cartbar = document.querySelector('[data-cartbar]')
  const cartBtn = document.querySelector('.cart-btn')
  const title = document.querySelector('[data-drawer-title]')
  const views = document.querySelectorAll('[data-view]')
  const lastBtn = document.querySelector('[data-last-order]')
  let view = 'cart'

  const itemHTML = (l, i) => {
    const p = PRODUCTS.get(l.id)
    const opts = describeLine(l)
    return `<li class="cart-item" data-index="${i}">
  <img class="cart-item__img${p.image ? ' is-photo' : ''}" src="${esc(productImage(p))}" alt="" width="64" height="64" loading="lazy">
  <div>
    <div class="cart-item__top">
      <div>
        <p class="cart-item__cat">${esc(p.category.name)}</p>
        <p class="cart-item__name">${esc(p.name)}</p>
      </div>
      <p class="cart-item__line">${formatDA(unitPrice(l) * l.qty)}</p>
    </div>
    ${opts.length ? `<p class="cart-item__opts">${opts.map(esc).join('<br>')}</p>` : ''}
    <div class="cart-item__bottom">
      <div class="qty">
        <button type="button" data-dec aria-label="Retirer un ${esc(p.fullName)}">${icons.minus}</button>
        <output aria-label="Quantité">${l.qty}</output>
        <button type="button" data-inc aria-label="Ajouter un ${esc(p.fullName)}">${icons.plus}</button>
      </div>
      <button class="cart-item__remove" type="button" data-remove>${icons.trash}Supprimer</button>
    </div>
  </div>
</li>`
  }

  function render() {
    const lines = cart.lines
    const n = cart.count()
    list.innerHTML = lines.map(itemHTML).join('')
    empty.hidden = lines.length > 0
    foot.hidden = lines.length === 0
    counts.forEach((el) => (el.textContent = n))
    totals.forEach((el) => (el.textContent = formatDA(cart.total())))
    document.documentElement.classList.toggle('has-items', n > 0)
    cartbar?.classList.toggle('is-visible', n > 0 && !isOverlayOpen())
    cartBtn?.setAttribute('aria-label', n ? `Ouvrir le panier (${n} article${n > 1 ? 's' : ''})` : 'Ouvrir le panier')
    // panier vide : raccourci vers le suivi de la dernière commande
    const last = lines.length ? null : getLastOrder?.()
    if (lastBtn) {
      lastBtn.hidden = !last
      if (last) {
        lastBtn.innerHTML = `${icons.receipt}<span>Suivre ma commande <strong>${esc(last.ref)}</strong><small>${esc(STATUS_LABEL[last.status] ?? '')}</small></span>${icons['arrow-right']}`
      }
    }
  }
  lastBtn?.addEventListener('click', () => {
    const last = getLastOrder?.()
    if (last) onOpenLastOrder?.(last)
  })

  list.addEventListener('click', (e) => {
    const row = e.target.closest('[data-index]')
    if (!row) return
    const i = Number(row.dataset.index)
    const line = cart.lines[i]
    if (!line) return
    if (e.target.closest('[data-inc]')) cart.setQty(i, line.qty + 1)
    else if (e.target.closest('[data-dec]')) cart.setQty(i, line.qty - 1)
    else if (e.target.closest('[data-remove]')) cart.remove(i)
    else return
    // garde le focus sur la même ligne après re-rendu
    requestAnimationFrame(() => {
      const again = list.querySelector(`[data-index="${Math.min(i, cart.lines.length - 1)}"] [data-inc]`)
      ;(again ?? document.querySelector('[data-overlay="cart"] [role="dialog"]'))?.focus({ preventScroll: true })
    })
  })

  function showView(name) {
    if (name === 'checkout' && !cart.lines.length) name = 'cart'
    view = name
    if (name === 'cart') render()
    views.forEach((v) => (v.hidden = v.dataset.view !== name))
    title.textContent = name === 'checkout' ? 'Validation' : name === 'done' ? 'Commande' : 'Ta commande'
    onShowView?.(name)
    const target = document.querySelector(`[data-view="${name}"] input, [data-view="${name}"] button`)
    if (name !== 'cart') setTimeout(() => target?.focus({ preventScroll: true }), 60)
  }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open-cart]')
    if (opener) {
      showView('cart')
      openOverlay('cart')
      return
    }
    const goto = e.target.closest('[data-goto-view]')
    if (goto) showView(goto.dataset.gotoView)
  })

  onOverlayChange(render)
  cart.subscribe(render)
  render()
  return { showView, currentView: () => view, render }
}
