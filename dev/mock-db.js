/**
 * Base de données en mémoire pour le développement local : même interface que
 * server/ak-api/db-supabase.js, sans réseau. Les statistiques reproduisent les
 * fonctions SQL ak_stats et ak_monthly (heure d'Algérie, recette = commandes confirmées).
 */
import { hashPassword, randomToken, randomRef } from '../supabase/functions/ak-api/crypto.js'
import { buildMenu, priceLine, describeLine } from '../supabase/functions/ak-api/menu-core.js'
import seed from '../src/data/menu-seed.js'

const algiersDay = (d) => new Date(new Date(d).getTime() + 3600000).toISOString().slice(0, 10)
const clone = (v) => (v == null ? v : structuredClone(v))

export async function createMockDb({ username = 'admin', password = 'admin-dev-2026', fakeOrders = 0 } = {}) {
  const now = () => new Date().toISOString()
  const state = {
    secret: randomToken(32),
    admins: [
      { id: crypto.randomUUID(), username, password_hash: await hashPassword(password), token_version: 1, created_at: now(), updated_at: now() },
    ],
    menu: { data: clone(seed), updatedAt: now() },
    orders: [],
    logins: [],
    storage: new Map(),
  }

  const inRange = (o, from, to) => new Date(o.created_at) >= from && new Date(o.created_at) < to

  const db = {
    state,
    isUniqueViolation: (err) => err?.code === '23505',
    getSecret: async (key) => (key === 'session_secret' ? state.secret : null),

    getAdminByUsername: async (u) => clone(state.admins.find((a) => a.username === u) ?? null),
    getAdminById: async (id) => clone(state.admins.find((a) => a.id === id) ?? null),
    async updateAdmin(id, patch) {
      const a = state.admins.find((x) => x.id === id)
      if (patch.username && state.admins.some((x) => x.username === patch.username && x.id !== id)) {
        throw Object.assign(new Error('duplicate'), { code: '23505' })
      }
      Object.assign(a, patch, { updated_at: now() })
      return clone(a)
    },

    countLoginFailures: async ({ ipHash, username, since }) =>
      state.logins.filter((l) => !l.success && new Date(l.created_at) >= since && (!ipHash || l.ip_hash === ipHash) && (!username || l.username === username))
        .length,
    recordLogin: async (row) => void state.logins.push({ ...row, created_at: now() }),
    pruneLogins: async (before) => void (state.logins = state.logins.filter((l) => new Date(l.created_at) >= before)),

    getMenu: async () => clone(state.menu),
    async saveMenu(data) {
      state.menu = { data: clone(data), updatedAt: now() }
      return { updatedAt: state.menu.updatedAt }
    },

    async insertOrder(row) {
      if (state.orders.some((o) => o.ref === row.ref)) throw Object.assign(new Error('duplicate'), { code: '23505' })
      const o = { id: crypto.randomUUID(), status: 'pending', created_at: now(), decided_at: null, ...clone(row) }
      state.orders.push(o)
      return clone(o)
    },
    getOrder: async (id) => clone(state.orders.find((o) => o.id === id) ?? null),
    latestOrder: async () => clone([...state.orders].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0] ?? null),
    countOrders: async ({ status, ipHash, since }) =>
      state.orders.filter((o) => (!status || o.status === status) && (!ipHash || o.ip_hash === ipHash) && (!since || new Date(o.created_at) >= since)).length,
    async listOrders({ status, q, before, limit }) {
      const needle = (q ?? '').toLowerCase()
      return clone(
        state.orders
          .filter((o) => !status || status === 'all' || o.status === status)
          .filter((o) => !before || new Date(o.created_at) < before)
          .filter((o) => !needle || [o.ref, o.customer_name, o.customer_phone].some((v) => v.toLowerCase().includes(needle)))
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
          .slice(0, limit),
      )
    },
    ordersInRange: async (from, to, limit) =>
      clone(state.orders.filter((o) => inRange(o, from, to)).sort((a, b) => (a.created_at < b.created_at ? -1 : 1)).slice(0, limit)),
    async updateOrderStatus(id, status) {
      const o = state.orders.find((x) => x.id === id)
      if (!o) return null
      o.status = status
      o.decided_at = status === 'pending' ? null : now()
      return clone(o)
    },

    async stats(from, to) {
      const o = state.orders.filter((x) => inRange(x, from, to))
      const c = o.filter((x) => x.status === 'confirmed')
      const sum = (arr) => arr.reduce((n, x) => n + x.total, 0)
      const group = (arr, key) => {
        const m = new Map()
        for (const x of arr) {
          const k = key(x)
          const g = m.get(k) ?? { orders: 0, revenue: 0 }
          g.orders++
          g.revenue += x.total
          m.set(k, g)
        }
        return m
      }
      const top = new Map()
      for (const x of c) {
        for (const i of x.items) {
          const t = top.get(i.name) ?? { name: i.name, qty: 0, revenue: 0 }
          t.qty += i.qty
          t.revenue += i.lineTotal
          top.set(i.name, t)
        }
      }
      return {
        orders: o.length,
        pending: o.filter((x) => x.status === 'pending').length,
        pendingAmount: sum(o.filter((x) => x.status === 'pending')),
        confirmed: c.length,
        rejected: o.filter((x) => x.status === 'rejected').length,
        revenue: sum(c),
        average: c.length ? Math.round(sum(c) / c.length) : 0,
        modes: [...group(c, (x) => x.mode)].map(([mode, g]) => ({ mode, ...g })).sort((a, b) => b.revenue - a.revenue),
        daily: [...group(c, (x) => algiersDay(x.created_at))].map(([day, g]) => ({ day, ...g })).sort((a, b) => (a.day < b.day ? -1 : 1)),
        top: [...top.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 8),
      }
    },
    async monthly(months) {
      const m = new Map()
      for (const o of state.orders) {
        const k = algiersDay(o.created_at).slice(0, 7)
        const g = m.get(k) ?? { month: k, orders: 0, confirmed: 0, revenue: 0 }
        g.orders++
        if (o.status === 'confirmed') {
          g.confirmed++
          g.revenue += o.total
        }
        m.set(k, g)
      }
      return [...m.values()].sort((a, b) => (a.month < b.month ? 1 : -1)).slice(0, months)
    },

    async uploadObject(path, bytes, contentType) {
      state.storage.set(path, { bytes, contentType, createdAt: now() })
    },
    listObjects: async (prefix) =>
      [...state.storage].filter(([p]) => p.startsWith(`${prefix}/`)).map(([path, o]) => ({ path, createdAt: o.createdAt })),
    async removeObjects(paths) {
      paths.forEach((p) => state.storage.delete(p))
    },
  }

  if (fakeOrders) addFakeOrders(state, fakeOrders)
  return db
}

