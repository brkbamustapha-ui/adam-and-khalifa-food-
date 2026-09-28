/**
 * Logique de la carte partagée par le site (build et navigateur), le tableau de bord
 * et l'API (Supabase Edge Function). Aucune dépendance : JavaScript standard (importé aussi par le site, voir src/data/menu.js).
 *
 * Document "carte" enregistré en base :
 * {
 *   supplements: [{ id, label, price }],
 *   categories: [{
 *     id, name, singular, brand: 'food' | 'juice', model, supplements: bool, visible: bool,
 *     items: [{ id, name, group?, desc?, price? | sizes?: [{ label, price }],
 *               choice?: { label, options: [] }, pick?: { label, count, from },
 *               tags?: [], image?: url, available?: bool, hidden?: bool }]
 *   }]
 * }
 */

export const MODELS = ['pizza', 'sandwich', 'tacos', 'fajitas', 'bowl', 'box', 'fries', 'juice', 'fruitsalad', 'waffle', 'crepe']
export const TAGS = ['new', 'signature', 'spicy', 'share']
export const BRANDS = ['food', 'juice']

export class MenuError extends Error {}

export const formatDA = (n) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/ | /g, ' ')} DA`

export const slugify = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)

/** Structure prête à l'emploi : catégories avec groupes, index des produits, suppléments. */
export function buildMenu(doc) {
  const supplements = (doc?.supplements ?? []).map((s) => ({ ...s }))
  const products = new Map()
  const categories = []
  for (const c of doc?.categories ?? []) {
    if (c.visible === false) continue
    const cat = {
      id: c.id,
      name: c.name,
      singular: c.singular ?? '',
      brand: c.brand ?? 'food',
      model: MODELS.includes(c.model) ? c.model : 'box',
      supplements: Boolean(c.supplements),
      groups: [],
      count: 0,
      fromPrice: Infinity,
    }
    const byGroup = new Map()
    for (const raw of c.items ?? []) {
      if (raw.hidden) continue
      const item = { ...raw, tags: [...(raw.tags ?? [])], category: cat, available: raw.available !== false }
      item.fromPrice = item.sizes?.length ? Math.min(...item.sizes.map((s) => s.price)) : item.price
      item.hasOptions = Boolean(item.sizes?.length || item.choice || item.pick || cat.supplements)
      const prefix = cat.singular && !item.name.toLowerCase().includes(cat.singular.toLowerCase())
      item.fullName = prefix ? `${cat.singular} ${item.name}` : item.name
      const key = item.group || ''
      if (!byGroup.has(key)) {
        const g = { title: key || null, items: [] }
        byGroup.set(key, g)
        cat.groups.push(g)
      }
      byGroup.get(key).items.push(item)
      cat.count++
      cat.fromPrice = Math.min(cat.fromPrice, item.fromPrice)
      products.set(item.id, item)
    }
    if (cat.count) categories.push(cat)
  }
  // choix multiple "parmi une catégorie" (ex : les 4 parfums de la Pizza Méga)
  for (const item of products.values()) {
    if (!item.pick?.from) continue
    const options = [...products.values()]
      .filter((p) => p.category.id === item.pick.from && !p.pick && p.available)
      .map((p) => p.name)
    item.pick = { ...item.pick, options }
  }
  return { categories, products, supplements }
}

/** Détails lisibles d'une ligne de commande (taille, viande, parfums, suppléments, remarque). */
export function describeLine(menu, line) {
  const out = []
  if (line.size) out.push(`Taille ${line.size}`)
  if (line.choice) out.push(line.choice)
  if (line.picks?.length) out.push(`Parfums : ${line.picks.join(', ')}`)
  if (line.supplements?.length) {
    const labels = line.supplements.map((id) => menu.supplements.find((s) => s.id === id)?.label.toLowerCase() ?? id)
    out.push(`Suppl. ${labels.join(', ')}`)
  }
  if (line.note) out.push(`« ${line.note} »`)
  return out
}

/**
 * Vérifie une ligne de commande et calcule son prix unitaire à partir de la carte.
 * Le prix envoyé par le navigateur n'est jamais utilisé.
 */
export function priceLine(menu, line) {
  const p = menu.products.get(String(line?.id ?? ''))
  if (!p) throw new MenuError("Un produit de ton panier n'est plus à la carte.")
  if (!p.available) throw new MenuError(`${p.fullName} est épuisé pour le moment.`)
  const clean = { id: p.id }
  let base
  if (p.sizes?.length) {
    const s = p.sizes.find((x) => x.label === line.size)
    if (!s) throw new MenuError(`Choisis une taille pour ${p.fullName}.`)
    base = s.price
    clean.size = s.label
  } else {
    base = p.price
  }
  if (p.choice) {
    if (!p.choice.options.includes(line.choice)) throw new MenuError(`Précise ton choix pour ${p.fullName}.`)
    clean.choice = line.choice
  }
  if (p.pick) {
    const picks = [...new Set(Array.isArray(line.picks) ? line.picks : [])]
    if (!picks.length || picks.length > p.pick.count || picks.some((x) => !p.pick.options.includes(x))) {
      throw new MenuError(`Choisis jusqu'à ${p.pick.count} parfums pour ${p.fullName}.`)
    }
    clean.picks = picks
  }
  let extras = 0
  if (p.category.supplements && Array.isArray(line.supplements) && line.supplements.length) {
    const ids = [...new Set(line.supplements)]
    const found = ids.map((id) => menu.supplements.find((s) => s.id === id))
    if (found.some((s) => !s)) throw new MenuError('Un supplément choisi n’existe plus.')
    extras = found.reduce((sum, s) => sum + s.price, 0)
    clean.supplements = ids
  }
  const note = String(line.note ?? '').trim().slice(0, 140)
  if (note) clean.note = note
  return { product: p, unit: base + extras, line: clean }
}

