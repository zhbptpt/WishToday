import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HomePage } from "./HomePage";

describe("HomePage", () => {
  it("renders the book-style hero without the two dark frame ornaments", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/home"]}>
        <HomePage />
      </MemoryRouter>,
    );

    expect(markup).toContain('class="home-hero home-hero-frame"');
    expect(markup).not.toContain('class="home-frame-ornament');
    expect(markup).toContain("让今晚有一杯答案！");
  });

  it("groups every hero message inside one ink-backed copy region", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/home"]}>
        <HomePage />
      </MemoryRouter>,
    );

    expect(markup).toMatch(
      /<div class="home-hero-copy">[\s\S]*今日推荐[\s\S]*让今晚有一杯答案！[\s\S]*从一杯经典鸡尾酒开始，稍微改造，沉淀成你的私人配方。[\s\S]*<\/div>/,
    );
  });
});
