/**
 * Place du médaillon dans le héros, en pixels (centre x/y et diamètre), selon la taille de la section.
 * Partagée par le logo affiché dès le premier affichage (image) et par la scène 3D qui prend
 * le relais : les deux se superposent exactement, le passage de l'un à l'autre est invisible.
 */
export function medallionRect(w, h) {
  if (w / h < 0.95) {
    // écran portrait : médaillon en haut, texte en bas
    return { portrait: true, d: Math.min(w * 0.54, h * 0.28), x: w / 2, y: h * 0.3 }
  }
  return { portrait: false, d: Math.min(h * 0.44, w * 0.28), x: w * 0.7, y: h * 0.545 }
}
