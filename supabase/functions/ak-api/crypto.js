/**
 * Outils cryptographiques (Web Crypto, compatibles Deno et Node 20+).
 * - mots de passe : PBKDF2-SHA256, sel aléatoire, 400 000 itérations
 * - sessions : jeton signé HMAC-SHA256 { sub, v, exp }
 */
const enc = new TextEncoder()
const dec = new TextDecoder()

export const PBKDF2_ITERATIONS = 400000

export const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n))

export function b64url(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromB64url(s) {
  try {
    const norm = String(s).replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(norm + '==='.slice((norm.length + 3) % 4))
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

export const randomToken = (n = 24) => b64url(randomBytes(n))

export function timingSafeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256))
}

export async function hashPassword(password, iterations = PBKDF2_ITERATIONS) {
  const salt = randomBytes(16)
  const hash = await pbkdf2(password, salt, iterations)
  return `pbkdf2_sha256$${iterations}$${b64url(salt)}$${b64url(hash)}`
}

export async function verifyPassword(password, stored) {
  const [alg, it, saltS, hashS] = String(stored ?? '').split('$')
  const iterations = Number(it)
  const salt = fromB64url(saltS)
  const expected = fromB64url(hashS)
  if (alg !== 'pbkdf2_sha256' || !Number.isInteger(iterations) || iterations < 1000 || !salt || !expected) return false
  const actual = await pbkdf2(String(password ?? ''), salt, iterations)
  return timingSafeEqual(actual, expected)
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)))
}

export async function signToken(payload, secret) {
  const body = b64url(enc.encode(JSON.stringify(payload)))
  return `${body}.${b64url(await hmac(secret, body))}`
}

export async function verifyToken(token, secret) {
  const [body, sig] = String(token ?? '').split('.')
  if (!body || !sig) return null
  const expected = await hmac(secret, body)
  if (!timingSafeEqual(expected, fromB64url(sig))) return null
  try {
    return JSON.parse(dec.decode(fromB64url(body)))
  } catch {
    return null
  }
}

export async function sha256hex(s) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))
  return [...d].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const REF_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
/** Référence courte et lisible au téléphone : AK-7F3KQ */
export const randomRef = () => `AK-${[...randomBytes(5)].map((x) => REF_ALPHABET[x % 32]).join('')}`
