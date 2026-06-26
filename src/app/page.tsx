import type { ReactNode } from "react";
import { CoinAscii } from "./coin-ascii";
import { HomeHeader } from "./home-header";
import { entryLabel, getMonthSummary, getRecentTransactions, getTopCategories } from "@/lib/data";
import { amount, signed } from "@/lib/format";
import { Bar } from "./bar";

// Money is shown in the mono / ASCII register with tabular figures so columns
// align. Words (titles, descriptions) stay in the sans / clean register.

export default async function Home() {
  const month = await getMonthSummary();
  const recent = await getRecentTransactions(3);
  const categories = await getTopCategories(3);
  const spendRatio = month.income > 0 ? month.expense / month.income : 0;

  return (
    <main className="px-5 py-6">
      <h1 className="text-sm font-medium tracking-tight">money-io</h1>
      <p className="mt-1 text-xs text-foreground/50">Welcome back</p>

      <div className="mt-6 flex justify-center">
        <CoinAscii />
      </div>

      <HomeHeader />

      <div className="-mx-5 mt-3 divide-y divide-app-border">
        <Widget title="This month">
          <div className={`font-mono text-3xl tabular-nums tracking-tight ${month.net >= 0 ? "text-money-in" : "text-money-out"}`}>
            {signed(month.net)}
          </div>
          <div className="mt-3 flex items-center gap-2 font-mono text-sm text-foreground/70">
            <Bar ratio={spendRatio} className="flex-1" />
            <span className="shrink-0 text-foreground/45">
              {Math.round(spendRatio * 100)}%
            </span>
          </div>
          <div className="mt-2 flex gap-5 font-mono text-xs tabular-nums text-foreground/55">
            <span>in {amount(month.income)}</span>
            <span>out {amount(month.expense)}</span>
          </div>
        </Widget>

        <Widget title="Top categories">
          <ul className="space-y-2">
            {categories.map((c) => (
              <li key={c.name}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm">{c.name}</span>
                  <span className="font-mono text-sm tabular-nums text-foreground/80">
                    {amount(c.amount)}
                  </span>
                </div>
                <Bar
                  ratio={c.amount / month.expense}
                  className="mt-1 text-xs text-foreground/40"
                />
              </li>
            ))}
          </ul>
        </Widget>

        <Widget title="Recent">
          <ul className="space-y-2">
            {recent.map((t) => (
              <li
                key={t.id}
                className="flex items-baseline justify-between gap-4"
              >
                <span className="text-sm">{entryLabel(t)}</span>
                <span className={`font-mono text-sm tabular-nums ${t.amount >= 0 ? "text-money-in" : "text-money-out"}`}>
                  {signed(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        </Widget>
      </div>
    </main>
  );
}

function Widget({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-6 py-4">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
