import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { TeacherIdSchema } from '../dto/common.dto';

const prisma = new PrismaClient();

export class TeacherController {
  async getAll(req: AuthRequest, res: Response) {
    const teachers = await prisma.teacher.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    const response: any = teachers.map((teacher: any) => ({
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    }));

    return res.status(200).json(response);
  }

  async getById(req: AuthRequest, res: Response) {
    const { id } = TeacherIdSchema.parse(req.params);

    const teacher = await prisma.teacher.findUnique({
      where: { id },
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const response: any = { ...teacher };

    return res.status(200).json(response);
  }
}
