import { UserRepository } from '../repositories/user.repository';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  getById(id: number) {
    return this.userRepository.findById(id);
  }

  delete(id: number) {
    return this.userRepository.deleteById(id);
  }

  promoteToAdmin(id: number) {
    return this.userRepository.promoteToAdmin(id);
  }
}
