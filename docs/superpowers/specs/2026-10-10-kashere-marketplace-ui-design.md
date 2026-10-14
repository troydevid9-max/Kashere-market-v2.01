# Kashere Student Marketplace — Phase 1: UI + Navigation Spec

**Project**: Kashere Student Marketplace (Federal University of Kashere)
**Phase**: 1 — UI only, pixel-perfect from image references, no backend
**Stack**: React 19 + Vite + React Router v7, plain CSS, no new deps
**PWA**: Installable via `vite-plugin-pwa`

---

## 1. Architecture

```
src/
  components/      # shared UI components
  pages/           # 9 page components
  context/         # CartContext, UserContext (mock state)
  data/            # mock.js, categories.js
  styles/          # variables.css, global.css, components.css
  firebase.js      # reserved for Phase 2
  App.jsx          # routes + providers
  main.jsx         # entry
```

**Routing** (`App.jsx`):
- `/` → HomePage
- `/categories` → CategoriesPage
- `/product/:id` → ProductDetailPage
- `/sell` → SellPage
- `/auth` → AuthPage
- `/profile` → ProfilePage
- `/cart` → CartPage
- `/reviews` → ReviewsPage
- `/admin` → AdminPage

**State**: Two React contexts only
- `UserContext` — currentUser (mock), login/logout, vendor status
- `CartContext` — items[], add/remove/clear, escrow flow steps

---

## 2. Page Specifications

### 2.1 Home/Feed (`/`)
- Hero: "Kashere Marketplace — Trusted Student Trading"
- Category chips (horizontal scroll): Academic, Clothes, Shoes & Bags, Foodstuffs, Services, More
- Product grid: 2-col mobile, 3-col tablet, 4-col desktop
- Each card: image, title, price (₦), category badge, seller avatar + name, "Escrow Protected" badge
- Trust strip: "Verified Students Only • Escrow Protection • 24hr Dispute Resolution"

### 2.2 Categories (`/categories`)
- 6 category cards in grid: icon, name, product count
- Tap → filters Home feed (URL param `?category=`)

### 2.3 Product Detail (`/product/:id`)
- Image carousel (swipe/dots), full-screen modal on tap
- Title, price (large), condition tag (New/Like New/Good/Fair)
- Seller card: avatar, name, "Verified Student" badge, rating, "Message" button
- Description, specs list
- Escrow notice box: "Your money is held until you confirm delivery with a photo"
- Primary CTA: "Buy Now — ₦X,XXX" (disabled if own listing)

### 2.4 Sell/List Item (`/sell`)
- 4-step wizard (progress bar):
  1. Photos (PhotoUpload, max 5, drag-drop, preview, compress)
  2. Details: title, description, condition select, category select
  3. Price: amount (₦), negotiable toggle
  4. Preview: full card preview → "Publish Listing"
- Validation at each step, "Back" preserves data

### 2.5 Auth (`/auth`)
- Three tabs: Login | Signup | Verify
- **Login**: matric number + password, "Forgot?" link
- **Signup**: full name, matric, email, phone, password, confirm, "I'm a FUKASHERE student" checkbox
- **Verify**: OTP input (6 digits), resend timer, "Verify & Enter"
- Mock: any matric @fukashere.edu.ng passes, OTP = "123456"

### 2.6 Profile (`/profile`)
- Top: avatar, name, matric, verification status, vendor badge (if active)
- Tabs: My Listings | Purchases | Vendor Badge
- **My Listings**: cards with status badges (Active, Sold, Pending), edit/delete actions
- **Purchases**: order cards with escrow status timeline
- **Vendor Badge**: 
  - If not vendor: "Get Verified Vendor Badge — ₦5,000 / 3 months", benefits list, "Upgrade" button
  - If vendor: badge expiry countdown, "Renew" button, boost credits

### 2.7 Cart / Checkout / Escrow (`/cart`)
- **Empty state**: illustration + "Start Shopping"
- **Cart**: list of items (thumb, title, price, qty, remove), subtotal, "Proceed to Checkout"
- **Checkout**: delivery info (hostel/block/room, phone), payment method (Escrow only V1)
- **Escrow Summary**: "₦X,XXX held securely • Seller ships • You confirm with photo • Seller paid"
- **Photo Upload Confirmation**: large upload zone, "I have received the item" checkbox, "Confirm & Release Payment"
- Success toast: "Payment released to seller. Order complete."

### 2.8 Reviews & Complaints (`/reviews`)
- Tabs: Received Reviews | File Complaint
- **Received Reviews**: list of StarRating + comment + buyer name + date + product link
- **File Complaint**: form — order reference (select from purchases), type (Not Delivered / Wrong Item / Damaged / Other), description, evidence photos (PhotoUpload), submit → "Complaint logged, admin will review in 24hrs"

### 2.9 Admin Panel (`/admin`)
- Sidebar nav: Users | Listings | Escrow Disputes | Vendors | Analytics
- **Users**: table (name, matric, email, verified, vendor, joined, actions: verify/ban)
- **Listings**: table (title, seller, category, price, status, reported, actions: hide/feature)
- **Escrow Disputes**: table (order, buyer, seller, amount, status, evidence, actions: release/refund)
- **Vendors**: table (name, expiry, boost credits, status)
- **Analytics**: 4 cards (Total Users, Active Listings, Escrow Volume, Revenue)

---

## 3. Shared Component Library

