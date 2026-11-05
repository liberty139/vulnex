import clsx from "clsx";
import { Check, Cloud, Cpu, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { LIVE, describe, type Progress } from "../ai/ollama";
import { useStore } from "../store";
import { Badge, fmtMs } from "./ui";

/** Ollama status as a small pill for the top bar. */
export function OllamaPill() {
  const { ollama, models } = useStore();
  if (!ollama)
    return (
      <Badge>
        <Loader2 className="h-3 w-3 animate-spin" /> ИИ: проверяю
      </Badge>
    );
  if (!ollama.online)
    return (
      <Badge tone="crit">
        <TriangleAlert className="h-3 w-3" /> {LIVE ? "ИИ просыпается…" : "Ollama не запущена"}
      </Badge>
    );
  const local = models.filter((m) => describe(m).local).length;
  return (
    <Badge tone="acc">
      <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-acc" />
      ИИ готов · {local ? `${local} локальн.` : "облако"}
    </Badge>
  );
}

/** Pick which models take part. Local models are first and on by default. */
export function ModelPicker({ compact = false, single = false }: { compact?: boolean; single?: boolean }) {
  const { ollama, models, setModels, refreshOllama } = useStore();
  const [busy, setBusy] = useState(false);

  if (!ollama) return <div className="shimmer h-24 rounded-xl border border-line bg-panel" />;
  if (!ollama.online)
    return (
      <div className="rounded-xl border border-crit/30 bg-crit/5 p-4 text-sm">
        <div className="mb-1 flex items-center gap-2 font-medium text-crit">
          <TriangleAlert className="h-4 w-4" /> {LIVE ? "ИИ-сервер ещё не ответил" : "Ollama не запущена"}
        </div>
        {LIVE ? (
          <p className="text-mute">
            ИИ-сервер Fortera просыпается — бесплатный хостинг засыпает без посетителей. Подождите 30–60 секунд и нажмите «Проверить снова». Правила
            (без ИИ) работают и так.
          </p>
        ) : (
          <p className="text-mute">
            ИИ-модули работают через Ollama на этом компьютере. Запустите сайт файлом <b className="text-text">ЗАПУСК.bat</b> — он поднимет
            Ollama сам, или выполните <code className="rounded bg-ink px-1.5 py-0.5 font-mono text-xs text-acc">ollama serve</code>. Правила
            (без ИИ) работают и так.
          </p>
        )}
        <button
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-acc hover:underline"
          onClick={async () => {
            setBusy(true);
            await refreshOllama();
            setBusy(false);
          }}
        >
          <RefreshCw className={clsx("h-3.5 w-3.5", busy && "animate-spin")} /> Проверить снова
        </button>
      </div>
    );

  // single mode picks the primary model (the first one) and keeps the rest of the council
  const toggle = (name: string) => {
    if (single) return setModels([name, ...models.filter((m) => m !== name)]);
    setModels(models.includes(name) ? models.filter((m) => m !== name) : [...models, name]);
  };
  const local = ollama.models.filter((m) => m.local);
  const cloud = ollama.models.filter((m) => !m.local);
  const anyCloud = models.some((m) => !describe(m).local);

  const row = (m: (typeof ollama.models)[number]) => {
    const on = single ? models[0] === m.name : models.includes(m.name);
    const loaded = ollama.loaded.includes(m.name);
    return (
      <button
        key={m.name}
        onClick={() => toggle(m.name)}
        className={clsx(
          "group flex w-full items-center gap-3 rounded-xl border px-3 text-left transition",
          compact ? "py-2" : "py-2.5",
          on ? "border-acc/50 bg-acc/[0.06]" : "border-line bg-ink2 hover:border-line2",
        )}
      >
        <span
          className={clsx(
            "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition",
            single && "rounded-full",
            on ? "border-acc bg-acc text-ink" : "border-line2",
          )}
        >
          {on && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-text">{m.label}</span>
            {loaded && <span className="rounded bg-acc/15 px-1.5 text-[10px] font-medium text-acc">в памяти</span>}
          </span>
          {!compact && <span className="block truncate text-xs text-dim">{m.vendor}</span>}
        </span>
        {m.local ? (
          <span className="flex items-center gap-1 text-[11px] text-low">
            <Cpu className="h-3.5 w-3.5" />
            {m.sizeGb ? `${m.sizeGb.toFixed(1)} ГБ` : "локально"}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-dim">
            <Cloud className="h-3.5 w-3.5" /> облако
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-wider text-dim">
          <span>Локальные — код не покидает компьютер</span>
        </div>
        <div className="space-y-1.5">{local.length ? local.map(row) : <p className="text-xs text-dim">Локальных моделей нет: ollama pull qwen2.5:7b</p>}</div>
      </div>
      {cloud.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] uppercase tracking-wider text-dim">Облачные · Ollama Cloud</div>
          <div className={clsx("space-y-1.5", compact && "max-h-40 overflow-y-auto pr-1")}>{cloud.map(row)}</div>
        </div>
      )}
      {anyCloud && (
        <p className="rounded-lg border border-med/30 bg-med/5 px-3 py-2 text-xs text-med">
          {LIVE ? "На сайте ИИ работает через Ollama Cloud — открытые модели в облаке. Для приватного кода есть локальная версия, где код не покидает компьютер." : "Облачная модель получит текст запроса. Для кода стартапа без согласия владельца оставляйте только локальные."}
        </p>
      )}
      {models.length === 0 && <p className="text-xs text-high">Выберите хотя бы одну модель.</p>}
    </div>
  );
}

export type RunState = Record<string, Progress>;

/** Live per-model progress: loading, tokens streamed, time, result. */
export function RunBoard({ runs }: { runs: RunState }) {
  const names = Object.keys(runs);
  if (!names.length) return null;
  return (
    <div className="space-y-1.5">
      {names.map((n) => {
        const p = runs[n];
        const m = describe(n);
        return (
          <div key={n} className={clsx("relative overflow-hidden rounded-lg border border-line bg-ink2 px-3 py-2", (p.phase === "load" || p.phase === "think") && "shimmer")}>
            <div className="flex items-center gap-2 text-[13px]">
              {m.local ? <Cpu className="h-3.5 w-3.5 text-low" /> : <Cloud className="h-3.5 w-3.5 text-dim" />}
              <span className="font-medium text-text">{m.label}</span>
              <span className="ml-auto font-mono text-xs text-mute">
                {p.phase === "wait" && "в очереди"}
                {p.phase === "load" && "загружает модель…"}
                {p.phase === "think" && `думает · ${p.tokens} ток. · ${fmtMs(p.ms)}`}
                {p.phase === "done" && <span className="text-low">готово · {fmtMs(p.ms)}</span>}
                {p.phase === "error" && <span className="text-crit">{p.text}</span>}
              </span>
            </div>
            {p.phase === "think" && p.text && (
              <div className="mt-1 truncate font-mono text-[11px] text-dim">{p.text.slice(-120).replace(/\s+/g, " ")}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
