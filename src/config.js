/**
 * Informations du restaurant.
 * Modifiez ce fichier pour changer le numéro, les horaires ou les liens :
 * tout le site se met à jour automatiquement.
 */
export const SITE = {
  name: 'Adam & Khalifa Food',
  city: 'Oran',

  // Numéro affiché et utilisé pour les appels
  phoneDisplay: '0542 58 97 56',
  phoneIntl: '+213542589756',

  // Numéro WhatsApp qui reçoit les commandes (format international, sans "+")
  whatsapp: '213542589756',

  address: {
    line1: 'Boulevard Millénium, Résidence Panorama 1',
    line2: 'Bir El Djir, Oran',
  },

  // Lien "Itinéraire" (Google Maps) et requête utilisée pour la carte intégrée
  mapsUrl: 'https://maps.app.goo.gl/MjbEqPxe7ZycBerz6',
  mapsEmbedQuery: 'Adam & Khalifa Food, Boulevard Millénium, Bir El Djir, Oran',

  // Horaires (heure d'Algérie). close: '24:00' = minuit.
  hours: { open: '12:00', close: '24:00', label: 'Tous les jours, 12h00 - 00h00' },

  socials: {
    instagram: { handle: '@adamkhalifa_food', url: 'https://www.instagram.com/adamkhalifa_food' },
    tiktok: { handle: '@adam.khalifa.food', url: 'https://www.tiktok.com/@adam.khalifa.food' },
    juice: { handle: '@ak_juice31', url: 'https://www.instagram.com/ak_juice31' },
  },

  // Modes de commande proposés dans le panier
  orderModes: [
    { id: 'emporter', label: 'À emporter', icon: 'storefront' },
    { id: 'livraison', label: 'Livraison', icon: 'motorcycle', needsAddress: true },
  ],
  deliveryNote: 'Frais de livraison selon le quartier, confirmés au téléphone.',
}

// Carte Google Maps intégrée (générée à partir de la requête ci-dessus)
SITE.mapsEmbedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(SITE.mapsEmbedQuery)}&z=16&hl=fr&output=embed`

export const telLink = `tel:${SITE.phoneIntl}`
export const waLink = (text = '') =>
  `https://wa.me/${SITE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
