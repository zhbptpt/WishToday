import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("can render a styled page label without a duplicate h1 title", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AppShell
          eyebrow="DIY 调酒实验台"
          eyebrowClassName="workbench-heading-label"
        >
          <section>content</section>
        </AppShell>
      </MemoryRouter>,
    );

    expect(markup).toContain(
      '<p class="workbench-heading-label">DIY 调酒实验台</p>',
    );
    expect(markup).not.toContain("<h1>");
  });

  it("can render a styled title for page-specific hierarchy", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AppShell title="Preview Recipe" titleClassName="preview-heading-title">
          <section>content</section>
        </AppShell>
      </MemoryRouter>,
    );

    expect(markup).toContain(
      '<h1 class="preview-heading-title">Preview Recipe</h1>',
    );
  });

  it.each([
    "/home",
    "/cocktails/old-fashioned",
    "/diy?sourceCocktailId=old-fashioned",
    "/diy/preview",
    "/login",
    "/register",
    "/notebook",
    "/recipes/private-recipe",
  ])("applies the leather book background on %s", (pathname) => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={[pathname]}>
        <AppShell title="WishToday">
          <section>content</section>
        </AppShell>
      </MemoryRouter>,
    );

    expect(markup).toContain(
      '<main class="app-shell app-shell--book-background',
    );
  });

  it("adds the dedicated home book layout only on the homepage", () => {
    const homeMarkup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/home"]}>
        <AppShell>
          <section>content</section>
        </AppShell>
      </MemoryRouter>,
    );
    const detailMarkup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/cocktails/old-fashioned"]}>
        <AppShell>
          <section>content</section>
        </AppShell>
      </MemoryRouter>,
    );

    expect(homeMarkup).toContain("app-shell--home-book");
    expect(detailMarkup).not.toContain("app-shell--home-book");
  });

  it("adds the dedicated cocktail manuscript layout only on detail pages", () => {
    const detailMarkup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/cocktails/gin-tonic"]}>
        <AppShell>
          <section>content</section>
        </AppShell>
      </MemoryRouter>,
    );
    const homeMarkup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/home"]}>
        <AppShell>
          <section>content</section>
        </AppShell>
      </MemoryRouter>,
    );

    expect(detailMarkup).toContain("app-shell--cocktail-detail-book");
    expect(homeMarkup).not.toContain("app-shell--cocktail-detail-book");
  });

  it("adds the dedicated private recipe manuscript layout only on recipe details", () => {
    const recipeMarkup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/recipes/private-recipe"]}>
        <AppShell>
          <section>content</section>
        </AppShell>
      </MemoryRouter>,
    );
    const notebookMarkup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/notebook"]}>
        <AppShell>
          <section>content</section>
        </AppShell>
      </MemoryRouter>,
    );

    expect(recipeMarkup).toContain("app-shell--recipe-detail-book");
    expect(notebookMarkup).not.toContain("app-shell--recipe-detail-book");
  });

  it("adds the dedicated private notebook layout only on the notebook page", () => {
    const notebookMarkup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/notebook"]}>
        <AppShell>
          <section>content</section>
        </AppShell>
      </MemoryRouter>,
    );
    const recipeMarkup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/recipes/private-recipe"]}>
        <AppShell>
          <section>content</section>
        </AppShell>
      </MemoryRouter>,
    );

    expect(notebookMarkup).toContain("app-shell--notebook-book");
    expect(recipeMarkup).not.toContain("app-shell--notebook-book");
  });

  it("adds the dedicated final-chapter layout only on the preview page", () => {
    const previewMarkup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/diy/preview"]}>
        <AppShell>
          <section>content</section>
        </AppShell>
      </MemoryRouter>,
    );
    const workbenchMarkup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/diy"]}>
        <AppShell>
          <section>content</section>
        </AppShell>
      </MemoryRouter>,
    );

    expect(previewMarkup).toContain("app-shell--preview-book");
    expect(workbenchMarkup).not.toContain("app-shell--preview-book");
  });
});
