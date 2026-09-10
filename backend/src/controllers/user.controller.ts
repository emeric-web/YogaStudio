import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserIdParamsSchema } from '../dto/common.dto';
import { UserService } from '../services/user.service';

export class UserController {
  constructor(private readonly userService: UserService) { }

  async getById(req: AuthRequest, res: Response) {
    const { id } = UserIdParamsSchema.parse(req.params);
    const result = await this.userService.getById(id);

    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(result);
  }

  async delete(req: AuthRequest, res: Response) {
    const { id } = UserIdParamsSchema.parse(req.params);
    const result = await this.userService.delete(id, req.userId);

    if (result.status === 'forbidden') {
      return res.status(403).json({ message: 'You can only delete your own account' });
    }

    if (result.status === 'notFound') {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'User deleted successfully' });
  }

  async promoteSelfToAdmin(req: AuthRequest, res: Response) {

    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await this.userService.promoteSelfToAdmin(req.userId);

    if (result.status === 'notDevelopment') {
      return res.status(403).json({ message: 'Admin self-promotion is only available in development' });
    }

    if (result.status === 'notFound') {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(result.user);
  }
}
