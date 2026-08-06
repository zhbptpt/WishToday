# Add Ingredient Sheet Design QA

## Comparison Target

- Source visual truth: `C:/Users/zhb/.codex/generated_images/019f8a11-e9e4-72c2-9e89-b430b98348c7/exec-5deabb83-6899-4b18-abda-57243621b9d0.png`
- Normalized source: `artifacts/add-ingredient-index-option-1-reference-430x931.png`
- Primary implementation capture: `artifacts/add-ingredient-index-two-row-430x932.png`
- Additional responsive captures: `artifacts/add-ingredient-index-two-row-394x932.png`, `artifacts/add-ingredient-index-two-row-698x706.png`
- Route and state: `/diy?sourceCocktailId=old-fashioned`, Add Ingredient drawer open, base-spirit category selected.
- CSS viewports: `394x932`, `430x932`, and `698x706`.
- Source pixels: `852x1846`; normalized to `430x931` for visual comparison.
- Implementation pixels: `394x931`, `430x931`, and `698x706`; browser capture density is 1x.

## Full-View Comparison

The normalized source and the `430px` implementation were opened together in the same comparison input. The implementation preserves the selected concept's dark leather drawer, champagne-gold hierarchy, five-by-two category index, active underline, search field, compact material rows, and circular add controls. Existing production typography and denser row rhythm were intentionally retained because this change is scoped to category navigation.

## Focused Region Comparison

The category region was checked at `394px` and `430px`. All ten tabs are visible in two rows of five, every tab measures `40px` high, the tab list has equal `minmax(0, 1fr)` tracks, and `scrollWidth` equals `clientWidth`. The last category, `装饰`, was clicked successfully and reported `aria-selected="true"`.

At `698px`, the existing single-row desktop presentation is retained. All ten labels fit inside the `570px` content width with no horizontal overflow.

## Fidelity Surfaces

- Fonts and typography: Existing Song-style project stack, weights, line heights, and zero letter spacing are preserved. Category labels remain legible without wrapping.
- Spacing and layout rhythm: Mobile uses five equal columns and two `40px` rows. Drawer height, header, search field, list density, and 42px add controls are unchanged.
- Colors and visual tokens: Existing dark-brown leather background and champagne-gold active, hover, and focus treatments are preserved; no light background or new hue was introduced.
- Image quality and asset fidelity: The production leather asset remains unchanged and renders without scaling artifacts. No generated mock asset was added to production.
- Copy and content: All ten existing category names and material content remain unchanged.

## Comparison History

1. Initial responsive check found the desktop category row exceeded its content width by about `4px` at `698px`.
   - Fix: reduced desktop tab horizontal padding from `14px` to `13px`.
   - Post-fix evidence: `scrollWidth` and `clientWidth` both measure `570px`; all ten labels are inside the tab list.
2. Initial focused-state capture showed a rectangular browser focus outline that did not match the selected underline treatment.
   - Fix: replaced the default outline with an inset champagne-gold underline for `:focus-visible`.
   - Post-fix evidence: final `430px` screenshot shows the selected category with an underline and no rectangular outline.

## Findings

- No actionable P0, P1, or P2 differences remain for the selected navigation change.

## Follow-up Polish

- P3: The concept mock uses larger display typography and looser list rows than the production drawer. Production density was retained deliberately so five material rows remain visible and the scope stays limited to category access.

## Verification

- Primary interaction tested: open drawer, select `装饰`, return to `基酒`.
- Page scroll locks while the drawer is open; the material list remains independently scrollable.
- Browser console warnings/errors: none.
- Automated tests: 12 files, 46 tests passed.
- Typecheck: passed.
- Production build: passed; existing Vite chunk-size warning remains.

final result: passed

# Private Recipe Manuscript Design QA

## Comparison Target

- Source visual truth: `C:/Users/zhb/.codex/generated_images/019fc288-9ac8-78d2-814c-692742043b66/exec-2224e520-7507-4a40-b609-41b08c6e3f8b.png`
- Primary implementation capture: `artifacts/recipe-detail-375-final.png`
- Desktop implementation capture: `artifacts/recipe-detail-852-viewport.png`
- Combined full-view comparison: `artifacts/recipe-detail-comparison-final.png`
- Route and state: `/recipes/78f5aecd-d311-47aa-ad6a-14a58e407042?saved=1`, saved private recipe.
- CSS viewports: `375x667` mobile and `852x1000` desktop; browser density is 1x.
- Source pixels: `852x1846`, normalized to `360x780` for the mobile comparison.
- Mobile implementation pixels: `360x819`; combined comparison pixels: `720x817`.

