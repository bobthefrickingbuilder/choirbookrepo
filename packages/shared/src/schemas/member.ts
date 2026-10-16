import { z } from 'zod';

// Validation for what a member submits. Error messages are i18n keys.

export const absenceSchema = z.object({
  eventId: z.uuid(),
  kind: z.enum(['absent', 'late']),
  reason: z.string().trim().min(1, { error: 'validation.required' }).max(500),
});

export const availabilitySchema = z.object({
  eventId: z.uuid(),
  answer: z.enum(['yes', 'no', 'maybe']),
  comment: z.string().trim().max(500).optional(),
});

export const practiceLogSchema = z.object({
  pieceId: z.uuid().nullable(),
  minutes: z.coerce.number().int().min(1, { error: 'validation.minutes' }).max(600, { error: 'validation.minutes' }),
  note: z.string().trim().max(500).optional(),
});

export const messageSchema = z.object({
  body: z.string().trim().min(1, { error: 'validation.required' }).max(5000),
});

export const newConversationSchema = messageSchema.extend({
  subject: z.string().trim().min(1, { error: 'validation.required' }).max(200),
  category: z.enum(['absence', 'music', 'fees', 'general']),
});

export const reportMessageSchema = z.object({
  messageId: z.uuid(),
  reason: z.string().trim().min(1, { error: 'validation.required' }).max(1000),
});

export const profileSchema = z.object({
  preferredName: z.string().trim().max(80).optional(),
  pronouns: z.string().trim().max(40).optional(),
  phone: z.string().trim().max(40).optional(),
  contactVisibility: z.enum(['private', 'choir']),
});