/** Historique réaliste (60 derniers jours) pour tester les graphiques et la pagination. */
function addFakeOrders(state, n) {
  const menu = buildMenu(state.menu.data)
  const products = [...menu.products.values()].filter((p) => p.available)
  const names = ['Yacine', 'Amina', 'Karim', 'Sara', 'Mehdi', 'Lina', 'Walid', 'Nour', 'Rayan', 'Imane', 'Sofiane', 'Meriem']
  let seedN = 7
  const rnd = () => ((seedN = (seedN * 16807) % 2147483647) - 1) / 2147483646
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
  for (let k = 0; k < n; k++) {
    const age = Math.pow(rnd(), 1.4) * 60 * 86400000
    const created = new Date(Date.now() - age)
    const hour = 12 + Math.floor(rnd() * 11)
    created.setUTCHours(hour - 1, Math.floor(rnd() * 60))
    if (created > new Date()) created.setTime(Date.now() - 5 * 60000 * (k + 1))
    const lines = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => {
      const p = pick(products)
      const raw = { id: p.id, qty: 1 + Math.floor(rnd() * 2) }
      if (p.sizes) raw.size = pick(p.sizes).label
      if (p.choice) raw.choice = pick(p.choice.options)
      if (p.pick) raw.picks = [pick(p.pick.options), pick(p.pick.options)]
      const { product, unit, line } = priceLine(menu, raw)
      return { ...line, name: product.fullName, category: product.category.name, qty: raw.qty, unit, lineTotal: unit * raw.qty, details: describeLine(menu, line) }
    })
    const recent = Date.now() - created.getTime() < 40 * 60000
    const status = recent && rnd() < 0.8 ? 'pending' : rnd() < 0.9 ? 'confirmed' : 'rejected'
    const mode = rnd() < 0.62 ? 'emporter' : 'livraison'
    state.orders.push({
      id: crypto.randomUUID(),
      ref: randomRef(),
      public_token: randomToken(24),
      status,
      customer_name: pick(names),
      customer_phone: `05${String(Math.floor(rnd() * 1e8)).padStart(8, '0')}`,
      mode,
      address: mode === 'livraison' ? 'Cité 1000 logements, bloc 12, Bir El Djir' : null,
      pickup_time: 'Dès que possible',
      note: rnd() < 0.2 ? 'Sans oignons svp' : null,
      items: lines,
      total: lines.reduce((s, l) => s + l.lineTotal, 0),
      item_count: lines.reduce((s, l) => s + l.qty, 0),
      ip_hash: 'fake',
      created_at: created.toISOString(),
      decided_at: status === 'pending' ? null : new Date(created.getTime() + 4 * 60000).toISOString(),
    })
  }
}
