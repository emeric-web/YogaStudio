import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { teacher } from '../fixtures';
import { prisma, resetPrismaMocks } from '../integration.setup';

const { default: app } = await import('../../src/app');

describe('TeacherController', () => {
  beforeEach(() => resetPrismaMocks());

  it('retourne la liste des enseignants', async () => {
    const response = await request(app)
      .get('/api/teacher')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([JSON.parse(JSON.stringify(teacher))]);
  });

  it('retourne un enseignant par son identifiant', async () => {
    const response = await request(app)
      .get('/api/teacher/3')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(JSON.parse(JSON.stringify(teacher)));
    expect(prisma.teacher.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
  });

  it('signale un enseignant absent', async () => {
    prisma.teacher.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/teacher/99')
      .set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Teacher not found' });
  });
});