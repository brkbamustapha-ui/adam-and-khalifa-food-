// Rendus 3D pré-calculés (vignettes) de chaque catégorie.
const files = import.meta.glob('../assets/renders/*.webp', { eager: true, query: '?url', import: 'default' })

export const renderUrl = (name) => files[`../assets/renders/${name}.webp`] ?? files['../assets/renders/pizza.webp']

/** Photo du plat si le restaurant en a ajouté une, sinon le rendu 3D de sa catégorie. */
export const productImage = (p) => p?.image || renderUrl(p?.category?.model)
