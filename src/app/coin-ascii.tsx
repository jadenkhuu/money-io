"use client";

import { useEffect, useRef, useState } from "react";

type CoinData = { cols: number; rows: number; fps: number; frames: string[] };

// Decorative looping ASCII coin. Pre-rendered frames are loaded from /public.
// Pauses when off-screen or tab hidden; freezes on a single frame when the user
// prefers reduced motion. aria-hidden — it carries no information.
export function CoinAscii() {
  const preRef = useRef<HTMLPreElement>(null);
  const [data, setData] = useState<CoinData | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/coin-frames.json")
      .then((r) => r.json())
      .then((d: CoinData) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const pre = preRef.current;
    if (!data || !pre) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      pre.textContent = data.frames[0];
      return;
    }

    let frame = 0;
    let raf = 0;
    let last = 0;
    let paused = false;
    const interval = 1000 / data.fps;

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (paused || t - last < interval) return;
      last = t;
      pre.textContent = data.frames[frame];
      frame = (frame + 1) % data.frames.length;
    };
    raf = requestAnimationFrame(tick);

    const onVisibility = () => {
      paused = document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const io = new IntersectionObserver(
      ([entry]) => {
        paused = !entry.isIntersecting || document.hidden;
      },
      { threshold: 0.1 }
    );
    io.observe(pre);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
    };
  }, [data]);

  return (
    <pre
      ref={preRef}
      aria-hidden="true"
      className="font-mono select-none whitespace-pre"
      style={{ fontSize: "clamp(5px, 2.2cqw, 10px)", lineHeight: 1.2 }}
    >
      {data ? data.frames[0] : ""}
    </pre>
  );
}
