# Shared Ink-Wash Language Implementation Plan

**Goal:** Extend the approved irregular deep-brown ink-wash contrast treatment to the five remaining product surfaces while preserving each page's existing grimoire background and interaction model.

**Architecture:** Reuse the three approved transparent raster ink textures through page-scoped pseudo-elements on existing semantic content groups. CSS owns placement, variation, stacking, responsive tuning, and readable foreground colors; React structure and behavior stay unchanged.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Vite

## Constraints

- No new route, component hierarchy, or modern card treatment.
- Use only real transparent PNG ink assets already approved for the cocktail detail page.
- Decorative layers are non-interactive and sit below text and controls.
- Preserve each page's unique background image, ornaments, illustrations, and responsive layout.

## Task 1: Lock the shared visual contract

- Add a focused layout test covering all five surfaces.
- Assert that page-scoped selectors reference the approved raster assets.
- Assert non-interactive pseudo-elements and elevated content layers.
- Run the focused test and confirm it fails before implementation.

## Task 2: Implement page-specific ink compositions

- Add home title and featured-copy washes.
- Add workbench intro, ingredients, tags, and notes washes.
- Add ingredient drawer header and row-copy washes.
- Add preview chapter, metadata, ledger, and flavor-note washes.
- Add private-recipe hero, summary, ledger, and notes washes.
- Add narrow-screen sizing and opacity adjustments where necessary.

## Task 3: Verify behavior and visuals

- Run the focused test, relevant existing layout tests, full suite, typecheck if available, and production build.
- Capture the five rendered surfaces in the in-app browser.
- Check text contrast, stain variation, ornament visibility, interaction reachability, and responsive containment.
- Record results in `design-qa.md`; resolve every P0-P2 issue before marking the final result passed.
