import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { paths } from "../routes/paths";

type AppShellProps = {
  children: ReactNode;
  eyebrow?: string;
  eyebrowClassName?: string;
  title?: string;
  titleClassName?: string;
};

function getPageFolio(pathname: string) {
  if (pathname === paths.home) return "I";
  if (pathname.startsWith("/cocktails/")) return "II";
  if (pathname === paths.diyWorkbench) return "III";
  if (pathname === paths.previewRecipe) return "IV";
  if (pathname === paths.notebook || pathname.startsWith("/recipes/")) return "V";
  return "VI";
}

export function AppShell({
  children,
  eyebrow,
  eyebrowClassName,
  title,
  titleClassName,
}: AppShellProps) {
  const { pathname } = useLocation();
  const shellClassName =
    pathname === paths.diyWorkbench
      ? "app-shell app-shell--book-background app-shell--leather-book"
      : pathname === paths.previewRecipe
        ? "app-shell app-shell--book-background app-shell--preview-book"
        : pathname === paths.home
          ? "app-shell app-shell--book-background app-shell--home-book"
          : pathname.startsWith("/cocktails/")
            ? "app-shell app-shell--book-background app-shell--cocktail-detail-book"
            : pathname === paths.notebook
              ? "app-shell app-shell--book-background app-shell--notebook-book"
              : pathname.startsWith("/recipes/")
                ? "app-shell app-shell--book-background app-shell--recipe-detail-book"
                : "app-shell app-shell--book-background";

  return (
    <main className={shellClassName}>
      <header className="app-header">
        <Link className="brand-mark" to={paths.home} aria-label="返回首页">
          <span className="brand-dot" aria-hidden="true" />
          WishToday
        </Link>
        {eyebrow || title ? (
          <div className="page-heading">
            {eyebrow ? (
              <p className={eyebrowClassName ?? "eyebrow"}>{eyebrow}</p>
            ) : null}
            {title ? <h1 className={titleClassName}>{title}</h1> : null}
          </div>
        ) : null}
      </header>
      {children}
      <footer className="book-folio" aria-hidden="true">
        <span />
        <b>{getPageFolio(pathname)}</b>
        <span />
      </footer>
    </main>
  );
}
