/**
 * La carte d'Adam & Khalifa Food et d'AK Juice.
 * Prix en dinars algériens (DA). Pour modifier un prix ou ajouter un produit,
 * il suffit d'éditer ce fichier.
 *
 * Champs d'un produit :
 *   name, price, desc      nom, prix de base, ingrédients
 *   tags                   'new' | 'signature' | 'spicy' | 'share'
 *   sizes                  tailles au choix [{ label, price }] (remplace price)
 *   choice                 choix obligatoire sans supplément de prix
 *   pick                   choix multiple (ex : 4 parfums de la Pizza Méga)
 *
 * Champ "singular" d'une catégorie : préfixe utilisé dans le message de commande
 * (ex : "Gaufre Chocolat" plutôt que "Chocolat").
 */

/** Suppléments proposés sur les plats salés. */
export const SUPPLEMENTS = [
  { id: 'fromage', label: 'Fromage', price: 200 },
  { id: 'viande', label: 'Viande', price: 250 },
  { id: 'crevettes', label: 'Crevettes', price: 350 },
]

const MEAT_CHOICE = { label: 'Viande', options: ['Poulet', 'Viande hachée'] }
const TACOS_SIZES = (m, l) => [
  { label: 'M', price: m },
  { label: 'L', price: l },
]

const RED_PIZZAS = [
  { name: 'Margherita', price: 450, desc: 'Sauce tomate, fromage, gruyère' },
  { name: 'Végétarienne', price: 550, desc: 'Sauce tomate, oignons, tomates, poivron, champignons, fromage, gruyère' },
  { name: 'Pepperoni', price: 600, desc: 'Sauce tomate, pepperoni, fromage, gruyère' },
  { name: 'Fumato', price: 700, desc: 'Sauce tomate, dinde fumée, fromage, gruyère' },
  { name: 'Thon', price: 750, desc: 'Sauce tomate, thon, fromage, gruyère' },
  { name: 'Poulet', price: 750, desc: 'Sauce tomate, poulet, fromage, gruyère' },
  { name: 'Mexicain', price: 800, desc: 'Sauce tomate, poulet, piment, poivron, oignon, fromage, gruyère', tags: ['spicy'] },
  { name: 'Buffalo', price: 850, desc: 'Sauce tomate, viande hachée, fromage, gruyère' },
  { name: 'Mixte', price: 850, desc: 'Sauce tomate, viande hachée, poulet, fromage, gruyère' },
]

const WHITE_PIZZAS = [
  { name: 'Blanche Neige', price: 600, desc: 'Sauce fromagère, champignons, fromage, gruyère' },
  { name: 'Pané', price: 750, desc: 'Sauce fromagère, poulet pané, fromage, gruyère' },
  { name: 'Fermière', price: 850, desc: 'Sauce fromagère, poulet, champignons, fromage, gruyère' },
  { name: 'Havana', price: 850, desc: 'Sauce fromagère, poulet, dinde fumée, fromage, gruyère' },
  { name: '4 Fromages', price: 850, desc: 'Sauce fromagère, cheddar, camembert, mozzarella, gruyère' },
  { name: 'Maestro', price: 900, desc: 'Sauce fromagère, poulet, camembert, fromage, gruyère' },
  { name: 'Adam Khalifa', price: 1000, desc: 'Sauce fromagère, viande hachée, poulet, crevettes, camembert, gruyère', tags: ['signature'] },
  { name: 'La Marinière', price: 1400, desc: 'Sauce fromagère, crevettes, poulet, fromage, gruyère' },
  { name: 'Océan', price: 1700, desc: 'Sauce fromagère, crevettes, calamars ou passamar, fromage, gruyère' },
]

