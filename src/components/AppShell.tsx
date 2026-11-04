import clsx from "clsx";
import {
  Bot,
  Building2,
  Cpu,
  FilePlus2,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  Menu,
  ScanSearch,
  Send,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { warm } from "../ai/ollama";
import { useStore, type Role } from "../store";
import { OllamaPill } from "./ai";
import { Logo } from "./ui";

const NAV: { group: string; items: { to: string; label: string; icon: typeof Inbox; end?: boolean; badge?: "inbox" }[] }[] = [
  {
    group: "Платформа",
    items: [
      { to: "/app", label: "Обзор", icon: LayoutDashboard, end: true },
      { to: "/app/programs", label: "Программы проверки", icon: ShieldCheck },
    ],
  },
  {
    group: "Стартапу",
    items: [
      { to: "/app/new", label: "Разместить проект", icon: FilePlus2 },
      { to: "/app/scan", label: "ИИ-анализ кода", icon: ScanSearch },
      { to: "/app/inbox", label: "Отчёты", icon: Inbox, badge: "inbox" },
    ],
  },
  {
    group: "Специалисту",
    items: [
      { to: "/app/report", label: "Отправить находку", icon: Send },
      { to: "/app/profile", label: "Мой путь", icon: GraduationCap },
      { to: "/app/mentor", label: "ИИ-наставник", icon: Bot },
    ],
  },
  { group: "ИИ", items: [{ to: "/app/ai", label: "Локальные модели", icon: Cpu }] },
];

function RoleSwitch() {
  const { role, setRole } = useStore();
  const opt = (r: Role, label: string, Icon: typeof Inbox) => (
    <button
      onClick={() => setRole(r)}
      className={clsx(
        "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12.5px] font-medium transition",
        role === r ? "bg-acc text-ink" : "text-mute hover:text-text",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
  return (
    <div className="flex gap-1 rounded-xl border border-line bg-ink2 p-1">
      {opt("startup", "Стартап", Building2)}
      {opt("specialist", "Специалист", UserRound)}
    </div>
  );
}

export default function AppShell() {
  const { reports, ollama, models } = useStore();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const newReports = reports.filter((r) => r.status === "new").length;

  useEffect(() => setOpen(false), [loc.pathname]);

  // load the first local model into memory so the first request is fast
  useEffect(() => {
    if (ollama?.online && models[0] && !ollama.loaded.includes(models[0])) void warm(models[0]).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ollama?.online]);

  const sidebar = (
    <div className="flex h-full flex-col gap-5 p-4">
      <div className="flex items-center justify-between px-1 pt-1">
        <Link to="/">
          <Logo small />
        </Link>
        <button className="text-mute lg:hidden" onClick={() => setOpen(false)} aria-label="Закрыть меню">
          <X className="h-5 w-5" />
        </button>
      </div>
      <RoleSwitch />
      <nav className="flex-1 space-y-5 overflow-y-auto">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="mb-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-dim">{g.group}</div>
            {g.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className={({ isActive }) =>
                  clsx(
                    "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition",
                    isActive ? "bg-white/[0.06] text-text before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded before:bg-acc" : "text-mute hover:bg-white/[0.03] hover:text-text",
                  )
                }
              >
                <it.icon className="h-4 w-4" />
                {it.label}
                {it.badge === "inbox" && newReports > 0 && (
                  <span className="ml-auto rounded-full bg-acc px-1.5 text-[11px] font-semibold text-ink">{newReports}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="rounded-xl border border-line bg-ink2 p-3 text-[11.5px] leading-relaxed text-dim">
        Прототип VULNEX. Данные хранятся в этом браузере, проекты и отчёты с пометкой «демо» вымышлены.
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-ink2/80 backdrop-blur lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-line bg-ink2">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-ink/80 px-4 backdrop-blur sm:px-8">
          <button className="text-mute lg:hidden" onClick={() => setOpen(true)} aria-label="Меню">
            <Menu className="h-5 w-5" />
          </button>
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-dim sm:inline">прототип · только с разрешения владельца</span>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/app/ai">
              <OllamaPill />
            </Link>
            <Link to="/" className="hidden text-[13px] text-mute hover:text-text sm:inline">
              На сайт
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
