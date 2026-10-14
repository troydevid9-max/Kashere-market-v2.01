import { Router } from 'express'
import crypto from 'node:crypto'
import { asyncH, AppError, validate, z, now } from '../lib/http.js'
import { requireAuth, requireVerified, isVendorActive } from '../lib/auth.js'
import { publicUser, ratingsMap, ratingFor } from '../lib/serialize.js'
import { uploadPublic, checkImages, removeFiles, publicUrl } from '../lib/uploads.js'
import { CATEGORIES, CATEGORY_IDS, CONDITIONS, DELIVERY } from '../lib/constants.js'

const listSchema = z.object({
  q: z.string().trim().max(80).optional(), category: z.enum(CATEGORY_IDS).optional(),
  sort: z.enum(['new', 'popular', 'low', 'high']).default('new'), max: z.coerce.number().int().positive().optional(),
  seller: z.string().max(60).optional(), limit: z.coerce.number().int().min(1).max(60).default(24), offset: z.coerce.number().int().min(0).default(0)
})
const productFields = {
  title: z.string().trim().min(3).max(100), description: z.string().trim().min(10).max(500),
  price: z.coerce.number().int().min(100).max(10_000_000), quantity: z.coerce.number().int().min(1).max(1000),
  category: z.enum(CATEGORY_IDS), condition: z.enum(CONDITIONS), delivery: z.enum(DELIVERY).default('delivery'),
  deliveryLocation: z.string().trim().max(120).optional()
}

