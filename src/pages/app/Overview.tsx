import { ArrowRight, Bot, FilePlus2, Inbox, ScanSearch, Send, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { ModelPicker } from "../../components/ai";
import { Badge, Button, Card, DemoTag, Eyebrow, PageHead, Sev, fmtDate } from "../../components/ui";
import { STATUS_LABEL, levelOf } from "../../data";
import { useStore } from "../../store";

function Action({ to, icon: Icon, title, text }: { to: string; icon: typeof Inbox; title: string; text: string }) {
  return (
    <Link to={to} className="group rounded-2xl border border-line bg-panel/70 p-5 transition hover:-translate-y-0.5 hover:border-acc/50">
      <Icon className="h-5 w-5 text-acc" />
      <div className="mt-4 flex items-center gap-1.5 font-medium text-text">
        {title} <ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-mute">{text}</p>
    </Link>
  );
}

function StartupView() {
  const { projects, reports } = useStore();
  const fresh = reports.filter((r) => r.status === "new");
  return (
    <>
      <PageHead eyebrow="Кабинет стартапа" title="Безопасность без отдельного отдела" sub="Разместите проект, задайте границы — специалисты проверят разрешённую копию, а ИИ поможет разобраться в отчётах." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Action to="/app/new" icon={FilePlus2} title="Разместить проект" text="Описание, границы проверки и разрешение — за 4 шага. Черновик границ предложит ИИ." />
        <Action to="/app/scan" icon={ScanSearch} title="ИИ-анализ кода" text="Локальные модели и правила покажут, где специалисту смотреть в первую очередь." />
        <Action to="/app/inbox" icon={Inbox} title={`Отчёты${fresh.length ? ` · ${fresh.length} новых` : ""}`} text="Каждый отчёт ИИ объяснит простым языком и подскажет, как исправить." />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <Eyebrow>Последние отчёты</Eyebrow>
            <Link to="/app/inbox" className="text-xs text-mute hover:text-acc">
              Все →
            </Link>
          </div>
          <div className="divide-y divide-line">
            {reports.slice(0, 5).map((r) => (
              <Link key={r.id} to={`/app/inbox?id=${r.id}`} className="flex items-center gap-3 py-3 transition hover:bg-white/[0.02]">
                <Sev s={r.severity} />
                <span className="min-w-0 flex-1 truncate text-sm text-text">{r.title}</span>
                {!r.mine && <DemoTag />}
                <Badge tone={r.status === "new" ? "acc" : r.status === "confirmed" ? "warn" : r.status === "fixed" ? "ok" : "line"}>{STATUS_LABEL[r.status]}</Badge>
              </Link>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <Eyebrow>Проекты на проверке</Eyebrow>
            <span className="text-xs text-dim">{projects.length}</span>
          </div>
          <div className="space-y-2.5">
            {projects.slice(0, 4).map((p) => (
              <Link key={p.id} to={`/app/programs/${p.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-ink2 px-3.5 py-3 transition hover:border-acc/40">
                <ShieldCheck className="h-4 w-4 text-acc" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text">{p.name}</span>
                  <span className="block text-xs text-dim">
                    {p.kind} · с {fmtDate(p.createdAt)}
                  </span>
                </span>
                {p.demo && <DemoTag />}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function SpecialistView() {
  const { points, projects, reports } = useStore();
  const lv = levelOf(points);
  const mine = reports.filter((r) => r.mine);
  return (
    <>
      <PageHead eyebrow="Кабинет специалиста" title="Практика, которая засчитывается" sub="Выбирайте проекты по уровню, проверяйте разрешённые копии и получайте репутацию за подтверждённые находки." />
      <Card className="relative overflow-hidden p-6" glow>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-dim">Ваш уровень</div>
            <div className="font-display text-3xl text-acc">{lv.cur.name}</div>
          </div>
          <div className="min-w-[220px] flex-1">
            <div className="mb-1.5 flex justify-between text-xs text-mute">
              <span>{points} очков репутации</span>
              <span>{lv.next ? `до «${lv.next.name}» — ${lv.next.from - points}` : "максимальный уровень"}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink">
              <div className="h-full rounded-full bg-acc transition-all duration-700" style={{ width: `${Math.max(3, lv.progress * 100)}%` }} />
            </div>
          </div>
          <Button to="/app/profile" variant="ghost">
            Мой путь
          </Button>
        </div>
      </Card>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Action to="/app/programs" icon={ShieldCheck} title={`Программы · ${projects.length}`} text="Проекты, владельцы которых разрешили проверку. Границы и правила — в карточке." />
        <Action to="/app/report" icon={Send} title="Отправить находку" text="ИИ проверит отчёт перед отправкой: шаги, доказательства, оценку серьёзности." />
        <Action to="/app/mentor" icon={Bot} title="ИИ-наставник" text="Спросите про любую уязвимость или как написать хороший отчёт." />
      </div>
      <Card className="mt-6 p-6">
        <Eyebrow className="mb-4">Мои отчёты</Eyebrow>
        {mine.length ? (
          <div className="divide-y divide-line">
            {mine.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-3">
                <Sev s={r.severity} />
                <span className="min-w-0 flex-1 truncate text-sm">{r.title}</span>
                <Badge tone={r.status === "confirmed" || r.status === "fixed" ? "ok" : r.status === "new" ? "acc" : "line"}>{STATUS_LABEL[r.status]}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-dim">
            Пока пусто. Выберите программу и отправьте первую находку — после подтверждения владельцем она принесёт репутацию.
          </p>
        )}
      </Card>
    </>
  );
}

export default function Overview() {
  const { role } = useStore();
  return (
    <div>
      {role === "startup" ? <StartupView /> : <SpecialistView />}
      <Card className="mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <Eyebrow>ИИ-модели для анализа</Eyebrow>
          <Link to="/app/ai" className="text-xs text-mute hover:text-acc">
            Подробнее →
          </Link>
        </div>
        <ModelPicker compact />
      </Card>
    </div>
  );
}
