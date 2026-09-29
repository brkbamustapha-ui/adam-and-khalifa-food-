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

/**
 * Module virtuel d'icônes pour le JavaScript : import icons from 'virtual:icons:plus,star.fill'
 * donne { plus: '<svg…>', 'star.fill': '<svg…>' } (graisse "bold" par défaut).
 */
function iconsModule() {
  const PREFIX = 'virtual:icons:'
  return {
    name: 'phosphor-icons-module',
    resolveId: (id) => (id.startsWith(PREFIX) ? `\0${id}` : undefined),
    load(id) {
      if (!id.startsWith(`\0${PREFIX}`)) return
      const out = {}
      for (const key of id.slice(PREFIX.length + 1).split(',')) {
        const [name, weight = 'bold'] = key.split('.')
        out[key] = inlineIcon(name, weight)
      }
      return `export default ${JSON.stringify(out)}`
    },
  }
}

/**
 * Précharge les deux polices (titres et texte) dès la lecture du HTML : les titres s'affichent
 * directement dans la bonne police, sans saut visible quand elle arrive.
 */
function fontPreload() {
  return {
    name: 'font-preload',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html
        const base = ctx.path.includes('/admin/') ? '../' : './'
        return Object.values(ctx.bundle)
          .filter((f) => f.type === 'asset' && /^assets\/(bebas-neue-latin-400-normal|outfit-latin-wght-normal)-.*\.woff2$/.test(f.fileName))
          .map((f) => ({ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: base + f.fileName, crossorigin: '' }, injectTo: 'head' }))
      },
    },
  }
}

// API locale (npm run dev:api) : même code que la fonction Supabase, base en mémoire
const api = { '/api': { target: 'http://localhost:8787', changeOrigin: false } }

export default defineConfig({
  base: './',
  plugins: [sitePlugin(), iconsModule(), fontPreload()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: { main: resolve('index.html'), admin: resolve('admin/index.html') },
    },
  },
  server: { host: true, proxy: api },
  preview: { proxy: api },
})
