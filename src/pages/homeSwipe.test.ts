import { describe, expect, it } from "vitest";
import { getRecommendationSwipeDelta } from "./homeSwipe";

describe("getRecommendationSwipeDelta", () => {
  it("moves to the next recommendation after a left swipe", () => {
    expect(
      getRecommendationSwipeDelta({ x: 180, y: 100 }, { x: 90, y: 108 }),
    ).toBe(1);
  });

  it("moves to the previous recommendation after a right swipe", () => {
    expect(
      getRecommendationSwipeDelta({ x: 80, y: 100 }, { x: 160, y: 95 }),
    ).toBe(-1);
  });

  it("ignores short and primarily vertical gestures", () => {
    expect(
      getRecommendationSwipeDelta({ x: 100, y: 100 }, { x: 130, y: 102 }),
    ).toBe(0);
    expect(
      getRecommendationSwipeDelta({ x: 100, y: 100 }, { x: 155, y: 190 }),
    ).toBe(0);
  });
});
