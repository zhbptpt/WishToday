import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("FlavorProfilePanel desktop layout", () => {
  it("top-aligns the narrower story column with the flavor chart", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toContain(
      "grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr);",
    );
    expect(stylesheet).toMatch(
      /\.flavor-story\s*\{[\s\S]*?align-content: start;[\s\S]*?padding: 0 8px 0 30px;/,
    );
  });

  it("disables the brighter default radius-axis line", () => {
    const component = readFileSync(
      new URL("./FlavorProfilePanel.tsx", import.meta.url),
      "utf8",
    );

    expect(component).toMatch(
      /<PolarRadiusAxis[\s\S]*?axisLine=\{false\}/,
    );
    expect(component).not.toContain("fontSize: 14");
  });
});
