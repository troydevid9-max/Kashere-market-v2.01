/* Demo data for local development:  npm run seed
   Never run this against a real production database. */
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { config } from './config.js'
import { createDb } from './db.js'
import { ensureSchema } from './schema.js'
import { addDays, now } from './lib/http.js'

export async function seed(db, { quiet = false } = {}) {
  await ensureSchema(db)
  if (await db('users').first()) { if (!quiet) console.log('Database already has users. Seed skipped.'); return false }
  const pw = await bcrypt.hash('password123', 10)
  const adminPw = await bcrypt.hash('Admin@12345', 10)
  const U = (name, matric, email, extra = {}) => ({ id: crypto.randomUUID(), is_admin: 0, account_type: 'student', launch_offer_used: 0, wallet_balance: 0, banned: 0, vendor_expires_at: null, boost_until: null, business_name: null, name, matric, email, phone: '0801234' + String(Math.floor(1000 + Math.random() * 8999)), password_hash: pw, verification_status: 'approved', created_at: addDays(now(), -60), ...extra })
  const exp = addDays(now(), 64)
  const users = [
    U('Aisha Mohammed', 'FUK/CS/21/0045', 'aisha.mohammed@fukashere.edu.ng', { account_type: 'vendor', business_name: "Aisha's Corner", vendor_expires_at: exp, launch_offer_used: 1, boost_until: addDays(now(), 20), wallet_balance: 23980 }),
    U('Ibrahim Yusuf', 'FUK/EE/22/0112', 'ibrahim.yusuf@fukashere.edu.ng', { wallet_balance: 5000 }),
    U('Fatima Abdullahi', 'FUK/BS/21/0089', 'fatima.abdullahi@fukashere.edu.ng', { account_type: 'vendor', business_name: 'Fatima Fashion', vendor_expires_at: exp }),
    U('Musa Garba', 'FUK/ME/23/0056', 'musa.garba@fukashere.edu.ng'),
    U('Zainab Aliyu', 'FUK/CH/22/0078', 'zainab.aliyu@fukashere.edu.ng', { verification_status: 'none' }),
    { ...U('Admin User', 'ADMIN', 'admin@kashere-marketplace.com'), password_hash: adminPw, is_admin: 1 }
  ]
  await db('users').insert(users)
  const [aisha, ibrahim, fatima, musa] = users

  const P = (seller, title, price, category, condition, description, extra = {}) => ({ id: crypto.randomUUID(), seller_id: seller.id, title, description, price, quantity: extra.quantity ?? 5, category, condition, delivery: 'both', views: Math.floor(Math.random() * 60), created_at: addDays(now(), -Math.floor(Math.random() * 20)), updated_at: now() })
  const products = [
    P(aisha, 'Nike Air Force 1 - White, UK 8', 28000, 'shoes-bags', 'like-new', 'Clean white Air Force 1, worn twice. Size 42 (UK 8). Original box and spare laces included.'),
    P(aisha, 'Calculus Textbook - Stewart 8th Edition', 8500, 'academic', 'good', 'Clean copy with light pencil notes in the first three chapters. Covers MTH101 and MTH102.'),
    P(aisha, 'Vintage Backpack - Brown Leather', 15000, 'shoes-bags', 'good', 'Sturdy vintage-style backpack with padded laptop sleeve. Zips and straps all in good shape.'),
    P(aisha, 'Chicken & Chips Combo (Hostel Delivery)', 4500, 'foodstuffs', 'new', 'Freshly made to order. Delivered hot to any hostel on campus between 12pm and 9pm.', { quantity: 40 }),
    P(aisha, 'Samsung 25W Fast Charger + Cable', 6000, 'electronics', 'new', 'Original Samsung 25W fast charger with USB-C cable. Sealed pack, one-week return window.'),
    P(ibrahim, 'Nike Air Max 270 - Size 42', 15000, 'shoes-bags', 'good', 'Worn about 10 times. Very comfortable, minor creasing on toe box. Original box included.'),
    P(fatima, 'Ankara Dress - Size Medium', 4500, 'clothes', 'new', 'Never worn, tags still attached. Beautiful Ankara pattern, perfect for Friday prayers or events.'),
    P(fatima, 'HP Pavilion Laptop - i5 11th Gen, 8GB RAM, 512GB SSD', 280000, 'electronics', 'good', 'Great for coding and design work. Battery lasts 5 hours. Charger and sleeve included.', { quantity: 1 }),
    P(musa, 'Samsung Galaxy A54 - 128GB, Awesome Graphite', 185000, 'electronics', 'like-new', 'Bought three months ago, always in a case. Comes with box, charger and screen protector.', { quantity: 1 }),
    P(aisha, 'Tutoring: Engineering Mathematics (MTH201)', 2000, 'services', 'new', 'One-hour one-on-one sessions in the library. Past questions included. Book a slot by message.', { quantity: 20 }),
    P(fatima, 'Bag of Rice (50kg)', 42000, 'foodstuffs', 'new', 'Premium parboiled rice, sealed bag. Delivery to hostels on request.', { quantity: 10 })
  ]
  await db('products').insert(products)

  // A few finished sales so ratings and the dashboard have real numbers.
  const mkOrder = async (buyer, seller, product, status, daysAgo) => {
    const id = crypto.randomUUID(), subtotal = product.price, fee = 1000, total = subtotal + fee
    const commission = status === 'confirmed' ? Math.round((subtotal * config.commissionPercent) / 100) : 0
    const at = addDays(now(), -daysAgo)
    await db('orders').insert({ id, code: 'KS-' + (100000 + Math.floor(Math.random() * 899999)), group_ref: crypto.randomUUID(), buyer_id: buyer.id, seller_id: seller.id, status, subtotal, delivery_fee: fee, total,
      commission, seller_payout: status === 'confirmed' ? subtotal - commission + fee : 0, delivery_method: 'delivery', address: `${buyer.name} · ${buyer.phone} · Hostel B`, paid_at: at, confirmed_at: status === 'confirmed' ? at : null, created_at: at, updated_at: at })
    await db('order_items').insert({ order_id: id, product_id: product.id, title: product.title, price: product.price, qty: 1 })
    return id
  }
  const done = [[ibrahim, aisha, products[1], 5, 'Book arrived in perfect condition, exactly as described. Seller communicated well and shipped fast. Escrow made me feel safe paying.'], [musa, aisha, products[1], 4, 'Good seller, quick delivery.'], [ibrahim, fatima, products[6], 5, 'Never worn, tags still attached. Exactly as described.']]
  for (const [buyer, seller, product, rating, comment] of done) {
    const oid = await mkOrder(buyer, seller, product, 'confirmed', 6)
    await db('reviews').insert({ id: crypto.randomUUID(), order_id: oid, product_id: product.id, buyer_id: buyer.id, seller_id: seller.id, rating, comment, created_at: now() })
  }
  await mkOrder(musa, aisha, products[0], 'paid', 1)
  await mkOrder(ibrahim, aisha, products[2], 'shipped', 2)
  await db('notifications').insert([{ user_id: aisha.id, title: 'Welcome to Kashere', body: 'Your vendor badge is active.', link: '/dashboard', created_at: now() }])

  if (!quiet) console.log(`Seeded demo data.\n  Student/vendor login: FUK/CS/21/0045  /  password123\n  Admin login:          ADMIN           /  Admin@12345`)
  return true
}

// Run directly: node server/seed.js
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('seed.js')) {
  if (config.prod) { console.error('Refusing to seed demo data in production.'); process.exit(1) }
  const db = createDb()
  await seed(db)
  await db.destroy()
}
