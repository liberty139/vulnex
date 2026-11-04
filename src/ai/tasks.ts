import { runJSON, type Progress, type RunResult } from "./ollama";
import { scanRules } from "./rules";
import { SEVERITIES, sevRank, type CodeFinding, type MergedFinding, type Severity } from "./types";

/*
  What the AI does in FortEra. Every task is an assistant step: the models
  propose, a person (the specialist or the project owner) decides. Prompts ask
  for explanations and fixes, never for attack payloads.
*/

const ROLE =
  "Ты — ИИ-ассистент платформы FortEra. Платформа соединяет стартапы, которым нужна проверка безопасности, " +
  "и начинающих специалистов. Проверки идут только с разрешения владельца проекта и в заданных границах. " +
  "Ты помогаешь людям, но не заменяешь специалиста: всё, что ты находишь, — гипотезы, их подтверждает человек. " +
  "Не выдумывай, не давай готовых эксплойтов и атакующих нагрузок — только объяснение риска и исправление. " +
  "Пиши только по-русски (кириллицей, без китайских иероглифов и английских вставок, кроме терминов), коротко и понятно. Отвечай только JSON по заданной схеме.";

const sevEnum = { type: "string", enum: SEVERITIES };

/* -------------------------------------------------------------- code scan */

const SCAN_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          line: { type: "integer" },
          title: { type: "string" },
          severity: sevEnum,
          cwe: { type: "string" },
          why: { type: "string" },
          fix: { type: "string" },
        },
        required: ["line", "title", "severity", "cwe", "why", "fix"],
      },
    },
  },
  required: ["summary", "findings"],
};

export interface ScanAnswer {
  summary: string;
  findings: CodeFinding[];
}

export function scanPrompt(code: string, lang: string) {
  const numbered = code
    .split("\n")
    .map((l, i) => `${String(i + 1).padStart(3)}| ${l}`)
    .join("\n");
  return (
    `Язык: ${lang}. Владелец проекта разрешил проверку и прислал фрагмент кода.\n` +
    `Код (слева номера строк):\n<<<\n${numbered}\n>>>\n\n` +
    "Найди места, которые специалист должен проверить в первую очередь: уязвимости и ошибки логики безопасности " +
    "(внедрение SQL, XSS, доступ к чужим данным без проверки владельца, ошибки аутентификации и проверки подписи, " +
    "секреты в коде, небезопасная десериализация, отключённая проверка TLS и т. п.).\n" +
    "Для каждой находки: line — номер строки, title — суть в 3–7 словах, severity — critical/high/medium/low, " +
    "cwe — код вида CWE-89, why — одно-два предложения, чем это опасно, fix — как исправить. " +
    "Не больше 6 находок, самые важные первыми. summary — одно предложение об общем состоянии кода. " +
    "Если опасного нет — пустой массив findings."
  );
}

export async function scanWithModel(
  model: string,
  code: string,
  lang: string,
  onProgress?: (p: Progress) => void,
  signal?: AbortSignal,
): Promise<RunResult<ScanAnswer>> {
  const res = await runJSON<ScanAnswer>(model, ROLE, scanPrompt(code, lang), SCAN_SCHEMA, {
    onProgress,
    signal,
    numPredict: 1100,
  });
  if (res.data) {
    const max = code.split("\n").length;
    res.data.findings = (res.data.findings ?? [])
      .filter((f) => f && typeof f.title === "string" && SEVERITIES.includes(f.severity))
      .map((f) => ({ ...f, line: Math.min(Math.max(1, Math.round(Number(f.line) || 1)), max), cwe: normCwe(f.cwe) }));
  }
  return res;
}

function normCwe(c: string) {
  const m = String(c ?? "").match(/\d+/);
  return m ? `CWE-${m[0]}` : "CWE-?";
}

