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

# Home Old Fashioned complete-glass visual QA

## Comparison target

- User correction: the recommendation image was too large and roughly one third of the cocktail was missing.
- Route/state: `/home`, Old Fashioned recommendation active.
- Browser viewport: `678x706` CSS pixels.
- Final capture: `C:\Users\zhb\.codex\worktrees\22da\WishToday\tmp\design-qa\home-old-fashioned-complete-glass-678x706.png`.

## Findings and correction

- P1 pre-fix: the photo layer was enlarged to `128%`, making the glass visually oversized.
- P1 pre-fix: the Old Fashioned mask was only `61% 72%`, so its irregular feathering crossed the drink and hid part of the glass.
- Fix: the Old Fashioned-only photo layer now uses `inset: 0`, `width: 100%`, and `height: 100%`; other cocktail images retain their existing geometry.
- Fix: the irregular rectangle is repositioned to `74% 55%` and tightened to `68% 72%`, preserving the complete rim, orange peel, glass body, and base while keeping the surrounding photo background close to the subject.
- The warm sepia archival wash and the left-side copy column remain unchanged.

## Live visual verification

- Computed image and card rectangles are identical at `523.275 x 390.5` CSS pixels, confirming that the previous `128%` enlargement is gone.
- Computed mask values are `74% 55% / 68% 72%` in the final static build.
- The final capture shows the whole drink at a smaller scale; the feathered mask remains outside the glass silhouette and does not obscure the left-side title, description, divider, or flavor notes.

final result: passed

---

# Home Old Fashioned compact irregular-photo window QA

## Comparison target

- Source visual truth: `browser:/home#comment-1`, the annotated Old Fashioned recommendation card specifying a glass-centered irregular rectangle with maximum top/right/left/bottom clearances of 1 cm / 0.8 cm / 0.8 cm / 1.5 cm and a lighter archival wash.
- Implementation screenshot: `C:\Users\zhb\.codex\worktrees\22da\WishToday\tmp\design-qa\home-old-fashioned-tight-rect-678x706.png`.
- Route/state: `/home`, Old Fashioned active and the recommendation card centered in the viewport.
- Browser viewport: `678x706` CSS pixels at 1x density; captured content is `663x690` pixels after the browser scrollbar and viewport chrome.

## Findings

- No actionable P0, P1, or P2 differences remain for the annotated correction.
- Spacing and layout rhythm: the photographic reveal is centered on the complete glass; the irregular edge now ends close to the garnish, glass base, and both glass sides instead of retaining the surrounding bar vessels. The left copy column remains unobstructed.
- Colors and visual tokens: `sepia(0.46) saturate(0.78) contrast(0.9) brightness(1.08)` at `0.82` opacity produces a lighter warm-brown archival wash without becoming monochrome.
- Image quality and asset fidelity: the original Old Fashioned photo and full glass detail remain intact; the transparent raster mask keeps a hand-washed rectangular edge with `61% 72%` sizing and `right 16% bottom 7%` placement.
- Fonts and typography: the Chinese title, English name, description, divider, and tasting notes keep their existing type hierarchy and remain fully readable.
- Copy and content: all recommendation copy is unchanged.
- A separate focused crop was not needed because the full viewport capture shows the complete glass, all four reveal edges, and the adjacent copy at readable scale.

## Comparison history

- Earlier P2 finding: the first `72% 72%` reveal left too much photographic background to the right of the glass.
- Fix: preserved the approved vertical extent and wash filter, narrowed the Old Fashioned-specific mask to `61%` width, and shifted its horizontal anchor to `right 16%`.
- Post-fix visual evidence: the final capture shows only a compact perimeter of photographic texture around the glass while preserving the complete drink and irregular feathering.

## Interaction and runtime checks

- The recommendation remains a working button and its text is not covered by the image.
- Browser-computed values confirm the Old Fashioned-specific class, `mask-size: 61% 72%`, `mask-position: 84% 93%`, the archival filter, and `0.82` opacity.
- Browser console errors: none.
- Focused layout suite: 6/6 tests passed.
- Production build: passed; the existing Vite chunk-size warning remains non-blocking.

