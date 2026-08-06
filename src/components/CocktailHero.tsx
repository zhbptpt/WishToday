import { Sprout } from "lucide-react";
import type { Cocktail } from "../types/domain";

type CocktailHeroProps = {
  cocktail: Cocktail;
};

export function CocktailHero({ cocktail }: CocktailHeroProps) {
  return (
    <section className="detail-hero detail-hero--manuscript">
      <img src={cocktail.imageUrl} alt={cocktail.nameZh} />
      <div className="detail-hero-copy">
        <h1 className="detail-hero-title">{cocktail.nameZh}</h1>
        <p className="eyebrow">{cocktail.nameEn}</p>
        <p className="detail-hero-description">{cocktail.recommendationText}</p>
        <span className="detail-hero-rule" aria-hidden="true" />
        <div className="detail-flavor-notes">
          {cocktail.flavorTags.map((tag) => (
            <span key={tag}>
              <Sprout size={18} strokeWidth={1.25} aria-hidden="true" />
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div
        className="hero-facts hero-facts--manuscript"
        aria-label="基础参数"
      >
        <span className="hero-fact">
          <span>
            <small>基酒</small>
            <strong>{cocktail.baseSpirit}</strong>
          </span>
          <span>
            <small>杯型</small>
            <strong>{cocktail.glassType}</strong>
          </span>
          <span>
            <small>酒精度</small>
            <strong>{cocktail.alcoholLevel}</strong>
          </span>
        </span>
      </div>
    </section>
  );
}
