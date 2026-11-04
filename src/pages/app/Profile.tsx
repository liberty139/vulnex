import clsx from "clsx";
import { Award, BookOpen, Briefcase, Check, Flag, Lock, RotateCcw } from "lucide-react";
import { SEVERITIES, SEV_POINTS } from "../../ai/types";
import { Badge, Button, Card, Eyebrow, PageHead, Sev, fmtDate } from "../../components/ui";
import { LEVELS, STATUS_LABEL, levelOf } from "../../data";
import { useStore } from "../../store";

const PATH = [
  { icon: BookOpen, t: "Обучение", d: "Курсы, CTF-задачи, учебные стенды" },
  { icon: Flag, t: "Первые проекты", d: "Простые программы стартапов с двойной проверкой отчётов" },
  { icon: Award, t: "Подтверждённая репутация", d: "Каждая находка подтверждена владельцем проекта" },
  { icon: Briefcase, t: "Профессиональный опыт", d: "Оплачиваемые задания и предложения от компаний" },
];

export default function Profile() {
  const { points, rep, reports, reset } = useStore();
  const lv = levelOf(points);
  const mine = reports.filter((r) => r.mine);
  const confirmed = mine.filter((r) => r.status === "confirmed" || r.status === "fixed");
  const skills = [...new Set(confirmed.map((r) => r.category))];

  return (
    <div>
      <PageHead
        eyebrow="Специалисту"
        title="Мой путь"
        sub="Путь от обучения к реальному профессиональному опыту. Репутация растёт только за находки, которые подтвердил владелец проекта."
        right={
          <Button
            variant="subtle"
            size="sm"
            onClick={() => {
              if (confirm("Сбросить все данные прототипа к исходным демо-данным?")) reset();
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Сбросить демо
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="p-7" glow>
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-acc/40 bg-acc/10 font-cond text-4xl text-acc">{points}</div>
            <div>
              <div className="text-xs uppercase tracking-wider text-dim">очков репутации</div>
              <div className="font-display text-3xl">{lv.cur.name}</div>
              <div className="mt-0.5 text-sm text-mute">{lv.cur.opens}</div>
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-1.5 flex justify-between text-xs text-mute">
              <span>{lv.cur.name}</span>
              <span>{lv.next ? `${lv.next.name} · ещё ${lv.next.from - points}` : "максимум"}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-ink">
              <div className="h-full rounded-full bg-gradient-to-r from-acc2 to-acc transition-all duration-700" style={{ width: `${Math.max(2, lv.progress * 100)}%` }} />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-line bg-ink2 p-3">
              <div className="font-cond text-2xl text-text">{mine.length}</div>
              <div className="text-[11px] text-dim">отправлено</div>
            </div>
            <div className="rounded-xl border border-line bg-ink2 p-3">
              <div className="font-cond text-2xl text-low">{confirmed.length}</div>
              <div className="text-[11px] text-dim">подтверждено</div>
            </div>
            <div className="rounded-xl border border-line bg-ink2 p-3">
              <div className="font-cond text-2xl text-text">{skills.length}</div>
              <div className="text-[11px] text-dim">навыков</div>
            </div>
          </div>
          {skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <Badge key={s} tone="acc">
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-7">
          <Eyebrow className="mb-5">Путь специалиста</Eyebrow>
          <ol className="relative space-y-5 border-l border-line pl-7">
            {PATH.map((p, i) => {
              const done = i === 0 || (i === 1 && mine.length > 0) || (i === 2 && confirmed.length > 0) || (i === 3 && lv.index >= 2);
              return (
                <li key={p.t} className="relative">
                  <span
                    className={clsx(
                      "absolute -left-[41px] flex h-7 w-7 items-center justify-center rounded-full border",
                      done ? "border-acc bg-acc text-ink" : "border-line2 bg-ink text-dim",
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <p.icon className="h-3.5 w-3.5" />}
                  </span>
                  <div className={clsx("font-medium", done ? "text-text" : "text-mute")}>{p.t}</div>
                  <div className="text-[13px] text-dim">{p.d}</div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-6">
          <Eyebrow className="mb-4">История репутации</Eyebrow>
          {rep.length ? (
            <div className="divide-y divide-line">
              {[...rep].reverse().map((e, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="font-mono text-low">+{e.points}</span>
                  <span className="min-w-0 flex-1 truncate text-mute">{e.why}</span>
                  <span className="text-xs text-dim">{fmtDate(e.at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-dim">Пока пусто. Отправьте находку, затем в роли «Стартап» подтвердите её во «Входящих отчётах».</p>
          )}
          {mine.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <div className="mb-2 text-xs uppercase tracking-wider text-dim">Мои отчёты</div>
              {mine.map((r) => (
                <div key={r.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <Sev s={r.severity} />
                  <span className="min-w-0 flex-1 truncate">{r.title}</span>
                  <Badge>{STATUS_LABEL[r.status]}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-6">
          <Eyebrow className="mb-4">Как растёт репутация</Eyebrow>
          <div className="space-y-2">
            {SEVERITIES.map((s) => (
              <div key={s} className="flex items-center justify-between rounded-lg border border-line bg-ink2 px-3 py-2">
                <Sev s={s} />
                <span className="font-mono text-sm text-text">+{SEV_POINTS[s]}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-1.5">
            {LEVELS.map((l) => (
              <div key={l.name} className="flex items-center gap-2 text-[13px]">
                <Lock className={clsx("h-3.5 w-3.5", points >= l.from ? "text-acc" : "text-dim")} />
                <span className={points >= l.from ? "text-text" : "text-mute"}>{l.name}</span>
                <span className="ml-auto text-dim">от {l.from}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11.5px] text-dim">В прототипе репутация хранится в этом браузере.</p>
        </Card>
      </div>
    </div>
  );
}
