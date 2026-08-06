import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HomePage } from "./HomePage";

describe("HomePage", () => {
  it("renders the engraved title frame used by the book-style homepage", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/home"]}>
        <HomePage />
      </MemoryRouter>,
    );

    expect(markup).toContain('class="home-hero home-hero-frame"');
    expect(markup).toContain('class="home-frame-ornament"');
    expect(markup).toContain("让今晚有一杯答案！");
  });
});