final result: passed

---

# Home irregular rectangular cocktail-photo reveal QA

## Comparison target

- Source visual truth: the browser annotation on `button.cocktail-card.feature-card` requesting a non-elliptical, irregular rectangular reveal, with the final edge geometry stored in `public/assets/ink-wash/cocktail-photo-window-rect-v1.png` (`1448x1086` pixels).
- Implementation captures: `tmp/design-qa/home-old-fashioned-irregular-rect.png` and `tmp/design-qa/home-negroni-irregular-rect.png` (both `663x690` pixels).
- Route/state: `/home`, checked with Old Fashioned and Negroni selected.
- Browser viewport: `678x706` CSS pixels at 1x density; screenshots exclude browser chrome and include the visible page scrollbar gutter.

## Full-view and focused comparison

- The generated transparent raster mask creates a broad, asymmetric rectangular photo window with feathered water-stain edges; no oval, radial gradient, CSS clip-path, card border, radius, or opaque black panel remains.
- Old Fashioned and Negroni both show the complete cocktail glass, garnish, glass texture, liquid color, and bar-surface reflection. The surrounding photo background fades progressively into the parchment instead of ending at a hard edge.
- The focused recommendation region is readable at the checked width: the image occupies the right side while the Chinese title, English subtitle, description, divider, and flavor notes remain unobstructed on the left.

## Fidelity surfaces

- Fonts and typography: existing Song-style hierarchy, weights, line height, and copy wrapping are preserved; the narrower mobile title size prevents overlap without changing the page's typographic language.
- Spacing and layout rhythm: the copy column is `50%` at `621–700px` and `44%` at `620px` and below, leaving a consistent parchment gutter between copy and the complete drink.
- Colors and visual tokens: the original drink colors remain clear under a restrained sepia/umber treatment; text uses archival dark brown directly on parchment.
- Image quality and asset fidelity: the original cocktail photos are retained at high opacity and are revealed by a true transparent PNG mask. No raster subject detail is reconstructed with CSS.
- Copy and content: Old Fashioned and Negroni titles, descriptions, and flavor notes remain unchanged and fully visible.

## Comparison history

- Earlier P2: the retained photo-detail region read as an ellipse and did not match the requested irregular rectangular treatment.
- Fix: replaced the ellipse/gradient geometry with `cocktail-photo-window-rect-v1.png`, enlarged the photo surface, retained near-original color/detail, and narrowed the copy column at responsive breakpoints.
- Post-fix evidence: both final captures show a complete drink inside an irregular rectangular fade with no text collision.

## Interaction and runtime checks

- Carousel pagination was exercised from Negroni back to Old Fashioned; the final deliverable state is restored to Old Fashioned.
- Browser console warnings/errors: none.
- Focused Home verification: 2 files, 8 tests passed.
- Production build: passed; the existing Vite chunk-size warning remains non-blocking.

final result: passed

---

# Home recommendation card — selected warm archival wash

## Scope

- Route/state: `/home`, Old Fashioned recommendation visible.
- Viewport: `630x706` CSS pixels.
- Selected direction: warm tobacco-brown archival wash with the cocktail retaining amber highlights; no black rectangular card, black ink backing, or monochrome treatment.

## Visual result

- The recommendation container has no border, radius, opaque fill, inset frame, or isolated black surface.
- The original cocktail photograph is filtered to a restrained sepia/amber range and blended into the parchment so its near-black photographic background no longer reads as a black ink block.
- The photograph keeps the irregular raster wash mask and a right-weighted composition; its edges dissolve into the manuscript rather than ending as a rectangle.
- The title, English name, description, divider, and flavor notes use dark archival brown directly on the parchment. The previous content pseudo-element and sheen overlays compute to `none` / `0` opacity.
- Browser console warnings/errors in the inspected state: none.

## Verification

- Focused Home layout tests: 6/6 passed.
- Production build: passed; the existing Vite chunk-size warning remains non-blocking.
- Full suite: 76/80 tests passed. Four failures remain in pre-existing Preview Recipe and stale Shared Ink Wash expectations, outside this Home recommendation-card change.