## Full-View Comparison

The normalized source and final mobile capture were opened together in the same comparison input. The implementation preserves the dark leather book, left-aligned archive hierarchy, large recipe title, English subtitle, integrated saved state, compact metadata, flavor tags, two-column ingredient/method ledger, and quiet bottom return link. The source's top return control and repeat-mix action are intentionally absent per the approved brief.

## Focused Region Comparison

The `852x1000` viewport capture was used to inspect display typography, metadata spacing, the ledger divider, row alignment, and amount columns at readable scale. At `375px`, the ledger computes to two `138.6px` columns, document `scrollWidth` equals `clientWidth` at `360px`, and no horizontal overflow is present.

## Fidelity Surfaces

- Fonts and typography: Song-style display and body typography, Georgia English subtitle, gold hierarchy, weights, wrapping, and line heights closely match the reference. The current recipe's longer Chinese title wraps to two lines at mobile width without clipping.
- Spacing and layout rhythm: The continuous manuscript replaces all stacked cards. Header, summary, ledger, and bottom navigation retain the reference's vertical order and two-column rhythm at both checked widths.
- Colors and visual tokens: Existing champagne-gold text and separators remain readable against the production dark-brown leather surface; no unrelated palette or elevation treatment was introduced.
- Image quality and asset fidelity: The existing production leather-book raster is reused at native art direction. It stays sharp and supplies the book spine, page edge, corner fold, botanical engraving, and archive motif without CSS-drawn substitutes.
- Copy and content: All visible content comes from the saved recipe. The saved status is always visible; `?saved=1` adds live-region semantics only. Exactly one `返回笔记本` link is present, and `再次调制` is absent.

## Comparison History

1. Initial comparison found the inherited chapter folio `V` below the return link, which was absent from the reference and competed with the retained navigation.
   - Fix: hide the shared folio only inside `app-shell--recipe-detail-book`.
   - Post-fix evidence: `artifacts/recipe-detail-375-final.png` and `artifacts/recipe-detail-comparison-final.png`; computed folio visibility is false.
2. The first desktop full-page browser capture contained a repeated page caused by capture tiling and was not valid visual evidence.
   - Fix: replace it with the viewport-only `artifacts/recipe-detail-852-viewport.png` capture and use the valid mobile full-page capture for normalized full-view comparison.

## Findings

- No actionable P0, P1, or P2 mismatch remains.

## Follow-up Polish

- P3: The selected mock places an additional botanical engraving near the upper-right title area. The implementation retains the product's existing bottom botanical/radar engraving so no new decorative asset is introduced for this scoped redesign.

## Verification

- Primary interaction tested: the unique `返回笔记本` link navigates to `/notebook`; the detail route was restored afterward.
- Mobile layout: two ledger columns, no horizontal overflow, folio hidden.
- Browser console warnings/errors: none.
- Feature tests: 3 files, 22 tests passed.
- Typecheck: passed.
- Production build: passed; the existing Vite chunk-size warning remains.
- Full-suite baseline: 59 tests passed; three pre-existing preview-related assertions remain failing and are unrelated to this page.

final result: passed

---

# Preview Final Chapter Design QA

## Scope

- Route: `/diy/preview`
- Viewports: `394x932` and `698x706`
- Required viewport-only captures:
  - `artifacts/preview-final-chapter-394x932.png`
  - `artifacts/preview-final-chapter-698x706.png`
- Supplemental bottom-state check:
  - `artifacts/preview-final-chapter-698x706-bottom-check.png`

## Visual checks

### 394x932

- The deep-brown leather background remains continuous from the header through the folio and bottom page actions.
- Preview title, final-chapter seal, source, three-column metadata, ingredient/method ledger, flavor tags, and notes are all visible and readable.
- Ledger and note body text computes to `14px`, meeting the mobile readability constraint.
- The ingredient and method ledger uses two equal `minmax(0, 1fr)` columns.
- Document width is `379px` inside the browser's scrollbar gutter; no horizontal overflow is present.
- Both bottom page actions compute to `40px` high, remain visually text-like, and do not overlap the folio or each other.

