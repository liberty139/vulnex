import clsx from "clsx";
import { Bot, Cpu, SendHorizonal, Square, Trash2, UserRound } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { describe, humanError, label, stream } from "../../ai/ollama";
import { MENTOR_SYSTEM } from "../../ai/tasks";
import { ModelPicker } from "../../components/ai";
import { Card, Eyebrow, PageHead, fmtMs } from "../../components/ui";
import { useStore } from "../../store";

interface Msg {
  role: "user" | "assistant";
  content: string;
  model?: string;
  ms?: number;
  error?: boolean;
}

const SUGGEST = [
  "Что такое IDOR простыми словами и как его найти в разрешённой проверке?",
  "Как написать хороший отчёт об уязвимости для стартапа?",
  "Почему пароли нельзя хранить в MD5?",
  "С чего начать путь в пентесте легально?",
];

/** Minimal markdown: headings, lists, **bold**, `code`. */
function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <b key={i} className="font-semibold text-text">
        {p.slice(2, -2)}
      </b>
    ) : p.startsWith("`") && p.endsWith("`") ? (
      <code key={i} className="rounded bg-ink px-1 py-0.5 font-mono text-[12.5px] text-acc">
        {p.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}

function Md({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let code: string[] | null = null;
  const flush = () => {
    if (list) {
      const L = list.ordered ? "ol" : "ul";
      blocks.push(
        <L key={blocks.length} className={clsx("my-2 space-y-1 pl-5", list.ordered ? "list-decimal" : "list-disc marker:text-acc")}>
          {list.items.map((it, i) => (
            <li key={i}>{inline(it)}</li>
          ))}
        </L>,
      );
      list = null;
    }
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (line.startsWith("```")) {
      if (code) {
        blocks.push(
          <pre key={blocks.length} className="my-2 overflow-x-auto rounded-lg border border-line bg-ink p-3 font-mono text-[12.5px] text-text">
            {code.join("\n")}
          </pre>,
        );
        code = null;
      } else {
        flush();
        code = [];
      }
      continue;
    }
    if (code) {
      code.push(raw);
      continue;
    }
    const ul = line.match(/^\s*[-*•]\s+(.*)/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul || ol) {
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((ul ?? ol)![1]);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const h = line.match(/^#{1,4}\s+(.*)/);
    blocks.push(
      h ? (
        <div key={blocks.length} className="mt-3 mb-1 font-display text-[15px] text-text">
          {inline(h[1])}
        </div>
      ) : (
        <p key={blocks.length} className="my-1.5">
          {inline(line)}
        </p>
      ),
    );
  }
  flush();
  if (code) blocks.push(<pre key={blocks.length} className="my-2 overflow-x-auto rounded-lg border border-line bg-ink p-3 font-mono text-[12.5px]">{(code as string[]).join("\n")}</pre>);
  return <>{blocks}</>;
}

export default function Mentor() {
  const { models, ollama } = useStore();
  const model = models[0];
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState("");
  const [tok, setTok] = useState(0);
  const ctrl = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, live]);

  async function ask(q: string) {
    if (!q.trim() || !model || busy) return;
    const history: Msg[] = [...msgs, { role: "user", content: q.trim() }];
    setMsgs(history);
    setDraft("");
    setBusy(true);
    setLive("");
    setTok(0);
    const c = new AbortController();
    ctrl.current = c;
    let latest = "";
    try {
      const out = await stream(
        model,
        [{ role: "system", content: MENTOR_SYSTEM }, ...history.slice(-8).map((m) => ({ role: m.role, content: m.content }))],
        {
          signal: c.signal,
          numPredict: 600,
          temperature: 0.2,
          onProgress: (p) => {
            if (p.text) {
              latest = p.text;
              setLive(p.text);
            }
            setTok(p.tokens);
          },
        },
      );
      setMsgs([...history, { role: "assistant", content: out.text.trim(), model, ms: out.ms }]);
    } catch (e) {
      const partial = latest;
      setMsgs([...history, { role: "assistant", content: partial ? `${partial}\n\n_(остановлено)_` : `Не получилось: ${humanError(e)}`, model, error: !partial }]);
    }
    setLive("");
    setBusy(false);
  }

  return (
    <div>
      <PageHead
        eyebrow="Специалисту"
        title="ИИ-наставник"
        sub="Спросите про уязвимость, инструмент или как оформить отчёт. Наставник учит легальной практике: только свои стенды, CTF и проекты с разрешением владельца."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <Card className="flex h-[calc(100svh-230px)] min-h-[480px] flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            {msgs.length === 0 && !busy && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-acc/40 bg-acc/10">
                  <Bot className="h-7 w-7 text-acc" />
                </span>
                <div className="mt-4 font-display text-xl">С чего начнём?</div>
                <p className="mt-1 max-w-md text-sm text-mute">
                  {model ? `${label(model)} ${describe(model).local ? "работает локально — вопросы не уходят в интернет." : "работает в облаке Ollama."}` : "Выберите модель справа."}
                </p>
                <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                  {SUGGEST.map((s) => (
                    <button key={s} onClick={() => ask(s)} disabled={!ollama?.online} className="rounded-xl border border-line bg-ink2 p-3.5 text-left text-[13.5px] text-mute transition hover:border-acc/50 hover:text-text disabled:opacity-40">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={clsx("flex gap-3", m.role === "user" && "flex-row-reverse")}>
                <span className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", m.role === "user" ? "border-line2 bg-panel2" : "border-acc/40 bg-acc/10")}>
                  {m.role === "user" ? <UserRound className="h-4 w-4 text-mute" /> : <Bot className="h-4 w-4 text-acc" />}
                </span>
                <div className={clsx("max-w-[80%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed", m.role === "user" ? "bg-acc/10 text-text" : "border border-line bg-ink2 text-mute", m.error && "border-crit/40 text-crit")}>
                  {m.role === "assistant" ? <Md text={m.content} /> : m.content}
                  {m.model && !m.error && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-dim">
                      <Cpu className="h-3 w-3" /> {label(m.model)} · {m.ms ? fmtMs(m.ms) : ""}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-acc/40 bg-acc/10">
                  <Bot className="h-4 w-4 text-acc" />
                </span>
                <div className="max-w-[80%] rounded-2xl border border-line bg-ink2 px-4 py-3 text-[14px] leading-relaxed text-mute">
                  {live ? <Md text={live} /> : <span className="text-dim">{label(model)} загружает модель…</span>}
                  <div className="mt-2 font-mono text-[11px] text-dim caret">{tok ? `${tok} ток.` : ""}</div>
                </div>
              </div>
            )}
            <div ref={end} />
          </div>
          <div className="border-t border-line p-4">
            <div className="flex gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ask(draft);
                  }
                }}
                rows={1}
                placeholder={ollama?.online ? "Ваш вопрос… (Enter — отправить)" : "Ollama не запущена"}
                className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-line bg-ink px-4 py-2.5 text-sm text-text outline-none placeholder:text-dim focus:border-acc/60"
              />
              {busy ? (
                <button onClick={() => ctrl.current?.abort()} className="flex h-11 w-11 items-center justify-center rounded-xl border border-crit/40 text-crit" aria-label="Остановить">
                  <Square className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={() => ask(draft)} disabled={!draft.trim() || !model || !ollama?.online} className="flex h-11 w-11 items-center justify-center rounded-xl bg-acc text-ink transition hover:bg-white disabled:opacity-40" aria-label="Отправить">
                  <SendHorizonal className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <Eyebrow className="mb-3">Модель наставника</Eyebrow>
            <ModelPicker compact single />
          </Card>
          {msgs.length > 0 && (
            <button onClick={() => setMsgs([])} className="flex items-center gap-1.5 text-xs text-dim hover:text-text">
              <Trash2 className="h-3.5 w-3.5" /> Очистить диалог
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
