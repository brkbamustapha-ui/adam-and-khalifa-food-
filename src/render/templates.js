/**
 * Gabarits HTML de la carte, générés au build (voir vite.config.js).
 * La carte est donc présente dans le HTML final : lisible sans JavaScript
 * et indexable par les moteurs de recherche.
 */
import { CATEGORIES, PRODUCTS, SUPPLEMENTS, formatDA } from '../data/menu.js'

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const TAG_LABEL = {
  new: { label: 'Nouveau', icon: 'sparkle' },
  signature: { label: 'Signature', icon: 'star' },
  spicy: { label: 'Piquant', icon: 'pepper' },
  share: { label: 'À partager', icon: 'users-three' },
}

export const renderTag = (t) =>
  TAG_LABEL[t] ? `<span class="tag tag--${t}"><i data-icon="${TAG_LABEL[t].icon}"></i>${TAG_LABEL[t].label}</span>` : ''

function priceLabel(item) {
  if (item.sizes) return item.sizes.map((s) => `<span><small>${esc(s.label)}</small> ${formatDA(s.price)}</span>`).join('')
  return `<span>${formatDA(item.price)}</span>`
}

function dish(item, i = 0) {
  const cat = item.category
  const verb = item.available ? (item.hasOptions ? 'Choisir' : 'Ajouter') : 'Épuisé'
  const cls = `dish__card${item.image ? ' has-photo' : ''}${item.available ? '' : ' is-soldout'}`
  return `<li class="dish" style="--i: ${Math.min(i, 14)}">
  <article class="${cls}" data-tilt>
    ${item.image ? `<img class="dish__photo" src="${esc(item.image)}" alt="${esc(item.fullName)}" width="96" height="96" loading="lazy" decoding="async">` : ''}
    <div class="dish__head">
      <h4 class="dish__name">${esc(item.name)}</h4>
      <p class="dish__price">${priceLabel(item)}</p>
    </div>
    ${item.desc ? `<p class="dish__desc">${esc(item.desc)}</p>` : ''}
    <div class="dish__foot">
      <div class="dish__tags">${item.tags.map(renderTag).join('')}</div>
      <button class="dish__add" type="button" data-add="${item.id}"${item.available ? '' : ' disabled'} aria-label="${verb} ${esc(item.name)} (${esc(cat.name)})">
        ${item.available ? '<i data-icon="plus"></i>' : ''}<span>${verb}</span>
      </button>
    </div>
  </article>
</li>`
}

export function renderTabs() {
  let lastBrand = null
  return CATEGORIES.map((cat, i) => {
    const sep = lastBrand && lastBrand !== cat.brand ? '<span class="tabs__sep" aria-hidden="true">AK Juice</span>' : ''
    lastBrand = cat.brand
    return `${sep}<button class="tab" role="tab" type="button" id="tab-${cat.id}" aria-controls="panel-${cat.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-tab="${i}">${esc(cat.name)}<span class="tab__count">${cat.count}</span></button>`
  }).join('')
}

export function renderPanels() {
  return CATEGORIES.map((cat, i) => {
    let n = 0
    const groups = cat.groups
      .map(
        (g) => `<div class="menu-group">
  ${g.title ? `<h3 class="menu-group__title">${esc(g.title)}</h3>` : ''}
  <ul class="menu-grid" role="list">${g.items.map((item) => dish(item, n++)).join('')}</ul>
</div>`,
      )
      .join('')
    const supp = cat.supplements
      ? `<p class="menu-note"><i data-icon="plus-circle"></i> Suppléments : ${SUPPLEMENTS.map((s) => `${s.label.toLowerCase()} ${formatDA(s.price)}`).join(', ')}.</p>`
      : ''
    return `<div class="menu-panel" role="tabpanel" id="panel-${cat.id}" aria-labelledby="tab-${cat.id}" data-panel="${i}"${i === 0 ? '' : ' hidden'}>
  <div class="menu-panel__intro">
    <h3 class="menu-panel__title">${esc(cat.name)}</h3>
    <p class="menu-panel__meta">${cat.count} choix, dès ${formatDA(cat.fromPrice)}</p>
  </div>
  ${groups}${supp}
</div>`
  }).join('')
}

