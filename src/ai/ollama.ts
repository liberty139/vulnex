/*
  Thin client for the Ollama server on the visitor's own computer. Run locally
  (ЗАПУСК.bat) the browser reaches it through the Vite proxy at /ollama; the
  published site calls http://127.0.0.1:11434 directly, which works once
  Ollama allows the site's origin (ИИ_ДЛЯ_САЙТА.bat). Local models (qwen2.5,
  llama3) never send code anywhere; "-cloud" models are served by Ollama Cloud
  and are off by default.
*/

/** True on the published site, false when run from ЗАПУСК.bat. */
export const LIVE = !import.meta.env.DEV;
/**
 * Published site: the Fortera AI relay (api/server.mjs on Render) forwards to
 * Ollama Cloud with a server-side key, so AI works for every visitor.
 * Local run: the Vite proxy to the Ollama on this computer.
 */
export const BASE = LIVE ? ((import.meta.env.VITE_AI_URL as string | undefined) ?? "https://fortera-ai.onrender.com/ollama") : "/ollama";

export interface AiModel {
  name: string;
  label: string;
  vendor: string;
  local: boolean;
  sizeGb?: number;
  note?: string;
}

/** Models the UI knows how to describe, in the order it shows them. */
export const KNOWN: AiModel[] = [
  { name: "qwen2.5:7b", label: "Qwen 2.5 7B", vendor: "Alibaba · открытые веса", local: true, note: "Лучше всех пишет по-русски среди локальных" },
  { name: "llama3:latest", label: "Llama 3 8B", vendor: "Meta · открытые веса", local: true, note: "Второе мнение для консилиума" },
  { name: "gemma4:31b-cloud", label: "Gemma 4 31B", vendor: "Google · Ollama Cloud", local: false },
  { name: "gpt-oss:120b-cloud", label: "GPT-OSS 120B", vendor: "OpenAI, открытые веса · Ollama Cloud", local: false },
  { name: "gpt-oss:20b-cloud", label: "GPT-OSS 20B", vendor: "OpenAI, открытые веса · Ollama Cloud", local: false },
  { name: "nemotron-3-super:cloud", label: "Nemotron 3 Super", vendor: "NVIDIA · Ollama Cloud", local: false },
  { name: "nemotron-3-nano:30b-cloud", label: "Nemotron 3 Nano", vendor: "NVIDIA · Ollama Cloud", local: false },
];

export const DEFAULT_MODELS = LIVE ? ["gemma4:31b"] : ["qwen2.5:7b"];
/** Preferred order when the saved choice is not available (fast first). */
// on the site Gemma 4 keeps Russian and the JSON shape best (tested 2026-11-05)
export const PREFERRED = LIVE ? ["gemma4:31b", "gpt-oss:120b", "gpt-oss:20b", "nemotron-3-super", "nemotron-3-nano:30b"] : ["qwen2.5:7b", "llama3:latest"];

const bare = (n: string) => n.replace(/-cloud$|:cloud$/, "");

export function describe(name: string): AiModel {
  const known = KNOWN.find((m) => m.name === name) ?? KNOWN.find((m) => bare(m.name) === bare(name));
  if (known) return LIVE ? { ...known, name, local: false, vendor: known.vendor.replace(" · Ollama Cloud", "") + " · облако" } : { ...known, name };
  const base = name.split(":")[0];
  return {
    name,
    label: base.charAt(0).toUpperCase() + base.slice(1),
    vendor: LIVE ? "Ollama Cloud" : "Ollama",
    local: !LIVE && !name.includes("cloud"),
  };
}

export const label = (name: string) => describe(name).label;

export interface OllamaStatus {
  online: boolean;
  version?: string;
  models: AiModel[];
  loaded: string[];
}

// the free relay sleeps when idle and takes up to a minute to wake
const WAIT = LIVE ? 75000 : 4000;

export async function status(): Promise<OllamaStatus> {
  try {
    const [tags, ps, ver] = await Promise.all([
      fetch(`${BASE}/api/tags`, { signal: AbortSignal.timeout(WAIT) }).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }),
      fetch(`${BASE}/api/ps`, { signal: AbortSignal.timeout(WAIT) })
        .then((r) => r.json())
        .catch(() => ({ models: [] })),
      fetch(`${BASE}/api/version`, { signal: AbortSignal.timeout(WAIT) })
        .then((r) => r.json())
        .catch(() => ({})),
    ]);
    const order = (n: string) => {
      const i = PREFERRED.indexOf(n);
      return i === -1 ? 99 : i;
    };
    const models = (tags.models as { name: string; size: number }[])
      .filter((m) => !/embed/i.test(m.name))
      .map((m) => ({ ...describe(m.name), sizeGb: m.size > 1e8 ? m.size / 1e9 : undefined }))
      .sort((a, b) => order(a.name) - order(b.name) || Number(b.local) - Number(a.local));
    return {
      online: true,
      version: ver.version,
      models,
      loaded: ((ps.models ?? []) as { name: string }[]).map((m) => m.name),
    };
  } catch {
    return { online: false, models: [], loaded: [] };
  }
}

