import clsx from "clsx";
import { Check, CircleCheck, Lightbulb, ShieldAlert, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { label, type Progress } from "../../ai/ollama";
import { explainForOwner, type OwnerExplain } from "../../ai/tasks";
import { SEV_POINTS } from "../../ai/types";
import { RunBoard } from "../../components/ai";
import { Badge, Button, Card, DemoTag, Empty, Eyebrow, PageHead, Sev, fmtDate } from "../../components/ui";
import { STATUS_LABEL, type Report, type ReportStatus } from "../../data";
import { useStore } from "../../store";

const FILTERS: { k: ReportStatus | "all"; l: string }[] = [
  { k: "all", l: "Все" },
  { k: "new", l: "Новые" },
  { k: "confirmed", l: "Подтверждённые" },
  { k: "fixed", l: "Исправленные" },
];

const statusTone = (s: ReportStatus) => (s === "new" ? "acc" : s === "confirmed" ? "warn" : s === "fixed" ? "ok" : "line");

function Explain({ r }: { r: Report }) {
  const { models, projects, ollama } = useStore();
  const model = models[0];
  const [run, setRun] = useState<Record<string, Progress>>({});
  const [out, setOut] = useState<OwnerExplain | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    setRun({});
    setOut(null);
    setErr("");
  }, [r.id]);

  async function go() {
    if (!model) return;
    const p = projects.find((x) => x.id === r.projectId);
    setErr("");
    setRun({ [model]: { phase: "wait", tokens: 0, ms: 0 } });
    const res = await explainForOwner(model, { ...r, project: p?.name ?? "", scope: p?.scope.inScope.join("; ") ?? "" }, (pr) => setRun({ [model]: pr }));
    if (res.ok && res.data) setOut(res.data);
    else setErr(res.error ?? "не получилось");
  }
  const busy = model && (run[model]?.phase === "load" || run[model]?.phase === "think");

  return (
    <div className="mt-6 rounded-2xl border border-acc/25 bg-acc/[0.04] p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Sparkles className="h-5 w-5 text-acc" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-text">Объяснить простыми словами</div>
          <div className="text-xs text-mute">{model ? `${label(model)} переведёт отчёт для основателя и подскажет, как исправить` : "Выберите модель"}</div>
        </div>
        {!out && (
          <Button size="sm" onClick={go} disabled={!model || !ollama?.online || !!busy}>
            Объяснить
          </Button>
        )}
      </div>
      {!out && Object.keys(run).length > 0 && (
        <div className="mt-4">
          <RunBoard runs={run} />
        </div>
      )}
      {err && <p className="mt-3 text-sm text-crit">{err}</p>}
      {out && (
        <div className="mt-4 space-y-4 text-[14px]">
          <p className="leading-relaxed text-text">{out.plain}</p>
          <div className="flex gap-2.5 text-mute">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-high" />
            <span>{out.risk}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-dim">
            Срочность: <Badge tone="warn">{out.urgency}</Badge>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-dim">
              <Lightbulb className="h-3.5 w-3.5" /> Как исправить
            </div>
            <ol className="space-y-1.5">
              {out.steps.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-mute">
                  <span className="font-mono text-xs text-acc">{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <p className="text-[11.5px] text-dim">Объяснение подготовил ИИ. Детали исправления уточните у специалиста.</p>
        </div>
      )}
    </div>
  );
}

export default function Inbox() {
  const { reports, projects, setStatus } = useStore();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<ReportStatus | "all">("all");
  const list = reports.filter((r) => filter === "all" || r.status === filter);
  const selId = params.get("id") ?? list[0]?.id;
  const sel = reports.find((r) => r.id === selId);
  const proj = sel && projects.find((p) => p.id === sel.projectId);

  return (
    <div>
      <PageHead eyebrow="Стартапу" title="Отчёты специалистов" sub="Подтверждайте находки — так специалист получает репутацию, а вы видите, что исправить в первую очередь." />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <button
            key={x.k}
            onClick={() => setFilter(x.k)}
            className={clsx("rounded-full border px-3 py-1 text-[13px] transition", filter === x.k ? "border-acc bg-acc/10 text-acc" : "border-line text-mute hover:text-text")}
          >
            {x.l}
            <span className="ml-1.5 text-dim">{x.k === "all" ? reports.length : reports.filter((r) => r.status === x.k).length}</span>
          </button>
        ))}
      </div>
      {!list.length ? (
        <Empty>Отчётов с таким статусом нет.</Empty>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <div className="space-y-2">
            {list.map((r) => (
              <button
                key={r.id}
                onClick={() => setParams({ id: r.id })}
                className={clsx("w-full rounded-xl border p-4 text-left transition", r.id === selId ? "border-acc/60 bg-acc/[0.05]" : "border-line bg-panel/60 hover:border-line2")}
              >
                <div className="flex items-center gap-2">
                  <Sev s={r.severity} />
                  <Badge tone={statusTone(r.status)} className="ml-auto">
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </div>
                <div className="mt-2 line-clamp-2 text-[14px] font-medium text-text">{r.title}</div>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-dim">
                  {projects.find((p) => p.id === r.projectId)?.name} · @{r.author} · {fmtDate(r.createdAt)}
                  {!r.mine && <DemoTag />}
                </div>
              </button>
            ))}
          </div>
          {sel && (
            <Card className="p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Sev s={sel.severity} />
                <Badge>{sel.category}</Badge>
                <Badge tone={statusTone(sel.status)}>{STATUS_LABEL[sel.status]}</Badge>
                {sel.aiChecked && (
                  <Badge tone="acc">
                    <Sparkles className="h-3 w-3" /> проверен ИИ перед отправкой
                  </Badge>
                )}
                {!sel.mine && <DemoTag />}
              </div>
              <h2 className="mt-3 font-display text-2xl">{sel.title}</h2>
              <div className="mt-1 text-sm text-dim">
                {proj?.name} · автор @{sel.author} · {fmtDate(sel.createdAt)}
              </div>
              <div className="mt-6 space-y-5">
                <div>
                  <Eyebrow className="mb-2">Шаги воспроизведения</Eyebrow>
                  <pre className="whitespace-pre-wrap rounded-xl border border-line bg-ink2 p-4 font-mono text-[13px] leading-relaxed text-text">{sel.steps}</pre>
                </div>
                {sel.impact && (
                  <div>
                    <Eyebrow className="mb-2">Влияние</Eyebrow>
                    <p className="text-[14.5px] text-mute">{sel.impact}</p>
                  </div>
                )}
                {sel.evidence && (
                  <div>
                    <Eyebrow className="mb-2">Доказательства</Eyebrow>
                    <p className="text-[14.5px] text-mute">{sel.evidence}</p>
                  </div>
                )}
              </div>
              <Explain r={sel} />
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                {sel.status === "new" && (
                  <>
                    <Button onClick={() => setStatus(sel.id, "confirmed")}>
                      <Check className="h-4 w-4" /> Подтвердить находку
                    </Button>
                    <Button variant="danger" onClick={() => setStatus(sel.id, "rejected")}>
                      <X className="h-4 w-4" /> Отклонить
                    </Button>
                    <span className="text-xs text-dim">Подтверждение даст автору +{SEV_POINTS[sel.severity]} к репутации</span>
                  </>
                )}
                {sel.status === "confirmed" && (
                  <Button onClick={() => setStatus(sel.id, "fixed")}>
                    <CircleCheck className="h-4 w-4" /> Отметить исправленным
                  </Button>
                )}
                {sel.status === "fixed" && <span className="text-sm text-low">Исправлено. Специалист может перепроверить исправление.</span>}
                {sel.status === "rejected" && <span className="text-sm text-dim">Отклонено.</span>}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