| Component | Variants / Props |
|-----------|------------------|
| `Button` | `variant: 'primary'|'secondary'|'ghost'|'danger'`, `size`, `loading`, `fullWidth`, `onClick` |
| `Input` | `type`, `label`, `error`, `helperText`, `icon`, `required` |
| `Textarea` | `rows`, `maxLength`, `label`, `error` |
| `Select` | `options[]`, `placeholder`, `label`, `error` |
| `Card` | `children`, `hover`, `padding` |
| `Modal` | `open`, `onClose`, `title`, `children`, `size` |
| `Navbar` | `cartCount`, `user`, `onSearch`, `onMenu` |
| `Footer` | static links |
| `Avatar` | `src?`, `name`, `size`, `verified`, `vendor` |
| `Badge` | `variant: 'verified'|'vendor'|'new'|'escrow'|'status'`, `text` |
| `StarRating` | `value`, `max`, `readonly`, `onChange` |
| `PhotoUpload` | `maxFiles`, `maxSizeMB`, `onChange`, `previews[]` |
| `CategoryChip` | `label`, `icon`, `selected`, `onClick` |
| `EmptyState` | `icon`, `title`, `description`, `action` |
| `Skeleton` | `variant: 'card'|'list'|'avatar'|'text'` |
| `Toast` | `type: 'success'|'error'|'info'`, `message`, `duration` |

---

## 4. Brand System

### Colors (CSS variables in `variables.css`)
```css
:root {
  --color-primary: #0B6E4F;
  --color-primary-light: #E8F5EF;
  --color-primary-dark: #064635;
  --color-accent: #F59E0B;
  --color-accent-light: #FEF3C7;
  --color-danger: #DC2626;
  --color-danger-light: #FEE2E2;
  --color-success: #059669;
  --color-text: #111827;
  --color-text-muted: #6B7280;
  --color-border: #E5E7EB;
  --color-bg: #FFFFFF;
  --color-bg-alt: #F9FAFB;
  --color-bg-hover: #F3F4F6;
}
```

### Typography
- Font: Inter (via `@fontsource/inter` — 12kb gzipped)
- Scale: `--fs-xs: 0.75rem`, `--fs-sm: 0.875rem`, `--fs-base: 1rem`, `--fs-lg: 1.125rem`, `--fs-xl: 1.25rem`, `--fs-2xl: 1.5rem`, `--fs-3xl: 2rem`, `--fs-4xl: 2.5rem`
- Weight: `--fw-normal: 400`, `--fw-medium: 500`, `--fw-semibold: 600`, `--fw-bold: 700`

### Spacing & Radius
- Space scale: `--space-1: 4px` … `--space-8: 32px`
- Radius: `--radius-sm: 4px`, `--radius-md: 8px`, `--radius-lg: 12px`, `--radius-xl: 16px`, `--radius-full: 9999px`
- Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg`

---

## 5. Mock Data (`src/data/mock.js`)

Exports: `mockProducts[]`, `mockUsers[]`, `mockCategories[]`, `mockReviews[]`, `mockComplaints[]`, `mockEscrowOrders[]`, `mockAdminStats{}`

Each entity matches the TypeScript contracts in the design. Sufficient records to populate every page realistically (12+ products, 5+ users, 3+ reviews per product, 2+ complaints, 5+ escrow orders).

---

## 6. PWA Configuration

`vite.config.js` + `vite-plugin-pwa`:
- Manifest: name "Kashere Marketplace", short_name "Kashere", theme_color `#0B6E4F`, background_color `#FFFFFF`, display `standalone`, icons 192/512
- Service worker: `registerType: 'autoUpdate'`, precache all assets
- Offline fallback: `offline.html` with "You're offline" message

---

## 7. Responsive Breakpoints

- Mobile: `< 640px` (base)
- Tablet: `640px – 1023px`
- Desktop: `≥ 1024px`
- Large: `≥ 1280px`

Container max-width: `1200px`, centered, `padding: var(--space-4)`

---

## 8. Accessibility Checklist

- [ ] Semantic HTML5 (`header`, `main`, `section`, `nav`, `footer`, `article`)
- [ ] All interactive elements focusable, visible focus ring (`outline: 2px solid var(--color-primary)`)
- [ ] ARIA labels on icon-only buttons, `aria-live` for toasts
- [ ] Color contrast ≥ 4.5:1 (AA) for text, 3:1 for UI elements
- [ ] `prefers-reduced-motion` disables animations
- [ ] Form inputs associated with labels (`htmlFor` / `id`)
- [ ] Modal focus trap, `Escape` closes, restore focus on close

---

## 9. Quality Gates

- `npm run lint` (oxlint) — zero errors
- `npm run build` — successful production build
- No console errors/warnings in dev or preview
- All 9 pages render without crashes at each breakpoint

---

## 10. Out of Scope (Phase 2+)

- Firebase Auth / Firestore integration
- Real payments (Paystack/Flutterwave)
- Real-time chat
- Push notifications
- Email/SMS OTP
- Image upload to Cloudinary/Storage
- Search indexing
- Multi-university support

---

## 11. Acceptance Criteria

1. All 9 routes accessible, no 404s
2. Navigation works: bottom tabs (mobile), navbar (desktop), sidebar (admin)
3. Forms validate, show inline errors, loading states
4. PhotoUpload compresses, previews, enforces limits
5. Cart persists in context, survives route changes
6. Escrow flow completes: checkout → photo upload → success toast
7. PWA installs on Chrome Android / Safari iOS
8. Lint + build pass
9. Visual match to provided image references (when received)

---

**Next Step**: User reviews this spec. On approval, I will invoke `writing-plans` skill to create the implementation plan.