/**
 * Carte de départ d'Adam & Khalifa Food et d'AK Juice (prix en DA).
 * Elle est intégrée au site au moment du build, puis remplacée par la carte
 * modifiée depuis le tableau de bord (/admin) dès qu'elle est chargée.
 */
export default {
  "supplements": [
    {
      "id": "fromage",
      "label": "Fromage",
      "price": 200
    },
    {
      "id": "viande",
      "label": "Viande",
      "price": 250
    },
    {
      "id": "crevettes",
      "label": "Crevettes",
      "price": 350
    }
  ],
  "categories": [
    {
      "id": "pizzas",
      "name": "Pizzas",
      "singular": "Pizza",
      "brand": "food",
      "model": "pizza",
      "supplements": true,
      "visible": true,
      "items": [
        {
          "id": "pizzas-margherita",
          "name": "Margherita",
          "group": "Sauce rouge",
          "desc": "Sauce tomate, fromage, gruyère",
          "price": 450
        },
        {
          "id": "pizzas-vegetarienne",
          "name": "Végétarienne",
          "group": "Sauce rouge",
          "desc": "Sauce tomate, oignons, tomates, poivron, champignons, fromage, gruyère",
          "price": 550
        },
        {
          "id": "pizzas-pepperoni",
          "name": "Pepperoni",
          "group": "Sauce rouge",
          "desc": "Sauce tomate, pepperoni, fromage, gruyère",
          "price": 600
        },
        {
          "id": "pizzas-fumato",
          "name": "Fumato",
          "group": "Sauce rouge",
          "desc": "Sauce tomate, dinde fumée, fromage, gruyère",
          "price": 700
        },
        {
          "id": "pizzas-thon",
          "name": "Thon",
          "group": "Sauce rouge",
          "desc": "Sauce tomate, thon, fromage, gruyère",
          "price": 750
        },
        {
          "id": "pizzas-poulet",
          "name": "Poulet",
          "group": "Sauce rouge",
          "desc": "Sauce tomate, poulet, fromage, gruyère",
          "price": 750
        },
        {
          "id": "pizzas-mexicain",
          "name": "Mexicain",
          "group": "Sauce rouge",
          "desc": "Sauce tomate, poulet, piment, poivron, oignon, fromage, gruyère",
          "price": 800,
          "tags": [
            "spicy"
          ]
        },
        {
          "id": "pizzas-buffalo",
          "name": "Buffalo",
          "group": "Sauce rouge",
          "desc": "Sauce tomate, viande hachée, fromage, gruyère",
          "price": 850
        },
        {
          "id": "pizzas-mixte",
          "name": "Mixte",
          "group": "Sauce rouge",
          "desc": "Sauce tomate, viande hachée, poulet, fromage, gruyère",
          "price": 850
        },
        {
          "id": "pizzas-blanche-neige",
          "name": "Blanche Neige",
          "group": "Sauce blanche",
          "desc": "Sauce fromagère, champignons, fromage, gruyère",
          "price": 600
        },
        {
          "id": "pizzas-pane",
          "name": "Pané",
          "group": "Sauce blanche",
          "desc": "Sauce fromagère, poulet pané, fromage, gruyère",
          "price": 750
        },
        {
          "id": "pizzas-fermiere",
          "name": "Fermière",
          "group": "Sauce blanche",
          "desc": "Sauce fromagère, poulet, champignons, fromage, gruyère",
          "price": 850
        },
        {
          "id": "pizzas-havana",
          "name": "Havana",
          "group": "Sauce blanche",
          "desc": "Sauce fromagère, poulet, dinde fumée, fromage, gruyère",
          "price": 850
        },
        {
          "id": "pizzas-4-fromages",
          "name": "4 Fromages",
          "group": "Sauce blanche",
          "desc": "Sauce fromagère, cheddar, camembert, mozzarella, gruyère",
          "price": 850
        },
        {
          "id": "pizzas-maestro",
          "name": "Maestro",
          "group": "Sauce blanche",
          "desc": "Sauce fromagère, poulet, camembert, fromage, gruyère",
          "price": 900
        },
        {
          "id": "pizzas-adam-khalifa",
          "name": "Adam Khalifa",
          "group": "Sauce blanche",
          "desc": "Sauce fromagère, viande hachée, poulet, crevettes, camembert, gruyère",
          "price": 1000,
          "tags": [
            "signature"
          ]
        },
        {
          "id": "pizzas-la-mariniere",
          "name": "La Marinière",
          "group": "Sauce blanche",
          "desc": "Sauce fromagère, crevettes, poulet, fromage, gruyère",
          "price": 1400
        },
        {
          "id": "pizzas-ocean",
          "name": "Océan",
          "group": "Sauce blanche",
          "desc": "Sauce fromagère, crevettes, calamars ou passamar, fromage, gruyère",
          "price": 1700
        },
        {
          "id": "pizza-mega",
          "name": "Pizza Méga",
          "group": "À partager",
          "desc": "Une grande pizza, 4 parfums au choix parmi toute la carte",
          "price": 2800,
          "pick": {
            "label": "Tes parfums (jusqu'à 4)",
            "count": 4,
            "from": "pizzas"
          },
          "tags": [
            "share"
          ]
        }
      ]
    },
    {
      "id": "sandwichs",
      "name": "Sandwichs",
      "singular": "Sandwich",
      "brand": "food",
      "model": "sandwich",
      "supplements": true,
      "visible": true,
      "items": [
        {
          "id": "sandwichs-easy",
          "name": "Easy",
          "desc": "Poulet, sauce fromagère, frites, sauce maison, salade, tomates",
          "price": 350
        },
        {
          "id": "sandwichs-suisse",
          "name": "Suisse",
          "desc": "Poulet, gruyère, sauce fromagère, sauce maison, salade, tomates",
          "price": 500
        },
        {
          "id": "sandwichs-le-fermier",
          "name": "Le Fermier",
          "desc": "Poulet, camembert, sauce fromagère, sauce maison, salade, tomates",
          "price": 500
        },
        {
          "id": "sandwichs-le-pane",
          "name": "Le Pané",
          "desc": "Poulet pané, gruyère, sauce fromagère, sauce maison, salade, tomates",
          "price": 500
        },
        {
          "id": "sandwichs-le-caramelise",
          "name": "Le Caramélisé",
          "desc": "Poulet, gruyère, oignons caramélisés, sauce fromagère, sauce maison, salade, tomates",
          "price": 550
        },
        {
          "id": "sandwichs-volcano",
          "name": "Volcano",
          "desc": "Poulet, gruyère, piment, sauce fromagère, sauce maison, salade, tomates",
          "price": 550,
          "tags": [
            "spicy"
          ]
        },
        {
          "id": "sandwichs-le-parisien",
          "name": "Le Parisien",
          "desc": "Poulet, champignons, gruyère, sauce fromagère, sauce maison, salade, tomates",
          "price": 650
        },
        {
          "id": "sandwichs-extra-fromage",
          "name": "Extra Fromage",
          "desc": "Poulet, extra gruyère, sauce fromagère, sauce maison, salade, tomates",
          "price": 650,
          "tags": [
            "new"
          ]
        },
        {
          "id": "sandwichs-le-top",
          "name": "Le Top",
          "desc": "Poulet ou viande hachée, gruyère, dinde fumée, sauce fromagère, sauce maison, salade, tomates",
          "price": 650,
          "choice": {
            "label": "Viande",
            "options": [
              "Poulet",
              "Viande hachée"
            ]
          }
        },
        {
          "id": "sandwichs-americain-pro-max",
          "name": "Américain Pro Max",
          "desc": "4 viandes hachées, gruyère, sauce fromagère, sauce maison, salade, tomates",
          "price": 750
        },
        {
          "id": "sandwichs-mix",
          "name": "Mix",
          "desc": "Poulet, viande hachée, gruyère, sauce fromagère, sauce maison, salade, tomates",
          "price": 750
        },
        {
          "id": "sandwichs-mariniere",
          "name": "Marinière",
          "desc": "Crevettes, poulet, gruyère, sauce fromagère, sauce maison, salade, tomates",
          "price": 800
        },
        {
          "id": "sandwichs-crevette-pro-max",
          "name": "Crevette Pro Max",
          "desc": "100 % crevettes, gruyère, sauce fromagère, sauce maison, salade, tomates",
          "price": 1300
        }
      ]
    },
    {
      "id": "tacos",
      "name": "Tacos",
      "singular": "Tacos",
      "brand": "food",
      "model": "tacos",
      "supplements": true,
      "visible": true,
      "items": [
        {
          "id": "tacos-chicken",
          "name": "Chicken",
          "desc": "Poulet",
          "sizes": [
            {
              "label": "M",
              "price": 700
            },
            {
              "label": "L",
              "price": 900
            }
          ]
        },
        {
          "id": "tacos-viande-hachee",
          "name": "Viande hachée",
          "desc": "Viande hachée",
          "sizes": [
            {
              "label": "M",
              "price": 750
            },
            {
              "label": "L",
              "price": 950
            }
          ]
        },
        {
          "id": "tacos-mixte",
          "name": "Mixte",
          "desc": "Poulet et viande hachée",
          "sizes": [
            {
              "label": "M",
              "price": 800
            },
            {
              "label": "L",
              "price": 950
            }
          ]
        }
      ]
    },
    {
      "id": "fajitas",
      "name": "Fajitas",
      "singular": "Fajitas",
      "brand": "food",
      "model": "fajitas",
      "supplements": true,
      "visible": true,
      "items": [
        {
          "id": "fajitas-poulet",
          "name": "Poulet",
          "desc": "Galette roulée au poulet",
          "price": 600
        },
        {
          "id": "fajitas-viande-hachee",
          "name": "Viande hachée",
          "desc": "Galette roulée à la viande hachée",
          "price": 700
        },
        {
          "id": "fajitas-mixte",
          "name": "Mixte",
          "desc": "Poulet et viande hachée",
          "price": 700
        }
      ]
    },
    {
      "id": "riz-crousty",
      "name": "Riz Crousty",
      "singular": "Riz Crousty",
      "brand": "food",
      "model": "bowl",
      "supplements": true,
      "visible": true,
      "items": [
        {
          "id": "riz-crousty-crispe",
          "name": "Crispé",
          "desc": "Riz, sauce Crousty, poulet pané",
          "price": 750
        },
        {
          "id": "riz-crousty-spicy",
          "name": "Spicy",
          "desc": "Riz, sauce Crousty, poulet pané, sauce spicy",
          "price": 850,
          "tags": [
            "spicy"
          ]
        },
        {
          "id": "riz-crousty-crevette",
          "name": "Crevette",
          "desc": "Riz, sauce Crousty, crevettes",
          "price": 1000
        }
      ]
    },
    {
      "id": "box",
      "name": "Box",
      "singular": "Box",
      "brand": "food",
      "model": "box",
      "supplements": true,
      "visible": true,
      "items": [
        {
          "id": "box-simple",
          "name": "Simple",
          "desc": "Poulet ou viande hachée, sauce fromagère, frites",
          "price": 500,
          "choice": {
            "label": "Viande",
            "options": [
              "Poulet",
              "Viande hachée"
            ]
          }
        },
        {
          "id": "box-fromage",
          "name": "Fromage",
          "desc": "Poulet ou viande hachée, sauce fromagère, gruyère, frites",
          "price": 650,
          "choice": {
            "label": "Viande",
            "options": [
              "Poulet",
              "Viande hachée"
            ]
          }
        },
        {
          "id": "box-fish",
          "name": "Fish",
          "desc": "Crevettes, sauce fromagère, gruyère, frites",
          "price": 900
        }
      ]
    },
    {
      "id": "frites",
      "name": "Frites",
      "singular": "",
      "brand": "food",
      "model": "fries",
      "supplements": false,
      "visible": true,
      "items": [
        {
          "id": "frites-frites-simples",
          "name": "Frites simples",
          "desc": "Portion de frites",
          "price": 200
        },
        {
          "id": "frites-menu-frites-canette",
          "name": "Menu frites + canette",
          "desc": "Frites et une canette",
          "price": 250
        }
      ]
    },
    {
      "id": "jus",
      "name": "Jus",
      "singular": "Jus",
      "brand": "juice",
      "model": "juice",
      "supplements": false,
      "visible": true,
      "items": [
        {
          "id": "jus-orange",
          "name": "Orange",
          "price": 250
        },
        {
          "id": "jus-citron",
          "name": "Citron",
          "price": 250
        },
        {
          "id": "jus-orange-citron",
          "name": "Orange-citron",
          "price": 350
        },
        {
          "id": "jus-banane",
          "name": "Banane",
          "price": 400
        },
        {
          "id": "jus-power",
          "name": "Power",
          "desc": "10 g de protéines : dattes, noix, banane, lait",
          "price": 500
        },
        {
          "id": "jus-1-fruit-au-choix",
          "name": "1 fruit au choix",
          "desc": "Précise ton fruit dans la remarque",
          "price": 500
        },
        {
          "id": "jus-2-fruits-au-choix",
          "name": "2 fruits au choix",
          "desc": "Précise tes fruits dans la remarque",
          "price": 550
        },
        {
          "id": "jus-3-fruits-au-choix",
          "name": "3 fruits au choix",
          "desc": "Précise tes fruits dans la remarque",
          "price": 600
        },
        {
          "id": "jus-fruits-tropical",
          "name": "Fruits tropical",
          "price": 800
        }
      ]
    },
    {
      "id": "salades-fruits",
      "name": "Salades de fruits",
      "singular": "Salade de fruits",
      "brand": "juice",
      "model": "fruitsalad",
      "supplements": false,
      "visible": true,
      "items": [
        {
          "id": "salades-fruits-salade-de-fruits-ak",
          "name": "Salade de fruits AK",
          "desc": "Fruits de saison et jus d'orange",
          "price": 500
        },
        {
          "id": "salades-fruits-chocolat",
          "name": "Chocolat",
          "desc": "Salade de fruits au chocolat",
          "price": 600
        },
        {
          "id": "salades-fruits-tropical",
          "name": "Tropical",
          "desc": "Salade de fruits tropicaux",
          "price": 900
        }
      ]
    },
    {
      "id": "gaufres",
      "name": "Gaufres",
      "singular": "Gaufre",
      "brand": "juice",
      "model": "waffle",
      "supplements": false,
      "visible": true,
      "items": [
        {
          "id": "gaufres-chocolat",
          "name": "Chocolat",
          "price": 300
        },
        {
          "id": "gaufres-banane",
          "name": "Banane",
          "price": 400
        },
        {
          "id": "gaufres-fraise",
          "name": "Fraise",
          "price": 500
        },
        {
          "id": "gaufres-pistache",
          "name": "Pistache",
          "price": 500
        },
        {
          "id": "gaufres-fraise-banane",
          "name": "Fraise-banane",
          "price": 550
        },
        {
          "id": "gaufres-mix-de-fruits",
          "name": "Mix de fruits",
          "price": 550
        }
      ]
    },
    {
      "id": "crepes",
      "name": "Crêpes",
      "singular": "Crêpe",
      "brand": "juice",
      "model": "crepe",
      "supplements": false,
      "visible": true,
      "items": [
        {
          "id": "crepes-chocolat",
          "name": "Chocolat",
          "price": 300
        },
        {
          "id": "crepes-banane",
          "name": "Banane",
          "price": 400
        },
        {
          "id": "crepes-speciale",
          "name": "Spéciale",
          "price": 450
        },
        {
          "id": "crepes-fraise",
          "name": "Fraise",
          "price": 500
        },
        {
          "id": "crepes-dubai",
          "name": "Dubaï",
          "price": 500
        },
        {
          "id": "crepes-fraise-banane",
          "name": "Fraise-banane",
          "price": 550
        },
        {
          "id": "crepes-lotus",
          "name": "Lotus",
          "price": 550
        },
        {
          "id": "crepes-mix-de-fruits",
          "name": "Mix de fruits",
          "price": 550
        },
        {
          "id": "crepes-sushi",
          "name": "Sushi",
          "price": 650
        }
      ]
    }
  ]
}
