import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { user } from '../fixtures';
import { prisma, resetPrismaMocks } from '../integration.setup';

const { default: app } = await import('../../src/app');

describe('UserController', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.stubEnv('NODE_ENV', 'development');
  });

  it('retourne le profil sans mot de passe', async () => {
    const response = await request(app)
      .get('/api/user/7')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: user.id, email: user.email });
    expect(response.body).not.toHaveProperty('password');
  });

  it('signale un profil absent', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/user/99')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'User not found' });
  });

  it('supprime son propre compte', async () => {
    const response = await request(app)
      .delete('/api/user/7')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'User deleted successfully' });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 7 } });
  });

  it('refuse la suppression du compte d’un autre utilisateur', async () => {
    const response = await request(app)
      .delete('/api/user/8')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: 'You can only delete your own account' });
  });

  it('signale un compte absent lors de la suppression', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .delete('/api/user/7')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'User not found' });
  });

  it('promeut son compte en développement', async () => {
    prisma.user.update.mockResolvedValue({ ...user, admin: true });

    const response = await request(app)
      .post('/api/user/promote-admin')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: user.id, admin: true });
  });

  it('interdit la promotion hors développement', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const response = await request(app)
      .post('/api/user/promote-admin')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: 'Admin self-promotion is only available in development' });
  });

  it('signale un utilisateur absent lors de la promotion', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/user/promote-admin')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'User not found' });
  });

  it('ne modifie pas un compte déjà administrateur', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, admin: true });

    const response = await request(app)
      .post('/api/user/promote-admin')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: user.id, admin: true });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});