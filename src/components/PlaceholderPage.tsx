import type { ReactNode } from "react";
import { AppShell } from "./AppShell";

type PlaceholderPageProps = {
  title: string;
  eyebrow: string;
  children: ReactNode;
};

export function PlaceholderPage({
  title,
  eyebrow,
  children,
}: PlaceholderPageProps) {
  return (
    <AppShell eyebrow={eyebrow} title={title}>
      <section className="panel">{children}</section>
    </AppShell>
  );
}
