import type { KeyResult } from "./types";

export function keyResultProgress(keyResult: Pick<KeyResult, "startValue" | "targetValue" | "currentValue" | "weight">): number {
  const range = Math.max(keyResult.startValue, keyResult.targetValue) - Math.min(keyResult.startValue, keyResult.targetValue);
  if (range === 0) return 100 * keyResult.weight;
  const distance = Math.abs(keyResult.currentValue - keyResult.startValue);
  return Math.min((distance / range) * 100, 100) * keyResult.weight;
}

export function objectiveProgress(keyResults: Array<Pick<KeyResult, "startValue" | "targetValue" | "currentValue" | "weight" | "deletedAt">>): number {
  const active = keyResults.filter((keyResult) => !keyResult.deletedAt);
  if (active.length === 0) return 0;
  const totalWeight = active.reduce((sum, keyResult) => sum + keyResult.weight, 0);
  if (totalWeight === 0) return 0;
  const weightedProgress = active.reduce((sum, keyResult) => sum + keyResultProgress(keyResult), 0);
  return weightedProgress / totalWeight;
}

export function progressForValue(keyResult: Pick<KeyResult, "startValue" | "targetValue">, value: number): number {
  const range = Math.max(keyResult.startValue, keyResult.targetValue) - Math.min(keyResult.startValue, keyResult.targetValue);
  if (range === 0) return 100;
  return Math.min((Math.abs(value - keyResult.startValue) / range) * 100, 100);
}
