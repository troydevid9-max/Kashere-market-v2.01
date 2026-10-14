# Implementation Plan — Kashere Marketplace Phase 1 UI

## Phase 0: Setup & Configuration
- [ ] Install `@fontsource/inter` and `vite-plugin-pwa`
- [ ] Update `vite.config.js` with PWA plugin
- [ ] Create `public/manifest.webmanifest` and icon placeholders
- [ ] Update `index.html` title, meta tags, PWA icons

## Phase 1: Styles Foundation
- [ ] `src/styles/variables.css` — CSS custom properties (colors, typography, spacing, radius, shadows)
- [ ] `src/styles/global.css` — reset, base styles, Inter font, scrollbar, focus-visible
- [ ] `src/styles/components.css` — shared utility classes (container, flex, grid, sr-only)
- [ ] Import all in `src/index.css`

## Phase 2: Mock Data
- [ ] `src/data/categories.js` — 6 category objects with icons (SVG strings)
- [ ] `src/data/mock.js` — products, users, reviews, complaints, escrow orders, admin stats

## Phase 3: Context Providers
- [ ] `src/context/UserContext.jsx` — currentUser, login, logout, becomeVendor, mock auth
- [ ] `src/context/CartContext.jsx` — items, add/remove/clear, checkout flow state
- [ ] Wrap App in both providers

## Phase 4: Shared Components (12 components)
Each in `src/components/ui/` with own CSS module:
1. `Button.jsx` + `Button.module.css`
2. `Input.jsx` / `Textarea.jsx` / `Select.jsx` + shared `FormField.module.css`
3. `Card.jsx` + `Card.module.css`
4. `Modal.jsx` + `Modal.module.css` (portal, focus trap)
5. `Navbar.jsx` + `Navbar.module.css` (responsive, cart count, user menu)
6. `Footer.jsx` + `Footer.module.css`
7. `Avatar.jsx` + `Avatar.module.css`
8. `Badge.jsx` + `Badge.module.css`
9. `StarRating.jsx` + `StarRating.module.css`
10. `PhotoUpload.jsx` + `PhotoUpload.module.css` (drag-drop, compress, preview)
11. `CategoryChip.jsx` + `CategoryChip.module.css`
12. `Toast.jsx` + `Toast.module.css` + `useToast` hook

## Phase 5: Pages (9 pages)
Each in `src/pages/` with own CSS module:
1. `HomePage.jsx` — hero, category chips, product grid
2. `CategoriesPage.jsx` — category grid
3. `ProductDetailPage.jsx` — carousel, seller card, escrow notice, buy CTA
4. `SellPage.jsx` — 4-step wizard with form state
5. `AuthPage.jsx` — 3 tabs, forms, validation
6. `ProfilePage.jsx` — 3 tabs, vendor badge UI
7. `CartPage.jsx` — 3 sub-views: cart, checkout, escrow confirm
8. `ReviewsPage.jsx` — 2 tabs, complaint form
9. `AdminPage.jsx` — sidebar + 5 content panels with tables

## Phase 6: Routing & App Shell
- [ ] Update `src/App.jsx` with all 9 routes
- [ ] Add `Navbar` + `Footer` + `ToastContainer` + `Outlet` layout
- [ ] Bottom tab bar component for mobile (`MobileTabs.jsx`)

## Phase 7: PWA Polish
- [ ] Generate real icons (192, 512) — placeholder SVGs for now
- [ ] `offline.html` fallback
- [ ] Test install prompt on mobile

## Phase 8: Verification
- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — successful
- [ ] `npm run preview` — manual smoke test all 9 routes
- [ ] Responsive check at 375px, 768px, 1440px

---

## Execution Order

**Batch 1** (can run in parallel):
- Install deps + PWA config
- Styles foundation (3 files)
- Mock data (2 files)
- Context providers (2 files)

**Batch 2** (sequential, components first):
- All 12 shared components
- All 9 pages

**Batch 3**:
- Routing + App shell + MobileTabs
- PWA polish

**Batch 4**:
- Lint + Build + Preview verification

---

## File Count Estimate
- New files: ~45 (12 components × 2 + 9 pages × 2 + 3 styles + 2 data + 2 context + 3 config + 1 mobile tabs + 1 toast hook + 5 PWA)
- Modified: `package.json`, `vite.config.js`, `index.html`, `src/App.jsx`, `src/index.css`, `src/main.jsx`

---

## Dependencies to Add
```json
"@fontsource/inter": "^5.0.0",
"vite-plugin-pwa": "^0.20.0"
```

---

## Notes
- No TypeScript — plain JS with JSDoc types in mock.js for clarity
- CSS Modules for scoping, no CSS-in-JS
- All images: placeholder SVGs or `https://picsum.photos/seed/{id}/400/300`
- Form validation: custom hook `useForm` (inline in each page or shared)
- Escrow flow: purely UI mock, no backend calls