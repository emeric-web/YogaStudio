import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { CreateSessionSchema, UpdateSessionSchema } from '../dto/session.dto';
import { SessionIdSchema } from '../dto/common.dto';
import { SessionService, UpdateSessionData } from '../services/session.service';

export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  async getAll(_req: AuthRequest, res: Response) {
    const sessions = await this.sessionService.getAll();

    const response: any = sessions.map((session: any) => ({
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

    return res.status(200).json(response);
  }

  async getById(req: AuthRequest, res: Response) {
    const { id } = req.params as { id: string };

    if (!id) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    const sessionId = parseInt(id);

    if (isNaN(sessionId)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }

    const session = await this.sessionService.getByIdWithDetails(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const response: any = {
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
    };

    return res.status(200).json(response);
  }

  async create(req: AuthRequest, res: Response) {
    const { name, date, description, teacherId } = CreateSessionSchema.parse(req.body);

    const user = await this.sessionService.getUserById(req.userId);

    if (!user || !user.admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const teacher = await this.sessionService.getTeacherById(teacherId);

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const session = await this.sessionService.create({
      name,
      date: new Date(date),
      description,
      teacherId,
    });

    const response: any = {
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
    };

    return res.status(201).json(response);
  }

  async update(req: AuthRequest, res: Response) {
    const sessionId = SessionIdSchema.parse(req.params).id;
    const { name, date, description, teacherId } = UpdateSessionSchema.parse(req.body);

    const user = await this.sessionService.getUserById(req.userId);

    if (!user || !user.admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const existingSession = await this.sessionService.getById(sessionId);

    if (!existingSession) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const updateData: UpdateSessionData = {};
    if (name) updateData.name = name;
    if (date) updateData.date = new Date(date);
    if (description) updateData.description = description;
    if (teacherId) {
      const teacher = await this.sessionService.getTeacherById(teacherId);
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }
      updateData.teacherId = teacherId;
    }

    const session = await this.sessionService.update(sessionId, updateData);

    const response: any = {
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
    };

    return res.status(200).json(response);
  }

  async delete(req: AuthRequest, res: Response) {
    const sessionId = SessionIdSchema.parse(req.params).id;

    const user = await this.sessionService.getUserById(req.userId);

    if (!user || !user.admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const existingSession = await this.sessionService.getById(sessionId);

    if (!existingSession) {
      return res.status(404).json({ message: 'Session not found' });
    }

    await this.sessionService.delete(sessionId);

    return res.status(200).json({ message: 'Session deleted successfully' });
  }

  async participate(req: AuthRequest, res: Response) {
    const sessionId = SessionIdSchema.parse(req.params).id;
    const { userId } = req.params as { userId: string };

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const participantUserId = parseInt(userId);

    if (isNaN(participantUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const session = await this.sessionService.getById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const user = await this.sessionService.getUserById(participantUserId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingParticipation = await this.sessionService.getParticipation(
      sessionId,
      participantUserId,
    );

    if (existingParticipation) {
      return res.status(400).json({ message: 'User already participating in this session' });
    }

    await this.sessionService.createParticipation(sessionId, participantUserId);

    return res.status(200).json({ message: 'Successfully joined the session' });
  }

  async unparticipate(req: AuthRequest, res: Response) {
    const sessionId = SessionIdSchema.parse(req.params).id;
    const { userId } = req.params as { userId: string };

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const participantUserId = parseInt(userId);

    if (isNaN(participantUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const participation = await this.sessionService.getParticipation(sessionId, participantUserId);

    if (!participation) {
      return res.status(404).json({ message: 'Participation not found' });
    }

    await this.sessionService.deleteParticipation(sessionId, participantUserId);

    return res.status(200).json({ message: 'Successfully left the session' });
  }
}
