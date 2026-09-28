import { CATEGORIES, formatDA } from '../data/menu.js'
import { renderUrl } from './renders.js'
import { reducedMotion, webglAvailable, navHeight } from './env.js'
import { scrollToTarget } from './smooth.js'

/** Onglets de la carte, panneaux de plats et plateau 3D synchronisés. */
export function initMenu({ logoUrl }) {
  const tablist = document.querySelector('[data-tabs]')
  const tabs = [...document.querySelectorAll('[data-tab]')]
  const panels = [...document.querySelectorAll('[data-panel]')]
  const stageEl = document.querySelector('[data-stage]')
  const nameEl = document.querySelector('[data-stage-name]')
  const metaEl = document.querySelector('[data-stage-meta]')
  const fallback = document.querySelector('[data-stage-fallback]')
  const layout = document.querySelector('.menu__layout')
  let active = 0
  let stage = null

  function label(i) {
    const cat = CATEGORIES[i]
    nameEl.textContent = cat.name
    metaEl.textContent = `${cat.count} choix, dès ${formatDA(cat.fromPrice)}`
  }

  function centerTab(tab) {
    const left = tab.offsetLeft - tablist.clientWidth / 2 + tab.clientWidth / 2
    tablist.scrollTo({ left, behavior: reducedMotion.matches ? 'auto' : 'smooth' })
  }

  function select(i, { fromStage = false, focus = false } = {}) {
    i = ((i % CATEGORIES.length) + CATEGORIES.length) % CATEGORIES.length
    const changed = i !== active
    active = i
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', String(k === i))
      t.tabIndex = k === i ? 0 : -1
    })
    centerTab(tabs[i])
    if (focus) tabs[i].focus({ preventScroll: true })
    label(i)
    if (!stage) fallback.src = renderUrl(CATEGORIES[i].model)
    if (!fromStage) stage?.setActive(i)
    if (!changed) return

    panels.forEach((p, k) => (p.hidden = k !== i))
    const panel = panels[i]
    // si la liste a défilé loin, on remonte au début de la nouvelle catégorie
    const top = layout.getBoundingClientRect().top
    if (top < navHeight() + 60) scrollToTarget(layout, { immediate: reducedMotion.matches })
    // entrée en cascade des plats (animation CSS)
    panel.classList.remove('is-entering')
    void panel.offsetWidth
    panel.classList.add('is-entering')
  }

  tablist.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]')
    if (tab) select(Number(tab.dataset.tab))
  })
  tablist.addEventListener('keydown', (e) => {
    const map = { ArrowRight: 1, ArrowLeft: -1 }
    if (e.key in map) {
      e.preventDefault()
      select(active + map[e.key], { focus: true })
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      select(e.key === 'Home' ? 0 : CATEGORIES.length - 1, { focus: true })
    }
  })
  document.querySelector('[data-stage-prev]').addEventListener('click', () => (stage ? stage.prev() : select(active - 1)))
  document.querySelector('[data-stage-next]').addEventListener('click', () => (stage ? stage.next() : select(active + 1)))
  stageEl.addEventListener('pointerdown', () => stageEl.classList.add('is-used'), { once: true })

  label(0)

  // le plateau 3D n'est chargé qu'à l'approche de la section
  if (webglAvailable()) {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        import('../three/menu-stage.js')
          .then(({ initMenuStage }) =>
            initMenuStage({
              initial: active,
              container: stageEl,
              canvas: stageEl.querySelector('[data-stage-canvas]'),
              categories: CATEGORIES,
              logoUrl,
              onChange: (i) => select(i, { fromStage: true }),
            }),
          )
          .then((s) => {
            stage = s
            stage.setActive(active, { instant: true, notify: false })
            stageEl.classList.add('is-3d')
          })
          .catch((err) => console.warn('Plateau 3D indisponible :', err))
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(stageEl)
  }

  return {
    select,
    selectById(id) {
      const i = CATEGORIES.findIndex((c) => c.id === id)
      if (i >= 0) select(i)
    },
  }
}
