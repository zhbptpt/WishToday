import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { BookPageAction } from "../components/BookPageAction";
import { CocktailHero } from "../components/CocktailHero";
import {
  FlavorRadarSection,
  FlavorStorySection,
} from "../components/FlavorProfilePanel";
import { getCocktailById } from "../services/cocktailService";
import { useWishTodayStore } from "../store/useWishTodayStore";
import type { Cocktail } from "../types/domain";

function getDifficultyLevel(difficulty: string): "入门" | "进阶" | "专业" {
  if (difficulty.includes("高") || difficulty.includes("难") || difficulty.includes("专业")) {
    return "专业";
  }

  if (difficulty.includes("中") || difficulty.includes("进阶")) {
    return "进阶";
  }

  return "入门";
}

export function CocktailDetailPage() {
  const { cocktailId } = useParams();
  const navigate = useNavigate();
  const createDraftFromCocktail = useWishTodayStore(
    (state) => state.createDraftFromCocktail,
  );
  const [cocktail, setCocktail] = useState<Cocktail>();
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">(
    "loading",
  );

  useEffect(() => {
    let ignore = false;

    if (!cocktailId) {
      setStatus("missing");
      return;
    }

    getCocktailById(cocktailId)
      .then((item) => {
        if (ignore) {
          return;
        }

        if (!item) {
          setStatus("missing");
          return;
        }

        setCocktail(item);
        setStatus("ready");
      })
      .catch(() => {
        if (!ignore) {
          setStatus("error");
        }
      });

    return () => {
      ignore = true;
    };
  }, [cocktailId]);

  function enterWorkbench() {
    if (!cocktail) {
      return;
    }

    createDraftFromCocktail(cocktail);
    navigate(`/diy?sourceCocktailId=${cocktail.id}`);
  }

  if (status === "loading") {
    return (
      <AppShell title="正在取出配方">
        <section className="panel state-panel">正在加载...</section>
      </AppShell>
    );
  }

  if (status === "missing" || !cocktail) {
    return (
      <AppShell title="没有找到这杯酒">
        <section className="panel state-panel">
          <p>这条推荐可能已经不在今日清单里。</p>
          <Link className="secondary-button" to="/home">
            <ArrowLeft size={16} />
            返回首页
          </Link>
        </section>
      </AppShell>
    );
  }

  if (status === "error") {
    return (
      <AppShell title="配方加载失败">
        <section className="panel state-panel">
          <p>请稍后再试。</p>
          <Link className="secondary-button" to="/home">
            <ArrowLeft size={16} />
            返回首页
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <CocktailHero cocktail={cocktail} />

      <div className="detail-ledger-grid">
        <div className="detail-ledger-column detail-ledger-column--left">
          <FlavorRadarSection flavorRadar={cocktail.flavorRadar} />

          <section className="detail-ledger-section detail-ingredients">
            <h2>配料清单</h2>
            <div className="line-list">
              {cocktail.ingredients.map((ingredient, index) => (
                <div className="line-item" key={ingredient.ingredientId}>
                  <span className="detail-list-index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>{ingredient.name}</span>
                  <strong>
                    {ingredient.amount} {ingredient.unit}
                  </strong>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="detail-ledger-column detail-ledger-column--right">
          <FlavorStorySection story={cocktail.backgroundStory} />

          <section className="detail-ledger-section steps-panel">
            <div className="panel-title-row">
              <h2>调制步骤</h2>
              <span className="difficulty-badge">
                制作难度 · {getDifficultyLevel(cocktail.difficulty)}
              </span>
            </div>
            <ol className="step-list">
              {cocktail.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="detail-ledger-section detail-notes">
            <h2>调酒师笔记</h2>
            <ul className="note-list">
              {cocktail.bartenderNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <div className="sticky-action book-page-navigation">
        <button
          className="primary-button book-page-action book-page-action--forward"
          onClick={enterWorkbench}
        >
          <BookPageAction direction="forward">DIY</BookPageAction>
        </button>
      </div>
    </AppShell>
  );
}
