# Adam & Khalifa Food

Site vitrine et de commande en ligne d'**Adam & Khalifa Food**, fast food à Bir El Djir (Oran).
Pizzas, sandwichs, tacos, fajitas, riz crousty, box, frites et la carte **AK Juice** (jus, salades de fruits, gaufres, crêpes).

## Ce que fait le site

- **Héros 3D animé** : le logo en médaillon 3D (texte circulaire, aliments en orbite, braises), qui suit la souris ou l'inclinaison du téléphone et tourne quand on le touche.
- **Carte 3D** : un plateau tournant avec un plat 3D par catégorie. On le fait tourner au doigt, à la souris ou avec les onglets ; la liste des plats se met à jour.
- **Commande en ligne** : panier (tailles, viande au choix, 4 parfums de la Pizza Méga, suppléments, remarques), puis envoi du récapitulatif sur **WhatsApp** au 0542 58 97 56, ou appel direct. Le panier est gardé dans le navigateur.
- **Horaires en direct** (heure d'Algérie), carte Google Maps, liens Instagram / TikTok.
- Responsive (mobile d'abord), fluide, accessible au clavier, respecte le réglage « réduire les animations ». Sans WebGL, le site affiche des images à la place de la 3D.

Tous les plats 3D sont modélisés en code (three.js) : aucun fichier 3D à télécharger.

## Modifier le contenu

| Je veux changer…                                   | Fichier                 |
| -------------------------------------------------- | ----------------------- |
| Un prix, un plat, une description, une catégorie   | `src/data/menu.js`      |
| Le numéro, le WhatsApp, l'adresse, les horaires, les réseaux, les modes de commande | `src/config.js` |
| Les textes des sections                            | `index.html`            |
| Les couleurs et polices                            | `src/styles/base.css`   |

La carte est générée dans le HTML au moment du build : elle reste lisible sans JavaScript et bien référencée par Google.

## Lancer le site en local

Il faut [Node.js](https://nodejs.org) 20.19 ou plus récent.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # version optimisée dans dist/
npm run preview   # tester la version optimisée
```

## Mettre en ligne

Le dossier `dist/` produit par `npm run build` est un site statique : il s'héberge partout.

- **GitHub Pages** : le workflow `.github/workflows/deploy.yml` publie le site à chaque mise à jour de `main`.
  À activer une seule fois : *Settings > Pages > Source : GitHub Actions*.
- **Vercel ou Netlify** : importer le dépôt, le framework « Vite » est détecté automatiquement.
- **Hébergement classique** (cPanel…) : envoyer le contenu de `dist/` par FTP.

Pour l'aperçu des liens partagés (WhatsApp, Facebook), remplacer `og-image.jpg` par l'adresse complète
(ex. `https://mon-domaine.dz/og-image.jpg`) dans `index.html` une fois le nom de domaine connu.

## Structure

```
index.html              page unique (sections, panier, fenêtres)
src/config.js           infos du restaurant
src/data/menu.js        la carte
src/render/templates.js HTML de la carte généré au build
src/three/              scènes 3D : héros, plateau de la carte, modèles et textures
src/ui/                 panier, commande WhatsApp, onglets, navigation, animations
src/styles/             styles
src/assets/             logo, rendus 3D des plats (vignettes)
tools/                  outils de développement (voir ci-dessous)
```

## Outils de développement

- `tools/models.html` : aperçu de tous les modèles 3D (`npm run dev` puis `/tools/models.html`).
  `?thumb=pizza&size=640` affiche un seul plat sur fond transparent, pour refaire les vignettes de `src/assets/renders/`.
- `tools/og.html` : maquette de l'image de partage `public/og-image.jpg`.

## Points à vérifier par le restaurant

- Tacos : les deux prix du menu (ex. 700 / 900 DA) sont présentés comme tailles **M** et **L**.
- Jus « 1 fruit / 2 fruits / 3 fruits » : le client précise ses fruits dans la remarque.
- Horaires affichés : tous les jours de 12h à minuit.
- Livraison : proposée dans le panier, frais confirmés par téléphone. Pour la retirer, supprimer l'option dans `orderModes` (`src/config.js`).
