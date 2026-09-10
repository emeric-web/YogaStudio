import { CreateSessionDto, UpdateSessionDto } from '../dto/session.dto';
import { SessionRepository } from '../repositories/session.repository';

export interface UpdateSessionData {
  name?: string;
  date?: Date;
  description?: string;
  teacherId?: number;
}

export class SessionService {
  constructor(private readonly sessionRepository: SessionRepository) { }

  async getAll() {
    const sessions = await this.sessionRepository.findAll();

    return sessions.map((session: any) => ({
      id: session.id,
      name: session.name,
      date: session.date,
      description: session.description,
      teacher: {
        id: session.teacher.id,
        firstName: session.teacher.firstName,
        lastName: session.teacher.lastName,
      },
      users: session.participants.map((p: any) => p.user.id),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));
  }

  getById(id: number) {
    return this.sessionRepository.findById(id);
  }

  async getByIdWithDetails(id: number) {
    const session = await this.sessionRepository.findByIdWithDetails(id);

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      name: session.name,
      date: session.date,
      description: session.description,
      teacher: {
        id: session.teacher.id,
        firstName: session.teacher.firstName,
        lastName: session.teacher.lastName,
      },
      users: session.participants.map((p: any) => p.user.id),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }
  }

  getUserById(id?: number) {
    return this.sessionRepository.findUserById(id);
  }

  getTeacherById(id: number) {
    return this.sessionRepository.findTeacherById(id);
  }

  async create(data: CreateSessionDto, userId?: number) {
    const user = await this.sessionRepository.findUserById(userId);

    if (!user || !user.admin) {
      return { status: 'forbidden' as const };
    }

    const teacher = await this.sessionRepository.findTeacherById(data.teacherId);

    if (!teacher) {
      return { status: 'teacherNotFound' as const };
    }

    const session = await this.sessionRepository.create({
      ...data,
      date: new Date(data.date),
    })

    return {
      status: 'created' as const,
      session: {
        id: session.id,
        name: session.name,
        date: session.date,
        description: session.description,
        teacher: {
          id: session.teacher.id,
          firstName: session.teacher.firstName,
          lastName: session.teacher.lastName,
        },
        users: [],
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }
    };
  }

  async update(sessionId: number, data: UpdateSessionDto, userId?: number) {
    const user = await this.sessionRepository.findUserById(userId);

    if (!user || !user.admin) {
      return { status: 'forbidden' as const };
    }

    const existingSession = await this.sessionRepository.findById(sessionId);
    if (!existingSession) {
      return { status: 'sessionNotFound' as const };
    }

    const updateData: UpdateSessionData = {};
    if (data.name) updateData.name = data.name;
    if (data.date) updateData.date = new Date(data.date);
    if (data.description) updateData.description = data.description;
    if (data.teacherId) {
      const teacher = await this.sessionRepository.findTeacherById(data.teacherId);
      if (!teacher) {
        return { status: 'teacherNotFound' as const };
      }
      updateData.teacherId = data.teacherId;
    }

    const updatedSession = await this.sessionRepository.update(sessionId, updateData);

    return {
      id: updatedSession.id,
      name: updatedSession.name,
      date: updatedSession.date,
      description: updatedSession.description,
      teacher: {
        id: updatedSession.teacher.id,
        firstName: updatedSession.teacher.firstName,
        lastName: updatedSession.teacher.lastName,
      },
      users: updatedSession.participants.map((p: any) => p.user.id),
      createdAt: updatedSession.createdAt,
      updatedAt: updatedSession.updatedAt,
    };
  }

  async delete(id: number, userId?: number) {
    const user = await this.sessionRepository.findUserById(userId);

    if (!user || !user.admin) {
      return { status: 'forbidden' as const };
    }

    const existingSession = await this.sessionRepository.findById(id);

    if (!existingSession) {
      return { status: 'sessionNotFound' as const };
    }

    await this.sessionRepository.delete(id);

    return { status: 'deleted' as const };
  }

  async participate(sessionId: number, userId: number) {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      return { status: 'sessionNotFound' as const };
    }

    const user = await this.sessionRepository.findUserById(userId);
    if (!user) {
      return { status: 'userNotFound' as const };
    }

    const existingParticipation = await this.sessionRepository.findParticipation(sessionId, userId);
    if (existingParticipation) {
      return { status: 'alreadyParticipating' as const };
    }

    await this.sessionRepository.createParticipation(sessionId, userId);
    return { status: 'sessionJoined' as const };
  }

  async unparticipate(sessionId: number, userId: number) {
    const session = await this.sessionRepository.findParticipation(sessionId, userId);
    if (!session) {
      return { status: 'participationNotFound' as const };
    }

    await this.sessionRepository.deleteParticipation(sessionId, userId);
    return { status: 'sessionLeft' as const };
  }
}
