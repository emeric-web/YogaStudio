import { vi } from 'vitest';
import { teacher, user } from './fixtures';

export const prisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  teacher: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  session: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  sessionParticipation: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock('../src/database/prisma', () => ({ prisma }));
vi.mock('bcrypt', () => ({ compare: vi.fn(), hash: vi.fn() }));
vi.mock('../src/utils/jwt.util', () => ({
  generateToken: vi.fn(() => 'signed-token'),
  verifyToken: vi.fn(() => ({ userId: user.id })),
}));

export function resetPrismaMocks() {
  vi.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(user);
  prisma.user.create.mockResolvedValue(user);
  prisma.teacher.findMany.mockResolvedValue([teacher]);
  prisma.teacher.findUnique.mockResolvedValue(teacher);
  prisma.sessionParticipation.findUnique.mockResolvedValue(null);
}