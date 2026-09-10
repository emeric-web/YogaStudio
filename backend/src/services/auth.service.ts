import * as bcrypt from 'bcrypt';
import { AuthRepository } from '../repositories/auth.repository';
import { LoginDto, RegisterDto } from '../dto/auth.dto';
import { generateToken } from '../utils/jwt.util';

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async login({ email, password }: LoginDto) {
    const user = await this.authRepository.findUserByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      token: generateToken(user.id),
    };
  }

  async register(data: RegisterDto) {
    const existingUser = await this.authRepository.findUserByEmail(data.email);

    if (existingUser) {
      return null;
    }

    const user = await this.authRepository.createUser({
      ...data,
      password: await bcrypt.hash(data.password, 10),
      admin: false,
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      token: generateToken(user.id),
    };
  }
}
