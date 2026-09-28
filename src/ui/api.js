/**
 * Appels à l'API du restaurant (/api, relayée par Vercel vers la fonction Supabase).
 * Ne lève jamais d'exception : renvoie { ok, status, data, error }.
 */
export async function api(path, { method = 'GET', body, timeout = 12000 } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
    const data = (res.headers.get('content-type') ?? '').includes('application/json') ? await res.json().catch(() => null) : null
    return { ok: res.ok && data !== null, status: res.status, data, error: data?.error ?? null }
  } catch {
    return { ok: false, status: 0, data: null, error: null }
  } finally {
    clearTimeout(timer)
  }
}
