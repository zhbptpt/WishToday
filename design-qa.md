# Design QA — Preview final actions

- source visual truth path: `C:\Users\zhb\.codex\generated_images\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\exec-12b3eec4-fe08-4adb-afd7-95cef175f74c.png`
- implementation screenshot path: `C:\Users\zhb\.codex\worktrees\22da\WishToday\design-qa-preview-actions.png`
- viewport: 634 × 659 CSS px
- source pixels: 1230 × 1279; reference is a full-page concept board at a different density/aspect ratio
- implementation pixels: 619 × 639 captured viewport content at deviceScaleFactor 1; compared as the same bottom-action state, with proportions normalized by the visible parchment page width
- state: populated DIY recipe preview, idle actions

## Full-view comparison evidence

The implemented bottom action composition follows the selected concept: two separated warm-brown irregular ink washes, a lighter secondary action at left and a denser primary action at right, pale-gold labels with directional arrows, and open space around the central crest. The implementation preserves the existing page's wax seals, lower leather edge, and right metal corner rather than changing surrounding artwork.

## Focused region comparison evidence

The bottom action region was inspected at the live 634 × 659 viewport. Both button hit areas measure approximately 146 × 50 CSS px. The left wash opacity is 0.72; the right wash opacity is 0.94. Both use the existing warm-brown `cocktail-ink-wash-wide.png` asset with `filter: none`, and both render `rgb(242, 214, 148)` text at 16px/700. Neither overlaps the wax seals, the central crest, nor the right metal corner. Focused inspection was necessary because the source concept and implementation have different full-page proportions.

## Required fidelity surfaces

- Fonts and typography: Songti-style book typography retained; action labels are 16px, weight 700, legible against both washes.
- Spacing and layout rhythm: mirrored 146 × 50 controls remain balanced and separated from the central crest and hardware.
- Colors and visual tokens: pale gold `#f2d694`; warm brown wash asset with no grayscale filter; secondary/primary hierarchy expressed by 0.72/0.94 opacity.
- Image quality and asset fidelity: the existing raster ink-wash asset is reused at native visual quality; no placeholder or CSS-drawn stain substituted.
- Copy and content: “返回编辑” and “保存笔记” remain unchanged; left/right arrows are preserved.

## Findings

No actionable P0/P1/P2 mismatch remains for the requested button-only scope. The live page also reports no console errors or warnings.

## Comparison history

- Initial implementation check: no P0/P1/P2 issues found, so no fix/re-capture loop was required.

## Implementation checklist

- [x] Page-scoped classes prevent leakage to other book pages.
- [x] Secondary wash is visibly lighter than primary wash.
- [x] Hover, focus-visible, active, and saving-disabled states are retained.
- [x] Related action layout tests and production build pass.

## Follow-up polish

None required for this confirmed scope.

final result: passed

---

# Design QA — All notebook slips matched to item 4

- source visual truth: live fourth index slip using `public/assets/notebook/extracted/reference-index-slip-final.png`
- implementation screenshot: `C:\Users\zhb\.codex\worktrees\22da\WishToday\design-qa-notebook-reference-tone-unified.png`
- viewport: 634 × 659 CSS px, deviceScaleFactor 1
- state: populated notebook, records 3–6 visible together

## Comparison evidence

The three rotating torn-paper assets now use the fourth slip's muted gray-tan color target while retaining their separate holes, curled fibers, fold lines, stains, and alpha silhouettes. Opaque-pixel means are v1 `(197.91, 157.45, 97.82)`, v2 `(198.26, 157.75, 97.95)`, v3 `(198.22, 157.31, 97.93)`, against the selected fourth slip `(198.15, 157.75, 97.95)`.

## Required fidelity surfaces

- Fonts and typography: unchanged; dark-brown headings, metadata, stamps, and arrows remain readable.
- Spacing and layout rhythm: unchanged; every live slip measures approximately 427–429 × 116–117 CSS px.
- Colors and visual tokens: all four paper sources now share the selected muted gray-brown target within less than one RGB unit per channel.
- Image quality and asset fidelity: recoloring is pixel-based and alpha-preserving; no paper silhouette or texture was redrawn.
- Copy and content: unchanged.

## Findings

No actionable P0/P1/P2 issue remains. All six live items report no horizontal or vertical overflow, and the browser console has no warnings or errors.

## Comparison history

- Before: v1–v3 averaged around `(218, 161, 88)`, visibly warmer and more saturated than item 4.
- Fix: generated three non-destructive `-reference-tone` raster variants and changed only the notebook background asset references.
- After: all variant means match the selected slip, with distinct damage patterns intact.

final result: passed

---

# Design QA — Extracted index slip preview on item 4

- source visual truth path: `C:\Users\zhb\AppData\Local\Temp\codex-clipboard-b5ff5a28-9847-4418-99ea-f422f4188f89.png`
- extracted raster asset: `C:\Users\zhb\.codex\worktrees\22da\WishToday\public\assets\notebook\extracted\reference-index-slip-final.png`
- implementation screenshot path: `C:\Users\zhb\.codex\worktrees\22da\WishToday\design-qa-notebook-extracted-slip-preview.png`
- live page: `http://127.0.0.1:4174/notebook`
- viewport: 634 × 659 CSS px, deviceScaleFactor 1
- state: six saved recipes populated; the fourth record is centered and uses the extracted blank slip

## Full-view comparison evidence

Only the fourth record uses the new extracted paper. Items 1–3 and 5–6 retain their three rotating warm parchment variants, making the requested comparison visible in context. The fourth item preserves the existing heading, English subtitle, metadata, stamps, arrow, link target, hover behavior, and keyboard focus behavior.

## Focused region comparison evidence

