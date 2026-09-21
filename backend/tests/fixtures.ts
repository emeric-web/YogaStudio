import type { Prisma, Teacher, User } from '@prisma/client';

export const user: User = {
  id: 7,
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Martin',
  password: 'hashed-password',
  admin: false,
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-02T10:00:00Z'),
};

export const publicUser = {
  id: 7,
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Martin',
  admin: false,
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-02T10:00:00Z'),
};

export const teacher: Teacher = {
  id: 3,
  firstName: 'Marie',
  lastName: 'Durand',
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-01T10:00:00Z'),
};

export const session: Prisma.SessionGetPayload<{
  include: { teacher: true; participants: { include: { user: true } } };
}> = {
  id: 12,
  name: 'Yoga du matin',
  date: new Date('2026-10-01T00:00:00Z'),
  description: 'Une séance douce',
  teacherId: teacher.id,
  teacher,
  participants: [{ sessionId: 12, userId: user.id, user }],
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-02T10:00:00Z'),
};

export const publicSession = {
  id: 12,
  name: 'Yoga du matin',
  date: new Date('2026-10-01T00:00:00Z'),
  description: 'Une séance douce',
  teacher: { id: 3, firstName: 'Marie', lastName: 'Durand' },
  users: [7],
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-02T10:00:00Z'),
};
