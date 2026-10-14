export const CATEGORIES = [
  { id: 'academic', name: 'Academic Materials', short: 'Academic' },
  { id: 'clothes', name: 'Clothes', short: 'Clothes' },
  { id: 'shoes-bags', name: 'Shoes & Bags', short: 'Shoes & Bags' },
  { id: 'foodstuffs', name: 'Foodstuffs', short: 'Food' },
  { id: 'electronics', name: 'Electronics', short: 'Electronics' },
  { id: 'services', name: 'Services', short: 'Services' }
]
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id)
export const CONDITIONS = ['new', 'like-new', 'good', 'fair']
export const DELIVERY = ['delivery', 'pickup', 'both']
export const COMPLAINT_TYPES = ['not-delivered', 'wrong-item', 'damaged', 'not-as-described', 'other']
export const MATRIC_RE = /^FUK\/[A-Z]{2,4}\/\d{2,4}\/\d{3,4}$/i
export const PHONE_RE = /^0[789][01]\d{8}$/
