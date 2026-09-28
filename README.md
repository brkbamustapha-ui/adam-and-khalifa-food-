# Adam & Khalifa Food

Site 3D, commande en ligne et espace gérant d'**Adam & Khalifa Food**, fast food à Bir El Djir (Oran).
Pizzas, sandwichs, tacos, fajitas, riz crousty, box, frites et la carte **AK Juice** (jus, salades de fruits, gaufres, crêpes).

## Ce que fait le site

- **Héros 3D animé** : le logo en médaillon 3D (texte circulaire, aliments en orbite, braises), qui suit la souris ou l'inclinaison du téléphone.
- **Carte 3D** : un plateau tournant avec un plat 3D par catégorie, synchronisé avec les onglets et la liste des plats.
- **Commande en ligne** : panier (tailles, viande au choix, parfums de la Pizza Méga, suppléments, remarques), puis envoi au restaurant.
  La commande arrive dans l'espace gérant, le restaurant la **confirme à la main**, et le client voit la confirmation en direct sur la page.
  Si le service de commande ne répond pas, le client peut l'envoyer par WhatsApp (0542 58 97 56).
- **Carte en direct** : prix, photos, plats épuisés ou masqués sont modifiés depuis l'espace gérant, sans toucher au code.
- Horaires en direct (heure d'Algérie), carte Google Maps, liens Instagram / TikTok.
- Responsive, fluide, accessible au clavier, respecte « réduire les animations ». Sans WebGL, des images remplacent la 3D.

## Espace gérant : `/admin`

Adresse : `https://<adresse-du-site>/admin/` (non référencée par Google). Sur téléphone, « Ajouter à l'écran d'accueil » l'installe comme une application.

| Écran | Ce qu'on y fait |
| --- | --- |
| **Tableau de bord** | Recette du jour, commandes du jour, commandes à traiter, recette du mois comparée au mois précédent, graphique des 14 derniers jours, meilleures ventes, part retrait / livraison. |
| **Commandes** | Confirmer, refuser ou remettre en attente chaque commande ; recherche par référence, prénom ou téléphone ; appel ou WhatsApp au client en un geste. Son et notification à chaque nouvelle commande. |
| **Recettes** | Calculateur : argent reçu sur une période (aujourd'hui, hier, 7 jours, 30 jours, ce mois, mois dernier, année ou dates au choix), panier moyen, mois par mois, export Excel (CSV). |
| **La carte** | Catégories, produits, prix, tailles, choix obligatoire, parfums au choix, badges, **photos**, disponible / épuisé, masqué, suppléments. « Enregistrer » publie la carte sur le site (environ une minute). |
| **Paramètres** | Changer l'identifiant et le mot de passe, déconnecter tous les appareils, son des nouvelles commandes. |

Seules les commandes **confirmées** comptent dans la recette. Les commandes en attente sont affichées à part.

**Premier accès** : identifiant `admin` et le mot de passe communiqué à la mise en ligne. À changer tout de suite dans *Paramètres*.

## Architecture

```
Navigateur ──> Vercel (site statique dist/)
                 └─ /api/*  ──>  Supabase Edge Function « ak-api »  ──>  Postgres (tables ak_*)
                                                                    └─>  Stockage « ak-food » (photos)
```

- **Vercel** sert le site et l'espace gérant ; `vercel.json` relaie `/api/*` vers la fonction Supabase (même domaine, pas de clé dans le navigateur).
- **Supabase** (projet `jxthopvlrwmbpmqbhkmy`) :
  - `supabase/functions/ak-api/` : l'API (carte, commandes, suivi, connexion, statistiques, photos). `menu-core.js` est partagé avec le site.
  - `supabase/migrations/` : tables `ak_admins`, `ak_orders`, `ak_menu`, `ak_login_attempts`, `ak_secrets`, fonctions de statistiques `ak_stats` et `ak_monthly` (heure d'Algérie). RLS activé sans politique : seule la fonction (clé secrète) y accède.
  - Stockage public `ak-food` pour les photos des plats (envoyées par la fonction après vérification).
- **Sécurité** : mots de passe PBKDF2-SHA256 (400 000 itérations), sessions signées (12 h, ou 30 jours avec « Rester connecté »), blocage après 5 essais ratés en 15 minutes, prix toujours recalculés côté serveur, 6 commandes maximum par appareil et par 10 minutes, en-têtes de sécurité et CSP sur `/admin`.

## Modifier le contenu

| Je veux changer… | Où |
| --- | --- |
| Prix, plats, photos, catégories, suppléments, plats épuisés | Espace gérant > **La carte** |
| Numéro, WhatsApp, adresse, horaires, réseaux, modes de commande | `src/config.js` |
| Textes des sections | `index.html` |
| Couleurs et polices | `src/styles/base.css` (site), `src/admin/admin.css` (espace gérant) |

`src/data/menu-seed.js` est la carte de départ : elle sert au HTML généré au build (lisible sans JavaScript, bien référencé)
et reste affichée si l'API ne répond pas. La carte publiée depuis l'espace gérant la remplace au chargement de la page.

## Développement local

Il faut [Node.js](https://nodejs.org) 20.19 ou plus récent.

```bash
npm install
npm run dev:api   # API locale, même code que la fonction Supabase, base en mémoire
                  # identifiant admin / admin-dev-2026 ; FAKE_ORDERS=300 npm run dev:api pour un historique fictif
npm run dev       # site http://localhost:5173 et espace gérant http://localhost:5173/admin/
npm run build     # version optimisée dans dist/
```

## Mise en ligne

- **Site** : le projet Vercel est relié à ce dépôt GitHub ; chaque mise à jour de la branche de production redéploie le site.
- **API** : `supabase functions deploy ak-api --no-verify-jwt --project-ref jxthopvlrwmbpmqbhkmy`
  (`--no-verify-jwt` car la connexion du gérant est gérée par la fonction elle-même).
- **Base de données** : les migrations de `supabase/migrations/` (`supabase db push`).

Pour l'aperçu des liens partagés (WhatsApp, Facebook), remplacer `og-image.jpg` par l'adresse complète
(ex. `https://mon-domaine.dz/og-image.jpg`) dans `index.html` une fois le nom de domaine connu.

## Structure

```
index.html                  site (sections, panier, fenêtres)
admin/index.html            espace gérant
src/config.js               infos du restaurant
src/data/                   carte de départ et carte "vivante" du site
src/render/templates.js     HTML de la carte (au build, puis dans le navigateur)
src/three/                  scènes 3D : héros, plateau de la carte, modèles et textures
src/ui/                     panier, commande et suivi, carte en direct, navigation, animations
src/admin/                  espace gérant : écrans, graphiques, styles
src/styles/                 styles du site
supabase/functions/ak-api/  API (Supabase Edge Function)
supabase/migrations/        tables et fonctions SQL
dev/                        API locale pour le développement
tools/                      aperçu des modèles 3D et de l'image de partage
```

## Points à vérifier par le restaurant

- Tacos : les deux prix du menu (ex. 700 / 900 DA) sont présentés comme tailles **M** et **L**.
- Jus « 1 fruit / 2 fruits / 3 fruits » : le client précise ses fruits dans la remarque.
- Horaires affichés : tous les jours de 12h à minuit.
- Livraison : proposée dans le panier, frais confirmés par téléphone. Pour la retirer, supprimer l'option dans `orderModes` (`src/config.js`).
