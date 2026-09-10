import { z } from "zod";

export const createIdParamSchema = (resource: string) =>
  z.object({
    id: z.coerce
      .number({ error: `Invalid ${resource} ID` })
      .int({ error: `Invalid ${resource} ID` })
      .positive({ error: `Invalid ${resource} ID` }),
  });

export const SessionIdParamsSchema = createIdParamSchema('session');
export const UserIdParamsSchema = createIdParamSchema('user');
export const TeacherIdParamsSchema = createIdParamSchema('teacher');
