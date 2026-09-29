// Préférences de l'appareil (sans dépendance à three.js).
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
export const coarsePointer = window.matchMedia('(pointer: coarse)').matches
export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/**
 * WebGL 2 présent ? Simple test de l'API : créer un contexte juste pour vérifier coûte cher
 * au démarrage. Si la création échoue ensuite, le site garde ses images.
 */
export function webglAvailable() {
  if (typeof window.WebGL2RenderingContext === 'undefined') return false
  try {
    // rendu sans carte graphique déjà constaté pendant cette visite (voir three/core.js)
    return sessionStorage.getItem('ak-3d') !== 'off' || new URLSearchParams(location.search).has('3d')
  } catch {
    return true
  }
}

export const navHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72
