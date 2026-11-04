export type Severity = "critical" | "high" | "medium" | "low";

export const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

export const SEV_LABEL: Record<Severity, string> = {
  critical: "Критическая",
  high: "Высокая",
  medium: "Средняя",
  low: "Низкая",
};

/** Reputation a specialist earns when the owner confirms a finding. */
export const SEV_POINTS: Record<Severity, number> = { critical: 100, high: 50, medium: 25, low: 10 };

export const sevRank = (s: Severity) => SEVERITIES.indexOf(s);

export interface CodeFinding {
  line: number;
  title: string;
  severity: Severity;
  cwe: string;
  why: string;
  fix: string;
}

/** A finding after merging the rule scanner and every model's answer. */
export interface MergedFinding extends CodeFinding {
  key: string;
  sources: string[]; // "rules" or model names
}
