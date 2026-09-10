import { Request, Response } from 'express';
import { LoginSchema, RegisterSchema } from '../dto/auth.dto';
import { AuthService } from '../services/auth.service';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async login(req: Request, res: Response) {
    const credentials = LoginSchema.parse(req.body);
    const result = await this.authService.login(credentials);

    if (!result) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    return res.status(200).json(result);
  }

  async register(req: Request, res: Response) {
    const data = RegisterSchema.parse(req.body);
    const result = await this.authService.register(data);

    if (!result) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    return res.status(201).json(result);
  }
}