// ---------------------------------------------------------------------------------------------
// Validation du document "carte" envoyé par le tableau de bord
// ---------------------------------------------------------------------------------------------
const str = (v, max, field, { required = true } = {}) => {
  const s = String(v ?? '').trim()
  if (required && !s) throw new MenuError(`${field} est obligatoire.`)
  if (s.length > max) throw new MenuError(`${field} : ${max} caractères maximum.`)
  return s
}
const price = (v, field) => {
  const n = Number(v)
  if (!Number.isInteger(n) || n < 0 || n > 200000) throw new MenuError(`${field} : prix invalide (nombre entier en DA).`)
  return n
}

export function validateMenuDoc(doc, { imageBase = '' } = {}) {
  if (!doc || typeof doc !== 'object') throw new MenuError('Carte invalide.')
  const supplements = (Array.isArray(doc.supplements) ? doc.supplements : []).slice(0, 20).map((s, i) => {
    const label = str(s.label, 30, `Supplément ${i + 1}`)
    return { id: slugify(s.id || label) || `supp-${i + 1}`, label, price: price(s.price, `Supplément « ${label} »`) }
  })
  if (new Set(supplements.map((s) => s.id)).size !== supplements.length) throw new MenuError('Deux suppléments ont le même nom.')

  const cats = Array.isArray(doc.categories) ? doc.categories : []
  if (!cats.length) throw new MenuError('La carte doit contenir au moins une catégorie.')
  if (cats.length > 40) throw new MenuError('40 catégories maximum.')
  const catIds = new Set()
  const itemIds = new Set()
  let itemCount = 0

  const categories = cats.map((c, ci) => {
    const name = str(c.name, 40, `Nom de la catégorie ${ci + 1}`)
    const id = slugify(c.id || name) || `categorie-${ci + 1}`
    if (catIds.has(id)) throw new MenuError(`Deux catégories ont le même identifiant (${name}).`)
    catIds.add(id)
    const items = (Array.isArray(c.items) ? c.items : []).map((it, ii) => {
      const iname = str(it.name, 60, `Nom du produit ${ii + 1} (${name})`)
      let iid = slugify(it.id) || `${id}-${slugify(iname)}`
      while (itemIds.has(iid)) iid = `${iid}-${ii}`
      itemIds.add(iid)
      const out = { id: iid, name: iname }
      const group = str(it.group, 40, 'Groupe', { required: false })
      if (group) out.group = group
      const desc = str(it.desc, 220, `Description de « ${iname} »`, { required: false })
      if (desc) out.desc = desc
      if (Array.isArray(it.sizes) && it.sizes.length) {
        out.sizes = it.sizes.slice(0, 6).map((s) => ({
          label: str(s.label, 12, `Taille de « ${iname} »`),
          price: price(s.price, `Taille ${s.label} de « ${iname} »`),
        }))
        if (new Set(out.sizes.map((s) => s.label)).size !== out.sizes.length) throw new MenuError(`« ${iname} » : deux tailles portent le même nom.`)
      } else {
        out.price = price(it.price, `« ${iname} »`)
      }
      if (it.choice && Array.isArray(it.choice.options)) {
        const options = [...new Set(it.choice.options.map((o) => str(o, 40, `Option de « ${iname} »`)).filter(Boolean))].slice(0, 10)
        if (options.length >= 2) out.choice = { label: str(it.choice.label || 'Choix', 30, 'Libellé du choix'), options }
      }
      if (it.pick && it.pick.from) {
        const count = Number(it.pick.count)
        if (!Number.isInteger(count) || count < 1 || count > 8) throw new MenuError(`« ${iname} » : nombre de parfums invalide.`)
        out.pick = { label: str(it.pick.label || 'Tes parfums', 40, 'Libellé des parfums'), count, from: slugify(it.pick.from) }
      }
      const tags = (Array.isArray(it.tags) ? it.tags : []).filter((t) => TAGS.includes(t))
      if (tags.length) out.tags = [...new Set(tags)]
      if (it.image) {
        const url = String(it.image)
        if (!imageBase || !url.startsWith(imageBase) || !/^[\w\-./:%]+$/.test(url)) throw new MenuError(`Photo invalide pour « ${iname} ».`)
        out.image = url
      }
      if (it.available === false) out.available = false
      if (it.hidden) out.hidden = true
      itemCount++
      return out
    })
    return {
      id,
      name,
      singular: str(c.singular, 30, 'Nom au singulier', { required: false }),
      brand: BRANDS.includes(c.brand) ? c.brand : 'food',
      model: MODELS.includes(c.model) ? c.model : 'box',
      supplements: Boolean(c.supplements),
      visible: c.visible !== false,
      items,
    }
  })
  if (itemCount > 600) throw new MenuError('600 produits maximum.')
  for (const c of categories) {
    for (const it of c.items) {
      if (it.pick && !catIds.has(it.pick.from)) throw new MenuError(`« ${it.name} » : catégorie des parfums introuvable.`)
    }
  }
  return { supplements, categories }
}

/** Numéros algériens : mobile (05, 06, 07), fixe (02, 03, 04) ou format international +213. */
export function normalizePhone(raw) {
  let d = String(raw ?? '').replace(/[^\d+]/g, '')
  if (d.startsWith('+213')) d = `0${d.slice(4)}`
  else if (d.startsWith('00213')) d = `0${d.slice(5)}`
  else if (d.startsWith('213') && d.length === 12) d = `0${d.slice(3)}`
  if (/^0[567]\d{8}$/.test(d) || /^0[234]\d{7,8}$/.test(d)) return d
  return null
}
