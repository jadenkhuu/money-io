"use client";

import Link from "next/link";
import { useState } from "react";
import { CoinAscii } from "./coin-ascii";

// Shared shell for the two auth screens. `login` and `signup` differ only by the
// confirm-password field and the copy, so they share one form to stay in sync.
// No backend yet — submit is inert; this is purely the visual surface.

type Mode = "login" | "signup";

const COPY = {
  login: {
    heading: "Sign in",
    action: "Sign in",
    altPrompt: "New here?",
    altLabel: "Create an account",
    altHref: "/signup",
  },
  signup: {
    heading: "Create account",
    action: "Create account",
    altPrompt: "Already have an account?",
    altLabel: "Sign in",
    altHref: "/login",
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const [show, setShow] = useState(false);

  return (
    <main className="flex h-full flex-col px-6 pt-6">
      <div className="flex flex-col items-center">
        <div className="scale-75">
          <CoinAscii />
        </div>
      </div>

      <div className="mx-auto mt-4 w-full max-w-[20rem]">
        <h2 className="text-lg font-medium tracking-tight">{copy.heading}</h2>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <Field
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
          />

          <Field
            id="password"
            label="Password"
            type={show ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="••••••••"
            trailing={
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="font-mono text-[11px] text-foreground/45 hover:text-foreground/70"
              >
                {show ? "hide" : "show"}
              </button>
            }
          />

          {mode === "signup" && (
            <Field
              id="confirm"
              label="Confirm password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          )}

          <button
            type="submit"
            className="mt-2 w-full bg-foreground py-2.5 text-sm font-medium text-app-surface transition-opacity hover:opacity-90"
          >
            {copy.action}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-foreground/50">
          {copy.altPrompt}{" "}
          <Link
            href={copy.altHref}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            {copy.altLabel}
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  trailing,
  ...props
}: {
  id: string;
  label: string;
  trailing?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="text-xs text-foreground/55">
          {label}
        </label>
        {trailing}
      </div>
      <input
        id={id}
        name={id}
        className="w-full border border-app-border bg-app-surface px-3 py-2.5 font-mono text-base tracking-tight outline-none transition-colors placeholder:text-foreground/30 focus:border-foreground/40"
        {...props}
      />
    </div>
  );
}
