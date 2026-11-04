import clsx from "clsx";
import { ArrowLeft, ArrowRight, Check, Lock, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { label, type Progress } from "../../ai/ollama";
import { draftScope } from "../../ai/tasks";
import { RunBoard } from "../../components/ai";
import { Badge, Button, Card, Eyebrow, Field, PageHead, asset, inputCls } from "../../components/ui";
import type { Level, Scope } from "../../data";
import { uid, useStore } from "../../store";

const STEPS = ["О проекте", "Границы проверки", "Разрешение", "Публикация"];
const KINDS = ["Веб-приложение", "Мобильное приложение", "API", "Веб + мобильное приложение", "Маркетплейс", "Другое"];

const EMPTY_SCOPE: Scope = { inScope: [], outOfScope: [], allowed: [], forbidden: [], focus: [] };

function ListEditor({ title, items, onChange, tone }: { title: string; items: string[]; onChange: (v: string[]) => void; tone: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    if (!draft.trim()) return;
    onChange([...items, draft.trim()]);
    setDraft("");
  };
  return (
    <div className="rounded-xl border border-line bg-ink2 p-4">
      <div className={clsx("mb-2.5 text-xs font-semibold uppercase tracking-wider", tone)}>{title}</div>
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="group flex items-start gap-2 text-[13.5px] text-text">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-mute" />
            <span className="flex-1">{t}</span>
            <button onClick={() => onChange(items.filter((_, k) => k !== i))} className="text-dim opacity-0 transition group-hover:opacity-100 hover:text-crit" aria-label="Удалить">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2.5 flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Добавить пункт…" className={clsx(inputCls, "py-1.5 text-[13px]")} />
        <button onClick={add} className="rounded-lg border border-line px-2 text-mute hover:border-acc/50 hover:text-acc" aria-label="Добавить">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function NewProject() {
  const nav = useNavigate();
  const { addProject, models, ollama } = useStore();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: "", kind: KINDS[0], url: "", stack: "", description: "", team: "", reward: "Репутация", level: "Новичок" as Level });
  const [scope, setScope] = useState<Scope>(EMPTY_SCOPE);
  const [perm, setPerm] = useState({ owner: false, copy: false, data: false, rules: false });
  const [contact, setContact] = useState("");
  const [run, setRun] = useState<Record<string, Progress>>({});
  const [aiError, setAiError] = useState("");
  const [aiBy, setAiBy] = useState("");

  const model = models[0];
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const canNext = [f.name.trim() && f.description.trim().length > 15, scope.inScope.length > 0 && scope.forbidden.length > 0, Object.values(perm).every(Boolean) && contact.trim(), true][step];

  async function ai() {
    if (!model) return;
    setAiError("");
    setRun({ [model]: { phase: "wait", tokens: 0, ms: 0 } });
    const res = await draftScope(model, f, (p) => setRun({ [model]: p }));
    if (res.ok && res.data) {
      const d = res.data;
      const clean = (a: unknown) => (Array.isArray(a) ? a.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 6) : []);
      setScope({ inScope: clean(d.inScope), outOfScope: clean(d.outOfScope), allowed: clean(d.allowed), forbidden: clean(d.forbidden), focus: clean(d.focus) });
      setAiBy(model);
    } else setAiError(res.error ?? "Не получилось");
  }

  function publish() {
    const id = `p-${uid()}`;
    addProject({ id, ...f, url: f.url || "тестовая копия будет выдана после одобрения", stack: f.stack || "не указан", scope, createdAt: Date.now() });
    nav(`/app/programs/${id}`);
  }

  return (
    <div>
      <PageHead eyebrow="Стартапу" title="Разместить проект на проверку" sub="Четыре шага. Без подтверждённого разрешения и границ проект не попадёт к специалистам." />

      <div className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => i < step && setStep(i)}
            className={clsx(
              "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] transition",
              i === step ? "border-acc bg-acc/10 text-acc" : i < step ? "border-low/40 text-low" : "border-line text-dim",
            )}
          >
            <span className="font-mono text-xs">{i < step ? <Check className="h-3.5 w-3.5" /> : `0${i + 1}`}</span>
            {s}
          </button>
        ))}
      </div>

      <Card className="p-7">
        {step === 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Название проекта">
              <input className={inputCls} value={f.name} onChange={set("name")} placeholder="Например: Запись к врачу" />
            </Field>
            <Field label="Тип">
              <select className={inputCls} value={f.kind} onChange={set("kind")}>
                {KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Что делает продукт" hint="2–3 предложения: кто пользователи, какие данные, ключевые функции. Это поможет ИИ предложить границы.">
                <textarea className={clsx(inputCls, "min-h-24")} value={f.description} onChange={set("description")} placeholder="Сервис онлайн-записи в клиники: личный кабинет пациента, выбор врача, вход по SMS…" />
              </Field>
            </div>
            <Field label="Технологии" hint="Необязательно">
              <input className={inputCls} value={f.stack} onChange={set("stack")} placeholder="PHP, Laravel, MySQL" />
            </Field>
            <Field label="Адрес тестовой копии" hint="Проверяется только она, не рабочий сайт">
              <input className={inputCls} value={f.url} onChange={set("url")} placeholder="https://staging.example.kz" />
            </Field>
            <Field label="Уровень специалистов">
              <select className={inputCls} value={f.level} onChange={set("level")}>
                {["Новичок", "Практик", "Проверенный", "Эксперт"].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>
            <Field label="Вознаграждение">
              <select className={inputCls} value={f.reward} onChange={set("reward")}>
                {["Репутация", "Репутация + рекомендация от команды", "Оплата за подтверждённые находки"].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-acc/25 bg-acc/[0.05] p-4">
              <Sparkles className="h-5 w-5 text-acc" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-text">Черновик границ от ИИ</div>
                <div className="text-xs text-mute">
                  {model ? `${label(model)} предложит границы по описанию проекта. Вы правите и утверждаете.` : "Выберите модель на странице «Локальные модели»."}
                </div>
              </div>
              <Button onClick={ai} disabled={!model || !ollama?.online || run[model]?.phase === "think" || run[model]?.phase === "load"}>
                <Sparkles className="h-4 w-4" /> Предложить
              </Button>
            </div>
            <RunBoard runs={run} />
            {aiError && <p className="mb-3 text-sm text-crit">ИИ: {aiError}. Заполните вручную.</p>}
            {aiBy && (
              <p className="my-3 text-xs text-dim">
                Черновик от {label(aiBy)}. Проверьте каждый пункт — ответственность за границы несёт владелец.
              </p>
            )}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ListEditor title="Что проверять" tone="text-acc" items={scope.inScope} onChange={(v) => setScope({ ...scope, inScope: v })} />
              <ListEditor title="Не трогать" tone="text-crit" items={scope.outOfScope} onChange={(v) => setScope({ ...scope, outOfScope: v })} />
              <ListEditor title="Разрешено" tone="text-low" items={scope.allowed} onChange={(v) => setScope({ ...scope, allowed: v })} />
              <ListEditor title="Запрещено" tone="text-crit" items={scope.forbidden} onChange={(v) => setScope({ ...scope, forbidden: v })} />
              <div className="md:col-span-2">
                <ListEditor title="Куда посмотреть внимательнее" tone="text-med" items={scope.focus} onChange={(v) => setScope({ ...scope, focus: v })} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <img src={asset("img/lock.png")} alt="" className="h-10 w-10" />
              <div>
                <div className="font-display text-xl">Разрешение владельца</div>
                <div className="text-sm text-mute">Главное правило VULNEX: проверка только с разрешения и только в границах.</div>
              </div>
            </div>
            {(
              [
                ["owner", "Я владелец проекта или уполномочен его представлять"],
                ["copy", "Специалисты проверяют отдельную тестовую копию, а не рабочий сервис"],
                ["data", "В тестовой копии нет реальных персональных данных пользователей"],
                ["rules", "Я согласен с правилами: находки не публикуются до исправления, оценка — по правилам платформы"],
              ] as const
            ).map(([k, t]) => (
              <label key={k} className={clsx("mb-2.5 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition", perm[k] ? "border-low/40 bg-low/[0.05]" : "border-line bg-ink2 hover:border-line2")}>
                <input type="checkbox" checked={perm[k]} onChange={(e) => setPerm({ ...perm, [k]: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#38D9FF]" />
                <span className="text-[14px] text-text">{t}</span>
              </label>
            ))}
            <div className="mt-5">
              <Field label="Контакт для срочной связи" hint="Если специалист найдёт критическую проблему">
                <input className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Telegram или e-mail ответственного" />
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <Eyebrow className="mb-3">Проверьте перед публикацией</Eyebrow>
            <div className="font-display text-2xl">{f.name}</div>
            <p className="mt-1 max-w-2xl text-sm text-mute">{f.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="ok">
                <Lock className="h-3 w-3" /> Разрешение подтверждено
              </Badge>
              <Badge>{f.kind}</Badge>
              <Badge tone="acc">Уровень: {f.level}</Badge>
              <Badge>{f.reward}</Badge>
            </div>
            <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <div className="mb-1 text-xs uppercase tracking-wider text-dim">Что проверять</div>
                <p className="text-mute">{scope.inScope.join(" · ")}</p>
              </div>
              <div>
                <div className="mb-1 text-xs uppercase tracking-wider text-dim">Запрещено</div>
                <p className="text-mute">{scope.forbidden.join(" · ")}</p>
              </div>
            </div>
            <p className="mt-6 text-xs text-dim">В прототипе проект сохранится в этом браузере и сразу появится в программах.</p>
          </div>
        )}

        <div className="mt-8 flex items-center gap-3 border-t border-line pt-5">
          {step > 0 && (
            <Button variant="subtle" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="h-4 w-4" /> Назад
            </Button>
          )}
          <div className="ml-auto">
            {step < 3 ? (
              <Button disabled={!canNext} onClick={() => setStep(step + 1)}>
                Далее <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={publish}>
                <Check className="h-4 w-4" /> Опубликовать проект
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