The fourth item measures approximately 427 × 116 CSS px and uses `reference-index-slip-final.png` at `background-size: 100% 100%`. Its content box reports no horizontal or vertical overflow. All live text stays inside the paper's opaque center and clear of the torn perimeter. The extracted paper retains the source's flatter torn top edge, granular fibers, gray-brown fold traces, small stains, and uneven lower edge. Compared with the surrounding unified ochre slips, it is intentionally paler and more muted, so the user can judge the replacement before wider adoption.

## Required fidelity surfaces

- Fonts and typography: existing dark-brown Songti/Georgia hierarchy and weight remain unchanged and readable.
- Spacing and layout rhythm: the fourth item keeps the same 108px minimum height and list spacing as neighboring records; its measured box does not overflow.
- Colors and visual tokens: extracted paper keeps its muted reference tan instead of inheriting the more saturated v3 ochre tone.
- Image quality and asset fidelity: a transparent 1739 × 640 raster asset supplies the real fibers, tears, folds, stains, and alpha silhouette; no CSS approximation is used.
- Copy and content: all recipe copy, tags, arrow, and destination remain unchanged.

## Findings

No actionable P0/P1/P2 issue remains for this single-item preview scope. The visible color difference is the purpose of the requested A/B comparison, not an unintentional mismatch.

## Comparison history

- Initial live pass: verified the fourth item alone receives the new asset; no overflow or interaction regression was found, so no layout correction was needed.

## Implementation checklist

- [x] Replacement is scoped to `.notebook-index-slip:nth-child(4)`.
- [x] Other index-slip backgrounds remain unchanged.
- [x] Text, stamps, arrow, data, and link interaction are retained.
- [x] Focused layout tests and production build pass.
- [x] Live page reports no text or element overflow.

## Follow-up polish

- User decision pending: keep the extracted paper's quieter gray-tan character, or recolor it toward the surrounding unified ochre variants before applying it to all records.

final result: passed

## Unified parchment tone follow-up

- selected colour reference: the third visible index slip (`antique-index-slip-torn-v3.png`)
- implementation screenshot: `C:\Users\zhb\.codex\worktrees\22da\WishToday\design-qa-notebook-index-slips-unified-tone.png`
- result: v1 and v2 are colour-matched to v3 while retaining their original fibres, creases, stains, tears, and alpha silhouettes
- measured opaque-pixel means: v1 `(217.9, 161.4, 87.8)`, v2 `(218.3, 161.8, 88.0)`, v3 `(218.2, 161.3, 87.9)`
- live browser check: all variants render in the same warm ochre-brown family; console errors: none

---

# Design QA — Private notebook antique index slips

- source visual truth path: `C:\Users\zhb\AppData\Local\Temp\codex-clipboard-3d1c0d33-4e9b-4868-9932-2091620b0f33.png`
- implementation screenshot path: `C:\Users\zhb\.codex\worktrees\22da\WishToday\design-qa-notebook-index-slips-v2.png`
- live page: `http://127.0.0.1:4174/notebook`
- viewport: 634 × 659 CSS px
- state: saved recipes populated, four complete slips and part of the fifth visible

## Comparison evidence

The saved-recipe list now follows the confirmed real-texture treatment: CSS polygon tears have been replaced by three transparent raster parchment assets. Their fibrous edges, missing chunks, layered curls, creases, stains, and silhouette-aware shadows rotate through the records, while the dark-brown Chinese/English headings, compact origin line, double-rule stamps, and line arrow remain live HTML.

The existing notebook artwork remains unchanged. At the live viewport, the slips sit inside the central parchment writing area; the right feather and lower ink bottle remain visible, and no slip reaches the leather edge. Four records remain readable at once, closely matching the density of the selected visual.

## Implementation checklist

- [x] Entire slip remains a link to `/recipes/:id`.
- [x] Only the first three flavor labels can render, preserving the existing data rule.
- [x] Warm parchment and dark-brown ink avoid modern card/glass styling.
- [x] Three distinct raster tears replace the former CSS `clip-path` silhouette.
- [x] Variant-specific safe padding keeps text and arrows clear of deep tears.
- [x] Keyboard focus is visible and each slip exceeds the 44px target size.
- [x] Compact 620px layout, focused tests, production build, and `git diff --check` pass.
- [x] Live console contains no errors or warnings.

final result: passed

---

# Design QA — Private recipe return action

- source visual truth path: `C:\Users\zhb\.codex\generated_images\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\exec-5d7fd683-4673-4e50-8a0b-79f244d7c145.png`
- live page: `http://127.0.0.1:4174/recipes/ceac2166-6f5e-4a7a-93d3-99b1b9e030d5?saved=1`
- viewport: 634 × 659 CSS px
- state: populated saved recipe, return action idle

## Comparison evidence

The implemented “返回笔记本” entry matches the confirmed option 1: a single-line left-arrow label on an irregular warm dark-brown ink wash, with pale-gold 700-weight Songti-style text. The control is scoped to the saved-recipe page and leaves the key crest, wax seal, leather edge, and metal corner unchanged.

Live inspection confirmed an approximately 146 × 50 CSS px control, `rgb(242, 214, 148)` text, wash opacity `0.94`, and the existing `cocktail-ink-wash-wide.png` asset with `filter: none`. The label does not wrap and the wash remains visually separated from the lower emblem and hardware.

## Implementation checklist

- [x] Left arrow and “返回笔记本” copy retained.
- [x] Warm-brown wash and pale-gold text match the confirmed direction.
- [x] Hover, focus-visible, and active states remain available.
- [x] Missing-recipe recovery link is unaffected.
- [x] Focused tests, related-page regression tests, production build, and `git diff --check` pass.

final result: passed
