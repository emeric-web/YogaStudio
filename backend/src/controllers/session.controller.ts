import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  CreateSessionBodySchema,
  SessionParticipationParamsSchema,
  UpdateSessionBodySchema,
} from '../dto/session.dto';
import { SessionIdParamsSchema } from '../dto/common.dto';
import { SessionService } from '../services/session.service';

export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  async getAll(_req: AuthRequest, res: Response) {
    const result = await this.sessionService.getAll();

    return res.status(200).json(result);
  }

  async getByIdWithDetails(req: AuthRequest, res: Response) {
    const sessionId = SessionIdParamsSchema.parse(req.params).id;
    const result = await this.sessionService.getByIdWithDetails(sessionId);

    if (!result) {
      return res.status(404).json({ message: 'Session not found' });
    }

    return res.status(200).json(result);
  }

  async create(req: AuthRequest, res: Response) {
    const data = CreateSessionBodySchema.parse(req.body);
    const result = await this.sessionService.create(data, req.userId);

    if (result.status === 'forbidden') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    if (result.status === 'teacherNotFound') {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    return res.status(201).json(result.session);
  }

  async update(req: AuthRequest, res: Response) {
    const sessionId = SessionIdParamsSchema.parse(req.params).id;
    const data = UpdateSessionBodySchema.parse(req.body);
    const result = await this.sessionService.update(sessionId, data, req.userId);

    if (result.status === 'forbidden') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    if (result.status === 'sessionNotFound') {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (result.status === 'teacherNotFound') {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    return res.status(200).json(result);
  }

  async delete(req: AuthRequest, res: Response) {
    const sessionId = SessionIdParamsSchema.parse(req.params).id;
    const result = await this.sessionService.delete(sessionId, req.userId);

    if (result.status === 'forbidden') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    if (result.status === 'sessionNotFound') {
      return res.status(404).json({ message: 'Session not found' });
    }

    return res.status(200).json({ message: 'Session deleted successfully' });
  }

  async participate(req: AuthRequest, res: Response) {
    const { userId, id } = SessionParticipationParamsSchema.parse(req.params);
    const result = await this.sessionService.participate(id, userId);

    if (result.status === 'sessionNotFound') {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (result.status === 'userNotFound') {
      return res.status(404).json({ message: 'User not found' });
    }

    if (result.status === 'alreadyParticipating') {
      return res.status(400).json({ message: 'User already participating in this session' });
    }

    return res.status(200).json({ message: 'Successfully joined the session' });
  }

  async unparticipate(req: AuthRequest, res: Response) {
    const { userId, id } = SessionParticipationParamsSchema.parse(req.params);
    const result = await this.sessionService.unparticipate(id, userId);

    if (result.status === 'participationNotFound') {
      return res.status(404).json({ message: 'Participation not found' });
    }

    return res.status(200).json({ message: 'Successfully left the session' });
  }
}
