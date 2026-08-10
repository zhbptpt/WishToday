# Cocktail Detail Brown Ink Unification Implementation Plan

**Goal:** Restore the cocktail detail page ink washes to the assets' native deep-brown to light-brown tonal range without changing their geometry or page layout.

**Scope:** Only the three base cocktail-detail ink-wash pseudo-elements and their regression coverage. Preserve opacity, inset, transform, asset, typography, content, and all other pages.

## Task 1: Lock the intended color treatment with a regression test

**Files:**
- Modify: `src/pages/CocktailDetailLayout.test.mjs`

1. Add assertions that the hero copy, fact cards, and ledger sections explicitly use `filter: none`.
2. Run the focused test and confirm it fails while the old desaturating filters remain.

## Task 2: Remove the gray-making filters

**Files:**
- Modify: `src/styles/global.css`

1. Replace the three cocktail-detail ink-wash filter declarations with `filter: none`.
2. Leave opacity, geometry, positioning, transforms, and assets untouched.
3. Re-run the focused test and confirm it passes.

## Task 3: Visual and technical verification

**Files:**
- Append: `design-qa.md`

1. Inspect the live cocktail detail page at desktop and narrow viewport sizes.
2. Confirm brown tonal consistency, readable text, unchanged layout, working navigation/actions, and no console errors.
3. Run the focused test, production build, and `git diff --check`.
4. Append the QA result and end the new entry with exactly `final result: passed`.
