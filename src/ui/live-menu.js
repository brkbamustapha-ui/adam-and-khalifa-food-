import { MENU_DOC, applyMenu } from '../data/menu.js'
import { renderTabs, renderPanels, renderSignatures, renderJuicePicks } from '../render/templates.js'
import { renderUrl } from './renders.js'
import { hydrateIcons } from './icons.js'
import { api } from './api.js'

/**
 * Carte en direct : le HTML est généré au build avec la carte de départ, puis la carte
 * publiée depuis le tableau de bord (prix, photos, plats épuisés…) la remplace au chargement.
 * Renvoie true si la page a été mise à jour.
 */
export async function loadLiveMenu() {
  const res = await api('/menu', { timeout: 8000 })
  const doc = res.ok ? res.data.menu : null
  if (!doc?.categories?.length || JSON.stringify(doc) === JSON.stringify(MENU_DOC)) return false
  try {
    applyMenu(doc)
  } catch (err) {
    console.warn('Carte en ligne illisible, carte de départ conservée :', err)
    return false
  }
  const set = (sel, html) => {
    const el = document.querySelector(sel)
    if (el) el.innerHTML = hydrateIcons(html)
  }
  set('[data-tabs]', renderTabs())
  set('[data-panels]', renderPanels())
  set('[data-bento]', renderSignatures(renderUrl))
  set('[data-picks]', renderJuicePicks())
  return true
}
