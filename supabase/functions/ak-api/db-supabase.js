/**
 * Accès aux données via Supabase (clé secrète, côté serveur uniquement).
 * Tables préfixées ak_ : ak_admins, ak_secrets, ak_menu, ak_orders, ak_login_attempts.
 */
export function createSupabaseDb(sb, { bucket = 'ak-food' } = {}) {
  const run = async (query) => {
    const { data, error } = await query
    if (error) throw error
    return data
  }
  const count = async (query) => {
    const { count: n, error } = await query
    if (error) throw error
    return n ?? 0
  }
  const orderCols = 'id, ref, public_token, status, customer_name, customer_phone, mode, address, pickup_time, note, items, total, item_count, created_at, decided_at'

  return {
    isUniqueViolation: (err) => err?.code === '23505',

    async getSecret(key) {
      const row = await run(sb.from('ak_secrets').select('value').eq('key', key).maybeSingle())
      return row?.value ?? null
    },

    getAdminByUsername: (username) => run(sb.from('ak_admins').select('*').eq('username', username).maybeSingle()),
    getAdminById: (id) => run(sb.from('ak_admins').select('*').eq('id', id).maybeSingle()),
    updateAdmin: (id, patch) =>
      run(sb.from('ak_admins').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()),

    countLoginFailures({ ipHash, username, since }) {
      let q = sb.from('ak_login_attempts').select('id', { count: 'exact', head: true }).eq('success', false).gte('created_at', since.toISOString())
      if (ipHash) q = q.eq('ip_hash', ipHash)
      if (username) q = q.eq('username', username)
      return count(q)
    },
    recordLogin: (row) => run(sb.from('ak_login_attempts').insert(row)),
    pruneLogins: (before) => run(sb.from('ak_login_attempts').delete().lt('created_at', before.toISOString())),

    async getMenu() {
      const row = await run(sb.from('ak_menu').select('data, updated_at').eq('id', 1).maybeSingle())
      return row ? { data: row.data, updatedAt: row.updated_at } : null
    },
    async saveMenu(data) {
      const row = await run(sb.from('ak_menu').upsert({ id: 1, data, updated_at: new Date().toISOString() }).select('updated_at').single())
      return { updatedAt: row.updated_at }
    },

    insertOrder: (row) => run(sb.from('ak_orders').insert(row).select(orderCols).single()),
    getOrder: (id) => run(sb.from('ak_orders').select(orderCols).eq('id', id).maybeSingle()),
    latestOrder: () =>
      run(sb.from('ak_orders').select('id, ref, total, status, created_at').order('created_at', { ascending: false }).limit(1).maybeSingle()),
    countOrders({ status, ipHash, since }) {
      let q = sb.from('ak_orders').select('id', { count: 'exact', head: true })
      if (status) q = q.eq('status', status)
      if (ipHash) q = q.eq('ip_hash', ipHash)
      if (since) q = q.gte('created_at', since.toISOString())
      return count(q)
    },
    listOrders({ status, q, before, limit }) {
      let query = sb.from('ak_orders').select(orderCols).order('created_at', { ascending: false }).limit(limit)
      if (status && status !== 'all') query = query.eq('status', status)
      if (before) query = query.lt('created_at', before.toISOString())
      if (q) query = query.or(`ref.ilike."*${q}*",customer_name.ilike."*${q}*",customer_phone.ilike."*${q}*"`)
      return run(query)
    },
    ordersInRange: (from, to, limit) =>
      run(
        sb.from('ak_orders').select(orderCols).gte('created_at', from.toISOString()).lt('created_at', to.toISOString()).order('created_at', { ascending: true }).limit(limit),
      ),
    updateOrderStatus: (id, status) =>
      run(
        sb
          .from('ak_orders')
          .update({ status, decided_at: status === 'pending' ? null : new Date().toISOString() })
          .eq('id', id)
          .select(orderCols)
          .maybeSingle(),
      ),

    stats: (from, to) => run(sb.rpc('ak_stats', { p_from: from.toISOString(), p_to: to.toISOString() })),
    monthly: (months) => run(sb.rpc('ak_monthly', { p_months: months })),

    async uploadObject(path, bytes, contentType) {
      const { error } = await sb.storage.from(bucket).upload(path, bytes, { contentType, cacheControl: '31536000', upsert: false })
      if (error) throw error
    },
    async listObjects(prefix) {
      const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 1000, sortBy: { column: 'created_at', order: 'asc' } })
      if (error) throw error
      return (data ?? []).filter((o) => o.id).map((o) => ({ path: `${prefix}/${o.name}`, createdAt: o.created_at }))
    },
    async removeObjects(paths) {
      const { error } = await sb.storage.from(bucket).remove(paths)
      if (error) throw error
    },
  }
}
