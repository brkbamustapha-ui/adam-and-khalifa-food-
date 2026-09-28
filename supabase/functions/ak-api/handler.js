import { buildMenu, priceLine, describeLine, validateMenuDoc, MenuError, normalizePhone } from './menu-core.js'
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  randomToken,
  sha256hex,
  randomRef,
  timingSafeEqual,
} from './crypto.js'

/**
 * API d'Adam & Khalifa Food (portable : Supabase Edge Function en production,
 * serveur Node en développement). Toutes les données passent par l'objet `db`.
 *
 * Public : GET /menu, POST /orders, GET /orders/status
 * Admin (en-tête x-admin-token) : /admin/*
 */

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const ORDER_MODES = {
  emporter: { label: 'À emporter' },
  livraison: { label: 'Livraison', needsAddress: true },
}
const STATUSES = ['pending', 'confirmed', 'rejected']
const SESSION_HOURS = 12
const REMEMBER_DAYS = 30
const LOGIN_WINDOW_MIN = 15
const ADMIN_CACHE_MS = 15000
const UPLOAD_TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' }
const MAX_PHOTO = 3 * 1024 * 1024
const DAY = 86400000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const enc = new TextEncoder()

const json = (data, status = 200, headers = {}) =>
  new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })

const normUser = (u) => String(u ?? '').trim().toLowerCase()

export const publicOrder = (o) => ({
  id: o.id,
  ref: o.ref,
  status: o.status,
  customerName: o.customer_name,
  customerPhone: o.customer_phone,
  mode: o.mode,
  modeLabel: ORDER_MODES[o.mode]?.label ?? o.mode,
  address: o.address,
  pickupTime: o.pickup_time,
  note: o.note,
  items: o.items,
  total: o.total,
  itemCount: o.item_count,
  createdAt: o.created_at,
  decidedAt: o.decided_at,
})

async function readJson(req, max) {
  const text = await req.text()
  if (text.length > max) throw new HttpError(413, 'Requête trop volumineuse.')
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    throw new HttpError(400, 'Requête invalide.')
  }
}

function parseDate(v, field) {
  const d = new Date(String(v ?? ''))
  if (Number.isNaN(d.getTime())) throw new HttpError(400, `${field} invalide.`)
  return d
}

/** Signature binaire des formats d'image acceptés (on ne se fie pas qu'à l'en-tête). */
function isImage(bytes, type) {
  const at = (i, ...b) => b.every((x, k) => bytes[i + k] === x)
  if (type === 'image/jpeg') return at(0, 0xff, 0xd8, 0xff)
  if (type === 'image/png') return at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
  if (type === 'image/webp') return at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)
  return false
}

// --- heure d'Algérie ---------------------------------------------------------------------------------
const algiersFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Algiers',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
function algiersParts(date) {
  const p = Object.fromEntries(algiersFmt.formatToParts(date).map((x) => [x.type, Number(x.value)]))
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
  return { y: p.year, m: p.month, d: p.day, offset: asUtc - Math.floor(date.getTime() / 60000) * 60000 }
}
/** Minuit (heure d'Algérie) du jour y-m-d, en instant UTC. Les dépassements (jour 0, mois 13) sont normalisés. */
const algiersMidnight = (y, m, d, offset) => new Date(Date.UTC(y, m - 1, d) - offset)

