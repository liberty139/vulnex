import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_MODELS, PREFERRED, status as ollamaStatus, type OllamaStatus } from "./ai/ollama";
import { SEV_POINTS } from "./ai/types";
import { DEMO_PROJECTS, DEMO_REPORTS, type Project, type Report, type ReportStatus } from "./data";

/*
  Prototype state. It lives in this browser's localStorage: there is no
  server yet, which the UI says openly.
*/

export type Role = "startup" | "specialist";

interface RepEvent {
  at: number;
  points: number;
  why: string;
}

interface Saved {
  role: Role;
  models: string[];
  projects: Project[];
  reports: Report[];
  rep: RepEvent[];
  nick: string;
}

const KEY = "fortera.v1";

const fresh = (): Saved => ({
  role: "startup",
  models: DEFAULT_MODELS,
  projects: DEMO_PROJECTS,
  reports: DEMO_REPORTS,
  rep: [],
  nick: "вы",
});

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...(JSON.parse(raw) as Partial<Saved>) };
  } catch {
    /* private window or blocked storage: start fresh */
  }
  return fresh();
}

interface Store extends Saved {
  ollama: OllamaStatus | null;
  refreshOllama: () => Promise<void>;
  setRole: (r: Role) => void;
  setModels: (m: string[]) => void;
  addProject: (p: Project) => void;
  addReport: (r: Report) => void;
  setStatus: (id: string, s: ReportStatus) => void;
  points: number;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Saved>(load);
  const [ollama, setOllama] = useState<OllamaStatus | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [s]);

  // keep several open tabs in step: another tab's save replaces this tab's state
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key === KEY) setS(load());
    };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  const refreshOllama = useCallback(async () => {
    const st = await ollamaStatus();
    setOllama(st);
    if (!st.online || !st.models.length) return;
    const names = st.models.map((m) => m.name);
    // keep the saved choice if it exists here, otherwise pick a working model
    setS((p) => {
      const keep = p.models.filter((m) => names.includes(m));
      if (keep.length === p.models.length && keep.length) return p;
      if (keep.length) return { ...p, models: keep };
      return { ...p, models: [PREFERRED.find((m) => names.includes(m)) ?? names[0]] };
    });
  }, []);

  useEffect(() => {
    void refreshOllama();
    const t = setInterval(() => void refreshOllama(), 15000);
    return () => clearInterval(t);
  }, [refreshOllama]);

  const store = useMemo<Store>(() => {
    const points = s.rep.reduce((a, e) => a + e.points, 0);
    return {
      ...s,
      ollama,
      refreshOllama,
      points,
      setRole: (role) => setS((p) => ({ ...p, role })),
      setModels: (models) => setS((p) => ({ ...p, models })),
      addProject: (proj) => setS((p) => ({ ...p, projects: [proj, ...p.projects] })),
      addReport: (r) => setS((p) => ({ ...p, reports: [r, ...p.reports] })),
      setStatus: (id, st) =>
        setS((p) => {
          const r = p.reports.find((x) => x.id === id);
          const rep = [...p.rep];
          // the owner's confirmation is what earns reputation, once
          if (r?.mine && st === "confirmed" && r.status === "new") {
            const proj = p.projects.find((x) => x.id === r.projectId);
            rep.push({ at: Date.now(), points: SEV_POINTS[r.severity], why: `«${r.title}» — ${proj?.name ?? "проект"}` });
          }
          return { ...p, rep, reports: p.reports.map((x) => (x.id === id ? { ...x, status: st } : x)) };
        }),
      reset: () => setS(fresh()),
    };
  }, [s, ollama, refreshOllama]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

export const uid = () => Math.random().toString(36).slice(2, 9);
