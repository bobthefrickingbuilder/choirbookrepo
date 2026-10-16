import { z } from 'zod';

// The question format stored in forms.fields (built by staff in Phase 4).

export const fieldSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]{1,40}$/),
  type: z.enum(['text', 'textarea', 'checkbox', 'select']),
  label_en: z.string(),
  label_fr: z.string(),
  required: z.boolean().optional(),
  options: z.array(z.object({ value: z.string(), label_en: z.string(), label_fr: z.string() })).optional(),
});
export type FormField = z.infer<typeof fieldSchema>;

export function parseFields(raw: unknown): FormField[] {
  const parsed = z.array(fieldSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}

export type Answers = Record<string, string | boolean>;

/** Keeps only answers to real questions, with the right type, and lists missing required ones. */
export function cleanAnswers(fields: FormField[], answers: Answers): { clean: Answers; missing: string[] } {
  const clean: Answers = {};
  const missing: string[] = [];
  for (const f of fields) {
    const v = answers[f.id];
    if (f.type === 'checkbox') {
      clean[f.id] = v === true;
      if (f.required && v !== true) missing.push(f.id);
    } else {
      const s = typeof v === 'string' ? v.trim().slice(0, 2000) : '';
      if (f.type === 'select' && s && !f.options?.some((o) => o.value === s)) continue;
      if (s) clean[f.id] = s;
      if (f.required && !s) missing.push(f.id);
    }
  }
  return { clean, missing };
}
