/**
 * Client de l'API du tableau de bord (/api/admin/*) et session du gérant.
 * La session est gardée pour l'onglet (sessionStorage) ou 30 jours ("rester connecté").
 */
const KEY = 'ak-admin-session-v1'

function readSession() {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const s = JSON.parse(store.getItem(KEY) || 'null')
      if (s?.token && new Date(s.expiresAt).getTime() > Date.now()) return s
    } catch {
      /* stockage indisponible */
    }
  }
  return null
}

let current = readSession()

export const session = {
  get token() {
    return current?.token ?? null
  },
  get username() {
    return current?.username ?? ''
  },
  save({ token, username, expiresAt }, remember = current?.remember ?? false) {
    current = { token, username, expiresAt, remember }
    try {
      ;(remember ? sessionStorage : localStorage).removeItem(KEY)
      ;(remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(current))
    } catch {
      /* navigation privée : session en mémoire */
    }
  },
  clear() {
    current = null
    try {
      localStorage.removeItem(KEY)
      sessionStorage.removeItem(KEY)
    } catch {
      /* ignoré */
    }
  },
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

let unauthorized = () => {}
export const onUnauthorized = (fn) => (unauthorized = fn)

/** Appel JSON (ou envoi d'un fichier avec `blob`). Lève ApiError avec un message en français. */
export async function call(path, { method = 'GET', body, blob, timeout = 20000, raw = false } = {}) {
  const headers = {}
  if (session.token) headers['x-admin-token'] = session.token
  let payload
  if (blob) {
    headers['content-type'] = blob.type
    payload = blob
  } else if (body !== undefined) {
    headers['content-type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  let res
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload, signal: ctrl.signal, cache: 'no-store' })
  } catch {
    throw new ApiError(0, 'Connexion impossible. Vérifie internet et réessaie.')
  } finally {
    clearTimeout(timer)
  }
  const type = res.headers.get('content-type') ?? ''
  if (!res.ok) {
    const data = type.includes('json') ? await res.json().catch(() => null) : null
    if (res.status === 401 && path !== '/admin/login') {
      session.clear()
      unauthorized(data?.error)
    }
    throw new ApiError(res.status, data?.error ?? (res.status >= 500 ? 'Le serveur ne répond pas, réessaie dans un instant.' : `Erreur ${res.status}`))
  }
  if (raw) return res
  if (res.status === 204) return null
  return type.includes('json') ? res.json() : null
}
