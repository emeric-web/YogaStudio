import { UserRepository } from '../repositories/user.repository';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getById(id: number) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async delete(id: number, authenticatedUserId?: number) {
    if (authenticatedUserId !== id) {
      return { status: 'forbidden' as const };
    }

    const user = await this.getById(id);

    if (!user) {
      return { status: 'notFound' as const };
    }

    await this.userRepository.deleteById(id);

    return { status: 'deleted' as const };
  }

  async promoteSelfToAdmin(id: number) {
    const isDev = (process.env.NODE_ENV || 'development') === 'development';
    if (!isDev) {
      return { status: 'notDevelopment' as const };
    }

    const user = await this.getById(id);
    
    if (!user) {
      return { status: 'notFound' as const };
    }

    if (user.admin) {
      return {
        status: 'alreadyAdmin' as const,
        user,
      };
    }
    
    const updatedUser = await this.userRepository.promoteToAdmin(id);

    return {
      status: 'promoted' as const,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        admin: updatedUser.admin,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    };
  }
}
