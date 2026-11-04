import clsx from "clsx";
import { CircleCheck, CircleDashed, Lock, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { label, type Progress } from "../../ai/ollama";
import { reviewReport, type ReportReview } from "../../ai/tasks";
import { SEVERITIES, SEV_LABEL, type Severity } from "../../ai/types";
import { RunBoard } from "../../components/ai";
import { Button, Card, Eyebrow, Field, PageHead, Sev, inputCls } from "../../components/ui";
import { CATEGORIES } from "../../data";
import { uid, useStore } from "../../store";

export default function ReportPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { projects, models, ollama, addReport } = useStore();
  const [f, setF] = useState({
    projectId: params.get("project") ?? projects[0]?.id ?? "",
    title: "",
    category: CATEGORIES[0],
    severity: "medium" as Severity,
    steps: "",
    impact: "",
    evidence: "",
  });
  const [inScope, setInScope] = useState(false);
  const [run, setRun] = useState<Record<string, Progress>>({});
  const [review, setReview] = useState<ReportReview | null>(null);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  const project = projects.find((p) => p.id === f.projectId);
  const model = models[0];
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const ready = project && f.title.trim() && f.steps.trim().length > 10 && inScope;
  const thinking = model && (run[model]?.phase === "load" || run[model]?.phase === "think");

  async function check() {
    if (!project || !model) return;
    setErr("");
    setReview(null);
    setRun({ [model]: { phase: "wait", tokens: 0, ms: 0 } });
    const res = await reviewReport(
      model,
      { ...f, project: project.name, scope: project.scope.inScope.join("; ") },
      (p) => setRun({ [model]: p }),
    );
    if (res.ok && res.data) setReview({ ...res.data, checklist: (res.data.checklist ?? []).slice(0, 6) });
    else setErr(res.error ?? "не получилось");
  }

  function send() {
    if (!project) return;
    addReport({ id: `r-${uid()}`, ...f, author: "вы", mine: true, status: "new", createdAt: Date.now(), aiChecked: !!review });
    setSent(true);
  }

  if (sent)
    return (
      <Card className="mx-auto mt-10 max-w-xl p-10 text-center" glow>
        <CircleCheck className="mx-auto h-12 w-12 text-low" />
        <h2 className="mt-4 font-display text-2xl">Отчёт отправлен владельцу</h2>
        <p className="mt-2 text-mute">
          Когда владелец «{project?.name}» подтвердит находку, вы получите репутацию. Чтобы увидеть это в прототипе, переключитесь на роль «Стартап» и откройте
          «Отчёты».
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button to="/app/inbox">Открыть как владелец</Button>
          <Button variant="ghost" onClick={() => nav("/app/profile")}>
            Мой путь
          </Button>
        </div>
      </Card>
    );

  return (
    <div>
      <PageHead
        eyebrow="Специалисту"
        title="Отправить находку"
        sub="Хороший отчёт — половина репутации. ИИ проверит его перед отправкой и подскажет, чего не хватает, но решение и оценку принимает владелец."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="p-7">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Программа">
              <select className={inputCls} value={f.projectId} onChange={set("projectId")}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.demo ? " (демо)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Категория">
              <select className={inputCls} value={f.category} onChange={set("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Заголовок">
                <input className={inputCls} value={f.title} onChange={set("title")} placeholder="Коротко: что не так и где" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Шаги воспроизведения" hint="Нумерованный список: что сделать в тестовой копии, чтобы увидеть проблему">
                <textarea className={clsx(inputCls, "min-h-28 font-mono text-[13px]")} value={f.steps} onChange={set("steps")} placeholder={"1. Войти тестовым пользователем A\n2. …\n3. …"} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Влияние" hint="Что может случиться с данными, пользователями или бизнесом">
                <textarea className={clsx(inputCls, "min-h-20")} value={f.impact} onChange={set("impact")} />
              </Field>
            </div>
            <Field label="Доказательства" hint="Скриншоты, запросы, тестовые аккаунты">
              <input className={inputCls} value={f.evidence} onChange={set("evidence")} />
            </Field>
            <Field label="Ваша оценка серьёзности">
              <select className={inputCls} value={f.severity} onChange={set("severity")}>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {SEV_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {project && (
            <label className={clsx("mt-6 flex cursor-pointer items-start gap-3 rounded-xl border p-4", inScope ? "border-low/40 bg-low/[0.05]" : "border-line bg-ink2")}>
              <input type="checkbox" checked={inScope} onChange={(e) => setInScope(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#38D9FF]" />
              <span className="text-[13.5px] text-text">
                <Lock className="mr-1 inline h-3.5 w-3.5 text-acc" />
                Я проверял только тестовую копию и только в границах программы: {project.scope.inScope.join(", ")}.
              </span>
            </label>
          )}
          <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5">
            <Button variant="ghost" onClick={check} disabled={!project || !f.title.trim() || !model || !ollama?.online || !!thinking}>
              <Sparkles className="h-4 w-4" /> Проверить с ИИ
            </Button>
            <Button className="ml-auto" onClick={send} disabled={!ready}>
              <Send className="h-4 w-4" /> Отправить владельцу
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <Eyebrow className="mb-3">Проверка отчёта ИИ</Eyebrow>
            {!Object.keys(run).length && !review && (
              <p className="text-[13.5px] leading-relaxed text-mute">
                Заполните заголовок и шаги, затем нажмите «Проверить с ИИ». {model ? `Модель: ${label(model)}.` : ""}
              </p>
            )}
            <RunBoard runs={run} />
            {err && <p className="mt-2 text-sm text-crit">{err}</p>}
            {review && (
              <div className="mt-4 space-y-4">
                <ul className="space-y-2">
                  {review.checklist.map((c, i) => (
                    <li key={i} className="flex gap-2.5 text-[13px]">
                      {c.ok ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-low" /> : <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-med" />}
                      <span>
                        <span className="font-medium text-text">{c.item}</span>
                        <span className="block text-mute">{c.hint}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="rounded-xl border border-line bg-ink2 p-3.5">
                  <div className="mb-1.5 flex items-center gap-2 text-xs text-dim">
                    Оценка ИИ <Sev s={review.severity} />
                    {review.severity !== f.severity && (
                      <button className="ml-auto text-acc hover:underline" onClick={() => setF({ ...f, severity: review.severity })}>
                        принять
                      </button>
                    )}
                  </div>
                  <p className="text-[13px] text-mute">{review.severityWhy}</p>
                </div>
                {review.title && review.title !== f.title && (
                  <div className="rounded-xl border border-line bg-ink2 p-3.5">
                    <div className="mb-1 flex items-center text-xs text-dim">
                      Заголовок получше
                      <button className="ml-auto text-acc hover:underline" onClick={() => setF({ ...f, title: review.title })}>
                        заменить
                      </button>
                    </div>
                    <p className="text-[13.5px] text-text">{review.title}</p>
                  </div>
                )}
                <div className="rounded-xl border border-acc/25 bg-acc/[0.05] p-3.5">
                  <div className="mb-1 text-xs text-acc">Так владелец поймёт суть</div>
                  <p className="text-[13px] leading-relaxed text-mute">{review.ownerSummary}</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
