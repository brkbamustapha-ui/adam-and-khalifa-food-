// Préférences de l'appareil (sans dépendance à three.js).
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
export const coarsePointer = window.matchMedia('(pointer: coarse)').matches
export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return Boolean(window.WebGL2RenderingContext && c.getContext('webgl2'))
  } catch {
    return false
  }
}

export const navHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72