final result: passed

---

# Home recommendation ornament removal visual QA

## Scope and result

- Route/state: `/home`, Old Fashioned recommendation card visible.
- Browser viewport: `630x706` CSS pixels.
- Removed only the two vertically aligned black rectangular ornaments from the featured recommendation card.
- Preserved the irregular ink-wash silhouette, warm sepia photo treatment, copy hierarchy, flavor notes, carousel controls, and pagination layout.
- Live DOM check: `.home-card-ornament` count is `0`; `.home-feature-card` count is `1`.
- Browser console errors: none.

## Verification

- Focused Home layout tests: 5/5 passed.
- Typecheck: passed.
- Production build: passed; the existing Vite chunk-size warning remains.
- Full suite: 76/79 tests passed. The same three pre-existing Preview Recipe failures remain outside this Home-only change.

final result: passed

---

# Home recommendation card — solution 1 visual QA

## Comparison target

- Source visual truth: `C:\Users\zhb\.codex\generated_images\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\exec-0c204718-13c5-474f-a1f7-dbb43399b51b.png` (`1185x1327` pixels).
- Pre-fix implementation evidence: `C:\Users\zhb\.codex\visualizations\2026\08\06\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\01-home-margarita-color-conflict.jpg`.
- Final browser-rendered implementation: `C:\Users\zhb\.codex\visualizations\2026\08\06\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\04-home-margarita-card-solution-1-630x706.png` (`615x689` captured pixels).
- Full-view comparison evidence: `C:\Users\zhb\.codex\visualizations\2026\08\06\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\05-home-margarita-solution-1-comparison.png`.
- Focused card comparison evidence: `C:\Users\zhb\.codex\visualizations\2026\08\06\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\06-home-margarita-card-focused-comparison.png`.
- Route/state: `/home`, `玛格丽特 / Margarita` active, recommendation region in view at `scrollY: 520`.
- Viewport/density: `630x706` CSS pixels, device scale factor `1`; browser chrome and scrollbar account for the `615x689` screenshot surface. For the full-view board, the source was normalized to the implementation's `615x689` pixel surface before side-by-side comparison.

## Findings

- No actionable P0, P1, or P2 differences remain for solution 1.
- Fonts and typography: the Song/Georgia manuscript pairing, gold hierarchy, line breaks, and five content labels remain legible over the umber wash. The responsive implementation uses smaller display type than the generated concept, which is an acceptable consequence of fitting the existing `630px` app shell.
- Spacing and layout rhythm: title row, circular carousel controls, ink-wash card, ornaments, and pager preserve the existing Home-page geometry without overflow or a rectangular card frame.
- Colors and visual tokens: the photograph now uses a warm sepia/umber treatment; the former saturated green lime and hard black panel no longer dominate the parchment. Gold copy remains reserved for the dark photographic wash.
- Image quality and asset fidelity: the original cocktail photo is retained, recolored rather than replaced, and clipped by the transparent raster ink-wash asset. Computed style confirms the irregular mask and no border, radius, opaque background, or hidden overflow on the card container.
- Copy and content: `玛格丽特`, `Margarita`, recommendation sentence, and both flavor tags match the application data and remain visible.
- P3 follow-up: the generated concept has a broader, more uniform left-hand brown pool; the live raster mask contains a few lighter feathered patches behind the first title glyph. The text remains readable at the target viewport, so this is non-blocking polish.

## Comparison history

- Initial P2 finding: the pre-fix card was a rigid black rectangle with a vivid green lime, creating a sharp visual break from the distressed parchment.
- Fix: removed the card border, radius, opaque background, and inset treatment; applied a sepia/umber image filter, the wide raster ink-wash mask, a multiply-blended wash layer, and a separate left-weighted text stain.
- Post-fix evidence: the full and focused comparison boards show feathered transparent edges, a subdued warm photograph, readable gold copy, and parchment visible around the entire card silhouette.

## Interaction and runtime checks

