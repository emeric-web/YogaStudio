import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { session, teacher, user } from '../fixtures';
import { prisma, resetPrismaMocks } from '../integration.setup';

const { default: app } = await import('../../src/app');

describe('SessionController', () => {
  beforeEach(() => resetPrismaMocks());

  it('retourne les séances', async () => {
    prisma.session.findMany.mockResolvedValue([session]);

    const response = await request(app)
      .get('/api/session')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ id: session.id, users: [user.id] });
  });

  it('retourne les détails d’une séance', async () => {
    prisma.session.findUnique.mockResolvedValue(session);

    const response = await request(app)
      .get('/api/session/12')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: session.id, teacher: { id: teacher.id }, users: [user.id] });
  });

  it('signale une séance absente', async () => {
    prisma.session.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/session/99')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Session not found' });
  });

  it('refuse la création à un utilisateur non administrateur', async () => {
    const response = await request(app)
      .post('/api/session')
      .set('Authorization', 'Bearer signed-token')
      .send({ name: 'Yoga du soir', date: '2026-11-01', description: 'Relaxation', teacherId: 3 });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: 'Admin access required' });
  });

  it('crée une séance pour un administrateur', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, admin: true });
    prisma.session.create.mockResolvedValue(session);

    const response = await request(app)
      .post('/api/session')
      .set('Authorization', 'Bearer signed-token')
      .send({ name: 'Yoga du soir', date: '2026-11-01', description: 'Relaxation', teacherId: 3 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ id: session.id, teacher: { id: teacher.id }, users: [] });
  });

  it('refuse la création avec un enseignant absent', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, admin: true });
    prisma.teacher.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/session')
      .set('Authorization', 'Bearer signed-token')
      .send({ name: 'Yoga du soir', date: '2026-11-01', description: 'Relaxation', teacherId: 99 });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Teacher not found' });
  });

  it('modifie une séance pour un administrateur', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, admin: true });
    prisma.session.findUnique.mockResolvedValue(session);
    prisma.session.update.mockResolvedValue({ ...session, name: 'Yoga du soir' });

    const response = await request(app)
      .put('/api/session/12')
      .set('Authorization', 'Bearer signed-token')
      .send({ name: 'Yoga du soir' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: session.id, name: 'Yoga du soir' });
  });

  it('refuse la modification à un utilisateur non administrateur', async () => {
    const response = await request(app)
      .put('/api/session/12')
      .set('Authorization', 'Bearer signed-token')
      .send({ name: 'Yoga du soir' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: 'Admin access required' });
  });

  it('signale une séance absente lors de la modification', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, admin: true });
    prisma.session.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .put('/api/session/99')
      .set('Authorization', 'Bearer signed-token')
      .send({ name: 'Yoga du soir' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Session not found' });
  });

  it('refuse une modification avec un enseignant absent', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, admin: true });
    prisma.session.findUnique.mockResolvedValue(session);
    prisma.teacher.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .put('/api/session/12')
      .set('Authorization', 'Bearer signed-token')
      .send({ teacherId: 99 });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Teacher not found' });
  });

  it('supprime une séance pour un administrateur', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, admin: true });
    prisma.session.findUnique.mockResolvedValue(session);

    const response = await request(app)
      .delete('/api/session/12')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Session deleted successfully' });
  });

  it('refuse la suppression à un utilisateur non administrateur', async () => {
    const response = await request(app)
      .delete('/api/session/12')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: 'Admin access required' });
  });

  it('signale une séance absente lors de la suppression', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, admin: true });
    prisma.session.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .delete('/api/session/99')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Session not found' });
  });

  it('inscrit un utilisateur à une séance', async () => {
    prisma.session.findUnique.mockResolvedValue(session);

    const response = await request(app)
      .post('/api/session/12/participate/7')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Successfully joined the session' });
    expect(prisma.sessionParticipation.create).toHaveBeenCalledWith({ data: { sessionId: 12, userId: 7 } });
  });

  it('refuse une participation à une séance absente', async () => {
    prisma.session.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/session/99/participate/7')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Session not found' });
  });

  it('refuse une participation pour un utilisateur absent', async () => {
    prisma.session.findUnique.mockResolvedValue(session);
    prisma.user.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/session/12/participate/99')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'User not found' });
  });

  it('refuse une participation déjà existante', async () => {
    prisma.session.findUnique.mockResolvedValue(session);
    prisma.sessionParticipation.findUnique.mockResolvedValue({ sessionId: 12, userId: 7 });

    const response = await request(app)
      .post('/api/session/12/participate/7')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'User already participating in this session' });
  });

  it('désinscrit un utilisateur d’une séance', async () => {
    prisma.sessionParticipation.findUnique.mockResolvedValue({ sessionId: 12, userId: 7 });

    const response = await request(app)
      .delete('/api/session/12/participate/7')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Successfully left the session' });
  });

  it('signale une participation absente lors de la désinscription', async () => {
    const response = await request(app)
      .delete('/api/session/12/participate/7')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Participation not found' });
  });
});