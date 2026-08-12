# Home Cocktail Warm Archival Tone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the home recommendation cocktail image an amber-caramel archival wash without changing its composition, completeness, or irregular fade mask.

**Architecture:** Keep the existing two-layer image system. Adjust only the CSS filters for the wash and subject layers, and lock those values with the existing source-level layout regression test.

**Tech Stack:** React 19, CSS, Vitest, Vite

## Global Constraints

- Preserve the existing image dimensions, position, `object-fit`, opacity, blend modes, and mask geometry.
- Preserve the complete drink and the irregular rectangular fade into the parchment.
- Do not add black ink blocks or a new color overlay element.

---

### Task 1: Lock and implement the amber-caramel filters

**Files:**
- Modify: `src/pages/HomePageLayout.test.mjs`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: Existing `.home-feature-photo--wash` and `.home-feature-photo--subject` CSS classes.
- Produces: Warm archival filter values protected by `HomePageLayout.test.mjs`.

- [ ] **Step 1: Write the failing test**

Update the two filter assertions in `shows a lighter archival photo through a drink-specific irregular rectangle` to require:

```js
filter: sepia(1) saturate(1.48) hue-rotate(-8deg) contrast(0.9) brightness(0.87) blur(18px);
filter: sepia(0.68) saturate(1.35) hue-rotate(-9deg) contrast(0.92) brightness(1.07);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- src/pages/HomePageLayout.test.mjs`

Expected: FAIL because `global.css` still contains the former cooler filters.

- [ ] **Step 3: Implement the minimal CSS change**

Replace only the two filter declarations in `src/styles/global.css` with the values asserted above. Do not alter opacity, blend mode, sizing, positions, or mask declarations.

- [ ] **Step 4: Run automated verification**

Run:

```powershell
npm test -- src/pages/HomePageLayout.test.mjs
npm test
npm run build
git diff --check
```

Expected: all commands exit with code `0`.

- [ ] **Step 5: Verify in the browser**

At `http://127.0.0.1:4174/home`, inspect the recommendation stage at the current viewport and confirm the drink is warm amber, complete, softly faded, and the text layout has not moved.
