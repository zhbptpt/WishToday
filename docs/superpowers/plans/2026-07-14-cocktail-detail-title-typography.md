# CocktailDetailPage Title Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将鸡尾酒详情页就绪状态的中文酒名改为稳定、清晰的「藏书票宋体」标题，并在 394px 与 698px 视口保持不裁切、不重叠。

**Architecture:** 沿用 `AppShell.titleClassName` 作为唯一组件接口，在 `CocktailDetailPage` 就绪状态传入局部 class。应用入口自托管加载 Noto Serif SC 变量字体，所有视觉规则集中在现有 `global.css`，不改变全局 `h1`、页面 DOM 结构或数据流。

**Tech Stack:** React 19、TypeScript 5.8、Vite 7、原生 CSS、Fontsource `@fontsource-variable/noto-serif-sc@5.2.10`、Vitest 3。

## Global Constraints

- 页面继续使用深棕背景体系，禁止新增 Warm Ivory、cream、beige、sand、off-white 大面积背景。
- 标题主体必须使用 `var(--wt-text-main)`；香槟金仅用于 56px × 1px 装饰细线。
- 标题字重固定为 600，字间距固定为 0，不使用文字阴影、描边、渐变填充或发光。
- 394px 视口字号为 42px、行高为 1.10、标题与细线间距为 10px。
- 698px 视口字号为 54px、行高为 1.06、标题与细线间距为 12px。
- 不修改加载、缺失、错误状态标题，也不修改其他页面标题。
- 不使用固定标题高度、行数截断或省略号；超长标题自然换行。
- 当前目录没有 `.git`，不得擅自初始化仓库；每个任务以变更摘要代替 Git 提交。

## File Structure

- Modify: `package.json` — 声明自托管中文衬线字体依赖。
- Modify: `package-lock.json` — 锁定字体依赖及完整性信息，由 npm 生成。
- Modify: `src/main.tsx` — 在全局 CSS 之前加载字体的 `wght` 轴样式。
- Modify: `src/pages/CocktailDetailPage.tsx` — 仅在数据就绪状态传入 `cocktail-detail-title`。
- Modify: `src/styles/global.css` — 定义桌面标题、金色细线和 620px 移动端覆盖。
- Verify: `src/components/AppShell.test.tsx` — 使用现有测试确认 `titleClassName` 仍按原接口输出。
- Reference: `docs/superpowers/specs/2026-07-14-cocktail-detail-title-typography-design.md` — 已批准视觉规范。

---

