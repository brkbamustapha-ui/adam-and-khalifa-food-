// Icônes Phosphor (graisse "bold") utilisées dans l'interface générée en JavaScript.
import set from 'virtual:icons:plus,minus,trash,check,storefront,motorcycle,sparkle,star,pepper,users-three,plus-circle,clock,x,whatsapp-logo,phone,receipt,arrow-right,warning-circle'

export const icons = set

/** Remplace les <i data-icon="nom"></i> des gabarits par le SVG (comme le fait le build pour le HTML). */
export const hydrateIcons = (html) =>
  html.replace(/<i data-icon="([\w-]+)"(?: data-weight="(\w+)")?><\/i>/g, (m, name, weight) => set[weight && weight !== 'bold' ? `${name}.${weight}` : name] ?? '')
