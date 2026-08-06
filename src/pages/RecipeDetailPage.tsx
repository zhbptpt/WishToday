import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { paths } from "../routes/paths";
import { useWishTodayStore } from "../store/useWishTodayStore";
import type { SavedRecipe } from "../types/domain";

type RecipeManuscriptProps = {
  recipe: SavedRecipe;
  announceSaved?: boolean;
};

const recipeDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function RecipeManuscript({
  recipe,
  announceSaved = false,
}: RecipeManuscriptProps) {
  return (
    <article className="recipe-manuscript">
      <header className="recipe-manuscript-hero">
        <p className="recipe-manuscript-eyebrow">私人配方</p>
        <h1 className="recipe-manuscript-title">{recipe.name}</h1>
        {recipe.nameEn ? (
          <p className="recipe-manuscript-title-en">{recipe.nameEn}</p>
        ) : null}
        <div
          className="recipe-saved-status"
          role={announceSaved ? "status" : undefined}
          aria-live={announceSaved ? "polite" : undefined}
        >
          <CheckCircle2 aria-hidden="true" />
          <strong>已收入私人笔记本</strong>
        </div>
      </header>

      <section className="recipe-manuscript-summary" aria-label="配方摘要">
        <p className="recipe-origin-line">
          改造自 <strong>{recipe.sourceCocktailName}</strong>
          <span aria-hidden="true">·</span>
          <time dateTime={recipe.createdAt}>
            {recipeDateFormatter.format(new Date(recipe.createdAt))}
          </time>
        </p>

        <dl className="recipe-facts">
          <div>
            <dt>基酒</dt>
            <dd>{recipe.baseSpirit}</dd>
          </div>
          <div>
            <dt>材料</dt>
            <dd>{recipe.ingredients.length} 种</dd>
          </div>
        </dl>

        {recipe.flavorTags.length > 0 ? (
          <div className="recipe-flavor-tags" aria-label="风味标签">
            {recipe.flavorTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}
      </section>

      <div className="recipe-ledger-grid">
        <section className="recipe-ledger-section">
          <h2>配料清单</h2>
          <ol className="recipe-ingredient-list">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={ingredient.ingredientId}>
                <span className="recipe-ledger-index">{index + 1}.</span>
                <span className="recipe-ingredient-name">{ingredient.name}</span>
                <strong>
                  {ingredient.amount} {ingredient.unit}
                </strong>
              </li>
            ))}
          </ol>
        </section>

        <section className="recipe-ledger-section">
          <h2>调制顺序</h2>
          <ol className="recipe-step-list">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={ingredient.ingredientId}>
                <span className="recipe-ledger-index">{index + 1}.</span>
                <span>
                  {ingredient.name} · {ingredient.amount} {ingredient.unit}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {recipe.notes ? (
        <section className="recipe-notes">
          <h2>我的备注</h2>
          <p>{recipe.notes}</p>
        </section>
      ) : null}

      <nav className="recipe-manuscript-navigation" aria-label="配方页面导航">
        <Link to={paths.notebook}>返回笔记本</Link>
      </nav>
    </article>
  );
}

export function RecipeDetailPage() {
  const { recipeId } = useParams();
  const [searchParams] = useSearchParams();
  const savedRecipes = useWishTodayStore((state) => state.savedRecipes);
  const recipe = savedRecipes.find((item) => item.id === recipeId);
  const showSavedMessage = searchParams.get("saved") === "1";

  if (!recipe) {
    return (
      <AppShell eyebrow="私人配方详情" title="没有找到这份配方">
        <section className="panel state-panel">
          <p>这份配方可能还没有保存到当前笔记本。</p>
          <Link className="secondary-button" to="/notebook">
            <ArrowLeft size={16} />
            返回私人笔记本
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <RecipeManuscript recipe={recipe} announceSaved={showSavedMessage} />
    </AppShell>
  );
}
