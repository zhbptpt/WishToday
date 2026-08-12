# Private Notebook Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the selected private-notebook grimoire artwork only to the `/notebook` page without changing saved-recipe behavior or the existing private recipe detail background.

**Architecture:** Follow the existing route-specific `AppShell` modifier pattern. The notebook route receives `app-shell--notebook-book`; CSS maps that modifier to a project-local raster asset, while recipe detail routes keep `app-shell--recipe-detail-book`.

**Tech Stack:** React 19, React Router, TypeScript, CSS, Vitest, Vite

## Global Constraints

- The selected visual source is `C:/Users/zhb/.codex/generated_images/019fd581-9448-7f03-a06f-678ca424b13b/exec-cfb67cce-76d1-4a0f-8950-96a828cbc3ad.png`.
- The project asset must be `public/assets/page-backgrounds/private-notebook-grimoire-golden-v4.png`.
- Only `/notebook` receives the new background; `/recipes/:recipeId` remains unchanged.
- Existing authentication redirects, notebook data, cards, navigation, page-turn animation, and reduced-motion behavior remain unchanged.

---

### Task 1: Route-Specific Private Notebook Background

**Files:**
- Create: `public/assets/page-backgrounds/private-notebook-grimoire-golden-v4.png`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/styles/global.css`
- Test: `src/components/AppShell.test.tsx`
- Test: `src/styles/PageBackgrounds.test.mjs`
- Create: `.codex/qa/private-notebook/design-qa.md`

**Interfaces:**
- Consumes: `paths.notebook` from `src/routes/paths.ts` and the selected PNG visual source.
- Produces: route modifier class `app-shell--notebook-book` and CSS asset mapping `/assets/page-backgrounds/private-notebook-grimoire-golden-v4.png`.

- [x] **Step 1: Write the failing route-class test**

Add an `AppShell` test that renders `/notebook` and `/recipes/private-recipe`, then asserts:

```tsx
expect(notebookMarkup).toContain("app-shell--notebook-book");
expect(recipeMarkup).not.toContain("app-shell--notebook-book");
```

- [x] **Step 2: Write the failing stylesheet mapping test**

Add this case to `PageBackgrounds.test.mjs`:

```js
[
  "app-shell--notebook-book",
  "/assets/page-backgrounds/private-notebook-grimoire-golden-v4.png",
],
```

- [x] **Step 3: Run focused tests and verify RED**

Run:

```powershell
npx vitest run src/components/AppShell.test.tsx src/styles/PageBackgrounds.test.mjs
```

Expected: the new route-class assertion and stylesheet mapping case fail because neither modifier nor CSS mapping exists yet.

- [x] **Step 4: Add the selected project asset**

Copy the selected PNG to:

```text
public/assets/page-backgrounds/private-notebook-grimoire-golden-v4.png
```

Do not overwrite `private-recipe-grimoire-golden-v4.png`.

- [x] **Step 5: Implement the route modifier**

Add the notebook branch before the recipe-detail branch in `AppShell.tsx`:

```tsx
: pathname === paths.notebook
  ? "app-shell app-shell--book-background app-shell--notebook-book"
```

- [x] **Step 6: Implement the background mapping**

Add a focused rule to `global.css`:

```css
.app-shell--notebook-book {
  background-image: url("/assets/page-backgrounds/private-notebook-grimoire-golden-v4.png");
  font-family: "Songti SC", STSong, Georgia, "Times New Roman", serif;
}
```

Keep the existing shared background sizing and page padding. Do not set a fixed aspect ratio: the notebook surface must grow with long saved-recipe lists.

- [x] **Step 7: Run focused tests and verify GREEN**

Run:

```powershell
npx vitest run src/components/AppShell.test.tsx src/styles/PageBackgrounds.test.mjs
```

Expected: both test files pass.

- [x] **Step 8: Run static verification**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both commands exit with code 0.

- [x] **Step 9: Run visual QA in the application browser**

Open `/notebook` in the existing local app, verify the rendered background, navigation, notebook cards or empty state, and browser console. Capture the page at the current mobile viewport. Build a same-canvas comparison containing the selected source background and the browser screenshot, inspect the five required fidelity surfaces, and save the evidence and final status in `design-qa.md`.

- [x] **Step 10: Commit the implementation**

```powershell
git add -- public/assets/page-backgrounds/private-notebook-grimoire-golden-v4.png src/components/AppShell.tsx src/components/AppShell.test.tsx src/styles/global.css src/styles/PageBackgrounds.test.mjs design-qa.md docs/superpowers/plans/2026-08-06-private-notebook-background.md
git commit -m "feat: apply private notebook manuscript background"
```
