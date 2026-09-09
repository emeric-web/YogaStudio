import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserIdSchema } from '../dto/common.dto';

const prisma = new PrismaClient();

export class UserController {
  async getById(req: AuthRequest, res: Response) {
    const { id } = UserIdSchema.parse(req.params);

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, ...response } = user;

    return res.status(200).json(response);
  }

  async delete(req: AuthRequest, res: Response) {
    const { id } = UserIdSchema.parse(req.params);

    if (req.userId !== id) {
      return res.status(403).json({ message: 'You can only delete your own account' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await prisma.user.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'User deleted successfully' });
  }

  async promoteSelfToAdmin(req: AuthRequest, res: Response) {
    const isDev = (process.env.NODE_ENV || 'development') === 'development';
    if (!isDev) {
      return res.status(403).json({ message: 'Admin self-promotion is only available in development' });
    }

    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.admin) {
      const { password, ...response } = user;

      return res.status(200).json(response);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { admin: true },
    });

    const { password, ...response } = updatedUser;

    return res.status(200).json(response);
  }
}
