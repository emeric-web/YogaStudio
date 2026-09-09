import { SessionRepository } from '../repositories/session.repository';

interface CreateSessionData {
  name: string;
  date: Date;
  description: string;
  teacherId: number;
}

export interface UpdateSessionData {
  name?: string;
  date?: Date;
  description?: string;
  teacherId?: number;
}

export class SessionService {
  constructor(private readonly sessionRepository: SessionRepository) {}

  getAll() {
    return this.sessionRepository.findAll();
  }

  getById(id: number) {
    return this.sessionRepository.findById(id);
  }

  getByIdWithDetails(id: number) {
    return this.sessionRepository.findByIdWithDetails(id);
  }

  getUserById(id?: number) {
    return this.sessionRepository.findUserById(id);
  }

  getTeacherById(id: number) {
    return this.sessionRepository.findTeacherById(id);
  }

  create(data: CreateSessionData) {
    return this.sessionRepository.create(data);
  }

  update(id: number, data: UpdateSessionData) {
    return this.sessionRepository.update(id, data);
  }

  delete(id: number) {
    return this.sessionRepository.delete(id);
  }

  getParticipation(sessionId: number, userId: number) {
    return this.sessionRepository.findParticipation(sessionId, userId);
  }

  createParticipation(sessionId: number, userId: number) {
    return this.sessionRepository.createParticipation(sessionId, userId);
  }

  deleteParticipation(sessionId: number, userId: number) {
    return this.sessionRepository.deleteParticipation(sessionId, userId);
  }
}
