# Private notebook background — design QA

- source: `public/assets/page-backgrounds/private-notebook-grimoire-golden-v4.png`
- implementation screenshot: `.codex/qa/private-notebook/implementation-mobile-final-top.png`
- viewport: 415 × 1026 CSS px
- state: `/notebook`, saved-recipe list populated with 11 realistic entries; top and bottom of the long list checked
- source pixel dimensions: 941 × 1672
- implementation pixel dimensions: 415 × 1026
- CSS size: notebook surface fills the 415 px mobile viewport width and grows with its recipe content
- density normalization: the comparison canvas normalizes both panes to 415 px width; the source is contained at 415 × 738 so the full artwork remains visible
- full-view comparison evidence: `.codex/qa/private-notebook/comparison-full.png`
- focused-region comparison evidence: `.codex/qa/private-notebook/comparison-top-focus.png`

## Findings

- The selected ochre parchment, burnt leather edge, brass corner, celestial seal, botanical markings, quill, lock/key, and hidden notebook lettering are all present in the browser-rendered page.
- The dark brown recipe cards maintain strong text contrast while allowing the parchment and engraved edge details to remain visible.
- The long notebook list remains fully backed by the manuscript artwork; the lower lock, hidden text, and brass corner remain visible at the end of the list.
- No horizontal overflow, clipped cards, broken padding, incorrect radii, or unreadable labels were observed at 415 × 1026.

## Comparison history

1. P2 — the first implementation added `aspect-ratio: 941 / 1672`, which fixed the surface height and allowed a long recipe list to overflow beyond the manuscript. Evidence: `implementation-mobile-415x1026-stable.png` and `implementation-full.png`.
2. Fixed — removed the notebook-only aspect ratio so the shared book surface grows with content. Added a regression test that rejects a fixed aspect ratio on this route.
3. Passed — rechecked the top and bottom of the populated list. Evidence: `implementation-mobile-final-top.png`, `implementation-mobile-final-bottom.png`, `comparison-full.png`, and `comparison-top-focus.png`.

## Browser verification

- browser-rendered screenshot: yes
- interactions tested: opened the visible “金汤力改造版” recipe and verified navigation to `/recipes/f9ffb6be-5cee-4f28-b5f8-9956261df20f`, then returned to `/notebook`
- console errors: none
- console warnings: none

final result: passed
