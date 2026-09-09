import { z } from "zod";

export const createIdParamSchema = (resource: string) =>
  z.object({
    id: z.coerce
      .number({ error: `Invalid ${resource} ID` })
      .int({ error: `Invalid ${resource} ID` })
      .positive({ error: `Invalid ${resource} ID` }),
  });

export const SessionIdSchema = createIdParamSchema('session');
export const UserIdSchema = createIdParamSchema('user');
export const TeacherIdSchema = createIdParamSchema('teacher');
