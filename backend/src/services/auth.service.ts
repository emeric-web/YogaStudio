import { AuthRepository } from '../repositories/auth.repository';

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  admin: boolean;
}

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  findUserByEmail(email: string) {
    return this.authRepository.findUserByEmail(email);
  }

  createUser(data: CreateUserData) {
    return this.authRepository.createUser(data);
  }
}
