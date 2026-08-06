import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookPageAction } from "./BookPageAction";

describe("BookPageAction", () => {
  it("places the arrow after a forward action", () => {
    const markup = renderToStaticMarkup(
      <BookPageAction direction="forward">保存笔记</BookPageAction>,
    );

    expect(markup).toMatch(/保存笔记.*book-page-action-icon/);
  });

  it("places the arrow before a back action", () => {
    const markup = renderToStaticMarkup(
      <BookPageAction direction="back">返回编辑</BookPageAction>,
    );

    expect(markup).toMatch(/book-page-action-icon.*返回编辑/);
  });
});
