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
  stepSize: z.number().positive(),
  weight: z.number().positive(),
  resultType: z.string().max(20)
});

export const commentSchema = z.object({
  text: z.string().trim().min(1).max(2000)
});
