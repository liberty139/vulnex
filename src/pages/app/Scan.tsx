import clsx from "clsx";
import { Cpu, FileCode2, Play, ShieldAlert, Square, Wand2, Wrench } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { describe, label, type Progress } from "../../ai/ollama";
import { merge, scanRules, scanWithModel } from "../../ai/tasks";
import type { CodeFinding, MergedFinding, Severity } from "../../ai/types";
import { ModelPicker, RunBoard, type RunState } from "../../components/ai";
import { Badge, Button, Card, Empty, Eyebrow, PageHead, SEV_DOT, Sev, fmtMs, inputCls } from "../../components/ui";
import { SAMPLES } from "../../data";
import { useStore } from "../../store";

const LH = 20.8; // 13px * 1.6
const PAD = 14;
const BAND: Record<Severity, string> = {
  critical: "bg-crit/15 border-crit",
  high: "bg-high/12 border-high",
  medium: "bg-med/10 border-med",
  low: "bg-low/10 border-low",
};
const LANGS = ["PHP", "JavaScript (Node.js)", "Python (Flask)", "Python", "TypeScript", "Java", "Go", "C#", "Другой"];

function Editor({ code, setCode, findings, focus }: { code: string; setCode: (s: string) => void; findings: MergedFinding[]; focus: number | null }) {
  const lines = code.split("\n");
  const byLine = new Map<number, Severity>();
  for (const f of findings) if (!byLine.has(f.line)) byLine.set(f.line, f.severity);
  return (
    <div className="relative max-h-[560px] overflow-auto rounded-xl border border-line bg-ink" id="code-scroll">
      <div className="relative flex min-w-max" style={{ minHeight: lines.length * LH + PAD * 2 }}>
        <div className="code-area sticky left-0 z-10 shrink-0 select-none border-r border-line bg-ink2 px-3 text-right text-dim" style={{ paddingTop: PAD, paddingBottom: PAD }}>
          {lines.map((_, i) => (
            <div key={i} className="flex items-center justify-end gap-1.5" style={{ height: LH }}>
              {byLine.has(i + 1) && <span className={clsx("h-1.5 w-1.5 rounded-full", SEV_DOT[byLine.get(i + 1)!])} />}
              {i + 1}
            </div>
          ))}
        </div>
        <div className="relative flex-1">
          {[...byLine.entries()].map(([ln, s]) => (
            <div
              key={ln}
              className={clsx("pointer-events-none absolute inset-x-0 border-l-2 transition-all", BAND[s], focus === ln && "ring-1 ring-acc")}
              style={{ top: PAD + (ln - 1) * LH, height: LH }}
            />
          ))}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            wrap="off"
            spellCheck={false}
            className="code-area relative block w-full min-w-[640px] resize-none overflow-hidden bg-transparent px-4 text-[#d6dde6] outline-none"
            style={{ height: lines.length * LH + PAD * 2, paddingTop: PAD, paddingBottom: PAD }}
          />
        </div>
      </div>
    </div>
  );
}

function SourceChips({ f }: { f: MergedFinding }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {f.sources.map((s) => (
        <span key={s} className="inline-flex items-center gap-1 rounded-md border border-line bg-ink2 px-1.5 py-0.5 text-[11px] text-mute">
          {s === "rules" ? <Wand2 className="h-3 w-3" /> : <Cpu className={clsx("h-3 w-3", describe(s).local ? "text-low" : "text-dim")} />}
          {s === "rules" ? "Правила" : label(s)}
        </span>
      ))}
    </div>
  );
}

