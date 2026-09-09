import { Prisma, PrismaClient } from '@prisma/client';

const sessionDetails = {
  teacher: true,
  participants: {
    include: {
      user: true,
    },
  },
} satisfies Prisma.SessionInclude;

interface CreateSessionData {
  name: string;
  date: Date;
  description: string;
  teacherId: number;
}

interface UpdateSessionData {
  name?: string;
  date?: Date;
  description?: string;
  teacherId?: number;
}

export class SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll() {
    return this.prisma.session.findMany({ include: sessionDetails });
  }

  findById(id: number) {
    return this.prisma.session.findUnique({ where: { id } });
  }

  findByIdWithDetails(id: number) {
    return this.prisma.session.findUnique({
      where: { id },
      include: sessionDetails,
    });
  }

  findUserById(id?: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findTeacherById(id: number) {
    return this.prisma.teacher.findUnique({ where: { id } });
  }

  create(data: CreateSessionData) {
    return this.prisma.session.create({
      data,
      include: {
        teacher: true,
        participants: true,
      },
    });
  }

  update(id: number, data: UpdateSessionData) {
    return this.prisma.session.update({
      where: { id },
      data,
      include: sessionDetails,
    });
  }

  delete(id: number) {
    return this.prisma.session.delete({ where: { id } });
  }

  findParticipation(sessionId: number, userId: number) {
    return this.prisma.sessionParticipation.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
  }

  createParticipation(sessionId: number, userId: number) {
    return this.prisma.sessionParticipation.create({
      data: { sessionId, userId },
    });
  }

  deleteParticipation(sessionId: number, userId: number) {
    return this.prisma.sessionParticipation.delete({
      where: { sessionId_userId: { sessionId, userId } },
    });
  }
}