const SIGNATURES = [
  { id: 'pizzas-adam-khalifa', img: 'pizza', size: 'xl', kicker: 'La pizza maison', title: 'Pizza Adam Khalifa' },
  { id: 'riz-crousty-spicy', img: 'bowl', size: 'tall', kicker: 'Riz Crousty', title: 'Spicy' },
  { id: 'sandwichs-americain-pro-max', img: 'sandwich', size: 'sm', kicker: 'Sandwich', title: 'Américain Pro Max' },
  { id: 'pizza-mega', img: 'slice', size: 'sm', kicker: 'Pizza à partager', title: 'Pizza Méga' },
]

export function renderSignatures(imgUrl) {
  // un incontournable retiré de la carte depuis le tableau de bord disparaît simplement
  return SIGNATURES.filter((s) => PRODUCTS.has(s.id))
    .map((s) => {
      const item = PRODUCTS.get(s.id)
      const verb = item.available ? (item.hasOptions ? 'Choisir' : 'Ajouter') : 'Épuisé'
      return `<article class="bento__cell bento__cell--${s.size}" data-tilt data-reveal>
  <div class="bento__media" aria-hidden="true"><img src="${imgUrl(s.img)}" alt="" loading="lazy" decoding="async" width="640" height="640"></div>
  <div class="bento__body">
    <p class="bento__kicker">${esc(s.kicker)}</p>
    <h3 class="bento__title">${esc(s.title)}</h3>
    <p class="bento__desc">${esc(item.desc ?? '')}</p>
    <div class="bento__foot">
      <span class="bento__price">${formatDA(item.fromPrice)}</span>
      <button class="btn btn--primary btn--sm" type="button" data-add="${item.id}"${item.available ? '' : ' disabled'}>${verb}${item.available ? '<i data-icon="plus"></i>' : ''}</button>
    </div>
  </div>
</article>`
    })
    .join('')
}

const JUICE_PICKS = [
  ['jus-orange', 'Jus d\'orange'],
  ['jus-power', 'Jus Power'],
  ['salades-fruits-salade-de-fruits-ak', 'Salade de fruits AK'],
  ['gaufres-pistache', 'Gaufre pistache'],
  ['crepes-dubai', 'Crêpe Dubaï'],
  ['crepes-lotus', 'Crêpe Lotus'],
]

export function renderJuicePicks() {
  return JUICE_PICKS.filter(([id]) => PRODUCTS.get(id)?.available)
    .map(([id, label]) => {
      const item = PRODUCTS.get(id)
      return `<li><button class="pick" type="button" data-add="${item.id}" aria-label="Ajouter ${esc(label)} au panier">
  <span class="pick__name">${esc(label)}</span><span class="pick__price">${formatDA(item.fromPrice)}</span><i data-icon="plus"></i>
</button></li>`
    })
    .join('')
}

/** Données structurées schema.org (Restaurant + carte) pour le référencement. */
export function renderJsonLd(site) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: site.name,
    image: 'icon-512.png',
    telephone: site.phoneIntl,
    servesCuisine: ['Fast food', 'Pizza', 'Tacos', 'Sandwichs', 'Jus frais'],
    priceRange: '200 DA - 2800 DA',
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.line1,
      addressLocality: 'Bir El Djir, Oran',
      addressCountry: 'DZ',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: site.hours.open,
        closes: site.hours.close === '24:00' ? '23:59' : site.hours.close,
      },
    ],
    sameAs: [site.socials.instagram.url, site.socials.tiktok.url],
    hasMenu: {
      '@type': 'Menu',
      hasMenuSection: CATEGORIES.map((cat) => ({
        '@type': 'MenuSection',
        name: cat.name,
        hasMenuItem: cat.groups.flatMap((g) =>
          g.items.map((item) => ({
            '@type': 'MenuItem',
            name: item.name,
            ...(item.desc ? { description: item.desc } : {}),
            offers: { '@type': 'Offer', price: item.fromPrice, priceCurrency: 'DZD' },
          })),
        ),
      })),
    },
  }
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`
}
