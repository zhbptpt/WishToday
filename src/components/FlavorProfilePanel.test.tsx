import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  FlavorProfilePanel,
  FlavorRadarSection,
  FlavorStorySection,
} from "./FlavorProfilePanel";

describe("FlavorProfilePanel", () => {
  it("pairs a number-free flavor radar with the cocktail story", () => {
    const story =
      "十九世纪的印度，英国人用奎宁汤力水抵御炎热。金酒与青柠让苦味变得明亮，最终成为酒吧里最清爽的经典。";
    const markup = renderToStaticMarkup(
      <FlavorProfilePanel
        flavorRadar={{
          sweetness: 1,
          bitterness: 3,
          acidity: 2,
          aroma: 5,
          body: 2,
          alcohol: 3,
        }}
        story={story}
      />,
    );

    expect(markup).toContain("<h2>风味图谱</h2>");
    expect(markup).toContain("<h2>背后的故事</h2>");
    expect(markup).toContain(story);
    expect(markup).toContain(
      'aria-label="甜度、苦度、酸度、香气、酒精、酒感"',
    );
    expect(markup).not.toContain("清冽 · 草本 · 微苦");
    expect(markup).not.toMatch(/>\s*[1-5]\s*</);
  });

  it("exposes the radar and story as separate manuscript sections", () => {
    const radarMarkup = renderToStaticMarkup(
      <FlavorRadarSection
        flavorRadar={{
          sweetness: 1,
          bitterness: 3,
          acidity: 2,
          aroma: 5,
          body: 2,
          alcohol: 3,
        }}
      />,
    );
    const storyMarkup = renderToStaticMarkup(
      <FlavorStorySection story="一杯酒的来历。" />,
    );

    expect(radarMarkup).toContain(
      'class="detail-ledger-section flavor-chart-column"',
    );
    expect(storyMarkup).toContain(
      'class="detail-ledger-section flavor-story"',
    );
    expect(storyMarkup).not.toContain("flavor-story-ornament");
    expect(storyMarkup).not.toContain("botanical-emboss-key");
    expect(storyMarkup).not.toContain(
      "/assets/emboss-library/reference-sheets/",
    );
    expect(storyMarkup).not.toContain("lucide-sprout");
  });

});