export const CATEGORIES = [
  {
    id: 'pizzas',
    name: 'Pizzas',
    singular: 'Pizza',
    brand: 'food',
    model: 'pizza',
    supplements: true,
    groups: [
      { title: 'Sauce rouge', items: RED_PIZZAS },
      { title: 'Sauce blanche', items: WHITE_PIZZAS },
      {
        title: 'À partager',
        items: [
          {
            id: 'pizza-mega',
            name: 'Pizza Méga',
            price: 2800,
            desc: 'Une grande pizza, 4 parfums au choix parmi toute la carte',
            tags: ['share'],
            pick: {
              label: "Tes parfums (jusqu'à 4)",
              count: 4,
              options: [...RED_PIZZAS, ...WHITE_PIZZAS].map((p) => p.name),
            },
          },
        ],
      },
    ],
  },
  {
    id: 'sandwichs',
    name: 'Sandwichs',
    singular: 'Sandwich',
    brand: 'food',
    model: 'sandwich',
    supplements: true,
    groups: [
      {
        items: [
          { name: 'Easy', price: 350, desc: 'Poulet, sauce fromagère, frites, sauce maison, salade, tomates' },
          { name: 'Suisse', price: 500, desc: 'Poulet, gruyère, sauce fromagère, sauce maison, salade, tomates' },
          { name: 'Le Fermier', price: 500, desc: 'Poulet, camembert, sauce fromagère, sauce maison, salade, tomates' },
          { name: 'Le Pané', price: 500, desc: 'Poulet pané, gruyère, sauce fromagère, sauce maison, salade, tomates' },
          { name: 'Le Caramélisé', price: 550, desc: 'Poulet, gruyère, oignons caramélisés, sauce fromagère, sauce maison, salade, tomates' },
          { name: 'Volcano', price: 550, desc: 'Poulet, gruyère, piment, sauce fromagère, sauce maison, salade, tomates', tags: ['spicy'] },
          { name: 'Le Parisien', price: 650, desc: 'Poulet, champignons, gruyère, sauce fromagère, sauce maison, salade, tomates' },
          { name: 'Extra Fromage', price: 650, desc: 'Poulet, extra gruyère, sauce fromagère, sauce maison, salade, tomates', tags: ['new'] },
          { name: 'Le Top', price: 650, desc: 'Poulet ou viande hachée, gruyère, dinde fumée, sauce fromagère, sauce maison, salade, tomates', choice: MEAT_CHOICE },
          { name: 'Américain Pro Max', price: 750, desc: '4 viandes hachées, gruyère, sauce fromagère, sauce maison, salade, tomates' },
          { name: 'Mix', price: 750, desc: 'Poulet, viande hachée, gruyère, sauce fromagère, sauce maison, salade, tomates' },
          { name: 'Marinière', price: 800, desc: 'Crevettes, poulet, gruyère, sauce fromagère, sauce maison, salade, tomates' },
          { name: 'Crevette Pro Max', price: 1300, desc: '100 % crevettes, gruyère, sauce fromagère, sauce maison, salade, tomates' },
        ],
      },
    ],
  },
  {
    id: 'tacos',
    name: 'Tacos',
    singular: 'Tacos',
    brand: 'food',
    model: 'tacos',
    supplements: true,
    groups: [
      {
        items: [
          { name: 'Chicken', desc: 'Poulet', sizes: TACOS_SIZES(700, 900) },
          { name: 'Viande hachée', desc: 'Viande hachée', sizes: TACOS_SIZES(750, 950) },
          { name: 'Mixte', desc: 'Poulet et viande hachée', sizes: TACOS_SIZES(800, 950) },
        ],
      },
    ],
  },
  {
    id: 'fajitas',
    name: 'Fajitas',
    singular: 'Fajitas',
    brand: 'food',
    model: 'fajitas',
    supplements: true,
    groups: [
      {
        items: [
          { name: 'Poulet', price: 600, desc: 'Galette roulée au poulet' },
          { name: 'Viande hachée', price: 700, desc: 'Galette roulée à la viande hachée' },
          { name: 'Mixte', price: 700, desc: 'Poulet et viande hachée' },
        ],
      },
    ],
  },
  {
    id: 'riz-crousty',
    name: 'Riz Crousty',
    singular: 'Riz Crousty',
    brand: 'food',
    model: 'bowl',
    supplements: true,
    groups: [
      {
        items: [
          { name: 'Crispé', price: 750, desc: 'Riz, sauce Crousty, poulet pané' },
          { name: 'Spicy', price: 850, desc: 'Riz, sauce Crousty, poulet pané, sauce spicy', tags: ['spicy'] },
          { name: 'Crevette', price: 1000, desc: 'Riz, sauce Crousty, crevettes' },
        ],
      },
    ],
  },
  {
    id: 'box',
    name: 'Box',
    singular: 'Box',
    brand: 'food',
    model: 'box',
    supplements: true,
    groups: [
      {
        items: [
          { name: 'Simple', price: 500, desc: 'Poulet ou viande hachée, sauce fromagère, frites', choice: MEAT_CHOICE },
          { name: 'Fromage', price: 650, desc: 'Poulet ou viande hachée, sauce fromagère, gruyère, frites', choice: MEAT_CHOICE },
          { name: 'Fish', price: 900, desc: 'Crevettes, sauce fromagère, gruyère, frites' },
        ],
      },
    ],
  },
  {
    id: 'frites',
    name: 'Frites',
    singular: '',
    brand: 'food',
    model: 'fries',
    groups: [
      {
        items: [
          { name: 'Frites simples', price: 200, desc: 'Portion de frites' },
          { name: 'Menu frites + canette', price: 250, desc: 'Frites et une canette' },
        ],
      },
    ],
  },
  {
    id: 'jus',
    name: 'Jus',
    singular: 'Jus',
    brand: 'juice',
    model: 'juice',
    groups: [
      {
        items: [
          { name: 'Orange', price: 250 },
          { name: 'Citron', price: 250 },
          { name: 'Orange-citron', price: 350 },
          { name: 'Banane', price: 400 },
          { name: 'Power', price: 500, desc: '10 g de protéines : dattes, noix, banane, lait' },
          { name: '1 fruit au choix', price: 500, desc: 'Précise ton fruit dans la remarque' },
          { name: '2 fruits au choix', price: 550, desc: 'Précise tes fruits dans la remarque' },
          { name: '3 fruits au choix', price: 600, desc: 'Précise tes fruits dans la remarque' },
          { name: 'Fruits tropical', price: 800 },
        ],
      },
    ],
  },
  {
    id: 'salades-fruits',
    name: 'Salades de fruits',
    singular: 'Salade de fruits',
    brand: 'juice',
    model: 'fruitsalad',
    groups: [
      {
        items: [
          { name: 'Salade de fruits AK', price: 500, desc: "Fruits de saison et jus d'orange" },
          { name: 'Chocolat', price: 600, desc: 'Salade de fruits au chocolat' },
          { name: 'Tropical', price: 900, desc: 'Salade de fruits tropicaux' },
        ],
      },
    ],
  },
  {
    id: 'gaufres',
    name: 'Gaufres',
    singular: 'Gaufre',
    brand: 'juice',
    model: 'waffle',
    groups: [
      {
        items: [
          { name: 'Chocolat', price: 300 },
          { name: 'Banane', price: 400 },
          { name: 'Fraise', price: 500 },
          { name: 'Pistache', price: 500 },
          { name: 'Fraise-banane', price: 550 },
          { name: 'Mix de fruits', price: 550 },
        ],
      },
    ],
  },
  {
    id: 'crepes',
    name: 'Crêpes',
    singular: 'Crêpe',
    brand: 'juice',
    model: 'crepe',
    groups: [
      {
        items: [
          { name: 'Chocolat', price: 300 },
          { name: 'Banane', price: 400 },
          { name: 'Spéciale', price: 450 },
          { name: 'Fraise', price: 500 },
          { name: 'Dubaï', price: 500 },
          { name: 'Fraise-banane', price: 550 },
          { name: 'Lotus', price: 550 },
          { name: 'Mix de fruits', price: 550 },
          { name: 'Sushi', price: 650 },
        ],
      },
    ],
  },
]

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

/** Index de tous les produits par identifiant, avec leur catégorie. */
export const PRODUCTS = new Map()

for (const cat of CATEGORIES) {
  cat.count = 0
  let min = Infinity
  for (const group of cat.groups) {
    for (const item of group.items) {
      item.id ??= `${cat.id}-${slug(item.name)}`
      item.tags ??= []
      item.category = cat
      item.fromPrice = item.sizes ? Math.min(...item.sizes.map((s) => s.price)) : item.price
      item.hasOptions = Boolean(item.sizes || item.choice || item.pick || cat.supplements)
      const prefix = cat.singular && !item.name.toLowerCase().includes(cat.singular.toLowerCase())
      item.fullName = prefix ? `${cat.singular} ${item.name}` : item.name
      min = Math.min(min, item.fromPrice)
      cat.count++
      PRODUCTS.set(item.id, item)
    }
  }
  cat.fromPrice = min
}

export const formatDA = (n) => `${n.toLocaleString('fr-FR').replace(/ | /g, ' ')} DA`
