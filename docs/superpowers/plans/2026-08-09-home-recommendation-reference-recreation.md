# Home Recommendation Reference Recreation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recreate the approved “Tonight's Seven / 每日推荐 / Old Fashioned” reference composition on the existing homepage while preserving the real cocktail photograph, carousel behavior, and all out-of-scope pages.

**Architecture:** Keep the existing React data and navigation flow, add only semantic class hooks needed by the recommendation composition, and implement the visual match in the homepage-scoped CSS. A dedicated transparent raster mask softens the photograph into a wide irregular rectangular wash while CSS `object-fit: contain` and drink-specific positioning keep the complete glass visible.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, CSS masks, PNG alpha assets, in-app browser visual QA.

## Global Constraints

- Treat `C:/Users/zhb/AppData/Local/Temp/codex-clipboard-b9ab9f53-a0bc-437b-9c50-224b53f5d856.png` (`1184 × 1328`) as the visual truth.
- Change only the homepage recommendation heading, carousel controls, featured cocktail composition, its focused tests, the dedicated ink-wash asset, and the final QA record.
- Do not modify the homepage hero ink block, six page backgrounds, detail page, DIY page, ingredient sheet, preview page, or notebook page.
- Keep `public/mock/cocktails/old-fashioned.png` as the only Old Fashioned photograph; do not generate or replace the glass.
- At the `592 × 664` reference viewport, the principal normalized anchors must be within `3%` of the reference width or height.
- At widths below `621px`, preserve the side-by-side text/photo relationship and the complete drink; do not switch to a vertical stack.
- Preserve previous/next controls, pager behavior, and featured-card navigation.
- Preserve unrelated user changes in the dirty worktree.

---

### Task 1: Lock the Reference Structure and Geometry in Tests

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/HomePage.test.tsx`
- Modify: `src/pages/HomePageLayout.test.mjs`

**Interfaces:**
- Consumes: existing `activeCocktail`, `move(delta)`, `navigate()`, and `home-feature-photo--${activeCocktail.id}` behavior.
- Produces: `.home-recommendation-copy`, `.home-recommendation-image`, `.home-flavor-rule`, and `.home-flavor-separator` hooks used by Task 3.

- [ ] **Step 1: Write failing semantic structure tests**

Add assertions that require the reference-specific hooks while retaining a single real `<img>`:

```tsx
expect(markup).toContain('class="cocktail-card-content home-recommendation-copy"');
expect(markup).toContain('class="home-recommendation-image"');
expect(markup).toContain('class="home-flavor-rule"');
expect(markup).toContain('class="home-flavor-separator"');
```

Add stylesheet assertions for the reference geometry:

```js
expect(stylesheet).toMatch(/\.app-shell--home-book \.recommendation-stage\s*\{[^}]*min-height:\s*664px;/);
expect(stylesheet).toMatch(/\.app-shell--home-book \.home-section-title-row\s*\{[^}]*padding:\s*0 7\.4% 0 16%;/);
expect(stylesheet).toMatch(/\.app-shell--home-book \.home-feature-card\s*\{[^}]*min-height:\s*430px;/);
expect(stylesheet).toMatch(/\.app-shell--home-book \.home-recommendation-copy\s*\{[^}]*left:\s*19%;[^}]*width:\s*36%;/);
expect(stylesheet).toMatch(/\.app-shell--home-book \.home-recommendation-image\s*\{[^}]*left:\s*47%;[^}]*width:\s*45%;/);
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run src/pages/HomePage.test.tsx src/pages/HomePageLayout.test.mjs`

Expected: FAIL because the semantic hooks and reference geometry do not yet exist.

- [ ] **Step 3: Add the minimal semantic wrappers**

Use this structure inside the existing featured-card button:

```tsx
<span className="home-recommendation-image" aria-hidden="true">
  <img
    className={`home-feature-photo home-feature-photo--subject home-feature-photo--${activeCocktail.id}`}
    src={activeCocktail.imageUrl}
    alt=""
  />
</span>
<span className="cocktail-card-content home-recommendation-copy">
  <strong>{activeCocktail.nameZh}</strong>
  <em>{activeCocktail.nameEn}</em>
  <span className="home-card-divider" aria-hidden="true" />
  <span className="home-card-description">{activeCocktail.recommendationText}</span>
  <span className="home-flavor-rule" aria-hidden="true" />
  <span className="home-flavor-notes">
    {activeCocktail.flavorTags.map((tag, index) => (
      <span key={tag}>
        {index > 0 ? <i className="home-flavor-separator" aria-hidden="true" /> : null}
        {tag}
      </span>
    ))}
  </span>