/** CWE ids that describe the same problem for merging purposes. */
const CWE_FAMILY: Record<string, string> = {
  "CWE-80": "CWE-79",
  "CWE-116": "CWE-79",
  "CWE-77": "CWE-78",
  "CWE-94": "CWE-78",
  "CWE-95": "CWE-78",
  "CWE-328": "CWE-916",
  "CWE-327": "CWE-916",
  "CWE-759": "CWE-916",
  "CWE-321": "CWE-798",
  "CWE-547": "CWE-798",
  "CWE-639": "CWE-284",
  "CWE-862": "CWE-284",
  "CWE-863": "CWE-284",
  "CWE-285": "CWE-284",
  "CWE-296": "CWE-295",
  "CWE-297": "CWE-295",
  "CWE-345": "CWE-347",
  "CWE-754": "CWE-390",
  "CWE-252": "CWE-390",
};
const family = (cwe: string) => CWE_FAMILY[cwe] ?? cwe;

/**
 * Merges the rule scanner and all model answers. Two findings are the same
 * when they point at nearby lines (±2) and the same CWE family. The highest
 * severity any source gave wins; the first source's wording is kept.
 */
export function merge(rules: CodeFinding[], answers: { model: string; findings: CodeFinding[] }[]): MergedFinding[] {
  const out: MergedFinding[] = [];
  const add = (f: CodeFinding, source: string) => {
    const hit = out.find((m) => Math.abs(m.line - f.line) <= 2 && family(m.cwe) === family(f.cwe));
    if (hit) {
      if (!hit.sources.includes(source)) hit.sources.push(source);
      if (sevRank(f.severity) < sevRank(hit.severity)) hit.severity = f.severity;
      // prefer a model's explanation over the generic rule text
      if (hit.sources[0] === "rules" && source !== "rules" && f.why.length > 20) {
        hit.why = f.why;
        hit.fix = f.fix || hit.fix;
        hit.title = f.title;
      }
      return;
    }
    out.push({ ...f, key: `${f.line}-${family(f.cwe)}-${out.length}`, sources: [source] });
  };
  for (const a of answers) for (const f of a.findings) add(f, a.model);
  for (const f of rules) add(f, "rules");
  return out.sort((a, b) => sevRank(a.severity) - sevRank(b.severity) || b.sources.length - a.sources.length || a.line - b.line);
}

export { scanRules };

/* ----------------------------------------------------------- scope draft */

const SCOPE_SCHEMA = {
  type: "object",
  properties: {
    inScope: { type: "array", items: { type: "string" } },
    outOfScope: { type: "array", items: { type: "string" } },
    allowed: { type: "array", items: { type: "string" } },
    forbidden: { type: "array", items: { type: "string" } },
    focus: { type: "array", items: { type: "string" } },
  },
  required: ["inScope", "outOfScope", "allowed", "forbidden", "focus"],
};

export interface ScopeDraft {
  inScope: string[];
  outOfScope: string[];
  allowed: string[];
  forbidden: string[];
  focus: string[];
}

export function draftScope(
  model: string,
  p: { name: string; kind: string; url: string; stack: string; description: string },
  onProgress?: (pr: Progress) => void,
) {
  const user =
    `Стартап размещает проект на проверку.\nНазвание: ${p.name}\nТип: ${p.kind}\nТестовая копия: ${p.url || "не указана"}\n` +
    `Технологии: ${p.stack || "не указаны"}\nОписание: ${p.description}\n\n` +
    "Составь черновик границ проверки для начинающих специалистов. inScope — что проверять (3–5 пунктов, конкретно для этого проекта); " +
    "outOfScope — что не трогать (3–4 пункта, например рабочие данные клиентов, сторонние сервисы, платёжный шлюз); " +
    "allowed — разрешённые действия (3–4 пункта); forbidden — запрещённые (3–5 пунктов: нагрузочные атаки, социальная инженерия, " +
    "доступ к реальным данным и т. п.); focus — 2–3 места, где у такого продукта чаще всего бывают проблемы. Каждый пункт — до 12 слов.";
  return runJSON<ScopeDraft>(model, ROLE, user, SCOPE_SCHEMA, { onProgress, numPredict: 700 });
}

/* --------------------------------------------------------- report review */

