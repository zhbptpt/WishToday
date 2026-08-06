# DIY Reference Book Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recreate the selected dark leather book background and its botanical/astrological embossing on the production DIY workbench without affecting other WishToday routes.

**Architecture:** Add a route-derived modifier class in `AppShell`, use a generated raster background asset for the book material and engravings, and layer tightly scoped responsive CSS over the existing functional DIY markup. Preserve all current React state and interactions.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, CSS, Vite.

## Global Constraints

- Preserve the confirmed dark-brown old-money palette with champagne-gold accents.
- Do not use ivory, cream, beige, sand, or off-white as large backgrounds.
- Apply the reference background only to the DIY route.
- Validate text fit and non-overlap at 394px and 698px widths.
- Keep existing form, ingredient, reorder, delete, add, tag, note, and preview behavior working.

---

### Task 1: Route-scoped book theme

**Files:**
- Modify: `src/components/AppShell.test.tsx`
- Modify: `src/components/AppShell.tsx`

**Interfaces:**
- Consumes: `useLocation().pathname`, `paths.diyWorkbench`
- Produces: `.app-shell--leather-book` modifier on the DIY route only

- [ ] Add a test asserting the DIY route receives the modifier class and the home route does not.
- [ ] Run the focused test and confirm it fails because the modifier is absent.
- [ ] Add the route-derived class in `AppShell`.
- [ ] Run the focused test and confirm it passes.

### Task 2: Reference background and compact mobile composition

**Files:**
- Create: `public/assets/wishtoday-diy-leather-book.png`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `.app-shell--leather-book`
- Produces: route-scoped leather book background, gilded edges, fine lower-page embossing, and responsive workbench layout

- [ ] Copy the generated background master into `public/assets` while preserving the original generated file.
- [ ] Add scoped desktop and mobile CSS using the raster background without inline SVG or CSS-drawn motifs.
- [ ] Keep controls readable and interactive over the texture.
- [ ] Ensure the compact layout does not clip long ingredient names or units.

### Task 3: Verification and design QA

**Files:**
- Create: `design-qa.md`

**Interfaces:**
- Consumes: local Vite app and selected reference image
- Produces: passing build, focused tests, and verified 394px/698px screenshots

- [ ] Run `npm test -- src/components/AppShell.test.tsx`.
- [ ] Run `npm run build`.
- [ ] Capture `/diy?sourceCocktailId=old-fashioned` at 394x932 and 698x706.
- [ ] Compare captures with the reference and fix P0-P2 visual mismatches.
- [ ] Record final QA status in `design-qa.md`.
