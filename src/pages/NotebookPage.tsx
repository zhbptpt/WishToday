import { ArrowRight, BookOpen } from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { useWishTodayStore } from "../store/useWishTodayStore";

export function NotebookPage() {
  const navigate = useNavigate();
  const { savedRecipes, session } = useWishTodayStore();

  useEffect(() => {
    if (!session.isAuthenticated) {
      navigate("/login?redirectTo=/notebook", { replace: true });
    }
  }, [navigate, session.isAuthenticated]);

  if (!session.isAuthenticated) {
    return (
      <AppShell eyebrow="私人笔记本" title="需要登录">
        <section className="panel state-panel">正在前往登录页...</section>
      </AppShell>
    );
  }

  return (
    <AppShell eyebrow="私人笔记本" title="沉淀你的调酒记录">
      {savedRecipes.length === 0 ? (
        <section className="panel empty-notebook">
          <BookOpen size={32} />
          <h2>你还没有保存任何配方</h2>
          <p>去首页找一杯今天想喝的酒，从经典配方开始改造。</p>
          <Link className="primary-button" to="/home">
            去首页找一杯酒
          </Link>
        </section>
      ) : (
        <section className="notebook-list" aria-label="已保存配方">
          {savedRecipes.map((recipe) => (
            <Link
              className="recipe-card notebook-index-slip"
              to={`/recipes/${recipe.id}`}
              key={recipe.id}
            >
              <span className="notebook-index-heading">
                <strong>{recipe.name}</strong>
                {recipe.nameEn ? <em>{recipe.nameEn}</em> : null}
              </span>
              <span className="recipe-meta notebook-index-meta">
                改造自 {recipe.sourceCocktailName} ·{" "}
                {new Date(recipe.createdAt).toLocaleDateString("zh-CN")} ·{" "}
                {recipe.ingredients.length} 个材料
              </span>
              <span className="tag-row notebook-index-stamps">
                {recipe.flavorTags.slice(0, 3).map((tag) => (
                  <span className="tag notebook-index-stamp" key={tag}>
                    {tag}
                  </span>
                ))}
              </span>
              <ArrowRight
                aria-hidden="true"
                className="recipe-card-arrow notebook-index-arrow"
                size={26}
              />
            </Link>
          ))}
        </section>
      )}
    </AppShell>
  );
}