### Task 1: Self-host The Display Typeface

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/main.tsx:1-5`
- Verify: `dist/assets/*`

**Interfaces:**
- Consumes: Vite 的 ESM/CSS 导入能力。
- Produces: 全局可引用的 CSS 字体族 `"Noto Serif SC Variable"`，支持 `font-weight: 200 900`。

- [ ] **Step 1: Record the pre-change dependency state**

Run:

```powershell
npm ls @fontsource-variable/noto-serif-sc
```

Expected: command reports `(empty)` or exits non-zero because the package is not installed.

- [ ] **Step 2: Install the exact self-hosted font package**

Run:

```powershell
npm install @fontsource-variable/noto-serif-sc@5.2.10
```

Expected: exit code 0; `package.json` contains the package under `dependencies`, and `package-lock.json` records version `5.2.10`.

- [ ] **Step 3: Verify the package preserves readable font swapping**

Run:

```powershell
Select-String -Path "node_modules/@fontsource-variable/noto-serif-sc/wght.css" -Pattern "font-display: swap"
```

Expected: one or more matches containing `font-display: swap`; if there is no match, stop before implementation because the approved fallback behavior is not satisfied.

- [ ] **Step 4: Import the variable weight stylesheet before project CSS**

Modify `src/main.tsx` imports to exactly:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource-variable/noto-serif-sc/wght.css";
import App from "./App";
import "./styles/global.css";
```

Keep the existing `createRoot(...).render(...)` block unchanged.

- [ ] **Step 5: Verify TypeScript and the production bundle**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both commands exit 0. Vite emits the application bundle plus local font assets; no runtime CDN URL is introduced.

- [ ] **Step 6: Record the Task 1 checkpoint**

Record this summary in the execution report:

```text
Task 1 complete: added @fontsource-variable/noto-serif-sc@5.2.10, confirmed font-display: swap, updated the npm lockfile, imported wght.css before global.css, and verified typecheck/build.
```

Do not run `git commit` because the workspace is not a Git repository.

---

### Task 2: Apply The Scoped Cocktail Title Style

**Files:**
- Modify: `src/pages/CocktailDetailPage.tsx:120`
- Modify: `src/styles/global.css:144-151`
- Modify: `src/styles/global.css:742-747`
- Verify: `src/components/AppShell.test.tsx`

**Interfaces:**
- Consumes: `AppShellProps.titleClassName?: string` and the `"Noto Serif SC Variable"` family from Task 1.
- Produces: `.cocktail-detail-title` and `.cocktail-detail-title::after`, scoped to the ready-state `h1`.

- [ ] **Step 1: Capture the pre-change visual failure**

Start the development server:

```powershell
npm run dev -- --host 127.0.0.1
```

Open `/cocktails/old-fashioned` in the in-app browser. Capture 394px and 698px wide views.

Expected pre-change state: 「古典鸡尾酒」uses the global system sans-serif title; there is no short gold line; the 698px title is approximately 63px because of `9vw`.

- [ ] **Step 2: Pass the ready-state title class**

Change only the successful render in `src/pages/CocktailDetailPage.tsx`:

```tsx
return (
  <AppShell
    title={cocktail.nameZh}
    titleClassName="cocktail-detail-title"
  >
```

Do not add `titleClassName` to loading, missing, or error branches.

- [ ] **Step 3: Add the desktop title and decorative line rules**

Insert this block immediately after the global `h1` rule in `src/styles/global.css`:

```css
.cocktail-detail-title {
  display: grid;
  row-gap: 12px;
  width: fit-content;
  max-width: 100%;
  color: var(--wt-text-main);
  font-family: "Noto Serif SC Variable", "Songti SC", STSong, serif;
  font-size: 54px;
  font-weight: 600;
  line-height: 1.06;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.cocktail-detail-title::after {
  content: "";
  width: 56px;
  height: 1px;
  background: var(--wt-gold-500);
  opacity: 0.72;
}
```

Do not add `text-shadow`, `-webkit-text-stroke`, `background-clip`, gradients, or fixed heights.

- [ ] **Step 4: Add the 394px/mobile override at the existing breakpoint**

Inside the existing `@media (max-width: 620px)` block, immediately after `.app-shell`, add:

```css
.cocktail-detail-title {
  row-gap: 10px;
  font-size: 42px;
  line-height: 1.1;
}
```

Do not change `.app-shell`, `.app-header`, `.page-heading`, or `.detail-hero` spacing.

- [ ] **Step 5: Run automated regression checks**

Run:

```powershell
npm test
npm run typecheck
npm run build
```

Expected: all existing Vitest tests pass, TypeScript exits 0, and Vite builds successfully. The existing `AppShell` test continues to prove that a page-specific `titleClassName` renders on the `h1`.

- [ ] **Step 6: Verify the approved typography at 394px**

In the in-app browser, set width to 394px and inspect:

```text
/cocktails/old-fashioned
/cocktails/espresso-martini
/cocktails/whiskey-sour
```

Expected for all three routes:

```text
The Chinese title uses Noto Serif SC Variable at 42px / 1.10.
The title is a complete single line with current V1 data.
The title does not overlap WishToday or the hero image.
The title color is #f3dfb4.
The 56px × 1px #c9a15a line is left-aligned and visually restrained.
No large light background or large gold area appears.
```

- [ ] **Step 7: Verify the approved typography at 698px**

At 698px width, inspect `/cocktails/old-fashioned`.

Expected:

```text
The title uses 54px / 1.06 rather than viewport-scaled 9vw.
The title, brand mark, line, and hero image remain separated.
The hero image remains the dominant first-screen visual.
No unrelated page spacing or component styling changes.
```

- [ ] **Step 8: Verify the font fallback**

Use browser developer tools to block the emitted Noto Serif SC font request, then reload `/cocktails/old-fashioned` at 394px.

Expected: the title remains visible in the declared Songti/STSong/serif fallback, retains 42px sizing, and does not overlap adjacent content.

- [ ] **Step 9: Record the Task 2 checkpoint**

Record this summary in the execution report:

```text
Task 2 complete: scoped the approved serif title to CocktailDetailPage ready state, added the restrained gold rule, passed tests/typecheck/build, and visually checked 394px and 698px including font fallback.
```

Do not run `git commit` because the workspace is not a Git repository.

---

## Completion Gate

Implementation is complete only when:

- Task 1 and Task 2 checkpoints are both recorded.
- `npm test`, `npm run typecheck`, and `npm run build` all exit 0 after the final edit.
- The three 394px routes and the 698px Old Fashioned route meet every visual expectation above.
- Font-request blocking confirms readable fallback behavior.
- No production files outside the five listed modified files have changed.