</span>
```

- [ ] **Step 4: Run the focused component test**

Run: `npm test -- --run src/pages/HomePage.test.tsx`

Expected: PASS for semantic structure and existing hero boundaries.

---

### Task 2: Create the Dedicated Wide Soft-Edge Wash Mask

**Files:**
- Create: `public/assets/ink-wash/home-old-fashioned-wide-wash-v1.png`
- Modify: `src/pages/HomePageLayout.test.mjs`

**Interfaces:**
- Consumes: PNG alpha-mask support in Chromium and CSS `mask-image`.
- Produces: a `1200 × 900` transparent PNG whose center is opaque, whose outer field is transparent, and whose feathered irregular rectangle never cuts through the glass.

- [ ] **Step 1: Add a failing asset contract test**

```js
import { existsSync } from "node:fs";

expect(
  existsSync(
    new URL("../../public/assets/ink-wash/home-old-fashioned-wide-wash-v1.png", import.meta.url),
  ),
).toBe(true);
expect(stylesheet).toContain(
  'mask-image: url("/assets/ink-wash/home-old-fashioned-wide-wash-v1.png")',
);
```

- [ ] **Step 2: Run the asset test and verify RED**

Run: `npm test -- --run src/pages/HomePageLayout.test.mjs`

Expected: FAIL because the dedicated mask file and CSS reference do not exist.

- [ ] **Step 3: Produce the transparent alpha mask**

Create a `1200 × 900` RGBA PNG with these exact bands: alpha `255` from normalized `x=0.16..0.84`, `y=0.14..0.86`; irregular feathering to alpha `0` across the outer `14–20%`; four corners fully transparent; subtle low-amplitude paper-grain noise only in the feather band. The resulting silhouette is a horizontal soft rectangle, never an oval.

- [ ] **Step 4: Inspect the mask and run the contract test**

Run: `npm test -- --run src/pages/HomePageLayout.test.mjs`

Expected: the existence assertion passes; the CSS assertion remains RED until Task 3 connects the asset.

---

### Task 3: Rebuild the Desktop Composition Against Reference Anchors

**Files:**
- Modify: `src/styles/global.css`
- Test: `src/pages/HomePageLayout.test.mjs`

**Interfaces:**
- Consumes: Task 1 semantic hooks and Task 2 mask path.
- Produces: the reference-aligned heading, controls, copy column, complete-glass image column, decorative line, description, and flavor row.

- [ ] **Step 1: Keep the geometry assertions RED and add typography/image assertions**

```js
expect(stylesheet).toMatch(/\.home-recommendation-image \.home-feature-photo\s*\{[^}]*object-fit:\s*contain;[^}]*object-position:\s*center bottom;/);
expect(stylesheet).toMatch(/\.home-card-divider::before[^}]*content:\s*"◆";/);
expect(stylesheet).toMatch(/\.home-card-divider::after[^}]*content:\s*"◆";/);
expect(stylesheet).toMatch(/\.home-flavor-rule\s*\{[^}]*border-top:\s*1px dashed/);
expect(stylesheet).not.toMatch(/\.home-flavor-notes\s*\{[^}]*(?:border-top|border-bottom):/);
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run src/pages/HomePageLayout.test.mjs`

Expected: FAIL on the new layout, image, divider, and flavor-row contracts.

- [ ] **Step 3: Implement the reference-scoped CSS**

Apply the following layout model, then tune only numeric values during visual QA:

```css
.app-shell--home-book .recommendation-stage {
  position: relative;
  min-height: 664px;
  gap: 0;
}

.app-shell--home-book .home-section-title-row {
  align-items: center;
  padding: 0 7.4% 0 16%;
}

.app-shell--home-book .home-feature-card {
  position: relative;
  min-height: 430px;
  aspect-ratio: auto;
}

.app-shell--home-book .home-recommendation-copy {
  position: absolute;
  left: 19%;
  top: 25%;
  width: 36%;
}

.app-shell--home-book .home-recommendation-image {
  position: absolute;
  left: 47%;
  top: 7%;
  width: 45%;
  height: 87%;
}