export default function Scan() {
  const { models, ollama } = useStore();
  const [sample, setSample] = useState(SAMPLES[2].id);
  const [code, setCode] = useState(SAMPLES[2].code);
  const [lang, setLang] = useState(SAMPLES[2].lang);
  const [rules, setRules] = useState<CodeFinding[] | null>(null);
  const [answers, setAnswers] = useState<{ model: string; findings: CodeFinding[]; summary: string; ms: number }[]>([]);
  const [runs, setRuns] = useState<RunState>({});
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState<number | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const merged = useMemo(() => (rules ? merge(rules, answers) : []), [rules, answers]);
  const aiCount = answers.length;

  function pick(id: string) {
    const s = SAMPLES.find((x) => x.id === id)!;
    setSample(id);
    setCode(s.code);
    setLang(s.lang);
    setRules(null);
    setAnswers([]);
    setRuns({});
  }

  async function run() {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setBusy(true);
    setAnswers([]);
    setRules(scanRules(code));
    const chosen = ollama?.online ? models : [];
    setRuns(Object.fromEntries(chosen.map((m) => [m, { phase: "wait", tokens: 0, ms: 0 } as Progress])));

    const one = async (m: string) => {
      const res = await scanWithModel(m, code, lang, (p) => setRuns((r) => ({ ...r, [m]: p })), c.signal);
      if (res.ok && res.data) setAnswers((a) => [...a, { model: m, findings: res.data!.findings, summary: res.data!.summary, ms: res.ms }]);
    };
    // local models share one CPU: run them one after another; cloud ones in parallel
    const local = chosen.filter((m) => describe(m).local);
    const cloud = chosen.filter((m) => !describe(m).local);
    await Promise.all([
      (async () => {
        for (const m of local) if (!c.signal.aborted) await one(m);
      })(),
      ...cloud.map(one),
    ]);
    setBusy(false);
  }

  function stop() {
    ctrl.current?.abort();
    setBusy(false);
  }

  function jump(line: number) {
    setFocus(line);
    const el = document.getElementById("code-scroll");
    el?.scrollTo({ top: Math.max(0, (line - 4) * LH), behavior: "smooth" });
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const s = SAMPLES.find((x) => x.id === sample);
  const totalSources = (rules ? 1 : 0) + aiCount;

  return (
    <div>
      <PageHead
        eyebrow="Стартапу и специалисту"
        title="ИИ-анализ кода"
        sub="Правила и несколько ИИ-моделей независимо читают код и отмечают места, которые специалист должен проверить первым. Это гипотезы, а не вердикт: подтверждает человек."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs uppercase tracking-wider text-dim">Учебные примеры:</span>
        {SAMPLES.map((x) => (
          <button
            key={x.id}
            onClick={() => pick(x.id)}
            className={clsx("rounded-full border px-3 py-1 text-[13px] transition", sample === x.id ? "border-acc bg-acc/10 text-acc" : "border-line text-mute hover:text-text")}
          >
            {x.label}
          </button>
        ))}
        <button
          onClick={() => {
            setSample("own");
            setCode("");
            setLang("Другой");
            setRules(null);
            setAnswers([]);
            setRuns({});
          }}
          className={clsx("rounded-full border border-dashed px-3 py-1 text-[13px] transition", sample === "own" ? "border-acc text-acc" : "border-line text-dim hover:text-text")}
        >
          Свой код
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-3 text-xs text-dim">
            <FileCode2 className="h-4 w-4" />
            {s && code === s.code ? s.hint : "Вставьте фрагмент кода своего проекта"}
            <select value={lang} onChange={(e) => setLang(e.target.value)} className={clsx(inputCls, "ml-auto w-auto py-1 text-xs")}>
              {LANGS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <Editor code={code} setCode={setCode} findings={merged} focus={focus} />
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <Eyebrow className="mb-3">Модели консилиума</Eyebrow>
            <ModelPicker compact />
            <div className="mt-4 flex gap-2">
              {busy ? (
                <Button variant="danger" className="flex-1" onClick={stop}>
                  <Square className="h-4 w-4" /> Остановить
                </Button>
              ) : (
                <Button className="flex-1" onClick={run} disabled={!code.trim()}>
                  <Play className="h-4 w-4" /> Запустить анализ
                </Button>
              )}
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-dim">
              Локальная модель на процессоре ноутбука отвечает за 30–90 секунд. Правила срабатывают мгновенно.
            </p>
          </Card>
          {(rules || busy) && (
            <Card className="p-5">
              <Eyebrow className="mb-3">Ход анализа</Eyebrow>
              <div className="mb-1.5 flex items-center gap-2 rounded-lg border border-line bg-ink2 px-3 py-2 text-[13px]">
                <Wand2 className="h-3.5 w-3.5 text-acc" />
                <span className="font-medium">Правила</span>
                <span className="ml-auto font-mono text-xs text-low">{rules ? `${rules.length} совпад. · мгновенно` : "…"}</span>
              </div>
              <RunBoard runs={runs} />
            </Card>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl">Находки для проверки</h2>
          {rules && <Badge tone="acc">{merged.length}</Badge>}
          {merged.length > 0 && (
            <div className="ml-auto flex gap-1.5">
              {(["critical", "high", "medium", "low"] as Severity[]).map((sv) => {
                const n = merged.filter((f) => f.severity === sv).length;
                return n ? (
                  <span key={sv} className="flex items-center gap-1 text-xs text-mute">
                    <span className={clsx("h-2 w-2 rounded-full", SEV_DOT[sv])} />
                    {n}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>

        {!rules ? (
          <Empty>Выберите пример или вставьте свой код и нажмите «Запустить анализ».</Empty>
        ) : merged.length === 0 && !busy ? (
          <Empty>Ни правила, ни модели ничего не отметили. Это не гарантия безопасности — только отсутствие явных сигналов.</Empty>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {merged.map((f) => (
              <button
                key={f.key}
                onClick={() => jump(f.line)}
                className={clsx("rounded-2xl border bg-panel/70 p-5 text-left transition hover:border-acc/50", focus === f.line ? "border-acc/60" : "border-line")}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Sev s={f.severity} />
                  <span className="font-mono text-xs text-dim">строка {f.line}</span>
                  <span className="font-mono text-xs text-dim">· {f.cwe}</span>
                  {f.sources.length > 1 && totalSources > 1 && (
                    <Badge tone="acc" className="ml-auto">
                      совпало: {f.sources.length} из {totalSources}
                    </Badge>
                  )}
                </div>
                <div className="mt-2.5 text-[15.5px] font-medium text-text">{f.title}</div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-mute">
                  <ShieldAlert className="mr-1.5 inline h-3.5 w-3.5 text-high" />
                  {f.why}
                </p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-mute">
                  <Wrench className="mr-1.5 inline h-3.5 w-3.5 text-low" />
                  {f.fix}
                </p>
                <div className="mt-3">
                  <SourceChips f={f} />
                </div>
              </button>
            ))}
            {busy && <div className="shimmer h-40 rounded-2xl border border-line bg-panel/50" />}
          </div>
        )}

        {answers.length > 0 && (
          <Card className="mt-6 p-5">
            <Eyebrow className="mb-3">Общее мнение моделей</Eyebrow>
            <div className="space-y-2.5">
              {answers.map((a) => (
                <div key={a.model} className="flex gap-3 text-sm">
                  <span className="w-32 shrink-0 font-medium text-text">{label(a.model)}</span>
                  <span className="flex-1 text-mute">{a.summary}</span>
                  <span className="font-mono text-xs text-dim">{fmtMs(a.ms)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
