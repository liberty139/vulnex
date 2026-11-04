import clsx from "clsx";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { SEV_LABEL, type Severity } from "../ai/types";

/** Path to a file in public/, correct both locally and under /vulnex/ on GitHub Pages. */
export const asset = (p: string) => import.meta.env.BASE_URL + p.replace(/^\//, "");

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src={asset("img/lock.png")} alt="" className={small ? "h-6 w-6" : "h-7 w-7"} />
      <span className={clsx("font-display tracking-[0.32em] text-text", small ? "text-[15px]" : "text-[17px]")}>VULNEX</span>
    </span>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "subtle" | "danger";
  size?: "sm" | "md" | "lg";
  to?: string;
  href?: string;
};

const btnClass = (variant: BtnProps["variant"] = "primary", size: BtnProps["size"] = "md") =>
  clsx(
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 select-none whitespace-nowrap",
    "disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-acc focus-visible:outline-offset-2",
    size === "sm" && "h-8 px-3 text-[13px]",
    size === "md" && "h-10 px-4 text-sm",
    size === "lg" && "h-12 px-6 text-[15px]",
    variant === "primary" && "bg-acc text-ink hover:bg-white hover:shadow-[0_0_28px_-4px_rgb(56_217_255/0.7)]",
    variant === "ghost" && "border border-line2 text-text hover:border-acc/70 hover:text-acc bg-white/[0.02]",
    variant === "subtle" && "text-mute hover:text-text hover:bg-white/5",
    variant === "danger" && "border border-crit/40 text-crit hover:bg-crit/10",
  );

export function Button({ variant, size, to, href, className, children, ...rest }: BtnProps) {
  const cls = clsx(btnClass(variant, size), className);
  if (to)
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  if (href)
    return (
      <a href={href} className={cls} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

export function Card({ className, children, glow }: { className?: string; children: ReactNode; glow?: boolean }) {
  return (
    <div className={clsx("rounded-2xl border border-line bg-panel/70 backdrop-blur-sm", glow && "glow", className)}>{children}</div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("font-mono text-[11.5px] uppercase tracking-[0.22em] text-acc", className)}>{children}</div>;
}

export function Badge({ children, tone = "line", className }: { children: ReactNode; tone?: "line" | "acc" | "ok" | "warn" | "crit"; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap",
        tone === "line" && "border-line2 text-mute",
        tone === "acc" && "border-acc/40 bg-acc/10 text-acc",
        tone === "ok" && "border-low/40 bg-low/10 text-low",
        tone === "warn" && "border-med/40 bg-med/10 text-med",
        tone === "crit" && "border-crit/40 bg-crit/10 text-crit",
        className,
      )}
    >
      {children}
    </span>
  );
}

const SEV_CLASS: Record<Severity, string> = {
  critical: "border-crit/50 bg-crit/12 text-crit",
  high: "border-high/50 bg-high/12 text-high",
  medium: "border-med/45 bg-med/10 text-med",
  low: "border-low/45 bg-low/10 text-low",
};
export const SEV_DOT: Record<Severity, string> = {
  critical: "bg-crit",
  high: "bg-high",
  medium: "bg-med",
  low: "bg-low",
};

export function Sev({ s, className }: { s: Severity; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11.5px] font-semibold", SEV_CLASS[s], className)}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", SEV_DOT[s])} />
      {SEV_LABEL[s]}
    </span>
  );
}

export function DemoTag() {
  return (
    <span className="rounded border border-dashed border-line2 px-1.5 py-px font-mono text-[10px] uppercase tracking-wider text-dim">демо</span>
  );
}

/** Fades children in when they scroll into view. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setIn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setIn(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={clsx("reveal", inView && "in", className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-text">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-dim">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-ink2 px-3.5 py-2.5 text-sm text-text placeholder:text-dim outline-none transition focus:border-acc/70 focus:shadow-[0_0_0_3px_rgb(56_217_255/0.12)]";

export function PageHead({ eyebrow, title, sub, right }: { eyebrow?: string; title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h1 className="font-display text-[30px] leading-tight text-text">{title}</h1>
        {sub && <p className="mt-2 text-[15px] leading-relaxed text-mute">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-dim">{children}</div>;
}

export function fmtMs(ms: number) {
  return ms < 1000 ? `${ms} мс` : `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)} с`;
}

export function fmtDate(t: number) {
  return new Date(t).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