.home-recommendation-image .home-feature-photo {
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center bottom;
  mask-image: url("/assets/ink-wash/home-old-fashioned-wide-wash-v1.png");
  mask-position: center;
  mask-size: 116% 108%;
  mask-repeat: no-repeat;
}
```

Implement a dark-brown Songti/serif text hierarchy, a short double-ended ornamental divider, a two-line description rhythm, a dashed flavor rule, and one short vertical separator between flavor labels. Remove the old top/bottom flavor borders.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- --run src/pages/HomePage.test.tsx src/pages/HomePageLayout.test.mjs`

Expected: PASS.

---

### Task 4: Preserve Side-by-Side Responsive Behavior and Interactions

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/pages/HomePage.test.tsx`
- Modify: `src/pages/HomePageLayout.test.mjs`

**Interfaces:**
- Consumes: Task 3 desktop composition and existing carousel data.
- Produces: proportional `621–700px` and `≤620px` layouts with complete image containment and unchanged interaction behavior.

- [ ] **Step 1: Add failing responsive and interaction contracts**

```js
expect(stylesheet).toMatch(/@media \(max-width: 620px\)[\s\S]*?\.app-shell--home-book \.recommendation-stage\s*\{[^}]*width:\s*100%;[^}]*min-height:\s*520px;/);
expect(stylesheet).toMatch(/@media \(max-width: 620px\)[\s\S]*?\.app-shell--home-book \.home-recommendation-copy\s*\{[^}]*left:\s*5%;[^}]*width:\s*43%;/);
expect(stylesheet).toMatch(/@media \(max-width: 620px\)[\s\S]*?\.app-shell--home-book \.home-recommendation-image\s*\{[^}]*left:\s*43%;[^}]*width:\s*57%;/);
expect(source).toContain("onClick={() => move(-1)}");
expect(source).toContain("onClick={() => move(1)}");
expect(source).toContain("onClick={() => setActiveIndex(index)}");
expect(source).toContain('navigate(`/cocktails/${activeCocktail.id}`)');
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run src/pages/HomePage.test.tsx src/pages/HomePageLayout.test.mjs`

Expected: FAIL on responsive geometry while existing interaction-source assertions remain GREEN.

- [ ] **Step 3: Implement proportional responsive overrides**

At `621–700px`, retain the desktop percentage anchors with reduced typography. At `≤620px`, use `width: 100%`, `min-height: 520px`, copy `left: 5%; width: 43%`, image `left: 43%; width: 57%`, and `object-fit: contain`; keep controls at least `34 × 34px` and do not stack the columns.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- --run src/pages/HomePage.test.tsx src/pages/HomePageLayout.test.mjs`

Expected: PASS.

---

### Task 5: Perform Blocking Visual QA and Final Verification

**Files:**
- Modify: `design-qa.md`
- Create: `tmp/design-qa/home-recommendation-reference-592x664.png`
- Create: `tmp/design-qa/home-recommendation-reference-678x706.png`
- Create: `tmp/design-qa/home-recommendation-reference-430.png`

**Interfaces:**
- Consumes: production build and the approved reference image.
- Produces: visual evidence, issue log, and a passing final verification record.

- [ ] **Step 1: Build and capture the reference viewport**

Run:

```powershell
npm run build
```

Open `/home`, set the viewport to `592 × 664`, scroll the recommendation section to the same state as the reference, and save `tmp/design-qa/home-recommendation-reference-592x664.png`.

- [ ] **Step 2: Compare visual anchors and correct every P0/P1/P2 difference**

Measure heading left edge, button centers, copy left edge, Chinese title top, glass bounding box, and wash bounding box. Adjust CSS until every principal anchor is within `3%`, the glass is complete, the image fades as a soft irregular rectangle, and text remains unobscured.

- [ ] **Step 3: Verify alternate viewports and interactions**

Capture `678 × 706` and `430px` wide screenshots. Exercise previous, next, pager, and featured-card navigation. Confirm no clipped glass, overlap, vertical stacking, or disabled hit targets.

- [ ] **Step 4: Append the QA record**

Append a new dated section to `design-qa.md` containing the reference path, screenshots, viewport sizes, measured anchor deltas, interaction results, and severity review. End the section with the exact line:

```text
final result: passed
```

- [ ] **Step 5: Run final verification**

Run:

```powershell
npm test -- --run src/pages/HomePage.test.tsx src/pages/HomePageLayout.test.mjs
npm run build
git diff --check
```

Expected: all focused tests pass, the production build succeeds, and `git diff --check` exits successfully.
