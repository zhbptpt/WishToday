import { Check, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { listIngredients } from "../services/ingredientService";
import { useWishTodayStore } from "../store/useWishTodayStore";
import {
  ingredientCategories,
  ingredientCategoryLabels,
  type Ingredient,
  type IngredientCategory,
} from "../types/domain";

type IngredientListStatus = "loading" | "ready" | "error";

export function filterIngredientsForSheet(
  ingredients: Ingredient[],
  category: IngredientCategory,
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return ingredients.filter((ingredient) => {
    if (ingredient.category !== category) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [ingredient.name, ingredient.description, ingredient.alcoholLevel]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedQuery);
  });
}

export function isIngredientSelected(
  selectedIngredientIds: ReadonlySet<string>,
  ingredientId: string,
) {
  return selectedIngredientIds.has(ingredientId);
}

export function getIngredientListStatusCopy(
  status: IngredientListStatus,
  resultCount: number,
) {
  if (status === "loading") {
    return "正在加载材料...";
  }

  if (status === "error") {
    return "材料库暂时不可用，请稍后再试。";
  }

  if (resultCount === 0) {
    return "当前分类没有匹配材料。";
  }

  return null;
}

export function AddIngredientSheet({ onClose }: { onClose: () => void }) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<IngredientCategory>("baseSpirit");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<IngredientListStatus>("loading");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentDraft = useWishTodayStore((state) => state.currentDraft);
  const addIngredientToDraft = useWishTodayStore(
    (state) => state.addIngredientToDraft,
  );

  useEffect(() => {
    let ignore = false;

    listIngredients()
      .then((items) => {
        if (!ignore) {
          setIngredients(items);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!ignore) {
          setStatus("error");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    searchInputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const selectedIngredientIds = useMemo(
    () =>
      new Set(
        currentDraft?.ingredients.map((ingredient) => ingredient.ingredientId) ?? [],
      ),
    [currentDraft?.ingredients],
  );

  const filteredIngredients = useMemo(
    () => filterIngredientsForSheet(ingredients, category, query),
    [category, ingredients, query],
  );
  const statusCopy = getIngredientListStatusCopy(
    status,
    filteredIngredients.length,
  );

  function addIngredient(ingredient: Ingredient) {
    const added = addIngredientToDraft(ingredient);
    setMessage(added ? `${ingredient.name} 已加入配方` : "该材料已在配方中");
  }

  const sheet = (
    <div
      className="sheet-backdrop ingredient-sheet-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="bottom-sheet ingredient-index-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ingredient-sheet-title"
      >
        <div className="ingredient-sheet-header">
          <div className="sheet-handle" aria-hidden="true" />
          <div className="ingredient-sheet-title-row">
            <div>
              <p className="eyebrow">Ingredient Library</p>
              <h2 id="ingredient-sheet-title">添加材料</h2>
            </div>
            <button
              className="icon-button ingredient-sheet-close"
              onClick={onClose}
              title="关闭材料库"
              aria-label="关闭材料库"
            >
              <X size={18} />
            </button>
          </div>

          <label className="ingredient-search-field">
            <Search size={17} aria-hidden="true" />
            <input
              ref={searchInputRef}
              value={query}
              placeholder="搜索材料"
              aria-label="搜索材料"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="category-scroll ingredient-index-tabs" role="tablist" aria-label="材料分类">
            {ingredientCategories.map((item) => (
              <button
                className={item === category ? "ingredient-index-tab active" : "ingredient-index-tab"}
                key={item}
                role="tab"
                aria-selected={item === category}
                onClick={() => {
                  setCategory(item);
                  setMessage("");
                }}
              >
                {ingredientCategoryLabels[item]}
              </button>
            ))}
          </div>
        </div>

        <div className="ingredient-sheet-status" role="status" aria-live="polite" aria-atomic="true">
          {message}
        </div>

        <div className="sheet-list ingredient-index-list">
          {statusCopy ? <p className="empty-copy ingredient-sheet-empty">{statusCopy}</p> : null}

          {status === "ready"
            ? filteredIngredients.map((ingredient, index) => {
                const alreadyAdded = isIngredientSelected(
                  selectedIngredientIds,
                  ingredient.id,
                );

                return (
                  <article
                    className={alreadyAdded ? "sheet-row ingredient-index-row is-added" : "sheet-row ingredient-index-row"}
                    key={ingredient.id}
                  >
                    <span className="ingredient-index-number" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="ingredient-index-copy">
                      <div className="ingredient-index-name-row">
                        <strong>{ingredient.name}</strong>
                        <small>
                          {ingredientCategoryLabels[ingredient.category]}
                          {ingredient.alcoholLevel ? ` · ${ingredient.alcoholLevel}` : ""}
                        </small>
                      </div>
                      {ingredient.description ? <p>{ingredient.description}</p> : null}
                    </div>
                    <button
                      className="icon-button ingredient-add-button"
                      disabled={alreadyAdded}
                      onClick={() => addIngredient(ingredient)}
                      title={alreadyAdded ? `${ingredient.name}已添加` : `添加${ingredient.name}`}
                      aria-label={alreadyAdded ? `${ingredient.name}已添加` : `添加${ingredient.name}`}
                    >
                      {alreadyAdded ? <Check size={18} /> : <Plus size={18} />}
                    </button>
                  </article>
                );
              })
            : null}
        </div>
      </section>
    </div>
  );

  if (typeof document === "undefined") {
    return sheet;
  }

  return createPortal(sheet, document.body);
}