export function createHandler({ db, basePath = '', imageBase = '', log = console }) {
  let secretPromise = null
  const secret = () => {
    secretPromise ??= db
      .getSecret('session_secret')
      .then((s) => {
        if (!s) throw new Error('Clé de session absente (table ak_secrets).')
        return s
      })
      .catch((err) => {
        secretPromise = null // nouvel essai à la prochaine requête
        throw err
      })
    return secretPromise
  }
  let dummyHash = null

  const clientIp = (req) =>
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'inconnue'
  const ipHash = async (req) => (await sha256hex(`${await secret()}|${clientIp(req)}`)).slice(0, 32)

  async function issueToken(admin, remember) {
    const now = Math.floor(Date.now() / 1000)
    const exp = now + (remember ? REMEMBER_DAYS * 86400 : SESSION_HOURS * 3600)
    const token = await signToken({ sub: admin.id, v: admin.token_version, iat: now, exp, r: remember ? 1 : 0 }, await secret())
    return { token, username: admin.username, expiresAt: new Date(exp * 1000).toISOString() }
  }

  // compte gérant gardé 15 s en mémoire : une requête SQL de moins par appel du tableau de bord
  // (une session révoquée ailleurs reste donc valable au plus 15 s)
  const admins = new Map()
  async function loadAdmin(id, fresh = false) {
    const hit = admins.get(id)
    if (!fresh && hit && Date.now() - hit.at < ADMIN_CACHE_MS) return hit.admin
    const admin = await db.getAdminById(id)
    if (admin) admins.set(id, { admin, at: Date.now() })
    else admins.delete(id)
    return admin
  }
  async function saveAdmin(id, patch) {
    const admin = await db.updateAdmin(id, patch)
    admins.set(id, { admin, at: Date.now() })
    return admin
  }

  async function authenticate(req) {
    const payload = await verifyToken(req.headers.get('x-admin-token'), await secret())
    if (!payload || typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now() || !UUID_RE.test(payload.sub ?? '')) return null
    let admin = await loadAdmin(payload.sub)
    if (admin && admin.token_version !== payload.v) admin = await loadAdmin(payload.sub, true)
    if (!admin || admin.token_version !== payload.v) return null
    return { admin, remember: payload.r === 1 }
  }

  // --- public ------------------------------------------------------------------------------------
  async function getMenu() {
    const stored = await db.getMenu()
    return json({ menu: stored?.data ?? null, updatedAt: stored?.updatedAt ?? null }, 200, {
      'cache-control': 'public, max-age=10, s-maxage=20, stale-while-revalidate=60',
    })
  }

  async function createOrder(req) {
    const body = await readJson(req, 40000)
    if (body.website) throw new HttpError(400, 'Commande refusée.')
    const c = body.customer ?? {}
    const name = String(c.name ?? '').trim()
    if (name.length < 2 || name.length > 60) throw new HttpError(400, 'Indique ton prénom.')
    const phone = normalizePhone(c.phone)
    if (!phone) throw new HttpError(400, 'Numéro de téléphone invalide.')
    const mode = ORDER_MODES[c.mode] ? c.mode : null
    if (!mode) throw new HttpError(400, 'Choisis à emporter ou livraison.')
    const address = String(c.address ?? '').trim().slice(0, 200)
    if (ORDER_MODES[mode].needsAddress && address.length < 6) throw new HttpError(400, 'Indique ton adresse de livraison.')
    const time = String(c.time ?? '').trim().slice(0, 40) || 'Dès que possible'
    const note = String(c.note ?? '').trim().slice(0, 300)
    const lines = Array.isArray(body.lines) ? body.lines : []
    if (!lines.length) throw new HttpError(400, 'Ton panier est vide.')
    if (lines.length > 40) throw new HttpError(400, '40 lignes maximum par commande.')

    const ih = await ipHash(req)
    const [stored, recent] = await Promise.all([db.getMenu(), db.countOrders({ ipHash: ih, since: new Date(Date.now() - 10 * 60 * 1000) })])
    if (recent >= 6) throw new HttpError(429, 'Trop de commandes envoyées. Réessaie dans quelques minutes ou appelle-nous.')
    if (!stored?.data) throw new HttpError(503, 'Carte indisponible, réessaie dans un instant.')
    const menu = buildMenu(stored.data)
    let total = 0
    let count = 0
    const items = lines.map((raw) => {
      const qty = Number(raw?.qty)
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new HttpError(400, 'Quantité invalide.')
      const { product, unit, line } = priceLine(menu, raw)
      count += qty
      total += unit * qty
      return { ...line, name: product.fullName, category: product.category.name, qty, unit, lineTotal: unit * qty, details: describeLine(menu, line) }
    })
    if (count > 60) throw new HttpError(400, '60 articles maximum par commande.')

    let order = null
    for (let attempt = 0; attempt < 5 && !order; attempt++) {
      try {
        order = await db.insertOrder({
          ref: randomRef(),
          public_token: randomToken(24),
          customer_name: name,
          customer_phone: phone,
          mode,
          address: ORDER_MODES[mode].needsAddress ? address : null,
          pickup_time: time,
          note: note || null,
          items,
          total,
          item_count: count,
          ip_hash: ih,
        })
      } catch (err) {
        if (!db.isUniqueViolation(err)) throw err
      }
    }
    if (!order) throw new HttpError(500, 'Impossible d’enregistrer la commande, réessaie.')
    return json({ id: order.id, ref: order.ref, token: order.public_token, total: order.total, status: order.status, createdAt: order.created_at }, 201)
  }

  async function orderStatus(url) {
    const id = url.searchParams.get('id') ?? ''
    const t = url.searchParams.get('t') ?? ''
    if (!UUID_RE.test(id) || !t) throw new HttpError(400, 'Suivi invalide.')
    const o = await db.getOrder(id)
    if (!o || !timingSafeEqual(enc.encode(o.public_token), enc.encode(t))) throw new HttpError(404, 'Commande introuvable.')
    return json({ ref: o.ref, status: o.status, total: o.total, createdAt: o.created_at, decidedAt: o.decided_at })
  }

  // --- connexion -----------------------------------------------------------------------------------
  async function login(req) {
    const body = await readJson(req, 2000)
    const username = normUser(body.username)
    const password = String(body.password ?? '')
    const ih = await ipHash(req)
    const since = new Date(Date.now() - LOGIN_WINDOW_MIN * 60 * 1000)
    const [ipFails, userFails, admin] = await Promise.all([
      db.countLoginFailures({ ipHash: ih, since }),
      username ? db.countLoginFailures({ username, since }) : 0,
      username ? db.getAdminByUsername(username) : null,
    ])
    if (ipFails >= 5 || userFails >= 20) throw new HttpError(429, `Trop de tentatives. Réessaie dans ${LOGIN_WINDOW_MIN} minutes.`)
    dummyHash ??= await hashPassword(randomToken(12))
    const ok = await verifyPassword(password, admin?.password_hash ?? dummyHash)
    const success = Boolean(admin && ok)
    await db.recordLogin({ ip_hash: ih, username: username.slice(0, 40) || null, success })
    if (Math.random() < 0.05) db.pruneLogins?.(new Date(Date.now() - 7 * 86400 * 1000))?.catch(() => {})
    if (!success) throw new HttpError(401, 'Identifiant ou mot de passe incorrect.')
    return json(await issueToken(admin, Boolean(body.remember)))
  }

  // --- administration --------------------------------------------------------------------------------
  async function updateAccount(req, { admin: cached, remember }) {
    const body = await readJson(req, 4000)
    const admin = await loadAdmin(cached.id, true)
    if (!(await verifyPassword(String(body.currentPassword ?? ''), admin.password_hash))) {
      throw new HttpError(403, 'Mot de passe actuel incorrect.')
    }
    const patch = {}
    if (body.username !== undefined && normUser(body.username) !== admin.username) {
      const username = normUser(body.username)
      if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
        throw new HttpError(400, "Nom d'utilisateur : 3 à 32 caractères (lettres, chiffres, point, tiret).")
      }
      const other = await db.getAdminByUsername(username)
      if (other && other.id !== admin.id) throw new HttpError(409, "Ce nom d'utilisateur est déjà pris.")
      patch.username = username
    }
    if (body.newPassword) {
      const pw = String(body.newPassword)
      if (pw.length < 10 || pw.length > 128) throw new HttpError(400, 'Le mot de passe doit contenir entre 10 et 128 caractères.')
      patch.password_hash = await hashPassword(pw)
    }
    if (!Object.keys(patch).length) throw new HttpError(400, 'Aucune modification à enregistrer.')
    patch.token_version = admin.token_version + 1
    const updated = await saveAdmin(admin.id, patch)
    return json(await issueToken(updated, remember))
  }

  async function listOrders(url) {
    const status = url.searchParams.get('status') || 'all'
    if (status !== 'all' && !STATUSES.includes(status)) throw new HttpError(400, 'Statut invalide.')
    const before = url.searchParams.get('before')
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 30))
    const q = String(url.searchParams.get('q') ?? '')
      .replace(/[^\p{L}\p{N} +-]/gu, '')
      .trim()
      .slice(0, 40)
    const rows = await db.listOrders({ status, q, before: before ? parseDate(before, 'Date') : null, limit: limit + 1 })
    return json({ orders: rows.slice(0, limit).map(publicOrder), hasMore: rows.length > limit })
  }

  async function setOrderStatus(req, id) {
    const body = await readJson(req, 500)
    if (!STATUSES.includes(body.status)) throw new HttpError(400, 'Statut invalide.')
    const o = await db.updateOrderStatus(id, body.status)
    if (!o) throw new HttpError(404, 'Commande introuvable.')
    return json({ order: publicOrder(o) })
  }

  async function stats(url) {
    const from = parseDate(url.searchParams.get('from'), 'Date de début')
    const to = parseDate(url.searchParams.get('to'), 'Date de fin')
    if (to <= from || to - from > 3700 * 86400 * 1000) throw new HttpError(400, 'Période invalide.')
    return json({ stats: await db.stats(from, to) })
  }

  async function exportCsv(url) {
    const from = parseDate(url.searchParams.get('from'), 'Date de début')
    const to = parseDate(url.searchParams.get('to'), 'Date de fin')
    const rows = await db.ordersInRange(from, to, 5000)
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const fmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Algiers', dateStyle: 'short', timeStyle: 'short' })
    const label = { pending: 'En attente', confirmed: 'Confirmée', rejected: 'Refusée' }
    const lines = [['Référence', 'Date', 'Statut', 'Client', 'Téléphone', 'Mode', 'Articles', 'Total (DA)'].map(esc).join(';')]
    for (const o of rows) {
      const articles = (o.items ?? []).map((i) => `${i.qty} x ${i.name}`).join(' | ')
      lines.push([o.ref, fmt.format(new Date(o.created_at)), label[o.status] ?? o.status, o.customer_name, o.customer_phone, ORDER_MODES[o.mode]?.label ?? o.mode, articles, o.total].map(esc).join(';'))
    }
    return new Response(`\uFEFF${lines.join('\r\n')}`, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="commandes-adam-khalifa.csv"',
        'cache-control': 'no-store',
      },
    })
  }

  /**
   * Supprime du stockage les photos qui ne sont plus utilisées par la carte
   * (retirées, remplacées, ou envoyées puis jamais enregistrées depuis plus de 24 h).
   */
  async function cleanPhotos(doc) {
    if (!imageBase || !db.listObjects) return
    const used = new Set(
      (doc?.categories ?? []).flatMap((c) => (c.items ?? []).map((i) => i.image).filter((u) => u?.startsWith(imageBase)).map((u) => u.slice(imageBase.length))),
    )
    const limit = Date.now() - DAY
    const stale = (await db.listObjects('items'))
      .filter((o) => !used.has(o.path) && new Date(o.createdAt).getTime() < limit)
      .map((o) => o.path)
    if (stale.length) await db.removeObjects(stale)
  }

  async function saveMenu(req) {
    const body = await readJson(req, 400000)
    const current = await db.getMenu()
    if (current?.updatedAt && body.baseUpdatedAt !== current.updatedAt && !body.force) {
      throw new HttpError(409, 'La carte a été modifiée depuis un autre appareil. Recharge-la avant d’enregistrer.')
    }
    const clean = validateMenuDoc(body.menu, { imageBase })
    const saved = await db.saveMenu(clean)
    await cleanPhotos(clean).catch((err) => log.error('Nettoyage des photos impossible', err))
    return json({ menu: clean, updatedAt: saved.updatedAt })
  }

  async function uploadPhoto(req) {
    const type = String(req.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    const ext = UPLOAD_TYPES[type]
    if (!ext) throw new HttpError(415, 'Format de photo non accepté (JPEG, PNG ou WebP).')
    if (Number(req.headers.get('content-length') ?? 0) > MAX_PHOTO) throw new HttpError(413, 'Photo trop lourde (3 Mo maximum).')
    const bytes = new Uint8Array(await req.arrayBuffer())
    if (bytes.length > MAX_PHOTO) throw new HttpError(413, 'Photo trop lourde (3 Mo maximum).')
    if (!isImage(bytes, type)) throw new HttpError(415, "Ce fichier n'est pas une image valide.")
    const path = `items/${Date.now().toString(36)}-${randomToken(9)}.${ext}`
    await db.uploadObject(path, bytes, type)
    return json({ url: `${imageBase}${path}` }, 201)
  }

  /** Tout le tableau de bord en un seul appel : aujourd'hui, le mois, 14 jours, commandes en attente. */
  async function overview() {
    const now = new Date()
    const { y, m, d, offset } = algiersParts(now)
    const today = algiersMidnight(y, m, d, offset)
    const tomorrow = algiersMidnight(y, m, d + 1, offset)
    const monthStart = algiersMidnight(y, m, 1, offset)
    const prevStart = algiersMidnight(y, m - 1, 1, offset)
    // même durée écoulée le mois précédent, pour une comparaison honnête
    const prevSame = new Date(Math.min(monthStart.getTime(), prevStart.getTime() + (now - monthStart)))
    const [day, month, prevMonth, last14, pending, pendingCount] = await Promise.all([
      db.stats(today, tomorrow),
      db.stats(monthStart, tomorrow),
      db.stats(prevStart, prevSame),
      db.stats(algiersMidnight(y, m, d - 13, offset), tomorrow),
      db.listOrders({ status: 'pending', q: '', before: null, limit: 6 }),
      db.countOrders({ status: 'pending' }),
    ])
    return json({ now: now.toISOString(), today: day, month, prevMonth, last14, pending: pending.map(publicOrder), pendingCount })
  }

  async function adminRoute(req, url, path, session) {
    const m = req.method
    if (m === 'GET' && path === '/admin/me') return json({ username: session.admin.username })
    if (m === 'POST' && path === '/admin/account') return updateAccount(req, session)
    if (m === 'POST' && path === '/admin/logout-all') {
      const admin = await loadAdmin(session.admin.id, true)
      await saveAdmin(admin.id, { token_version: admin.token_version + 1 })
      return json(null, 204)
    }
    if (m === 'GET' && path === '/admin/pulse') {
      const [pending, latest] = await Promise.all([db.countOrders({ status: 'pending' }), db.latestOrder()])
      return json({ pending, latest: latest ? { id: latest.id, ref: latest.ref, total: latest.total, createdAt: latest.created_at, status: latest.status } : null })
    }
    if (m === 'GET' && path === '/admin/orders') return listOrders(url)
    const sm = path.match(/^\/admin\/orders\/([0-9a-f-]{36})\/status$/i)
    if (m === 'POST' && sm) return setOrderStatus(req, sm[1])
    if (m === 'GET' && path === '/admin/stats') return stats(url)
    if (m === 'GET' && path === '/admin/monthly') return json({ months: await db.monthly(24) })
    if (m === 'GET' && path === '/admin/export') return exportCsv(url)
    if (m === 'GET' && path === '/admin/menu') {
      const stored = await db.getMenu()
      return json({ menu: stored?.data ?? null, updatedAt: stored?.updatedAt ?? null, imageBase })
    }
    if (m === 'PUT' && path === '/admin/menu') return saveMenu(req)
    if (m === 'POST' && path === '/admin/photo') return uploadPhoto(req)
    if (m === 'GET' && path === '/admin/overview') return overview()
    throw new HttpError(404, 'Introuvable.')
  }

  return async function handler(req) {
    try {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
      const url = new URL(req.url)
      let path = url.pathname
      if (basePath) {
        const i = path.indexOf(basePath)
        if (i >= 0) path = path.slice(i + basePath.length)
      }
      path = path.replace(/\/+$/, '') || '/'
      const m = req.method
      if (m === 'GET' && path === '/menu') return await getMenu()
      if (m === 'POST' && path === '/orders') return await createOrder(req)
      if (m === 'GET' && path === '/orders/status') return await orderStatus(url)
      if (m === 'POST' && path === '/admin/login') return await login(req)
      if (path.startsWith('/admin/')) {
        const session = await authenticate(req)
        if (!session) throw new HttpError(401, 'Session expirée, reconnecte-toi.')
        return await adminRoute(req, url, path, session)
      }
      throw new HttpError(404, 'Introuvable.')
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status)
      if (err instanceof MenuError) return json({ error: err.message }, 400)
      log.error(err)
      return json({ error: 'Erreur serveur, réessaie dans un instant.' }, 500)
    }
  }
}
