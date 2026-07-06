import type { Objective, Quarter } from "./types";

export function currentQuarter(now = new Date()): Quarter {
  return { quarter: Math.floor(now.getMonth() / 3) + 1, year: now.getFullYear() };
}

export function previousQuarter(value: Quarter): Quarter {
  return value.quarter === 1 ? { quarter: 4, year: value.year - 1 } : { quarter: value.quarter - 1, year: value.year };
}

export function nextQuarter(value: Quarter): Quarter {
  return value.quarter === 4 ? { quarter: 1, year: value.year + 1 } : { quarter: value.quarter + 1, year: value.year };
}

export function quarterStart({ quarter, year }: Quarter): string {
  const month = (quarter - 1) * 3;
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

export function quarterEnd({ quarter, year }: Quarter): string {
  const month = quarter * 3;
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

export function isPastQuarter(value: Quarter, now = new Date()): boolean {
  const current = currentQuarter(now);
  return value.year < current.year || (value.year === current.year && value.quarter < current.quarter);
}

export function objectiveVisibleInQuarter(objective: Objective, selected: Quarter): boolean {
  if (objective.deletedAt) return false;
  if (objective.type === "quarterly") return objective.quarter === selected.quarter && objective.year === selected.year;
  const start = objective.startDate ?? quarterStart({ quarter: objective.quarter, year: objective.year });
  const end = objective.endDate ?? quarterEnd({ quarter: objective.quarter, year: objective.year });
  return start <= quarterEnd(selected) && end >= quarterStart(selected);
}

export function quarterLabel(value: Quarter, locale: "de" | "en"): string {
  return locale === "de" ? `${value.quarter}. Quartal ${value.year}` : `Q${value.quarter} ${value.year}`;
}
