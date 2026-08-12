import { ChevronLeft, ChevronRight, Sparkle, Sprout } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { listTodayRecommendations } from "../services/cocktailService";
import type { Cocktail } from "../types/domain";

export function HomePage() {
  const navigate = useNavigate();
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let ignore = false;

    listTodayRecommendations()
      .then((items) => {
        if (ignore) {
          return;
        }
        setCocktails(items);
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
  }, []);

  const activeCocktail = cocktails[activeIndex];

  function move(delta: number) {
    setActiveIndex((current) => {
      if (cocktails.length === 0) {
        return 0;
      }
      return (current + delta + cocktails.length) % cocktails.length;
    });
  }

  return (
    <AppShell>
      <section className="home-hero home-hero-frame">
        {(["tl", "tr", "bl", "br"] as const).map((corner) => (
          <span
            className={`home-frame-corner home-frame-corner--${corner}`}
            aria-hidden="true"
            key={corner}
          >
            <Sparkle size={9} strokeWidth={1.35} />
          </span>
        ))}
        <div className="home-hero-copy">
          <p className="eyebrow home-hero-eyebrow">
            <Sprout size={15} strokeWidth={1.4} aria-hidden="true" />
            今日推荐
          </p>
          <h1>让今晚有一杯答案！</h1>
          <p className="lead">
            从一杯经典鸡尾酒开始，稍微改造，沉淀成你的私人配方。
          </p>
        </div>
      </section>

      {status === "loading" ? (
        <section className="panel state-panel">正在擦亮今晚的第一只杯子...</section>
      ) : null}

      {status === "error" ? (
        <section className="panel state-panel">
          <p>今日推荐暂时没有加载成功。</p>
          <button className="primary-button" onClick={() => location.reload()}>
            重新加载
          </button>
        </section>
      ) : null}

      {status === "ready" && !activeCocktail ? (
        <section className="panel state-panel">今天的推荐还在准备中。</section>
      ) : null}

      {activeCocktail ? (
        <section className="recommendation-stage" aria-label="今日推荐列表">
          <div className="section-title-row home-section-title-row">
            <div>
              <p className="eyebrow">Tonight's Seven</p>
              <h2>每日推荐</h2>
            </div>
            <div className="icon-button-row home-carousel-controls">
              <button className="icon-button" onClick={() => move(-1)} title="上一杯">
                <ChevronLeft size={18} />
              </button>
              <button className="icon-button" onClick={() => move(1)} title="下一杯">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <button
            className="cocktail-card feature-card home-feature-card"
            onClick={() => navigate(`/cocktails/${activeCocktail.id}`)}
          >
            <span className="home-recommendation-image" aria-hidden="true">
              <img
                className={`home-feature-photo home-feature-photo--wash home-feature-photo--${activeCocktail.id}`}
                src={
                  activeCocktail.id === "old-fashioned"
                    ? "/assets/ink-wash/old-fashioned-background-wash-v1.png"
                    : activeCocktail.imageUrl
                }
                alt=""
              />
              <img
                className={`home-feature-photo home-feature-photo--subject home-feature-photo--${activeCocktail.id}`}
                src={activeCocktail.imageUrl}
                alt=""
              />
            </span>
            <span className="card-sheen" aria-hidden="true" />
            <span className="cocktail-card-content home-recommendation-copy">
              <strong>{activeCocktail.nameZh}</strong>
              <em>{activeCocktail.nameEn}</em>
              <span className="home-card-divider" aria-hidden="true" />
              <span className="home-card-description">
                {activeCocktail.recommendationText}
              </span>
              <span className="home-flavor-rule" aria-hidden="true" />
              <span className="home-flavor-notes">
                {activeCocktail.flavorTags.map((tag, index) => (
                  <span key={tag}>
                    {index > 0 ? (
                      <i className="home-flavor-separator" aria-hidden="true" />
                    ) : null}
                    {tag}
                  </span>
                ))}
              </span>
            </span>
          </button>

          <div className="pager home-pager" aria-label="推荐分页">
            {cocktails.map((cocktail, index) => (
              <button
                className={index === activeIndex ? "is-active" : ""}
                key={cocktail.id}
                onClick={() => setActiveIndex(index)}
                title={cocktail.nameZh}
              />
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
