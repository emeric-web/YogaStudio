import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt.util';
import { LoginSchema, RegisterSchema } from '../dto/auth.dto';
import { AuthService } from '../services/auth.service';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async login(req: Request, res: Response) {
    const { email, password } = LoginSchema.parse(req.body);

    const user = await this.authService.findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    const response: any = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      token,
    };

    return res.status(200).json(response);
  }

  async register(req: Request, res: Response) {
    const { email, password, firstName, lastName } = RegisterSchema.parse(req.body);

    const existingUser = await this.authService.findUserByEmail(email);

    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.authService.createUser({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      admin: false,
    });

    const token = generateToken(user.id);

    const response: any = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      token,
    };

    return res.status(201).json(response);
  }
}