export default function catalogRoutes(db) {
  const r = Router()

  const hydrate = async (rows) => {
    const ids = rows.map((p) => p.id)
    const imgs = ids.length ? await db('product_images').whereIn('product_id', ids).orderBy('position') : []
    const byProduct = {}; for (const im of imgs) (byProduct[im.product_id] ??= []).push(im.url)
    const sellers = await db('users').whereIn('id', [...new Set(rows.map((p) => p.seller_id))])
    const ratings = await ratingsMap(db, sellers.map((s) => s.id))
    const sMap = Object.fromEntries(sellers.map((s) => [s.id, publicUser(s, ratings[s.id])]))
    return rows.map((p) => ({
      id: p.id, title: p.title, description: p.description, price: p.price, quantity: p.quantity, category: p.category,
      condition: p.condition, delivery: p.delivery, deliveryLocation: p.delivery_location, status: p.status, views: p.views,
      createdAt: p.created_at, images: byProduct[p.id] || [], seller: sMap[p.seller_id]
    }))
  }

  r.get('/categories', asyncH(async (_req, res) => {
    const counts = await db('products').where({ status: 'active' }).andWhere('quantity', '>', 0).select('category').count({ n: '*' }).groupBy('category')
    const m = Object.fromEntries(counts.map((c) => [c.category, Number(c.n)]))
    res.json({ categories: CATEGORIES.map((c) => ({ ...c, count: m[c.id] || 0 })) })
  }))

  r.get('/products', validate(listSchema, 'query'), asyncH(async (req, res) => {
    const { q, category, sort, max, seller, limit, offset } = req.valid
    const qb = db('products as p').join('users as u', 'u.id', 'p.seller_id').where('p.status', 'active').andWhere('p.quantity', '>', 0).andWhere('u.banned', 0)
    if (category) qb.andWhere('p.category', category)
    if (max) qb.andWhere('p.price', '<=', max)
    if (seller) qb.andWhere('p.seller_id', seller)
    if (q) { const like = `%${q.toLowerCase()}%`; qb.andWhere((b) => b.whereRaw('lower(p.title) like ?', [like]).orWhereRaw('lower(p.description) like ?', [like])) }
    const total = Number((await qb.clone().count({ c: '*' }).first()).c)
    if (sort === 'new' || sort === 'popular') qb.orderByRaw('case when u.boost_until > ? then 1 else 0 end desc', [now()])
    const order = { new: ['p.created_at', 'desc'], popular: ['p.views', 'desc'], low: ['p.price', 'asc'], high: ['p.price', 'desc'] }[sort]
    qb.orderBy(order[0], order[1]).limit(limit).offset(offset).select('p.*')
    res.json({ items: await hydrate(await qb), total })
  }))

  r.get('/products/:id', asyncH(async (req, res) => {
    const p = await db('products').where({ id: req.params.id }).first()
    const mine = req.user && (req.user.id === p?.seller_id || req.user.is_admin)
    if (!p || (p.status !== 'active' && !mine)) throw new AppError(404, 'Item not found.', 'NOT_FOUND')
    if (!mine) await db('products').where({ id: p.id }).increment('views', 1)
    const [item] = await hydrate([p])
    const reviews = await db('reviews as r').join('users as b', 'b.id', 'r.buyer_id').where('r.product_id', p.id).orderBy('r.created_at', 'desc').limit(20)
      .select('r.id', 'r.rating', 'r.comment', 'r.created_at', 'b.name as buyerName', 'b.id as buyerId')
    const similar = await hydrate(await db('products').where({ category: p.category, status: 'active' }).andWhere('quantity', '>', 0).andWhereNot({ id: p.id }).orderBy('views', 'desc').limit(5))
    res.json({ product: item, reviews: reviews.map((x) => ({ id: x.id, rating: x.rating, comment: x.comment, createdAt: x.created_at, buyer: { id: x.buyerId, name: x.buyerName } })), similar })
  }))

  r.post('/products', requireAuth, requireVerified, uploadPublic.array('images', 5), asyncH(async (req, res) => {
    const files = req.files || []
    try {
      checkImages(files)
      const parsed = z.object(productFields).safeParse(req.body)
      if (!parsed.success) throw new AppError(400, `${parsed.error.issues[0].path.join('.')}: ${parsed.error.issues[0].message}`, 'VALIDATION')
      if (!files.length) throw new AppError(400, 'images: add at least one photo', 'VALIDATION')
      const d = parsed.data, id = crypto.randomUUID()
      await db.transaction(async (trx) => {
        await trx('products').insert({ id, seller_id: req.user.id, title: d.title, description: d.description, price: d.price, quantity: d.quantity,
          category: d.category, condition: d.condition, delivery: d.delivery, delivery_location: d.deliveryLocation || null, created_at: now(), updated_at: now() })
        await trx('product_images').insert(files.map((f, i) => ({ product_id: id, url: publicUrl(f), position: i })))
      })
      res.status(201).json({ product: (await hydrate([await db('products').where({ id }).first()]))[0] })
    } catch (e) { removeFiles(files); throw e }
  }))

  r.patch('/products/:id', requireAuth, validate(z.object({
    title: productFields.title.optional(), description: productFields.description.optional(), price: productFields.price.optional(),
    quantity: z.coerce.number().int().min(0).max(1000).optional(), condition: productFields.condition.optional(), deliveryLocation: z.string().max(120).optional()
  })), asyncH(async (req, res) => {
    const p = await db('products').where({ id: req.params.id }).first()
    if (!p || p.status === 'removed') throw new AppError(404, 'Item not found.', 'NOT_FOUND')
    if (p.seller_id !== req.user.id) throw new AppError(403, 'This is not your listing.', 'FORBIDDEN')
    const d = req.valid, patch = { updated_at: now() }
    for (const k of ['title', 'description', 'price', 'quantity', 'condition']) if (d[k] !== undefined) patch[k] = d[k]
    if (d.deliveryLocation !== undefined) patch.delivery_location = d.deliveryLocation
    await db('products').where({ id: p.id }).update(patch)
    res.json({ product: (await hydrate([await db('products').where({ id: p.id }).first()]))[0] })
  }))

  r.delete('/products/:id', requireAuth, asyncH(async (req, res) => {
    const p = await db('products').where({ id: req.params.id }).first()
    if (!p) throw new AppError(404, 'Item not found.', 'NOT_FOUND')
    if (p.seller_id !== req.user.id && !req.user.is_admin) throw new AppError(403, 'This is not your listing.', 'FORBIDDEN')
    await db('products').where({ id: p.id }).update({ status: 'removed', updated_at: now() })
    res.json({ ok: true })
  }))

  r.get('/me/products', requireAuth, asyncH(async (req, res) => {
    res.json({ items: await hydrate(await db('products').where({ seller_id: req.user.id }).whereNot({ status: 'removed' }).orderBy('created_at', 'desc')) })
  }))

  // ---- favourites ----
  r.get('/favorites', requireAuth, asyncH(async (req, res) => {
    const rows = await db('favorites as f').join('products as p', 'p.id', 'f.product_id').where('f.user_id', req.user.id).andWhere('p.status', 'active').orderBy('f.created_at', 'desc').select('p.*')
    res.json({ items: await hydrate(rows) })
  }))
  r.get('/favorites/ids', requireAuth, asyncH(async (req, res) => {
    res.json({ ids: (await db('favorites').where({ user_id: req.user.id }).select('product_id')).map((x) => x.product_id) })
  }))
  r.put('/favorites/:id', requireAuth, asyncH(async (req, res) => {
    if (!(await db('products').where({ id: req.params.id, status: 'active' }).first())) throw new AppError(404, 'Item not found.', 'NOT_FOUND')
    await db('favorites').insert({ user_id: req.user.id, product_id: req.params.id, created_at: now() }).onConflict(['user_id', 'product_id']).ignore()
    res.json({ ok: true })
  }))
  r.delete('/favorites/:id', requireAuth, asyncH(async (req, res) => {
    await db('favorites').where({ user_id: req.user.id, product_id: req.params.id }).del()
    res.json({ ok: true })
  }))

  // ---- public vendor store ----
  r.get('/stores/:id', asyncH(async (req, res) => {
    const u = await db('users').where({ id: req.params.id }).first()
    if (!u || u.banned) throw new AppError(404, 'Store not found.', 'NOT_FOUND')
    const rating = await ratingFor(db, u.id)
    const products = await hydrate(await db('products').where({ seller_id: u.id, status: 'active' }).andWhere('quantity', '>', 0).orderBy('created_at', 'desc').limit(60))
    const sales = Number((await db('orders').where({ seller_id: u.id, status: 'confirmed' }).count({ c: '*' }).first()).c)
    const reviews = await db('reviews as r').join('users as b', 'b.id', 'r.buyer_id').where('r.seller_id', u.id).orderBy('r.created_at', 'desc').limit(20)
      .select('r.id', 'r.rating', 'r.comment', 'r.created_at', 'b.name as buyerName', 'b.id as buyerId')
    res.json({
      store: { ...publicUser(u, rating), storeCategory: u.store_category, vendorActive: isVendorActive(u), completedSales: sales },
      products, reviews: reviews.map((x) => ({ id: x.id, rating: x.rating, comment: x.comment, createdAt: x.created_at, buyer: { id: x.buyerId, name: x.buyerName } }))
    })
  }))
  return r
}
