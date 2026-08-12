import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { SavedRecipe } from "../types/domain";
import { RecipeDetailPage, RecipeManuscript } from "./RecipeDetailPage";

const savedRecipe: SavedRecipe = {
  id: "recipe-1",
  sourceCocktailId: "espresso-martini",
  sourceCocktailName: "浓缩马天尼",
  name: "浓缩马天尼改造版",
  nameEn: "Espresso Martini",
  baseSpirit: "伏特加",
  ingredients: [
    {
      ingredientId: "vodka",
      name: "伏特加",
      category: "baseSpirit",
      amount: "45",
      unit: "ml",
      stepOrder: 1,
    },
    {
      ingredientId: "coffee-liqueur",
      name: "咖啡利口酒",
      category: "liqueur",
      amount: "20",
      unit: "ml",
      stepOrder: 2,
    },
  ],
  flavorTags: ["辛香提神", "烘香浓郁"],
  notes: "摇和前充分冷却杯具。",
  createdAt: "2026-08-02T12:30:00.000Z",
};

function renderRecipe(path = "/recipes/recipe-1?saved=1") {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/recipes/:recipeId" element={<RecipeDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderManuscript(recipe: SavedRecipe, announceSaved = false) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <RecipeManuscript recipe={recipe} announceSaved={announceSaved} />
    </MemoryRouter>,
  );
}

describe("RecipeDetailPage", () => {
  it("renders a saved recipe as one continuous manuscript with a single quiet return link", () => {
    const markup = renderManuscript(savedRecipe, true);

    expect(markup).toContain('class="recipe-manuscript"');
    expect(markup).toContain('class="recipe-ledger-grid"');
    expect(markup).toContain("私人配方");
    expect(markup).toContain("浓缩马天尼改造版");
    expect(markup).toContain("Espresso Martini");
    expect(markup).toContain("已收入私人笔记本");
    expect(markup).toContain("改造自 ");
    expect(markup).toContain("浓缩马天尼");
    expect(markup).toContain("2026年8月2日");
    expect(markup).toContain("伏特加");
    expect(markup).toContain("2 种");
    expect(markup).toContain("辛香提神");
    expect(markup).toContain("配料清单");
    expect(markup).toContain("调制顺序");
    expect(markup).toContain("摇和前充分冷却杯具。");
    expect(markup.match(/返回笔记本/g)).toHaveLength(1);
    expect(markup).toContain(
      'class="book-page-action recipe-notebook-return-action"',
    );
    expect(markup).toContain('href="/notebook"');
    expect(markup).toContain("book-page-action-icon");
    expect(markup).not.toContain("返回私人笔记本");
    expect(markup).not.toContain("再次调制");
    expect(markup).not.toContain("sticky-action");
  });

  it("omits optional English name and notes without leaving empty sections", () => {
    const markup = renderManuscript({
      ...savedRecipe,
      nameEn: undefined,
      notes: "",
    });

    expect(markup).not.toContain("Espresso Martini");
    expect(markup).not.toContain("我的备注");
    expect(markup).toContain("已收入私人笔记本");
  });

  it("keeps a recovery action when the recipe cannot be found", () => {
    const markup = renderRecipe("/recipes/missing");

    expect(markup).toContain("没有找到这份配方");
    expect(markup).toContain("返回私人笔记本");
  });
});
