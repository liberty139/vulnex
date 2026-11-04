import { Cloud, Cpu, Gauge, HardDrive, RefreshCw, ShieldCheck, UserCheck, Zap } from "lucide-react";
import { useState } from "react";
import { describe, label, stream, warm } from "../../ai/ollama";
import { ModelPicker } from "../../components/ai";
import { Badge, Button, Card, Eyebrow, PageHead, fmtMs } from "../../components/ui";
import { useStore } from "../../store";

interface Bench {
  state: "run" | "done" | "error";
  tps?: number;
  ms?: number;
  text?: string;
}

const ROLES = [
  ["Черновик границ проверки", "Разместить проект → шаг 2"],
  ["Анализ кода консилиумом моделей", "ИИ-анализ кода"],
  ["Проверка отчёта перед отправкой", "Отправить находку"],
  ["Объяснение отчёта для основателя", "Отчёты → «Объяснить»"],
  ["Наставник для новичков", "ИИ-наставник"],
];

export default function Models() {
  const { ollama, models, refreshOllama } = useStore();
  const [bench, setBench] = useState<Record<string, Bench>>({});
  const [busy, setBusy] = useState(false);

  async function test(m: string) {
    setBench((b) => ({ ...b, [m]: { state: "run" } }));
    try {
      const out = await stream(m, [{ role: "user", content: "Одним предложением: зачем стартапу проверка безопасности?" }], { numPredict: 60, temperature: 0.3 });
      setBench((b) => ({ ...b, [m]: { state: "done", ms: out.ms, tps: out.tokens / (out.ms / 1000), text: out.text.trim() } }));
    } catch (e) {
      setBench((b) => ({ ...b, [m]: { state: "error", text: e instanceof Error ? e.message : String(e) } }));
    }
  }

  return (
    <div>
      <PageHead
        eyebrow="ИИ"
        title="Локальные модели"
        sub="FortEra работает с моделями через Ollama прямо на этом компьютере. Локальные модели не отправляют код стартапа в интернет — для проверки безопасности это принципиально."
        right={
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              setBusy(true);
              await refreshOllama();
              setBusy(false);
            }}
          >
            <RefreshCw className={busy ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Обновить
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <HardDrive className="h-5 w-5 text-acc" />
          <div className="mt-3 font-cond text-3xl">{ollama?.online ? ollama.models.filter((m) => m.local).length : "—"}</div>
          <div className="text-sm text-mute">локальных моделей</div>
        </Card>
        <Card className="p-5">
          <Cloud className="h-5 w-5 text-dim" />
          <div className="mt-3 font-cond text-3xl">{ollama?.online ? ollama.models.filter((m) => !m.local).length : "—"}</div>
          <div className="text-sm text-mute">облачных — по выбору</div>
        </Card>
        <Card className="p-5">
          <Zap className="h-5 w-5 text-acc" />
          <div className="mt-3 font-cond text-3xl">{ollama?.online ? ollama.loaded.length : "—"}</div>
          <div className="text-sm text-mute">сейчас в памяти</div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <Eyebrow>Кто участвует в анализе</Eyebrow>
            {ollama?.online && <Badge tone="acc">Ollama {ollama.version}</Badge>}
          </div>
          <ModelPicker />
          <p className="mt-4 text-xs leading-relaxed text-dim">
            Первая выбранная модель — основная: она пишет черновики границ, проверяет отчёты и отвечает в наставнике. В анализе кода участвуют все
            выбранные.
          </p>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <Eyebrow className="mb-4">Проверка скорости</Eyebrow>
            {!ollama?.online ? (
              <p className="text-sm text-dim">Ollama не запущена.</p>
            ) : (
              <div className="space-y-2.5">
                {models.map((m) => {
                  const b = bench[m];
                  return (
                    <div key={m} className="rounded-xl border border-line bg-ink2 p-3.5">
                      <div className="flex items-center gap-2">
                        {describe(m).local ? <Cpu className="h-4 w-4 text-low" /> : <Cloud className="h-4 w-4 text-dim" />}
                        <span className="text-sm font-medium">{label(m)}</span>
                        <div className="ml-auto flex gap-1.5">
                          {!ollama.loaded.includes(m) && describe(m).local && (
                            <Button size="sm" variant="subtle" onClick={() => void warm(m).then(refreshOllama)}>
                              Загрузить
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => test(m)} disabled={b?.state === "run"}>
                            <Gauge className="h-3.5 w-3.5" /> Тест
                          </Button>
                        </div>
                      </div>
                      {b?.state === "run" && <div className="shimmer mt-2 h-4 rounded bg-panel" />}
                      {b?.state === "done" && (
                        <div className="mt-2 text-xs">
                          <span className="font-mono text-acc">{b.tps!.toFixed(1)} ток/с</span>
                          <span className="text-dim"> · {fmtMs(b.ms!)} с загрузкой</span>
                          <p className="mt-1 text-mute">{b.text}</p>
                        </div>
                      )}
                      {b?.state === "error" && <p className="mt-2 text-xs text-crit">{b.text}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <Eyebrow className="mb-4">Где работает ИИ</Eyebrow>
            <ul className="space-y-2.5">
              {ROLES.map(([t, where]) => (
                <li key={t} className="flex items-start gap-2.5 text-sm">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-acc" />
                  <span className="flex-1 text-text">{t}</span>
                  <span className="text-xs text-dim">{where}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex gap-2.5 rounded-xl border border-line bg-ink2 p-3.5 text-[13px] text-mute">
              <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-low" />
              ИИ предлагает — решает человек. Находку подтверждает владелец, исправление проверяет специалист.
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6 p-6">
        <Eyebrow className="mb-3">Добавить модели</Eyebrow>
        <p className="mb-3 text-sm text-mute">Любую модель из библиотеки Ollama можно скачать одной командой — она сразу появится в списке.</p>
        <div className="grid gap-2 font-mono text-[13px] sm:grid-cols-3">
          {["ollama pull qwen2.5:7b", "ollama pull llama3", "ollama pull gemma3:4b"].map((c) => (
            <code key={c} className="rounded-lg border border-line bg-ink px-3 py-2 text-acc">
              {c}
            </code>
          ))}
        </div>
      </Card>
    </div>
  );
}
