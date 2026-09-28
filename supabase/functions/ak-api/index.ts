// Point d'entrée Supabase Edge Function "ak-api" (Deno).
// Déployée avec verify_jwt = false : l'authentification admin est gérée dans handler.js.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createHandler } from './handler.js'
import { createSupabaseDb } from './db-supabase.js'

const url = Deno.env.get('SUPABASE_URL')!
let key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
try {
  const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
  if (secretKeys.default) key = secretKeys.default
} catch {
  // clé historique conservée
}

const BUCKET = 'ak-food'
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

const handler = createHandler({
  db: createSupabaseDb(supabase, { bucket: BUCKET }),
  basePath: '/ak-api',
  imageBase: `${url}/storage/v1/object/public/${BUCKET}/`,
})

Deno.serve(handler)
