import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { user } from '../fixtures';
import { prisma, resetPrismaMocks } from '../integration.setup';

const { default: app } = await import('../../src/app');
const bcrypt = await import('bcrypt');
const compare = vi.mocked(bcrypt.compare) as unknown as ReturnType<typeof vi.fn<(password: string, hash: string) => Promise<boolean>>>;
const hash = vi.mocked(bcrypt.hash) as unknown as ReturnType<typeof vi.fn<(password: string, rounds: number) => Promise<string>>>;

describe('AuthController', () => {
  beforeEach(() => {
    resetPrismaMocks();
    compare.mockResolvedValue(true);
    hash.mockResolvedValue('hashed-password');
  });

  it('connecte un utilisateur et retourne son jeton', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'plain-password' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: user.id, email: user.email, token: 'signed-token' });
    expect(response.body).not.toHaveProperty('password');
  });

  it('refuse des identifiants incorrects', async () => {
    compare.mockResolvedValue(false);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Invalid credentials' });
  });

  it('valide les données de connexion', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'invalid-email' });

    expect(response.status).toBe(400);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('inscrit un utilisateur', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: user.email, firstName: 'Alice', lastName: 'Martin', password: 'password123' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ id: user.id, token: 'signed-token' });
    expect(prisma.user.create).toHaveBeenCalledOnce();
  });

  it('refuse une adresse déjà utilisée', async () => {
    prisma.user.findUnique.mockResolvedValue(user);

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: user.email, firstName: 'Alice', lastName: 'Martin', password: 'password123' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Email already exists' });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});