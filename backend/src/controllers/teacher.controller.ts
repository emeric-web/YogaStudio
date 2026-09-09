import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TeacherIdSchema } from '../dto/common.dto';
import { TeacherService } from '../services/teacher.service';

export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  async getAll(_req: AuthRequest, res: Response) {
    const teachers = await this.teacherService.getAll();

    return res.status(200).json(teachers);
  }

  async getById(req: AuthRequest, res: Response) {
    const { id } = TeacherIdSchema.parse(req.params);
    const teacher = await this.teacherService.getById(id);

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    return res.status(200).json(teacher);
  }
}
