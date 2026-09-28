// Rendus 3D pré-calculés (vignettes) de chaque catégorie.
const files = import.meta.glob('../assets/renders/*.webp', { eager: true, query: '?url', import: 'default' })

export const renderUrl = (name) => files[`../assets/renders/${name}.webp`] ?? files['../assets/renders/pizza.webp']