/** Loads a model into memory so the first real request does not wait for it. */
export async function warm(model: string) {
  await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, keep_alive: "30m" }),
  });
}

function humanError(e: unknown): string {
  if (e instanceof DOMException && e.name === "AbortError") return "остановлено";
  if (e instanceof DOMException && e.name === "TimeoutError") return "модель не ответила вовремя";
  const msg = e instanceof Error ? e.message : String(e);
  if (/Failed to fetch|NetworkError|ECONNREFUSED|502|504/.test(msg)) return "Ollama не запущена";
  if (/402/.test(msg)) return "модель требует платную подписку Ollama";
  if (/404/.test(msg)) return "модель не скачана";
  return msg.slice(0, 160);
}

export interface Progress {
  phase: "wait" | "load" | "think" | "done" | "error";
  tokens: number;
  ms: number;
  text?: string;
}

export interface RunResult<T> {
  model: string;
  ok: boolean;
  ms: number;
  tokens: number;
  data?: T;
  error?: string;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Streams a chat completion and reports progress token by token.
 * Returns the full text of the answer.
 */
export async function stream(
  model: string,
  messages: ChatMessage[],
  opts: {
    format?: object;
    signal?: AbortSignal;
    numPredict?: number;
    temperature?: number;
    onProgress?: (p: Progress) => void;
  } = {},
): Promise<{ text: string; tokens: number; ms: number }> {
  const t0 = Date.now();
  opts.onProgress?.({ phase: "load", tokens: 0, ms: 0 });
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: opts.signal,
    body: JSON.stringify({
      model,
      stream: true,
      keep_alive: "30m",
      format: opts.format,
      options: { temperature: opts.temperature ?? 0.1, num_predict: opts.numPredict ?? 900, num_ctx: 4096 },
      messages,
    }),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  let tokens = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const chunk = JSON.parse(line) as { message?: { content?: string }; error?: string; done?: boolean; eval_count?: number };
      if (chunk.error) throw new Error(chunk.error);
      const piece = chunk.message?.content ?? "";
      if (piece) {
        text += piece;
        tokens += 1;
        opts.onProgress?.({ phase: "think", tokens, ms: Date.now() - t0, text: stripCJK(text) });
      }
      if (chunk.done && chunk.eval_count) tokens = chunk.eval_count;
    }
  }
  text = stripCJK(text);
  opts.onProgress?.({ phase: "done", tokens, ms: Date.now() - t0, text });
  return { text, tokens, ms: Date.now() - t0 };
}

/**
 * Qwen sometimes slips into Chinese mid-sentence. The prompts ask for Russian
 * only; this removes any CJK characters that get through anyway.
 */
export const stripCJK = (t: string) => t.replace(/[　-ヿ㐀-鿿豈-﫿＀-￯]+/g, "");

// Cloud models do not always honour `format`: strip fences, accept a bare array.
function parseJSON<T>(content: string): T {
  const cleaned = content.replace(/```(?:json)?/gi, "").trim();
  const obj = cleaned.indexOf("{");
  const arr = cleaned.indexOf("[");
  const isArr = arr !== -1 && (obj === -1 || arr < obj);
  const start = isArr ? arr : obj;
  const end = isArr ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
  const v = JSON.parse(cleaned.slice(start, end + 1));
  return (Array.isArray(v) ? { items: v } : v) as T;
}

/** An example object built from a JSON schema, so the model sees the exact keys. */
function skeleton(s: unknown): unknown {
  const o = s as { type?: string; enum?: string[]; properties?: Record<string, unknown>; items?: unknown };
  if (!o || typeof o !== "object") return "";
  if (o.enum) return o.enum.join("|");
  if (o.type === "object") return Object.fromEntries(Object.entries(o.properties ?? {}).map(([k, v]) => [k, skeleton(v)]));
  if (o.type === "array") return [skeleton(o.items)];
  if (o.type === "integer" || o.type === "number") return 0;
  if (o.type === "boolean") return true;
  return "…";
}

/** One structured request: the model must answer with JSON matching `schema`. */
export async function runJSON<T>(
  model: string,
  system: string,
  user: string,
  schema: object,
  opts: { signal?: AbortSignal; numPredict?: number; onProgress?: (p: Progress) => void } = {},
): Promise<RunResult<T>> {
  const t0 = Date.now();
  try {
    const out = await stream(
      model,
      [
        { role: "system", content: system },
        { role: "user", content: `${user}\n\nОтветь ОДНИМ JSON-объектом без markdown, ключи строго такие (значения — по-русски): ${JSON.stringify(skeleton(schema))}` },
      ],
      { format: schema, signal: opts.signal, numPredict: opts.numPredict, temperature: 0, onProgress: opts.onProgress },
    );
    return { model, ok: true, ms: Date.now() - t0, tokens: out.tokens, data: parseJSON<T>(out.text) };
  } catch (e) {
    const error = humanError(e);
    opts.onProgress?.({ phase: "error", tokens: 0, ms: Date.now() - t0, text: error });
    return { model, ok: false, ms: Date.now() - t0, tokens: 0, error };
  }
}

export { humanError };
