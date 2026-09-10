import { z } from 'zod';

export const CreateSessionBodySchema = z.object({
  name: z.string().min(3).max(50),
  date: z.string(),
  description: z.string().max(2500),
  teacherId: z.number(),
});

export const UpdateSessionBodySchema = z.object({
  name: z.string().min(3).max(50).optional(),
  date: z.string().optional(),
  description: z.string().max(2500).optional(),
  teacherId: z.number().optional(),
});

export const SessionParticipationParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
});

export type CreateSessionDto = z.infer<typeof CreateSessionBodySchema>;
export type UpdateSessionDto = z.infer<typeof UpdateSessionBodySchema>;
export type SessionParticipationParamsDto = z.infer<typeof SessionParticipationParamsSchema>;
