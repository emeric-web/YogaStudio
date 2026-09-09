import { PrismaClient } from '@prisma/client';

export class TeacherRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll() {
    return this.prisma.teacher.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findById(id: number) {
    return this.prisma.teacher.findUnique({
      where: { id },
    });
  }
}
