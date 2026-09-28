import { PRODUCTS, SUPPLEMENTS } from '../data/menu.js'

/**
 * Panier : lignes { id, qty, size?, choice?, picks?, supplements?, note? }
 * sauvegardées dans le navigateur (localStorage) pour ne rien perdre en cas de rechargement.
 */
const KEY = 'ak-cart-v1'
const listeners = new Set()

export const lineKey = (l) =>
  [
    l.id,
    l.size ?? '',
    l.choice ?? '',
    (l.picks ?? []).join('+'),
    [...(l.supplements ?? [])].sort().join('+'),
    (l.note ?? '').trim().toLowerCase(),
  ].join('|')

function isValid(l) {
  const p = PRODUCTS.get(l?.id)
  if (!p) return false
  if (p.sizes && !p.sizes.some((s) => s.label === l.size)) return false
  return Number.isInteger(l.qty) && l.qty > 0 && l.qty < 100
}

function read() {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(arr) ? arr.filter(isValid).map((l) => ({ ...l, key: lineKey(l) })) : []
  } catch {
    return []
  }
}

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines))
  } catch {
    /* navigation privée : le panier reste en mémoire */
  }
}

let lines = read()

export function unitPrice(l) {
  const p = PRODUCTS.get(l.id)
  const base = p.sizes ? (p.sizes.find((s) => s.label === l.size) ?? p.sizes[0]).price : p.price
  const extras = (l.supplements ?? []).reduce((sum, id) => sum + (SUPPLEMENTS.find((s) => s.id === id)?.price ?? 0), 0)
  return base + extras
}

/** Détails lisibles d'une ligne (taille, viande, parfums, suppléments, remarque). */
export function describeLine(l) {
  const out = []
  if (l.size) out.push(`Taille ${l.size}`)
  if (l.choice) out.push(l.choice)
  if (l.picks?.length) out.push(`Parfums\u00a0: ${l.picks.join(', ')}`)
  if (l.supplements?.length) {
    out.push(`Suppl. ${l.supplements.map((id) => SUPPLEMENTS.find((s) => s.id === id)?.label.toLowerCase()).join(', ')}`)
  }
  if (l.note) out.push(`«\u00a0${l.note}\u00a0»`)
  return out
}

function commit(type, detail) {
  write()
  listeners.forEach((fn) => fn(type, detail))
}

export const cart = {
  get lines() {
    return lines
  },
  count: () => lines.reduce((n, l) => n + l.qty, 0),
  total: () => lines.reduce((n, l) => n + unitPrice(l) * l.qty, 0),
  add(line) {
    const clean = {
      id: line.id,
      qty: Math.max(1, Math.min(99, line.qty || 1)),
      ...(line.size ? { size: line.size } : {}),
      ...(line.choice ? { choice: line.choice } : {}),
      ...(line.picks?.length ? { picks: line.picks } : {}),
      ...(line.supplements?.length ? { supplements: line.supplements } : {}),
      ...(line.note ? { note: line.note.slice(0, 140) } : {}),
    }
    if (!isValid(clean)) return
    const key = lineKey(clean)
    const existing = lines.find((l) => l.key === key)
    if (existing) existing.qty = Math.min(99, existing.qty + clean.qty)
    else lines.push({ ...clean, key })
    commit('add', clean)
  },
  setQty(index, qty) {
    const l = lines[index]
    if (!l) return
    if (qty <= 0) lines = lines.filter((_, i) => i !== index)
    else l.qty = Math.min(99, qty)
    commit('update')
  },
  remove(index) {
    lines = lines.filter((_, i) => i !== index)
    commit('remove')
  },
  clear() {
    lines = []
    commit('clear')
  },
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}

// synchronisation entre plusieurs onglets ouverts
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return
  lines = read()
  listeners.forEach((fn) => fn('sync'))
})