- Carousel pagination selected `玛格丽特`; next/previous controls changed to `莫吉托` and restored `玛格丽特` correctly.
- Browser console warnings/errors in the inspected state: none.
- Focused Home layout suite: 5/5 tests passed.
- Typecheck: passed.
- Production build: passed; the existing Vite chunk-size warning remains non-blocking.
- Full suite: 76/79 tests passed. The three existing Preview Recipe failures remain outside this Home recommendation-card change: two `PreviewRecipeLayout.test.mjs` assertions and one `previewRecipeSteps.test.ts` assertion.

final result: passed

---

# Home enlarged hero ink-wash visual QA

## Comparison target

- Source visual truth: `C:\Users\zhb\.codex\generated_images\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\exec-67e75c4b-c891-4425-914c-7171f23a1e2c.png`.
- Final implementation capture: `C:\Users\zhb\.codex\visualizations\2026\08\06\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\home-hero-implementation-approved-v2.jpg`.
- Combined focused comparison: `C:\Users\zhb\.codex\visualizations\2026\08\06\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\home-hero-approved-comparison-v2.jpg` (approved concept left, live implementation right).
- Route/state: `/home`, scroll position `0`, first recommendation selected.
- Browser viewport: `630x706` CSS pixels at `1.25x` density; live content width `614px` with no horizontal overflow.
- The approved concept is square while the live browser capture is portrait, so the QA comparison normalizes the top `614px` and judges the requested hero region rather than unrelated lower-page length.

## Findings and iteration history

- The final irregular wash is substantially larger than the previous implementation and now forms one continuous dark-brown field behind all three copy levels: eyebrow, title, and explanatory sentence.
- Initial P2 finding: the title wrapped and the final explanatory line was too faint near the wash edge. The copy region was widened, the hero height and ink footprint were increased, and the small copy gained a brighter warm-gold color, `500` weight, and stronger sepia shadow.
- Final geometry keeps the title on one line and the explanation on two lines, both fully inside the dark central stain. The wash retains asymmetric splashes, feathered edges, and long drips instead of reading as a rectangular panel.
- Typography and copy hierarchy match the approved direction; the background manuscript, moon engraving, botanical drawing, recommendation heading, image crop, and carousel layout remain unchanged.
- No actionable P0, P1, or P2 mismatch remains for this approved hero treatment.

## Interaction and verification

- Recommendation carousel `下一杯` advanced to 金汤力 and `上一杯` restored 古典鸡尾酒 successfully.
- Focused regression suite: 3 files, 15 tests passed.
- Full suite: 76/79 tests passed. The same three existing Preview Recipe failures remain outside this Home-only change.
- Production build: passed; the existing Vite chunk-size warning remains non-blocking.

final result: passed

---

# Private notebook grimoire visual QA

## Comparison target

- Source visual truth: `C:\Users\zhb\AppData\Local\Temp\codex-clipboard-b7a1dcb7-1d15-4385-b6de-80c64fbcad26.png` (`942x1675`).
- Live route and state: `/notebook` with three persisted private recipes.
- Browser viewport: `630x706` CSS pixels at `1.25x` density; the rendered parchment shell is `614.4x1092.5` CSS pixels and preserves the source aspect ratio.
- Final captures: `private-notebook-applied-top.png` and `private-notebook-applied-bottom.png` in `C:\Users\zhb\.codex\visualizations\2026\08\06\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e`.
- Combined comparison input: `private-notebook-design-comparison.png` in the same folder, with the untouched source beside the live top and bottom captures.

## Visual comparison

The live notebook uses the supplied raster without recoloring or reconstruction. The scorched grimoire border, brass corners, moon medallion, botanical drawings, constellation paths, feather and ink bottle, locked notebook and key, and the `PRIVATE NOTEBOOK / SECRETUM MEUM` inscription remain visible in their original positions.

The application heading and three saved-recipe cards stay inside the central parchment safe area. Cards use a lightly translucent warm-paper wash, deep sepia text, restrained borders, and compact spacing so the original engraved motifs remain legible around them. The ordinary folio footer is hidden on this route because the supplied background already contains its own illustrated closing inscription.

## Interaction and layout checks