### 698x706

- The leather manuscript fills the available content width and keeps the dark-brown/champagne-gold visual system; no light paper surface was introduced.
- The ingredient and method ledger uses two equal `minmax(0, 1fr)` columns.
- Ledger body text computes to `15.2px`; flavor/note body text computes to `15.36px`.
- The page grows naturally to `1618px` and scrolls vertically instead of clipping content into a fixed-height region.
- No horizontal overflow is present.
- At the bottom scroll position, both page actions are fully visible, compute to `40px` high, and do not overlap each other; the centered folio remains between them.

## Findings and residual risk

- No actionable P0, P1, or P2 issue was found in the final-chapter implementation.
- The prior `698x706` artifact was invalid because it used a full-page capture and contained a repeated page separated by a large dark gap. Both required artifacts were regenerated with `fullPage: false`.
- Residual P3: browser scrollbar chrome is visible in the captures. It accurately reflects the scrollable page and does not consume content width or create horizontal overflow.
- Residual build note: Vite reports the existing JavaScript chunk-size warning (`574.54 kB`); it is unrelated to the preview-page layout.

## Verification

- `npm test`: passed, 12 files and 53 tests.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Browser console warnings/errors during the two-viewport check: none.

final result: passed

---

# Six Page Background Assignment Design QA

## Scope and source truth

- Routes and states: `/home`, `/cocktails/old-fashioned`, `/diy?sourceCocktailId=old-fashioned`, `/diy/preview`, `/recipes/private-recipe`, plus the Add Ingredient drawer opened from `/diy`.
- Source visual truth: the six `*-alchemy-grimoire-golden-v4.png` / `*-grimoire-golden-v4.png` files in `public/assets/page-backgrounds/`.
- Browser viewport: `430x900` CSS pixels at 1x density. Source assets are `941x1672` pixels.
- Implementation captures: `.codex/qa/page-backgrounds/home.png`, `cocktail-detail.png`, `diy.png`, `ingredient-sheet.png`, `preview.png`, and `private-recipe.png`.
- Combined comparison input: `.codex/qa/page-backgrounds/comparison-board.png`. Every source and its corresponding live-page capture are shown side by side at the same normalized `225x400` comparison size.

## Full-view comparison

The combined board confirms that every route uses its dedicated grimoire background: home constellation manuscript, cocktail-detail glass and distillation manuscript, DIY alchemy workbench, ingredient herbarium index, final-preview chapter seal, and private-recipe botanical archive. None of the six assignments repeat another page's asset.

The first capture pass occurred during the page-turn animation and showed an invalid dark gutter. A second pass waited for the transition to finish before capture. DOM geometry then confirmed the page shell covered its entire `1019px` document height and the transition matrix had settled to identity.

## Focused checks

- Computed `background-image` values were checked in the live browser for all five page shells and exactly match their assigned files.
- The Add Ingredient interaction was exercised through the visible `添加材料` button. Its open `.ingredient-index-sheet` computes to the herbarium asset with `background-size: 100% 100%` and fills the `430x792` drawer.
- Source backgrounds retain their distinct embossed/hidden motifs after application; no generated asset was replaced, recolored, or approximated in CSS.

## Findings

- No actionable P0, P1, or P2 mismatch remains in the requested background assignment.
- P3: the private recipe route did not have a persisted recipe for the inspected ID, so its empty state was used for live visual verification. The dedicated private-recipe background was still verified by computed style and full-view capture.
- P3: existing foreground typography on the lighter parchment is deliberately unchanged by this scoped task; some secondary gold copy remains subtle against the generated paper texture.

## Verification

- Background mapping test: 6 assertions passed.
- Full suite: 65 tests passed; 3 existing preview-related assertions remain failing and are unrelated to the background mapping.
- Typecheck: passed.
- Production build: passed; the existing Vite chunk-size warning remains.
- Primary interaction: Add Ingredient drawer opened successfully.
- Browser console errors: none.

final result: passed
