/**
 * API locale pour le développement : le même code que l'Edge Function Supabase,
 * branché sur une base en mémoire (dev/mock-db.js). Vite relaie /api vers ce serveur.
 *
 *   npm run dev:api            identifiant admin / admin-dev-2026
 *   FAKE_ORDERS=300 npm run dev:api   avec un historique de commandes fictives
 */
import http from 'node:http'
import { createHandler } from '../supabase/functions/ak-api/handler.js'
import { createMockDb } from './mock-db.js'

const PORT = Number(process.env.PORT || 8787)
const LATENCY = Number(process.env.LATENCY || 120)
const db = await createMockDb({ fakeOrders: Number(process.env.FAKE_ORDERS || 0) })
const handler = createHandler({ db, basePath: '/api', imageBase: `http://localhost:${PORT}/__storage/` })

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/__storage/')) {
      const obj = db.state.storage.get(decodeURIComponent(req.url.slice('/__storage/'.length).split('?')[0]))
      if (!obj) return res.writeHead(404).end()
      res.writeHead(200, { 'content-type': obj.contentType, 'cache-control': 'public, max-age=3600' })
      return res.end(Buffer.from(obj.bytes))
    }
    const chunks = []
    for await (const c of req) chunks.push(c)
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v)
    if (!headers.has('x-forwarded-for')) headers.set('x-forwarded-for', req.socket.remoteAddress ?? '127.0.0.1')
    const request = new Request(`http://localhost:${PORT}${req.url}`, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
    })
    if (LATENCY) await new Promise((r) => setTimeout(r, LATENCY * (0.6 + Math.random() * 0.8)))
    const response = await handler(request)
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch (err) {
    console.error(err)
    res.writeHead(500).end()
  }
})

server.listen(PORT, () => console.log(`API locale sur http://localhost:${PORT}/api (admin / admin-dev-2026)`))
