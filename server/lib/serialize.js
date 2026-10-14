import { isVendorActive } from './auth.js'
import { now } from './http.js'

/** What anyone may see about a user. Never include email, phone, matric, wallet. */
export const publicUser = (u, rating = {}) => ({
  id: u.id, name: u.name, isVendor: isVendorActive(u), businessName: u.business_name || null,
  verified: u.verification_status === 'approved', rating: rating.avg ?? 0, reviewCount: rating.count ?? 0, joinedAt: u.created_at
})

/** The signed-in user's own view. */
export const privateUser = (u, rating = {}) => ({
  ...publicUser(u, rating), email: u.email, matric: u.matric, phone: u.phone, isAdmin: !!u.is_admin,
  accountType: u.account_type, storeCategory: u.store_category, deliveryLocation: u.delivery_location,
  verificationStatus: u.verification_status, verificationNote: u.verification_note,
  vendorExpiry: u.vendor_expires_at, boostActive: !!u.boost_until && u.boost_until > now(), walletBalance: u.wallet_balance
})

export const ratingFor = async (db, sellerId) => {
  const r = await db('reviews').where({ seller_id: sellerId }).avg({ avg: 'rating' }).count({ count: '*' }).first()
  return { avg: r?.avg ? Math.round(Number(r.avg) * 10) / 10 : 0, count: Number(r?.count || 0) }
}

export const ratingsMap = async (db, ids) => {
  if (!ids.length) return {}
  const rows = await db('reviews').whereIn('seller_id', ids).select('seller_id').avg({ avg: 'rating' }).count({ count: '*' }).groupBy('seller_id')
  return Object.fromEntries(rows.map((r) => [r.seller_id, { avg: Math.round(Number(r.avg) * 10) / 10, count: Number(r.count) }]))
}