- The dedicated `app-shell--notebook-book` class applies only to `/notebook`; saved recipe detail routes keep their existing background.
- Computed `background-image` resolves to `/assets/page-backgrounds/private-notebook-grimoire-golden-v1.png` with `100% 100%` sizing.
- All three saved-recipe links remain present. The first card was activated and navigated to its `/recipes/:id` route, then returned successfully to `/notebook`.
- Top and bottom viewport captures confirm the content does not cover the moon crest, locked notebook, key, bottom inscription, or brass corner ornaments.
- Browser console warnings/errors during the final notebook inspection: none.

## Verification

- Notebook shell regression test: 15/15 assertions passed.
- Typecheck: passed.
- Production build: passed.

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

---

# Cocktail detail ink-wash visual QA

- Reference: `C:\Users\zhb\.codex\generated_images\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\exec-cdf50743-a22a-4ee0-a52f-d2117c2325b8.png`
- Final implementation capture: `C:\Users\zhb\.codex\visualizations\2026\08\06\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\cocktail-detail-ink-final-full.png`
- Route checked: `/cocktails/old-fashioned`
- Responsive width checked: 852 px

## Visual comparison

- Preserved the existing alchemy parchment, photographic cocktail hero, central ledger rule, and lower engraved illustrations.
- Added a dense vertical ink wash behind the hero copy and a separate wide splatter behind the three-column fact strip.
- Added distinct heading blots and irregular wide spills behind the story, ingredients, steps, and bartender notes without covering the radar or engraved background art.
- Raised gold copy contrast and weight on the dark washes; radar labels remain dark sepia on bare parchment.
- Ink assets use transparent raster edges, droplets, rotation, mirroring, and different crops so the sections do not repeat as identical rectangular panels.

## Verification

- `npm test -- src/pages/CocktailDetailLayout.test.mjs`: passed, 6/6 tests.
- `npm run build`: passed.
- Full test run: 66/69 passed. Three failures remain in unchanged preview-recipe code/tests and are outside this cocktail-detail change.

final result: passed

---

# Shared ink-wash language visual QA

## Comparison target

- Source visual truth: `C:\Users\zhb\AppData\Local\Temp\codex-clipboard-2fff0765-1866-47bb-aab1-ee98d2765cc6.png`
- Live routes and states: `/home`, `/diy?sourceCocktailId=old-fashioned`, Add Ingredient drawer open, `/diy/preview`, and a saved `/recipes/:id?saved=1` private recipe.
- Mobile viewport: `430x932` CSS pixels at 1x density.
- Final captures: `home-shared-ink.png`, `diy-shared-ink.png`, `ingredient-sheet-shared-ink.png`, `preview-shared-ink.png`, and `recipe-detail-shared-ink.png` in `C:\Users\zhb\.codex\visualizations\2026\08\06\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e`.

## Visual comparison

The reference and all five final live captures were opened together in one comparison input. The implementation keeps the shared deep-brown distressed parchment, scorched edge, brass-corner, botanical, and alchemy-manuscript system. Each page uses a distinct irregular composition rather than one repeated overlay: a broad hero spill on Home, alternating sectional washes on DIY, a pooled archive header with lighter row traces in the ingredient drawer, mirrored ledger stains in Preview, and a vertical title pool with quieter archival washes in the private recipe.

Static copy on pale parchment now uses deep sepia ink consistent with the reference. Gold remains reserved for dark ink fields, controls, seals, and the photographic recommendation card. The Add Ingredient list, Preview ledger, and private recipe title/summary/ledger were specifically rechecked after contrast adjustments.

## Interaction and layout checks

- Home recommendation content and carousel controls remain visible above the decorative ink layer.
- DIY ingredient inputs, unit selectors, order/delete controls, flavor tags, notes, Add Ingredient, and Preview actions remain interactive.
- Add Ingredient drawer opens and closes; category tabs, search, rows, and add buttons remain above the non-interactive stains.
- Preview opens from the DIY draft; Save Recipe follows the mock login flow and opens the saved private recipe detail.
- Decorative layers use `pointer-events: none`, isolated stacking contexts, and content at `z-index: 1`.
- Browser console warnings/errors during the final inspected route: none.

