import clsx from "clsx";
import { Ban, Check, CircleCheck, Crosshair, ExternalLink, Lock, Send, ShieldCheck, Target, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Card, DemoTag, Eyebrow, PageHead, fmtDate } from "../../components/ui";
import { LEVELS, type Project } from "../../data";
import { useStore } from "../../store";

function List({ title, items, icon: Icon, tone }: { title: string; items: string[]; icon: typeof Check; tone: string }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-dim">{title}</div>
      <ul className="space-y-1.5">
        {items.map((t) => (
          <li key={t} className="flex gap-2 text-[13.5px] text-mute">
            <Icon className={clsx("mt-0.5 h-4 w-4 shrink-0", tone)} />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Detail({ p, onClose }: { p: Project; onClose: () => void }) {
  const nav = useNavigate();
  const { reports } = useStore();
  const count = reports.filter((r) => r.projectId === p.id).length;
  return (
    <Card className="p-7" glow>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl">{p.name}</h2>
            {p.demo && <DemoTag />}
          </div>
          <p className="mt-1 text-sm text-mute">{p.description}</p>
        </div>
        <button onClick={onClose} className="text-dim hover:text-text" aria-label="Закрыть">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Badge tone="ok">
          <Lock className="h-3 w-3" /> Разрешение владельца подтверждено
        </Badge>
        <Badge>{p.kind}</Badge>
        <Badge>{p.stack}</Badge>
        <Badge tone="acc">Уровень: {p.level}</Badge>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <List title="Что проверять" items={p.scope.inScope} icon={Target} tone="text-acc" />
        <List title="Не трогать" items={p.scope.outOfScope} icon={Ban} tone="text-crit" />
        <List title="Разрешено" items={p.scope.allowed} icon={Check} tone="text-low" />
        <List title="Запрещено" items={p.scope.forbidden} icon={X} tone="text-crit" />
      </div>
      {p.scope.focus.length > 0 && (
        <div className="mt-6 rounded-xl border border-acc/25 bg-acc/[0.05] p-4">
          <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-acc">
            <Crosshair className="h-4 w-4" /> Где владелец просит посмотреть внимательнее
          </div>
          <p className="text-[13.5px] text-mute">{p.scope.focus.join(" · ")}</p>
        </div>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5 text-[13px] text-mute">
        <span>
          Тестовая копия: <span className="font-mono text-text">{p.url}</span>
        </span>
        <span>·</span>
        <span>Вознаграждение: {p.reward}</span>
        <span>·</span>
        <span>Отчётов: {count}</span>
        <Button className="ml-auto" onClick={() => nav(`/app/report?project=${p.id}`)}>
          <Send className="h-4 w-4" /> Отправить находку
        </Button>
      </div>
    </Card>
  );
}

export default function Programs() {
  const { id } = useParams();
  const nav = useNavigate();
  const { projects } = useStore();
  const open = projects.find((p) => p.id === id);

  return (
    <div>
      <PageHead
        eyebrow="Программы проверки"
        title="Проекты, которые разрешили проверку"
        sub="Каждый проект размещён владельцем с подтверждённым разрешением и чёткими границами. Проверяется только тестовая копия."
        right={
          <Button to="/app/new" variant="ghost">
            + Разместить свой
          </Button>
        }
      />
      {open && (
        <div className="mb-8">
          <Detail p={open} onClose={() => nav("/app/programs")} />
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => nav(`/app/programs/${p.id}`)}
            className={clsx(
              "group flex flex-col rounded-2xl border bg-panel/70 p-5 text-left transition hover:-translate-y-0.5",
              p.id === id ? "border-acc/60" : "border-line hover:border-acc/40",
            )}
          >
            <div className="flex w-full items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-acc" />
              <span className="font-display text-lg text-text">{p.name}</span>
              <span className="ml-auto">{p.demo ? <DemoTag /> : <Badge tone="acc">ваш</Badge>}</span>
            </div>
            <p className="mt-2 line-clamp-2 flex-1 text-[13.5px] text-mute">{p.description}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge>{p.kind}</Badge>
              <Badge tone={p.level === "Новичок" ? "ok" : "warn"}>{p.level}</Badge>
            </div>
            <div className="mt-4 flex w-full items-center gap-2 border-t border-line pt-3 text-xs text-dim">
              <CircleCheck className="h-3.5 w-3.5 text-low" /> разрешение
              <span className="ml-auto">{fmtDate(p.createdAt)}</span>
            </div>
          </button>
        ))}
      </div>
      <Card className="mt-8 p-6">
        <Eyebrow className="mb-4">Уровни доступа</Eyebrow>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LEVELS.map((l, i) => (
            <div key={l.name} className="rounded-xl border border-line bg-ink2 p-4">
              <div className="flex items-baseline gap-2">
                <span className="font-cond text-2xl text-acc">0{i + 1}</span>
                <span className="font-medium text-text">{l.name}</span>
              </div>
              <div className="mt-1 text-xs text-dim">от {l.from} очков</div>
              <p className="mt-2 text-[13px] text-mute">{l.opens}</p>
            </div>
          ))}
        </div>
        <a href="https://owasp.org/www-project-top-ten/" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs text-dim hover:text-acc">
          Категории находок опираются на OWASP Top 10 <ExternalLink className="h-3 w-3" />
        </a>
      </Card>
    </div>
  );
}
