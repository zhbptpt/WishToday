import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AddIngredientSheet } from "../components/AddIngredientSheet";
import { AppShell } from "../components/AppShell";
import { getCocktailById } from "../services/cocktailService";
import { useWishTodayStore } from "../store/useWishTodayStore";
import { ingredientCategoryLabels } from "../types/domain";

const flavorOptions = [
  "橡木焦糖",
  "苦韵回甘",
  "清冽草本",
  "鲜果微酸",
  "蜜韵甜香",
  "芳醇花韵",
  "乳香绵润",
  "烘香浓醇",
  "辛香提神",
];

export function DiyWorkbenchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sourceCocktailId = searchParams.get("sourceCocktailId");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pageError, setPageError] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const {
    currentDraft,
    createDraftFromCocktail,
    removeDraftIngredient,
    reorderDraftIngredient,
    updateDraftInfo,
    updateDraftIngredient,
    validateCurrentDraft,
  } = useWishTodayStore();

  useEffect(() => {
    let ignore = false;

    if (
      !sourceCocktailId ||
      currentDraft?.sourceCocktailId === sourceCocktailId
    ) {
      return;
    }

    getCocktailById(sourceCocktailId)
      .then((cocktail) => {
        if (ignore) {
          return;
        }
        if (!cocktail) {
          setPageError("没有找到来源鸡尾酒，请回到首页重新选择。");
          return;
        }
        createDraftFromCocktail(cocktail);
      })
      .catch(() => setPageError("实验台初始化失败，请稍后再试。"));

    return () => {
      ignore = true;
    };
  }, [createDraftFromCocktail, currentDraft?.sourceCocktailId, sourceCocktailId]);

  function toggleTag(tag: string) {
    if (!currentDraft) {
      return;
    }
    const nextTags = currentDraft.flavorTags.includes(tag)
      ? currentDraft.flavorTags.filter((item) => item !== tag)
      : [...currentDraft.flavorTags, tag];
    updateDraftInfo({ flavorTags: nextTags });
  }

  function preview() {
    const errors = validateCurrentDraft();
    setValidationErrors(errors);
    if (errors.length === 0) {
      navigate("/diy/preview");
    }
  }

  if (pageError) {
    return (
      <AppShell eyebrow="实验台" title="无法开始改造">
        <section className="panel state-panel">
          <p>{pageError}</p>
          <Link className="secondary-button" to="/home">
            <ArrowLeft size={16} />
            返回首页
          </Link>
        </section>
      </AppShell>
    );
  }

  if (!currentDraft) {
    return (
      <AppShell eyebrow="实验台" title="先选一杯经典鸡尾酒">
        <section className="panel state-panel">
          <p>第一版实验台只支持从今日推荐导入配方后改造。</p>
          <Link className="primary-button" to="/home">
            去首页找一杯想喝的酒
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      eyebrow="DIY 调酒实验台"
      eyebrowClassName="workbench-heading-label"
    >
      <section className="panel intro-panel workbench-intro-panel">
        <p className="eyebrow">基于 {currentDraft.sourceCocktailName} 改造</p>
        <p>调整材料、顺序和风味标签，先把这杯酒变成你今晚想喝的样子。</p>
      </section>

      <section className="panel form-panel workbench-fields-panel">
        <label>
          <span>配方名称</span>
          <input
            value={currentDraft.name}
            onChange={(event) => updateDraftInfo({ name: event.target.value })}
          />
        </label>
        <label>
          <span>英文名</span>
          <input
            value={currentDraft.nameEn ?? ""}
            onChange={(event) => updateDraftInfo({ nameEn: event.target.value })}
          />
        </label>
      </section>

      <section className="panel workbench-ingredients-panel">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Ingredients</p>
            <h2>已选材料</h2>
          </div>
          <button className="secondary-button" onClick={() => setSheetOpen(true)}>
            <Plus size={16} />
            添加材料
          </button>
        </div>

        <div className="ingredient-list">
          {currentDraft.ingredients.map((ingredient, index) => (
            <article className="ingredient-row" key={ingredient.ingredientId}>
              <div className="ingredient-row-head">
                <span className="step-badge">{ingredient.stepOrder}</span>
                <div>
                  <strong>{ingredient.name}</strong>
                  <small>{ingredientCategoryLabels[ingredient.category]}</small>
                </div>
                <div className="icon-button-row">
                  <button
                    className="icon-button"
                    disabled={index === 0}
                    onClick={() =>
                      reorderDraftIngredient(ingredient.ingredientId, index - 1)
                    }
                    title="上移"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    className="icon-button"
                    disabled={index === currentDraft.ingredients.length - 1}
                    onClick={() =>
                      reorderDraftIngredient(ingredient.ingredientId, index + 1)
                    }
                    title="下移"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    className="icon-button"
                    disabled={currentDraft.ingredients.length <= 1}
                    onClick={() => removeDraftIngredient(ingredient.ingredientId)}
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="amount-grid">
                <label>
                  <span>用量</span>
                  <input
                    value={ingredient.amount}
                    onChange={(event) =>
                      updateDraftIngredient(ingredient.ingredientId, {
                        amount: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  <span>单位</span>
                  <select
                    value={ingredient.unit}
                    onChange={(event) =>
                      updateDraftIngredient(ingredient.ingredientId, {
                        unit: event.target.value,
                      })
                    }
                  >
                    {["ml", "dash", "片", "颗", "撮"].map((unit) => (
                      <option key={unit}>{unit}</option>
                    ))}
                  </select>
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel workbench-tags-panel">
        <h2>风味标签</h2>
        <div className="chip-grid">
          {flavorOptions.map((tag) => (
            <button
              className={currentDraft.flavorTags.includes(tag) ? "chip active" : "chip"}
              key={tag}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      <section className="panel form-panel workbench-notes-panel">
        <label>
          <span>我的备注</span>
          <textarea
            rows={4}
            value={currentDraft.notes}
            placeholder="例如：少糖，橙皮多挤一点。"
            onChange={(event) => updateDraftInfo({ notes: event.target.value })}
          />
        </label>
      </section>

      {validationErrors.length > 0 ? (
        <section className="message-panel">
          {validationErrors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </section>
      ) : null}

      <div className="sticky-action">
        <button className="primary-button" onClick={preview}>
          预览成品
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>

      {sheetOpen ? <AddIngredientSheet onClose={() => setSheetOpen(false)} /> : null}
    </AppShell>
  );
}
