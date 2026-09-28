import '@fontsource/bebas-neue/latin-400.css'
import '@fontsource-variable/outfit/wght.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/menu.css'
import './styles/overlays.css'

import logo512 from './assets/logo-512.webp'
import logo1024 from './assets/logo-1024.webp'
import { PRODUCTS } from './data/menu.js'
import { webglAvailable } from './ui/env.js'
import { initSmoothScroll, scrollToTarget } from './ui/smooth.js'
import { initNav } from './ui/nav.js'
import { initReveals, initTilt, initJuiceParallax } from './ui/motion.js'
import { initMenu } from './ui/menu.js'
import { cart } from './ui/store.js'
import { initCartView } from './ui/cart-view.js'
import { initCustomize } from './ui/customize.js'
import { initCheckout } from './ui/checkout.js'
import { initStatus } from './ui/status.js'
import { toast, flyToCart } from './ui/feedback.js'
import { renderUrl } from './ui/renders.js'

document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()))

initSmoothScroll()
initNav()
initStatus()

let checkout
const { showView } = initCartView({ onShowView: (view) => checkout?.onShow(view) })
checkout = initCheckout({ showView })

const added = (product, line, origin) => {
  flyToCart(origin, renderUrl(product.category.model))
  toast(`${line.qty > 1 ? `${line.qty} x ` : ''}${product.fullName} ajouté au panier`)
}
const customize = initCustomize({ onAdded: added })
const menu = initMenu({ logoUrl: logo512 })

// boutons "Ajouter" / "Choisir" partout dans la page
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-add]')
  if (!btn) return
  const product = PRODUCTS.get(btn.dataset.add)
  if (!product) return
  if (product.hasOptions) {
    customize.open(product, btn)
  } else {
    cart.add({ id: product.id, qty: 1 })
    added(product, { qty: 1 }, btn)
  }
})

// raccourci vers une catégorie de la carte (ex : AK Juice)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-goto-category]')
  if (!btn) return
  menu.selectById(btn.dataset.gotoCategory)
  scrollToTarget('#menu')
})

initReveals()
initTilt()
initJuiceParallax()

// héros 3D : three.js est chargé à part, une fois la page affichée et le texte animé
const hero = document.querySelector('.hero')
const startHero = () =>
  import('./three/hero.js')
    .then(({ initHero }) =>
      initHero({
        section: hero,
        canvas: hero.querySelector('[data-hero-canvas]'),
        logoUrl: logo512,
        logoTexUrl: logo1024,
        onReady: () => hero.classList.add('is-3d'),
      }),
    )
    .catch((err) => {
      document.documentElement.classList.add('no-webgl')
      console.warn('Héros 3D indisponible :', err)
    })
if (!webglAvailable()) document.documentElement.classList.add('no-webgl')
else {
  if ('requestIdleCallback' in window) requestIdleCallback(startHero, { timeout: 900 })
  else setTimeout(startHero, 300)
}
