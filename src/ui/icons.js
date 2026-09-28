// Icônes Phosphor (graisse "bold") utilisées dans l'interface générée en JavaScript.
import plus from '@phosphor-icons/core/assets/bold/plus-bold.svg?raw'
import minus from '@phosphor-icons/core/assets/bold/minus-bold.svg?raw'
import trash from '@phosphor-icons/core/assets/bold/trash-bold.svg?raw'
import check from '@phosphor-icons/core/assets/bold/check-bold.svg?raw'
import storefront from '@phosphor-icons/core/assets/bold/storefront-bold.svg?raw'
import motorcycle from '@phosphor-icons/core/assets/bold/motorcycle-bold.svg?raw'

const prep = (svg) => svg.trim().replace('<svg ', '<svg class="icon" aria-hidden="true" focusable="false" ')

export const icons = {
  plus: prep(plus),
  minus: prep(minus),
  trash: prep(trash),
  check: prep(check),
  storefront: prep(storefront),
  motorcycle: prep(motorcycle),
}