## Verification

- Focused affected tests: 5 files, 28 tests passed.
- Shared ink-wash regression test: 7 assertions passed, including per-page texture variation and pale-parchment contrast.
- Typecheck: passed.
- Production build: passed; the existing Vite chunk-size warning remains.
- Full suite: 73/76 tests passed. Three existing preview-related failures remain unchanged: two stale `PreviewRecipeLayout` expectations and one preparation-step expectation.

final result: passed

---

# Home border-trace removal visual QA

## Comparison target

- Source visual truth: browser annotation captures for the Home hero and `TONIGHT'S SEVEN / 每日推荐` heading, plus the pre-fix live capture `C:\Users\zhb\.codex\visualizations\2026\08\06\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\home-borders-before.png`.
- Implementation capture: `C:\Users\zhb\.codex\visualizations\2026\08\06\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\home-borders-removed.png`.
- Combined same-state evidence: `C:\Users\zhb\.codex\visualizations\2026\08\06\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\home-borders-comparison.png` (before on the left, implementation on the right).
- Route/state: `/home`, recommendation heading and card visible at the same scroll position.
- Browser viewport: `630x706` CSS pixels at 1x density; both normalized captures are `614x688` pixels.

## Findings

- No actionable P0, P1, or P2 differences remain for the annotated request.
- The hero container's thin rectangular stroke and inset frame shadow are absent in the implementation; the irregular ink wash, copy, spacing, and parchment artwork are preserved.
- The recommendation title row's horizontal divider is absent; heading hierarchy, carousel controls, and card alignment are unchanged.
- Focused region evidence was not split out because the combined capture already shows both requested border locations at readable scale.
- Typography, color tokens, image crop/quality, copy, and responsive layout remain visually unchanged by this scoped correction.

## Comparison history

- Initial P2 finding: rectangular frame traces remained around the hero and below the recommendation heading.
- Fix: set the Home hero border to `0`, removed its inset box shadow, and set the recommendation heading border-bottom to `0`.
- Post-fix evidence: computed styles report zero-width borders and no box shadow; the right side of `home-borders-comparison.png` shows clean parchment transitions without the two rules.

## Interaction and runtime checks

- Carousel controls remain present and aligned.
- Browser console errors: none; only Vite connection messages and the React DevTools informational message were recorded.

final result: passed

---

# Home Old Fashioned reference recreation final visual QA

## Comparison target

- Source visual truth: `C:\Users\zhb\AppData\Local\Temp\codex-clipboard-b9ab9f53-a0bc-437b-9c50-224b53f5d856.png` (`1184x1328` pixels, a 2x reference corresponding to a `592x664` CSS design canvas).
- Normalized source capture: `tmp/design-qa/home-recommendation-reference-592x664.png` (`577x647` visible page pixels after excluding browser scrollbar gutters).
- Same-state implementation capture: `tmp/design-qa/home-recommendation-592x664-final.png` (`577x647` visible page pixels).
- Full-view side-by-side evidence: `tmp/design-qa/home-recommendation-comparison-592x664-final-wash.png` (`1184x664` comparison canvas; reference on the left, implementation on the right).
- Responsive evidence: `tmp/design-qa/home-recommendation-678x706-final-wash.png` (`663x690` visible page pixels) and `tmp/design-qa/home-recommendation-430x706-final-spaced.png` (`415x681` visible page pixels).
- Route/state: `/home`, Old Fashioned active in the recommendation carousel.
- Browser viewports: `592x664`, `678x706`, and `430x706` CSS pixels at 1x capture density. The original 2x reference was normalized to the `592x664` design scale before comparison.

## Findings

