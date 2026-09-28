import seed from './menu-seed.js'
import { buildMenu, formatDA } from '../../supabase/functions/ak-api/menu-core.js'

/**
 * Carte "vivante" du site : initialisée avec la carte de départ (menu-seed.js),
 * puis remplacée par celle du tableau de bord quand l'API répond.
 * Les tableaux et l'index sont modifiés sur place : tous les modules qui les importent
 * voient donc toujours la carte à jour.
 */
export { formatDA }
export const CATEGORIES = []
export const SUPPLEMENTS = []
export const PRODUCTS = new Map()
export let MENU_DOC = null

const listeners = new Set()
export const onMenuChange = (fn) => listeners.add(fn)

export function applyMenu(doc) {
  const menu = buildMenu(doc)
  CATEGORIES.splice(0, CATEGORIES.length, ...menu.categories)
  SUPPLEMENTS.splice(0, SUPPLEMENTS.length, ...menu.supplements)
  PRODUCTS.clear()
  for (const [id, item] of menu.products) PRODUCTS.set(id, item)
  MENU_DOC = doc
  listeners.forEach((fn) => fn())
}

/** Vue "menu" attendue par les fonctions partagées (priceLine, describeLine). */
export const menuView = () => ({ categories: CATEGORIES, products: PRODUCTS, supplements: SUPPLEMENTS })

applyMenu(seed)
