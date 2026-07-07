import { z } from "zod";

export const participantSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  language: z.enum(["de", "en"]),
  roleDescription: z.string().max(255),
  about: z.string().max(255),
  orgUnitId: z.string().optional()
});

export const orgUnitSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(255),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  parentId: z.string().optional()
});

export const objectiveSchema = z.object({
  description: z.string().trim().min(1).max(255),
  quarter: z.number().int().min(1).max(4),
  year: z.number().int().min(2000).max(9999),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.enum(["quarterly", "strategic"]),
  owner: z.union([
    z.object({ kind: z.literal("participant"), id: z.string().min(1) }),
    z.object({ kind: z.literal("orgUnit"), id: z.string().min(1) })
  ])
});

export const keyResultSchema = z.object({
  description: z.string().trim().min(1).max(255),
  startValue: z.number(),
  targetValue: z.number(),
  currentValue: z.number(),
  stepSize: z.number().min(0.01),
  weight: z.number().int().min(1),
  resultType: z.string().max(20)
}).superRefine((value, context) => {
  const range = Math.abs(value.targetValue - value.startValue);
  const minValue = Math.min(value.startValue, value.targetValue);
  const maxValue = Math.max(value.startValue, value.targetValue);

  if (range === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["targetValue"], message: "Startwert und Zielwert dürfen nicht identisch sein." });
  }
  if (value.stepSize > range) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["stepSize"], message: "Schrittgröße darf nicht größer als der Wertebereich sein." });
  }
  if (range > 0 && !dividesRange(range, value.stepSize)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["stepSize"], message: "Schrittgröße teilt den Wertebereich nicht ganzzahlig." });
  }
  if (value.currentValue < minValue || value.currentValue > maxValue) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["currentValue"], message: "Aktueller Wert muss zwischen Startwert und Zielwert liegen." });
  }
});

export function dividesRange(range: number, stepSize: number): boolean {
  if (stepSize <= 0) return false;
  const precision = 1_000_000;
  const scaledRange = Math.round(range * precision);
  const scaledStep = Math.round(stepSize * precision);
  return scaledStep > 0 && scaledRange % scaledStep === 0;
}

export const commentSchema = z.object({
  text: z.string().trim().min(1).max(2000)
});