const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    checklist: {
      type: "array",
      items: {
        type: "object",
        properties: { item: { type: "string" }, ok: { type: "boolean" }, hint: { type: "string" } },
        required: ["item", "ok", "hint"],
      },
    },
    severity: sevEnum,
    severityWhy: { type: "string" },
    ownerSummary: { type: "string" },
    title: { type: "string" },
  },
  required: ["checklist", "severity", "severityWhy", "ownerSummary", "title"],
};

export interface ReportReview {
  checklist: { item: string; ok: boolean; hint: string }[];
  severity: Severity;
  severityWhy: string;
  ownerSummary: string;
  title: string;
}

export interface ReportDraft {
  project: string;
  scope: string;
  title: string;
  category: string;
  severity: Severity;
  steps: string;
  impact: string;
  evidence: string;
}

const reportText = (r: ReportDraft) =>
  `Проект: ${r.project}\nГраницы проверки: ${r.scope}\nЗаголовок: ${r.title}\nКатегория: ${r.category}\n` +
  `Оценка автора: ${r.severity}\nШаги воспроизведения:\n${r.steps || "—"}\nВлияние:\n${r.impact || "—"}\nДоказательства:\n${r.evidence || "—"}`;

export function reviewReport(model: string, r: ReportDraft, onProgress?: (p: Progress) => void) {
  const user =
    `Начинающий специалист готовит отчёт об уязвимости для владельца проекта.\n\n${reportText(r)}\n\n` +
    "Проверь отчёт перед отправкой. checklist — ровно 5 пунктов: «Понятный заголовок», «Шаги воспроизведения», " +
    "«Влияние на бизнес», «Доказательства», «В границах проверки»; ok — выполнено ли, hint — что добавить или почему хорошо (до 15 слов). " +
    "severity — твоя оценка серьёзности, severityWhy — почему (одно предложение). title — улучшенный заголовок до 10 слов. " +
    "ownerSummary — 2 предложения для основателя без технических терминов: что не так и чем грозит.";
  return runJSON<ReportReview>(model, ROLE, user, REVIEW_SCHEMA, { onProgress, numPredict: 700 });
}

/* ------------------------------------------------- explain to the owner */

const EXPLAIN_SCHEMA = {
  type: "object",
  properties: {
    plain: { type: "string" },
    risk: { type: "string" },
    urgency: { type: "string", enum: ["сегодня", "на этой неделе", "в ближайшем релизе", "по возможности"] },
    steps: { type: "array", items: { type: "string" } },
  },
  required: ["plain", "risk", "urgency", "steps"],
};

export interface OwnerExplain {
  plain: string;
  risk: string;
  urgency: string;
  steps: string[];
}

export function explainForOwner(model: string, r: ReportDraft, onProgress?: (p: Progress) => void) {
  const user =
    `Специалист прислал отчёт владельцу стартапа. Владелец не разбирается в безопасности.\n\n${reportText(r)}\n\n` +
    "plain — объясни суть в 2–3 простых предложениях, можно с бытовой аналогией. risk — чем это грозит бизнесу и пользователям (1–2 предложения). " +
    "urgency — насколько срочно исправлять. steps — 3–5 конкретных шагов исправления для разработчика.";
  return runJSON<OwnerExplain>(model, ROLE, user, EXPLAIN_SCHEMA, { onProgress, numPredict: 600 });
}

/* ------------------------------------------------------------- mentor */

export const MENTOR_SYSTEM =
  "Ты — ИИ-наставник платформы FortEra для начинающих специалистов по кибербезопасности. " +
  "Объясняешь простым языком, с примерами: что такое уязвимость, почему она возникает, как её искать в рамках разрешённой проверки, " +
  "как написать хороший отчёт и как исправить проблему. Практиковаться можно только на своих стендах, учебных площадках и CTF " +
  "и в проектах, владельцы которых дали разрешение, — напоминай об этом, если вопрос касается чужих систем. " +
  "Не помогай атаковать чужие системы и не давай готовых боевых эксплойтов. Отвечай только на русском языке, кириллицей, без китайских иероглифов; структурно и коротко: до 180 слов, " +
  "списки и короткие абзацы, без лишней воды.";
