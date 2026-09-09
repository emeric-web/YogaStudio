import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string('Email is required').email(),
  password: z.string('Password is required').min(6),
});

export const RegisterSchema = z.object({
  email: z.string('Email is required').email(),
  firstName: z.string().min(2).max(20),
  lastName: z.string().min(2).max(20),
  password: z.string().min(8),
});

export type LoginDto = z.infer<typeof LoginSchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;
