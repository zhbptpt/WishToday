import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

type BookPageActionProps = {
  children: ReactNode;
  direction: "back" | "forward";
};

export function BookPageAction({ children, direction }: BookPageActionProps) {
  const arrowProps = {
    "aria-hidden": true,
    className: "book-page-action-icon",
    size: 17,
    strokeWidth: 1.5,
  } as const;

  return (
    <>
      {direction === "back" ? <ArrowLeft {...arrowProps} /> : null}
      <span>{children}</span>
      {direction === "forward" ? <ArrowRight {...arrowProps} /> : null}
    </>
  );
}
