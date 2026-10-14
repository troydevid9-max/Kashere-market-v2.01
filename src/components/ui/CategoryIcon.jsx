import { BookOpen, Shirt, ShoppingBag, Wheat, Laptop, Wrench, Package } from 'lucide-react'

const map = { BookOpen, Shirt, ShoppingBag, Wheat, Laptop, Wrench }

export function CategoryIcon({ name, ...props }) {
  const Icon = map[name] || Package
  return <Icon {...props} />
}
