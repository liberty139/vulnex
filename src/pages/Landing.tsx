import clsx from "clsx";
import {
  ArrowRight,
  Bot,
  Building2,
  ChevronRight,
  ClipboardCheck,
  Cpu,
  ExternalLink,
  FileSearch,
  GraduationCap,
  Lock,
  Menu,
  MessageSquareText,
  ScanSearch,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { describe } from "../ai/ollama";
import { Badge, Button, Card, Eyebrow, Logo, Reveal, asset } from "../components/ui";
import { FACTS } from "../data";
import { useStore } from "../store";

const STEPS = [
  { t: "Стартап размещает проект и задаёт границы проверки", icon: Building2 },
  { t: "Специалист выбирает проект и проверяет его разрешённую копию", icon: UserRound },
  { t: "ИИ помогает анализировать и подсказывает, где искать", icon: Bot },
  { t: "Находки проходят проверку и подтверждение", icon: ClipboardCheck },
  { t: "Стартап получает отчёт, специалист — репутацию", icon: ShieldCheck },
];

const AI_ROLES = [
  { icon: FileSearch, t: "Черновик границ проверки", d: "По описанию проекта предлагает, что проверять, что не трогать и какие действия запрещены. Владелец правит и утверждает." },
  { icon: ScanSearch, t: "Предварительный анализ кода", d: "Несколько моделей независимо читают код и отмечают места для проверки. Совпадения видно сразу." },
  { icon: ClipboardCheck, t: "Проверка отчёта", d: "Подсказывает новичку, чего не хватает в отчёте: шагов, доказательств, оценки влияния." },
  { icon: MessageSquareText, t: "Объяснение для основателя", d: "Переводит технический отчёт на понятный язык: что не так, чем грозит и как исправить." },
  { icon: GraduationCap, t: "Наставник для новичка", d: "Отвечает на вопросы об уязвимостях и учит писать отчёты — в рамках легальной практики." },
];

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const links = [
    ["#problem", "Проблема"],
    ["#how", "Как работает"],
    ["#ai", "ИИ"],
    ["#value", "Для кого"],
    ["#plan", "План"],
  ];
  return (
    <header className={clsx("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled ? "border-b border-line bg-ink/80 backdrop-blur-md" : "border-b border-transparent")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-5 sm:px-8">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {links.map(([h, l]) => (
            <a key={h} href={h} className="text-[13.5px] text-mute transition hover:text-text">
              {l}
            </a>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-3 sm:flex">
          <Button to="/app" size="sm">
            Открыть платформу <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <button className="ml-auto text-mute sm:hidden" onClick={() => setOpen(!open)} aria-label="Меню">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-line bg-ink px-5 py-4 sm:hidden">
          {links.map(([h, l]) => (
            <a key={h} href={h} onClick={() => setOpen(false)} className="block py-2 text-mute">
              {l}
            </a>
          ))}
          <Button to="/app" className="mt-3 w-full">
            Открыть платформу
          </Button>
        </div>
      )}
    </header>
  );
}

/** A scripted scan shown in the hero: an illustration, labelled as such. */
const SCRIPT: { t: string; c?: string; d: number }[] = [
  { t: "$ fortera scan ./clinic-staging", c: "text-text", d: 500 },
  { t: "✓ разрешение владельца подтверждено", c: "text-low", d: 600 },
  { t: "✓ границы: кабинет пациента, запись, вход по SMS", c: "text-low", d: 500 },
  { t: "→ правила: 2 совпадения за 0,04 с", c: "text-mute", d: 700 },
  { t: "→ qwen2.5:7b (локально): анализирую…", c: "text-acc", d: 1300 },
  { t: "→ llama3:8b (локально): анализирую…", c: "text-acc", d: 1100 },
  { t: "! строка 18 · доступ к чужим записям · высокая", c: "text-high", d: 600 },
  { t: "! строка 9 · SQL-запрос из строк · критическая", c: "text-crit", d: 600 },
  { t: "→ 2 гипотезы переданы специалисту на проверку", c: "text-text", d: 2600 },
];

function Terminal() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setN((x) => (x >= SCRIPT.length ? 0 : x + 1)), n >= SCRIPT.length ? 2400 : SCRIPT[n]?.d ?? 600);
    return () => clearTimeout(t);
  }, [n]);
  return (
    <div className="scanline relative overflow-hidden rounded-2xl border border-line bg-ink/85 shadow-2xl shadow-black/60 backdrop-blur">
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-line2" />
        <span className="h-2.5 w-2.5 rounded-full bg-line2" />
        <span className="h-2.5 w-2.5 rounded-full bg-line2" />
        <span className="ml-3 font-mono text-[11px] text-dim">пример проверки · иллюстрация</span>
      </div>
      <div className="h-[244px] space-y-1.5 px-4 py-3.5 font-mono text-[12.5px] leading-relaxed">
        {SCRIPT.slice(0, n).map((l, i) => (
          <div key={i} className={clsx(l.c, i === n - 1 && n < SCRIPT.length && "caret")}>
            {l.t}
          </div>
        ))}
        {n === 0 && <div className="caret text-dim" />}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden">
      <img src={asset("img/bg-1.jpg")} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-[70%_50%] opacity-30 lg:opacity-100" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/10" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink to-transparent" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pt-32 pb-20 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:pt-40">
        <div>
          <Reveal>
            <Eyebrow className="mb-6">Платформа практической кибербезопасности</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="font-display text-[44px] leading-[1.02] sm:text-[64px] lg:text-[76px]">
              Безопасность
              <br />
              <span className="text-acc">каждой идее.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-xl text-[17px] leading-relaxed text-mute sm:text-lg">
              FortEra соединяет стартапы и небольшие IT-команды, которым нужна доступная проверка безопасности, с начинающими специалистами,
              которым нужны реальная практика и подтверждённая репутация.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button to="/app/new" size="lg">
                Разместить проект <ArrowRight className="h-4 w-4" />
              </Button>
              <Button to="/app/programs" size="lg" variant="ghost">
                Я специалист
              </Button>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[13px] text-mute">
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-acc" /> Только с разрешения владельца
              </span>
              <span className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-acc" /> ИИ работает локально
              </span>
              <span className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-acc" /> Путь от обучения к опыту
              </span>
            </div>
          </Reveal>
        </div>
        <Reveal delay={300} className="lg:mt-24">
          <Terminal />
        </Reveal>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section id="problem" className="relative isolate scroll-mt-16 overflow-hidden py-28">
      <img src={asset("img/bg-2.jpg")} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-right opacity-60" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/90 to-ink/40" />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <Eyebrow className="mb-5">Проблема</Eyebrow>
          <h2 className="max-w-4xl font-display text-[36px] leading-tight sm:text-[52px]">
            Мир стал быстрее. <span className="text-acc">А стал ли он безопаснее?</span>
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-mute">
            Мы научились создавать цифровые продукты быстрее, чем научились обеспечивать их безопасность.
          </p>
        </Reveal>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {FACTS.map((f, i) => (
            <Reveal key={f.big} delay={i * 120}>
              <Card className="flex h-full flex-col p-7 transition hover:border-acc/40">
                <div className="font-cond text-[56px] leading-none text-acc">{f.big}</div>
                <div className="mt-2 text-[15px] font-medium text-text">{f.label}</div>
                <p className="mt-4 flex-1 text-[14.5px] leading-relaxed text-mute">{f.text}</p>
                <a href={f.href} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-xs text-dim transition hover:text-acc">
                  {f.src} <ExternalLink className="h-3 w-3" />
                </a>
              </Card>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <p className="mt-8 max-w-3xl text-[13px] text-dim">
            «Почти 70%» — это доля сайтов, работающих на PHP, а не число взломанных: все они оказались под угрозой и требовали срочного
            обновления. Binance и Bybit — примеры масштаба последствий, а не случаи, которые предотвратила бы платформа.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Sides() {
  const side = (Icon: typeof Building2, title: string, items: string[], delay: number) => (
    <Reveal delay={delay}>
      <Card className="h-full p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-acc/30 bg-acc/10 text-acc">
            <Icon className="h-5 w-5" />
          </span>
          <h3 className="font-display text-2xl">{title}</h3>
        </div>
        <ul className="space-y-3.5">
          {items.map((t) => (
            <li key={t} className="flex gap-3 text-[15.5px] text-mute">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-acc" />
              {t}
            </li>
          ))}
        </ul>
      </Card>
    </Reveal>
  );
  return (
    <section className="relative isolate overflow-hidden pt-28 pb-60">
      <img src={asset("img/bg-3.jpg")} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-bottom opacity-80" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink via-ink/70 to-ink/30" />
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <Eyebrow className="mb-5 text-center">Две стороны одной проблемы</Eyebrow>
          <h2 className="text-center font-display text-[34px] leading-tight sm:text-[46px]">Одним не хватает проверки. Другим — практики.</h2>
        </Reveal>
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {side(Building2, "Стартапы", ["Все силы — на продукт", "Полная проверка безопасности часто не по силам", "Проблемы замечают, когда уже поздно"], 0)}
          {side(UserRound, "Начинающие специалисты", ["Учатся и решают CTF-задачи", "Нет доступа к реальным проектам", "Нечем подтвердить практический опыт"], 120)}
        </div>
        <Reveal>
          <p className="mx-auto mt-14 max-w-3xl text-center text-xl leading-relaxed text-mute sm:text-2xl">
            Одним нужна доступная проверка безопасности. Другим — возможность доказать свои навыки.{" "}
            <span className="font-display text-acc">FortEra объединяет их.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function How() {
  return (
    <section id="how" className="relative isolate scroll-mt-16 py-28">
      <div className="grid-bg absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <Eyebrow className="mb-5">Как работает</Eyebrow>
          <h2 className="font-display text-[34px] leading-tight sm:text-[46px]">Пять шагов. Только по правилам.</h2>
        </Reveal>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <Reveal key={s.t} delay={i * 90}>
              <div className="group relative h-full rounded-2xl border border-line bg-panel/70 p-6 transition hover:-translate-y-1 hover:border-acc/50">
                <div className="flex items-center justify-between">
                  <span className="font-cond text-[44px] leading-none text-acc">0{i + 1}</span>
                  <s.icon className="h-5 w-5 text-dim transition group-hover:text-acc" />
                </div>
                <p className="mt-6 text-[15px] leading-snug text-text">{s.t}</p>
                {i < STEPS.length - 1 && <ChevronRight className="absolute top-1/2 -right-3.5 z-10 hidden h-5 w-5 -translate-y-1/2 text-acc lg:block" />}
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="glow mt-6 flex flex-col gap-4 rounded-2xl bg-panel/80 p-6 sm:flex-row sm:items-center">
            <img src={asset("img/lock.png")} alt="" className="h-12 w-12" />
            <div>
              <div className="font-display text-xl text-text">Только с разрешения владельца</div>
              <p className="mt-1 text-[15px] text-mute">
                Проверяется разрешённая копия проекта и только в заранее заданных границах. Без подтверждённого разрешения проект не попадает на
                платформу.
              </p>
            </div>
            <Button to="/app/new" variant="ghost" className="sm:ml-auto">
              Как задать границы
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function AiSection() {
  const { ollama } = useStore();
  const models = ollama?.online ? ollama.models : [];
  const local = models.filter((m) => m.local);
  return (
    <section id="ai" className="relative isolate scroll-mt-16 overflow-hidden border-y border-line bg-ink2 py-28">
      <div className="absolute -top-40 left-1/2 -z-0 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-acc/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Reveal>
              <Eyebrow className="mb-5">ИИ внутри платформы</Eyebrow>
              <h2 className="font-display text-[34px] leading-tight sm:text-[46px]">
                ИИ подсказывает.
                <br />
                <span className="text-acc">Решает человек.</span>
              </h2>
              <p className="mt-6 max-w-xl text-[16.5px] leading-relaxed text-mute">
                Модели работают прямо на компьютере через Ollama — код стартапа не уходит в чужое облако. Несколько моделей смотрят на одну задачу
                независимо, а каждую находку подтверждает специалист. ИИ не заменяет людей и не обещает абсолютной безопасности.
              </p>
            </Reveal>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {AI_ROLES.map((r, i) => (
                <Reveal key={r.t} delay={i * 70} className={i === 4 ? "sm:col-span-2" : ""}>
                  <div className="h-full rounded-xl border border-line bg-panel/60 p-5 transition hover:border-acc/40">
                    <r.icon className="h-5 w-5 text-acc" />
                    <div className="mt-3 text-[15px] font-medium text-text">{r.t}</div>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-mute">{r.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal delay={150}>
            <Card className="sticky top-24 p-6" glow>
              <div className="flex items-center justify-between">
                <div className="font-display text-lg">Модели на этом компьютере</div>
                {ollama?.online ? (
                  <Badge tone="acc">
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-acc" /> Ollama {ollama.version}
                  </Badge>
                ) : (
                  <Badge>{ollama ? "Ollama не запущена" : "проверяю…"}</Badge>
                )}
              </div>
              <div className="mt-5 space-y-2">
                {(models.length ? models.slice(0, 7) : ["qwen2.5:7b", "llama3:latest", "gemma4:31b-cloud"].map(describe)).map((m) => (
                  <div key={m.name} className="flex items-center gap-3 rounded-xl border border-line bg-ink2 px-3.5 py-2.5">
                    <Cpu className={clsx("h-4 w-4", m.local ? "text-low" : "text-dim")} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-text">{m.label}</div>
                      <div className="truncate text-[11.5px] text-dim">{m.vendor}</div>
                    </div>
                    <span className={clsx("text-[11px]", m.local ? "text-low" : "text-dim")}>{m.local ? "локально" : "облако"}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[12.5px] leading-relaxed text-dim">
                {local.length
                  ? `${local.length} локальн. модели работают без интернета. Облачные включаются только по выбору.`
                  : "Локальные модели работают без интернета. Облачные включаются только по выбору."}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button to="/app/scan">
                  <ScanSearch className="h-4 w-4" /> Попробовать анализ кода
                </Button>
                <Button to="/app/mentor" variant="ghost">
                  <Bot className="h-4 w-4" /> Наставник
                </Button>
              </div>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Value() {
  const cards = [
    { who: "Стартапам", icon: Building2, t: "Доступная проверка безопасности и время исправить проблемы до того, как они станут инцидентом." },
    { who: "Специалистам", icon: GraduationCap, t: "Практика на реальных проектах, подтверждённая репутация и путь к оплачиваемым заданиям." },
    { who: "Компаниям", icon: ShieldCheck, t: "Возможность находить специалистов с подтверждёнными результатами работы." },
  ];
  return (
    <section id="value" className="relative isolate scroll-mt-16 overflow-hidden py-28">
      <img src={asset("img/bg-5.jpg")} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-70" />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <Eyebrow className="mb-5">Ценность</Eyebrow>
          <h2 className="font-display text-[34px] leading-tight sm:text-[46px]">Выигрывает каждая сторона</h2>
        </Reveal>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal key={c.who} delay={i * 110}>
              <Card className="h-full p-8 transition hover:border-acc/40">
                <c.icon className="h-6 w-6 text-acc" />
                <div className="mt-5 font-display text-2xl text-text">{c.who}</div>
                <p className="mt-3 text-[15.5px] leading-relaxed text-mute">{c.t}</p>
              </Card>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <blockquote className="mx-auto mt-16 max-w-4xl text-center font-display text-[24px] leading-snug text-text sm:text-[32px]">
            Мы создаём не просто площадку для поиска уязвимостей.{" "}
            <span className="text-acc">Мы создаём путь от обучения к реальному профессиональному опыту.</span>
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}

function Plan() {
  const money = ["Комиссия с оплачиваемых заданий", "Корпоративные проекты и заказы", "Инструменты и тарифы для компаний"];
  const stages = [
    { h: "Прототип", t: "интерфейс платформы и ИИ-модули на локальных моделях — этот сайт", now: true },
    { h: "Запуск MVP", t: "первые стартапы и специалисты" },
    { h: "Репутация и проверка", t: "система рейтинга и подтверждения находок" },
    { h: "Корпоративный рынок", t: "компании-заказчики и расширение рынка" },
  ];
  return (
    <section id="plan" className="relative isolate scroll-mt-16 overflow-hidden py-28">
      <img src={asset("img/bg-6.jpg")} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-right opacity-70" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/90 to-ink/30" />
      <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-2">
        <Reveal>
          <Eyebrow className="mb-5">Как будем зарабатывать</Eyebrow>
          <h2 className="font-display text-[34px] leading-tight sm:text-[42px]">Бизнес-модель</h2>
          <ul className="mt-9 space-y-4">
            {money.map((m) => (
              <li key={m} className="flex items-center gap-4 text-lg text-text">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-acc shadow-[0_0_12px_rgb(56_217_255)]" />
                {m}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={120}>
          <Eyebrow className="mb-5">План развития</Eyebrow>
          <h2 className="font-display text-[34px] leading-tight sm:text-[42px]">Куда растём</h2>
          <ol className="relative mt-9 space-y-6 border-l border-line pl-8">
            {stages.map((s, i) => (
              <li key={s.h} className="relative">
                <span
                  className={clsx(
                    "absolute top-0.5 -left-[45px] flex h-7 w-7 items-center justify-center rounded-full border font-mono text-xs",
                    s.now ? "border-acc bg-acc text-ink" : "border-line2 bg-ink text-mute",
                  )}
                >
                  {i}
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="font-display text-xl text-text">{s.h}</span>
                  {s.now ? <Badge tone="acc">сейчас</Badge> : <Badge>план</Badge>}
                </div>
                <p className="mt-1 text-[15px] text-mute">{s.t}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

function Finale() {
  return (
    <section className="relative isolate overflow-hidden pt-32 pb-40">
      <img src={asset("img/bg-7.jpg")} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-bottom" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink via-ink/60 to-transparent" />
      <div className="mx-auto max-w-5xl px-5 text-center sm:px-8">
        <Reveal>
          <p className="font-display text-[26px] leading-snug text-text sm:text-[38px]">
            Создавать технологии — значит двигать мир вперёд.{" "}
            <span className="text-acc">Делать их безопаснее — значит позволять ему двигаться дальше.</span>
          </p>
        </Reveal>
        <Reveal delay={150}>
          <div className="mt-14 font-display text-[44px] tracking-[0.02em] text-text sm:text-[64px]">FortEra</div>
          <div className="font-light-d mt-2 text-xl text-mute sm:text-2xl">Безопасность каждой идее.</div>
        </Reveal>
        <Reveal delay={250}>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button to="/app" size="lg">
              Открыть платформу <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="bg-ink">
      <Nav />
      <Hero />
      <Problem />
      <Sides />
      <How />
      <AiSection />
      <Value />
      <Plan />
      <Finale />
      <footer className="border-t border-line py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 text-[13px] text-dim sm:flex-row sm:items-center sm:px-8">
          <Logo small />
          <span className="sm:ml-6">Прототип · 2026</span>
          <span className="sm:ml-auto sm:max-w-xl sm:text-right">
            Проверки — только с разрешения владельца и в заданных границах. Абсолютной безопасности не бывает: мы помогаем находить проблемы раньше.
          </span>
        </div>
      </footer>
    </div>
  );
}
