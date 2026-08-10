# Cocktail Detail Ink Wash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add irregular semi-transparent deep-brown ink-wash backings to the cocktail detail page while preserving its existing manuscript layout and imagery.

**Architecture:** Generate real transparent PNG ink-wash textures and place them as non-interactive pseudo-element backgrounds on existing cocktail-detail content groups. Keep all behavior and document structure unchanged; CSS controls responsive sizing, stacking, contrast, and decorative variation.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Vite

## Global Constraints

- Scope is limited to the cocktail detail page.
- Preserve the existing two-column manuscript structure, parchment background, cocktail image, radar chart, illustrations, and interactions.
- Use real raster ink textures; do not create modern cards or CSS-drawn stain shapes.
- Decorative layers must use `pointer-events: none` and remain below readable content.

---

### Task 1: Lock the ink-wash contract with a layout test

**Files:**
- Modify: `src/pages/CocktailDetailLayout.test.mjs`

**Interfaces:**
- Consumes: `src/styles/global.css` as text.
- Produces: Assertions for the generated ink texture asset references, isolated pseudo-element layers, and mobile-safe styling.

- [ ] **Step 1: Write the failing test**

Add a test that expects cocktail-detail CSS to reference dedicated ink-wash PNG assets and to place them in pseudo-elements with `pointer-events: none`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/pages/CocktailDetailLayout.test.mjs`

Expected: FAIL because the ink-wash asset references and selectors do not yet exist.

- [ ] **Step 3: Preserve the failing result for the implementation cycle**

Do not loosen existing layout assertions; the new treatment must coexist with them.

### Task 2: Generate and integrate the ink-wash assets

**Files:**
- Create: `public/assets/ink-wash/cocktail-ink-wash-wide.png`
- Create: `public/assets/ink-wash/cocktail-ink-wash-tall.png`
- Create: `public/assets/ink-wash/cocktail-ink-wash-heading.png`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: Existing `.app-shell--cocktail-detail-book` selectors and DOM structure.
- Produces: Decorative pseudo-elements using the three PNG assets, with content promoted above them through stacking context.

- [ ] **Step 1: Generate three chroma-keyed ink textures**

Use the built-in Image Gen tool for a wide wash, tall wash, and compact heading wash. Each texture must have uneven pooled centers, feathered capillary edges, opacity variation, and sparse satellite droplets.

- [ ] **Step 2: Convert the key color to alpha and inspect every PNG**

Run the installed `remove_chroma_key.py` helper with soft matte and despill. Verify transparent corners and no green fringe.

- [ ] **Step 3: Add the minimal CSS implementation**

Create isolated `::before` layers for the hero copy, fact strip, ledger sections, and selected headings. Set `pointer-events: none`, keep text at `z-index: 1`, and vary background image, position, opacity, and transforms to prevent repeated-looking stains.

- [ ] **Step 4: Tune readable ink-and-gold contrast**

Keep warm antique-gold foreground colors over dark washes, strengthen fine rules where needed, and use dark sepia for chart labels that remain directly on pale parchment.

- [ ] **Step 5: Run the focused test to verify it passes**

Run: `npm test -- src/pages/CocktailDetailLayout.test.mjs`

Expected: PASS.

### Task 3: Verify implementation and visual fidelity

**Files:**
- Create or update: `design-qa.md`

**Interfaces:**
- Consumes: Selected generated mock and rendered cocktail-detail page at the same mobile viewport.
- Produces: A visual comparison record with `final result: passed` when no P0-P2 mismatch remains.

- [ ] **Step 1: Run automated verification**

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run build`

Expected: all commands succeed.

- [ ] **Step 2: Capture the implemented page**

Open `/cocktails/old-fashioned` in the in-app browser at the established mobile viewport and capture the full page.

- [ ] **Step 3: Compare against the selected reference**

Check stain irregularity, text contrast, image visibility, chart clarity, spacing, and edge preservation. Record P0-P3 findings in `design-qa.md`.

- [ ] **Step 4: Fix blocking visual issues and repeat**

Resolve every P0-P2 issue, recapture, and update `design-qa.md` until it states `final result: passed`.