- No actionable P0, P1, or P2 differences remain for the selected reference recreation.
- Fonts and typography: the English eyebrow, Chinese title, drink name, description, and flavor notes preserve the source hierarchy, weight contrast, line wrapping, and compact manuscript rhythm. Minor glyph raster differences from the photographed reference are acceptable and do not change hierarchy or readability.
- Spacing and layout rhythm: title controls, copy column, divider, flavor notes, and drink image follow the reference proportions at `592x664`. At `430x706`, the image is reduced and shifted right so the copy remains readable while the whole glass stays visible.
- Colors and visual tokens: the recommendation image now uses warm sepia-brown antique-print toning. The background photo is blurred, multiplied, and faded instead of appearing as a hard black blot or monochrome photograph.
- Image quality and asset fidelity: the visible drink is the real supplied `public/mock/cocktails/old-fashioned.png`, not a generated replacement. `object-fit: contain` and the dedicated glass mask keep the rim, garnish, full tumbler, and base intact. The photograph behind it fades through an irregular soft-edge rectangular wash; it is not an oval window.
- Copy and content: `TONIGHT'S SEVEN`, `每日推荐`, `古典鸡尾酒`, `Old Fashioned`, the recommendation sentence, and both flavor notes match the intended state.
- Focused-region evidence was not split into a separate crop because the full-view comparison isolates only the recommendation section at readable 1:1 design scale. The additional `430x706` capture specifically validates the narrow-screen image/copy boundary and complete glass silhouette.

## Comparison history

- Earlier P1: the recommendation image read as a high-contrast black or black-and-white block rather than a warm antique wash. Fix: introduced a separate blurred sepia background wash at reduced opacity while retaining the real source photo for the subject. Post-fix evidence: `home-recommendation-comparison-592x664-final-wash.png`.
- Earlier P1: the drink was oversized, cropped, or revealed through an oval region, hiding about one third of the cocktail. Fix: changed the photo fit to `contain`, applied the dedicated `old-fashioned-glass-mask-v1.png`, and retained an irregular rectangular wash around the subject. Post-fix evidence: the complete rim-to-base glass in the `592x664`, `678x706`, and `430x706` captures.
- Earlier P2: the narrow layout let the image treatment press into the text column. Fix: below `480px`, set the image region to `left: 49.5%` and `width: 43.5%`. Post-fix evidence: `home-recommendation-430x706-final-spaced.png`.
- Earlier P1 interaction regression: pager dots sat beneath the clickable card and could open the detail route. Fix: raised `.home-pager` to `z-index: 3`. Pointer hit-testing now resolves to the intended pager button.

## Interaction and runtime checks

- Previous/next controls cycle Old Fashioned to Gin and Tonic and back.
- Pager selection changes Old Fashioned to Negroni and can restore Old Fashioned.
- Clicking the recommendation opens `/cocktails/old-fashioned`; back navigation returns to `/home`.
- Pager hit-testing returns the pager `BUTTON`, not the recommendation card.
- Browser console errors in both inspected tabs: none.

## Final implementation checklist

- Real Old Fashioned glass remains complete and uncropped.
- Background photograph is warm brown, blurred, and progressively faded.
- Soft boundary remains an irregular rectangle rather than an ellipse.
- Narrow-screen copy and image spacing is preserved.
- Carousel controls and pager remain clickable above the recommendation card.

final result: passed

---

# Cocktail detail brown ink unification visual QA

## Scope

- Route: `/cocktails/old-fashioned`.
- Browser viewport: `678x706` CSS pixels, plus a full-page capture.
- Change under review: remove only the detail-page desaturating filters so the existing PNG washes retain their native brown tonal range.

## Findings

- Hero copy, fact strip, and ledger section pseudo-elements all compute to `filter: none`.
- The visible stains now transition from a deep warm brown center into lighter brown feathered edges instead of reading as black-gray.
- Existing assets, opacity values, insets, rotations, shapes, text, photograph treatment, and layout remain unchanged.
- Text remains readable over the restored brown washes; no new overlap or clipping was observed.

## Interaction and runtime checks

- The `返回首页` link navigates to `/home`.
- The `DIY` action navigates to `/diy?sourceCocktailId=old-fashioned`.
- Back navigation restores `/cocktails/old-fashioned`.
- Browser console errors: none.
- Focused regression test: 7/7 passed.
- Production build: passed; only the existing Vite chunk-size advisory remains.

final result: passed
