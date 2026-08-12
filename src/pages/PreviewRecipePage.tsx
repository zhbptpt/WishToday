import { BadgeCheck, BookMarked } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { BookPageAction } from "../components/BookPageAction";
import { mockCocktails } from "../mocks/cocktails";
import { useWishTodayStore } from "../store/useWishTodayStore";
import { resolvePreviewSteps } from "./previewRecipeSteps";

export function PreviewRecipePage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const { currentDraft, saveCurrentDraft, saveStatus, saveError } =
    useWishTodayStore();

  async function saveRecipe() {
    setMessage("");
    const result = await saveCurrentDraft();

    if (result.status === "authRequired") {
      navigate("/login?redirectAction=saveRecipe");
      return;
    }

    if (result.status === "saved") {
      navigate(`/recipes/${result.recipe.id}?saved=1`);
      return;
    }

    if (result.status === "invalid") {
      setMessage(result.errors[0]);
      return;
    }

    if (result.status === "emptyDraft") {
      setMessage("当前没有可保存的草稿。");
    }
  }

  if (!currentDraft) {
    return (
      <AppShell eyebrow="预览成品" title="没有可预览的草稿">
        <section className="panel state-panel">
          <p>请先从一杯推荐鸡尾酒进入实验台。</p>
          <Link className="primary-button" to="/home">
            返回首页
          </Link>
        </section>
      </AppShell>
    );
  }

  const previewSteps = resolvePreviewSteps(
    currentDraft.sourceCocktailId,
    currentDraft.ingredients,
    mockCocktails,
  );

  return (
    <AppShell
      eyebrow="预览成品"
      eyebrowClassName="workbench-heading-label"
      title={currentDraft.name}
      titleClassName="preview-heading-title"
    >
      <section className="preview-final-chapter">
        <div className="preview-final-seal" aria-hidden="true">
          <BadgeCheck />
          <span>终章</span>
        </div>
        <p className="preview-chapter-name">酒谱终章</p>
        <p className="preview-source">
          改造自 <strong>{currentDraft.sourceCocktailName}</strong>
        </p>
      </section>

      <dl className="preview-meta-ledger">
        <div>
          <dt>英文名</dt>
          <dd>{currentDraft.nameEn || "未填写"}</dd>
        </div>
        <div>
          <dt>基酒</dt>
          <dd>{currentDraft.baseSpirit}</dd>
        </div>
        <div>
          <dt>材料数</dt>
          <dd>{currentDraft.ingredients.length}</dd>
        </div>
      </dl>

      <div className="preview-ledger-grid">
        <section className="preview-ledger-section preview-ingredients">
          <h2>配料总览</h2>
          <div className="preview-line-list">
            {currentDraft.ingredients.map((ingredient) => (
              <div className="preview-line-item" key={ingredient.ingredientId}>
                <span>{ingredient.name}</span>
                <strong>
                  {ingredient.amount} {ingredient.unit}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <section className="preview-ledger-section preview-method">
          <h2>调制顺序</h2>
          <ol>
            {previewSteps.map((step, index) => (
              <li key={`${currentDraft.sourceCocktailId}-${index}`}>{step}</li>
            ))}
          </ol>
        </section>
      </div>

      <section className="preview-flavor-note">
        <div>
          <h2>风味标签</h2>
          <p>{currentDraft.flavorTags.join(" · ") || "未填写"}</p>
        </div>
        <div>
          <h2>我的备注</h2>
          <p>{currentDraft.notes || "未填写"}</p>
        </div>
      </section>

      {message || saveError ? (
        <section className="preview-message" role="status">
          <p>{message || saveError}</p>
        </section>
      ) : null}

      <div className="dual-action-row">
        <button
          className="secondary-button book-page-action book-page-action--back preview-edit-action"
          onClick={() => navigate("/diy")}
        >
          <BookPageAction direction="back">返回编辑</BookPageAction>
        </button>
        <button
          className="primary-button book-page-action book-page-action--forward preview-save-action"
          disabled={saveStatus === "saving"}
          onClick={saveRecipe}
        >
          {saveStatus === "saving" ? (
            <>
              <BookMarked size={17} />
              <span>保存中...</span>
            </>
          ) : (
            <BookPageAction direction="forward">保存笔记</BookPageAction>
          )}
        </button>
      </div>
    </AppShell>
  );
}
