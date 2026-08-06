import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Ingredient } from "../types/domain";
import {
  AddIngredientSheet,
  filterIngredientsForSheet,
  getIngredientListStatusCopy,
  isIngredientSelected,
} from "./AddIngredientSheet";

const ingredients: Ingredient[] = [
  {
    id: "bourbon",
    name: "波本威士忌",
    category: "baseSpirit",
    description: "香草、橡木与焦糖气息明显的经典基酒。",
    alcoholLevel: "40%",
  },
  {
    id: "gin",
    name: "金酒",
    category: "baseSpirit",
    description: "以杜松子为核心香气。",
    alcoholLevel: "40%",
  },
  {
    id: "mint",
    name: "薄荷",
    category: "herb",
    description: "增加清凉草本气息。",
  },
];

describe("AddIngredientSheet", () => {
  it("filters search results within the active category", () => {
    expect(filterIngredientsForSheet(ingredients, "baseSpirit", "橡木")).toEqual([
      ingredients[0],
    ]);
    expect(filterIngredientsForSheet(ingredients, "baseSpirit", "薄荷")).toEqual([]);
  });

  it("marks ingredients already present in the draft", () => {
    const selectedIds = new Set(["bourbon"]);

    expect(isIngredientSelected(selectedIds, "bourbon")).toBe(true);
    expect(isIngredientSelected(selectedIds, "gin")).toBe(false);
  });

  it("returns stable loading, error, and empty-state copy", () => {
    expect(getIngredientListStatusCopy("loading", 0)).toBe("正在加载材料...");
    expect(getIngredientListStatusCopy("error", 0)).toBe("材料库暂时不可用，请稍后再试。");
    expect(getIngredientListStatusCopy("ready", 0)).toBe("当前分类没有匹配材料。");
    expect(getIngredientListStatusCopy("ready", 2)).toBeNull();
  });

  it("renders the archive drawer accessibility contract", () => {
    const markup = renderToStaticMarkup(<AddIngredientSheet onClose={() => undefined} />);

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-labelledby="ingredient-sheet-title"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Ingredient Library");
    expect(markup).toContain("添加材料");
    expect(markup).toContain('placeholder="搜索材料"');
  });
});
