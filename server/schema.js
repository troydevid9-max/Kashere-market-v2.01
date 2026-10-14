/** Creates every table if missing. Timestamps are ISO strings, money is whole naira (integers). */
export async function ensureSchema(db) {
  const make = async (name, fn) => { if (!(await db.schema.hasTable(name))) await db.schema.createTable(name, fn) }
  const ts = (t, c) => t.text(c)

  await make('users', (t) => {
    t.text('id').primary()
    t.text('name').notNullable()
    t.text('email').notNullable().unique()
    t.text('matric').notNullable().unique()
    t.text('phone')
    t.text('password_hash').notNullable()
    t.integer('is_admin').notNullable().defaultTo(0)
    t.text('account_type').notNullable().defaultTo('student')
    t.text('business_name'); t.text('store_category'); t.text('delivery_location')
    t.text('verification_status').notNullable().defaultTo('none') // none | pending | approved | rejected
    t.text('verification_note'); t.text('id_photo')
    ts(t, 'vendor_expires_at'); ts(t, 'boost_until')
    t.integer('launch_offer_used').notNullable().defaultTo(0)
    t.integer('wallet_balance').notNullable().defaultTo(0)
    t.integer('banned').notNullable().defaultTo(0)
    ts(t, 'created_at')
  })
  await make('products', (t) => {
    t.text('id').primary()
    t.text('seller_id').notNullable().references('id').inTable('users')
    t.text('title').notNullable(); t.text('description').notNullable()
    t.integer('price').notNullable(); t.integer('quantity').notNullable()
    t.text('category').notNullable(); t.text('condition').notNullable()
    t.text('delivery').notNullable().defaultTo('delivery'); t.text('delivery_location')
    t.text('status').notNullable().defaultTo('active') // active | removed
    t.integer('views').notNullable().defaultTo(0)
    ts(t, 'created_at'); ts(t, 'updated_at')
    t.index(['category']); t.index(['seller_id']); t.index(['status'])
  })
  await make('product_images', (t) => {
    t.increments('id'); t.text('product_id').notNullable().references('id').inTable('products')
    t.text('url').notNullable(); t.integer('position').notNullable().defaultTo(0)
    t.index(['product_id'])
  })
  await make('favorites', (t) => {
    t.text('user_id').notNullable().references('id').inTable('users')
    t.text('product_id').notNullable().references('id').inTable('products')
    ts(t, 'created_at'); t.primary(['user_id', 'product_id'])
  })
  await make('orders', (t) => {
    t.text('id').primary(); t.text('code').notNullable().unique(); t.text('group_ref').notNullable()
    t.text('buyer_id').notNullable().references('id').inTable('users')
    t.text('seller_id').notNullable().references('id').inTable('users')
    // pending_payment | paid | shipped | delivered | confirmed | disputed | refunded | cancelled
    t.text('status').notNullable()
    t.integer('subtotal').notNullable(); t.integer('delivery_fee').notNullable(); t.integer('total').notNullable()
    t.integer('commission').notNullable().defaultTo(0); t.integer('seller_payout').notNullable().defaultTo(0)
    t.text('delivery_method').notNullable(); t.text('address'); t.text('note')
    t.text('receipt_photo')
    ts(t, 'paid_at'); ts(t, 'shipped_at'); ts(t, 'delivered_at'); ts(t, 'confirmed_at'); ts(t, 'auto_release_at'); ts(t, 'cancelled_at')
    ts(t, 'created_at'); ts(t, 'updated_at')
    t.index(['buyer_id']); t.index(['seller_id']); t.index(['status']); t.index(['group_ref'])
  })
  await make('order_items', (t) => {
    t.increments('id'); t.text('order_id').notNullable().references('id').inTable('orders')
    t.text('product_id').notNullable().references('id').inTable('products')
    t.text('title').notNullable(); t.integer('price').notNullable(); t.integer('qty').notNullable(); t.text('image')
    t.index(['order_id'])
  })
  await make('payments', (t) => {
    t.text('id').primary(); t.text('reference').notNullable().unique()
    t.text('kind').notNullable() // order | topup | badge
    t.text('user_id').notNullable().references('id').inTable('users')
    t.integer('amount').notNullable()
    t.text('status').notNullable().defaultTo('pending') // pending | success | failed
    t.text('provider').notNullable(); t.text('meta')
    ts(t, 'created_at'); ts(t, 'paid_at')
  })
  await make('ledger', (t) => {
    t.increments('id'); t.text('user_id').references('id').inTable('users') // NULL = platform account
    t.text('type').notNullable(); t.integer('amount').notNullable() // signed
    t.integer('balance_after'); t.text('ref_type'); t.text('ref_id'); t.text('description')
    ts(t, 'created_at'); t.index(['user_id'])
  })
  await make('withdrawals', (t) => {
    t.text('id').primary(); t.text('user_id').notNullable().references('id').inTable('users')
    t.integer('amount').notNullable()
    t.text('bank_name').notNullable(); t.text('account_number').notNullable(); t.text('account_name').notNullable()
    t.text('status').notNullable().defaultTo('pending') // pending | paid | rejected
    t.text('note'); ts(t, 'created_at'); ts(t, 'processed_at')
  })
  await make('reviews', (t) => {
    t.text('id').primary(); t.text('order_id').notNullable().unique().references('id').inTable('orders')
    t.text('product_id').references('id').inTable('products')
    t.text('buyer_id').notNullable().references('id').inTable('users')
    t.text('seller_id').notNullable().references('id').inTable('users')
    t.integer('rating').notNullable(); t.text('comment'); ts(t, 'created_at'); t.index(['seller_id'])
  })
  await make('complaints', (t) => {
    t.text('id').primary(); t.text('order_id').notNullable().references('id').inTable('orders')
    t.text('buyer_id').notNullable().references('id').inTable('users')
    t.text('seller_id').notNullable().references('id').inTable('users')
    t.text('type').notNullable(); t.text('description').notNullable()
    t.text('status').notNullable().defaultTo('open') // open | resolved
    t.text('resolution'); t.text('resolution_note'); t.text('resolved_by')
    ts(t, 'created_at'); ts(t, 'resolved_at')
  })
  await make('notifications', (t) => {
    t.increments('id'); t.text('user_id').notNullable().references('id').inTable('users')
    t.text('title').notNullable(); t.text('body'); t.text('link')
    t.integer('is_read').notNullable().defaultTo(0); ts(t, 'created_at'); t.index(['user_id'])
  })
  await make('conversations', (t) => {
    t.text('id').primary()
    t.text('user_a').notNullable().references('id').inTable('users')
    t.text('user_b').notNullable().references('id').inTable('users')
    t.text('product_id'); ts(t, 'last_message_at'); ts(t, 'created_at')
  })
  await make('messages', (t) => {
    t.increments('id'); t.text('conversation_id').notNullable().references('id').inTable('conversations')
    t.text('sender_id').notNullable().references('id').inTable('users')
    t.text('body').notNullable(); ts(t, 'created_at'); ts(t, 'read_at'); t.index(['conversation_id'])
  })
  await make('admin_logs', (t) => {
    t.increments('id'); t.text('admin_id').notNullable(); t.text('action').notNullable()
    t.text('target'); t.text('detail'); ts(t, 'created_at')
  })
}
