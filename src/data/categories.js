// Icons are lucide-react component names, resolved in components/ui/CategoryIcon.jsx
export const categories = [
  { id: 'academic', name: 'Academic Materials', short: 'Academic', icon: 'BookOpen', tint: '#ececec', ink: '#111111' },
  { id: 'clothes', name: 'Clothes', short: 'Clothes', icon: 'Shirt', tint: '#ececec', ink: '#111111' },
  { id: 'shoes-bags', name: 'Shoes & Bags', short: 'Shoes & Bags', icon: 'ShoppingBag', tint: '#ececec', ink: '#111111' },
  { id: 'foodstuffs', name: 'Foodstuffs', short: 'Food', icon: 'Wheat', tint: '#ececec', ink: '#111111' },
  { id: 'electronics', name: 'Electronics', short: 'Electronics', icon: 'Laptop', tint: '#ececec', ink: '#111111' },
  { id: 'services', name: 'Services', short: 'Services', icon: 'Wrench', tint: '#ececec', ink: '#111111' }
];

export const getCategory = (id) => categories.find((c) => c.id === id) || categories[0];
