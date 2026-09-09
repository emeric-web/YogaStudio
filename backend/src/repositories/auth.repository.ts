import { PrismaClient } from '@prisma/client';

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  admin: boolean;
}

export class AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  createUser(data: CreateUserData) {
    return this.prisma.user.create({ data });
  }
}
