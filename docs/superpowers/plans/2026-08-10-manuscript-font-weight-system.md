# Manuscript Font Weight System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve text legibility across the seven manuscript pages with one consistent semantic font-weight system while preserving all existing visual composition.

**Architecture:** Define five semantic weight tokens in `:root`, permit weight synthesis for Chinese fallback glyphs, and append one scoped typography layer after the existing page-specific rules. A source-level Vitest contract verifies token values, page coverage, and the required heading/body/numeric/action/brand mappings.

**Tech Stack:** CSS custom properties, React 19, Vite 7, Vitest 3.

## Global Constraints

- Brand mark weight is `800`.
- H1 and H2 weight is `600`.
- Body, step, input, and metadata weight is `500`.
- Numeric values weight is `600`.
- Buttons and selected tags weight is `700`.
- Do not change colors, font sizes, line heights, spacing, backgrounds, ink-wash assets, masks, or component markup.
- Preserve every pre-existing user modification in the dirty worktree.

---

### Task 1: Add the typography contract

**Files:**
- Create: `src/styles/TypographyHierarchy.test.mjs`

**Interfaces:**
- Consumes: `src/styles/global.css` as UTF-8 source.
- Produces: a Vitest contract for `--wt-font-weight-*` tokens and the seven-page selector mappings.

- [ ] **Step 1: Write the failing test**

```js
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(new URL("./global.css", import.meta.url), "utf8");

describe("manuscript typography hierarchy", () => {
  it("defines the approved semantic weights and permits weight synthesis", () => {
    expect(stylesheet).toMatch(/--wt-font-weight-body:\s*500;/);
    expect(stylesheet).toMatch(/--wt-font-weight-heading:\s*600;/);
    expect(stylesheet).toMatch(/--wt-font-weight-numeric:\s*600;/);
    expect(stylesheet).toMatch(/--wt-font-weight-action:\s*700;/);
    expect(stylesheet).toMatch(/--wt-font-weight-brand:\s*800;/);
    expect(stylesheet).toMatch(/font-synthesis:\s*weight;/);
  });

  it("maps all seven manuscript surfaces to the readable body weight", () => {
    for (const selector of [
      ".app-shell--home-book",
      ".app-shell--cocktail-detail-book",
      ".app-shell--leather-book",
      ".ingredient-index-sheet",
      ".app-shell--preview-book",
      ".app-shell--recipe-detail-book",
      ".app-shell--notebook-book",
    ]) expect(stylesheet).toContain(selector);
    expect(stylesheet).toMatch(/Manuscript typography hierarchy[\s\S]*?font-weight:\s*var\(--wt-font-weight-body\);/);
  });

  it("maps headings, values, actions, and brand marks to their semantic weights", () => {
    expect(stylesheet).toMatch(/Manuscript typography hierarchy[\s\S]*?h1,[\s\S]*?h2[\s\S]*?font-weight:\s*var\(--wt-font-weight-heading\);/);
    expect(stylesheet).toMatch(/Manuscript typography hierarchy[\s\S]*?\.detail-list-index[\s\S]*?\.recipe-ledger-index[\s\S]*?font-weight:\s*var\(--wt-font-weight-numeric\);/);
    expect(stylesheet).toMatch(/Manuscript typography hierarchy[\s\S]*?\.primary-button[\s\S]*?\.ingredient-index-tab\.active[\s\S]*?font-weight:\s*var\(--wt-font-weight-action\);/);
    expect(stylesheet).toMatch(/Manuscript typography hierarchy[\s\S]*?\.brand-mark[\s\S]*?font-weight:\s*var\(--wt-font-weight-brand\);/);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/styles/TypographyHierarchy.test.mjs`

Expected: FAIL because the semantic tokens and hierarchy block do not exist yet.

### Task 2: Implement the semantic hierarchy

**Files:**
- Modify: `src/styles/global.css:1-25`
- Modify: `src/styles/global.css` at end of file
- Test: `src/styles/TypographyHierarchy.test.mjs`

**Interfaces:**
- Consumes: the five `--wt-font-weight-*` variables.
- Produces: scoped typography rules for the seven page surfaces and ingredient sheet portal.

- [ ] **Step 1: Add tokens and enable weight synthesis**

Add to `:root`:

```css
font-synthesis: weight;
--wt-font-weight-body: 500;
--wt-font-weight-heading: 600;
--wt-font-weight-numeric: 600;
--wt-font-weight-action: 700;
--wt-font-weight-brand: 800;
```

- [ ] **Step 2: Add the scoped mappings at the end of `global.css`**

```css
/* Manuscript typography hierarchy */
:is(
  .app-shell--home-book,
  .app-shell--cocktail-detail-book,
  .app-shell--leather-book,
  .app-shell--preview-book,
  .app-shell--recipe-detail-book,
  .app-shell--notebook-book,
  .ingredient-index-sheet
) {
  font-weight: var(--wt-font-weight-body);
}

:is(
  .app-shell--home-book,
  .app-shell--cocktail-detail-book,
  .app-shell--leather-book,
  .app-shell--preview-book,
  .app-shell--recipe-detail-book,
  .app-shell--notebook-book,
  .ingredient-index-sheet
) :is(h1, h2) {
  font-weight: var(--wt-font-weight-heading);
}
```

Append focused groups for body copy and inputs (`500`), numeric/index values (`600`), actions and active chips/tabs (`700`), and `.brand-mark` (`800`). Use only existing class names from the seven surfaces.

- [ ] **Step 3: Run focused tests and verify GREEN**

Run: `npm test -- src/styles/TypographyHierarchy.test.mjs src/pages/HomePageLayout.test.mjs src/pages/CocktailDetailLayout.test.mjs src/pages/PreviewRecipeLayout.test.mjs src/components/AddIngredientSheetLayout.test.mjs`

Expected: all tests PASS.

### Task 3: Regression and visual verification

**Files:**
- Verify only; no planned source edits.

**Interfaces:**
- Consumes: the completed CSS hierarchy.
- Produces: fresh automated and visual evidence for completion.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 2: Run static and production checks**

Run: `npm run typecheck`

Expected: exit code `0`.

Run: `npm run build`

Expected: exit code `0` and a successful Vite production build.

- [ ] **Step 3: Verify all seven surfaces in the in-app browser**

Inspect `/home`, `/cocktails/old-fashioned`, `/diy/old-fashioned`, the opened ingredient sheet, `/diy/preview`, a saved `/recipes/:id`, and `/notebook` at the active narrow viewport. Confirm stronger hierarchy without changes to layout, masks, background art, or clipping.

- [ ] **Step 4: Report exact changed files and verification results**

Do not commit or stage unrelated dirty-worktree files. Only create a commit if the user explicitly asks for one.
