import { PrismaClient } from '@prisma/client';

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  deleteById(id: number) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  promoteToAdmin(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { admin: true },
    });
  }
}
