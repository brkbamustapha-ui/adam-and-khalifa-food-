import { defineConfig } from 'vite'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { SITE } from './src/config.js'
import { renderTabs, renderPanels, renderSignatures, renderJuicePicks, renderJsonLd } from './src/render/templates.js'

const ICONS = resolve('node_modules/@phosphor-icons/core/assets')

/** Remplace <i data-icon="nom"></i> par le SVG Phosphor correspondant (graisse "bold" par défaut). */
function inlineIcon(name, weight = 'bold') {
  const file = resolve(ICONS, weight, weight === 'regular' ? `${name}.svg` : `${name}-${weight}.svg`)
  if (!existsSync(file)) throw new Error(`Icône Phosphor introuvable : ${name} (${weight})`)
  return readFileSync(file, 'utf8')
    .trim()
    .replace('<svg ', '<svg class="icon" aria-hidden="true" focusable="false" ')
}

/**
 * Génère le contenu dynamique (carte, incontournables, données SEO, icônes)
 * directement dans index.html, en dev comme au build.
 */
function sitePlugin() {
  return {
    name: 'adam-khalifa-site',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const img = (name) => `./src/assets/renders/${name}.webp`
        return html
          .replace('<!-- @tabs -->', renderTabs())
          .replace('<!-- @panels -->', renderPanels())
          .replace('<!-- @signatures -->', renderSignatures(img))
          .replace('<!-- @juice-picks -->', renderJuicePicks())
          .replace('<!-- @jsonld -->', renderJsonLd(SITE))
          .replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
            const v = path.split('.').reduce((o, k) => o?.[k], SITE)
            if (v === undefined) throw new Error(`Valeur SITE inconnue : ${path}`)
            return v
          })
          .replace(/<i data-icon="([\w-]+)"(?: data-weight="(\w+)")?><\/i>/g, (_, name, weight) => inlineIcon(name, weight))
      },
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [sitePlugin()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
  },
  server: { host: true },
})
