import { TeacherRepository } from '../repositories/teacher.repository';

export class TeacherService {
  constructor(private readonly teacherRepository: TeacherRepository) {}

  getAll() {
    return this.teacherRepository.findAll();
  }

  getById(id: number) {
    return this.teacherRepository.findById(id);
  }
}
