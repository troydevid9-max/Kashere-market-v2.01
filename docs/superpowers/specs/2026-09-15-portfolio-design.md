# Portfolio Design — 2026-09-15

## Goal
Single-page Frontend React portfolio inspired by https://www.quantoxtinc.com/ flow, but personal and unique. Mid-tone theme, fully responsive.

## Inspiration analysis (what we borrow vs change)
Borrow structure/rhythm from Quantoxt Inc:
- Bold hero + proof stats
- Interactive showcase moment (their client dashboard)
- Comparison/trust grid
- 3-step process (01/02/03)
- Projects/proof + FAQ + contact/footer

Change to avoid replica:
- No agency sales copy, no pricing ($200), no timeline guarantees, no client dashboard
- Personal voice: name, role, story, skills
- Mid-tone palette, not pure dark/light
- Featured Build + Skills Grid + Projects Grid instead of pricing/comparison

## Architecture
- Stack: React 19 + Vite + react-router-dom (existing in `Default Project`)
- Route `/` renders new `src/pages/Portfolio.jsx` (replaces current Landing usage in `src/App.jsx:14`)
- New files:
  - `src/pages/Portfolio.jsx` — section composition + nav anchors
  - `src/data/projects.js` — static project entries
  - `src/components/Hero.jsx`, `FeaturedBuild.jsx`, `Skills.jsx`, `Process.jsx`, `ProjectsGrid.jsx`, `About.jsx`, `Faq.jsx`, `Contact.jsx`, `Footer.jsx`, `Navbar.jsx`
- Styling: extend `src/index.css` + `src/App.css` with CSS vars. No new dependencies.
- Router kept for future `/projects/:slug` expansion, not required now.

## Components / Page flow
1. Navbar — anchors to sections, collapses to stacked links under 640px
2. Hero — name, "Frontend Developer", 1-line bio, CTAs (View Projects / Contact), 3 stats (projects count, main tech, focus)
3. FeaturedBuild — interactive tabs (Overview / Features / Code peek) for best project. Replaces dashboard mockup.
4. Skills — grid of React, JavaScript, HTML, CSS, Vite, Git + tools. Replaces 4-way comparison table.
5. Process — How I Work 01 Learn/Plan, 02 Build, 03 Polish/Ship
6. ProjectsGrid — cards from `projects.js`: title, blurb, tech pills, links, `reactMigration: true` badge for HTML/CSS/JS origins
7. About + FAQ (hiring me, availability, React migration note) + Contact (email, GitHub, LinkedIn) + Footer

## Theme (mid-tone, unique)
- Base slate: `#3A3F4B`, deep section: `#2E323D`
- Light section: `#EDE9E1`, card: `#FFFFFF`
- Accent: `#4DB6AC`, text muted: `#9AA0AE`
- No pure `#000` / `#fff` backgrounds. System font stack, 16px base, 1.5 line-height.
- Spacing scale 8/16/24/48/80px. Border-radius 12px cards, 8px pills.

## Responsive
- Mobile-first. Breakpoints 640px, 900px, 1200px.
- Grids: 1 col mobile → 2 col 640px → 3 col 900px+ for projects/skills
- Hero stacks, font clamps via `clamp()`, nav stacks, no horizontal scroll, tap targets >=44px

## Data
`src/data/projects.js` exports array:
`{ id, title, blurb, tech[], demoUrl, repoUrl, image, reactMigration: boolean }`
Placeholders allowed for missing links/images.

## Error handling / Edge cases
- Missing image → styled initials placeholder
- Missing demo/repo link → button hidden, not broken
- Empty projects array → "Projects coming soon" message

## Testing
- `npm run build` passes
- `npm run lint` passes
- Manual checks at 360px, 768px, 1280px: stacking, no overflow, nav usable, tabs clickable

## Content needed from owner
1. name, role title, 1-line bio
2. 3-6 projects: title, what it does, tech, link/image (placeholders ok)
3. skills list, GitHub/LinkedIn/email, photo optional
