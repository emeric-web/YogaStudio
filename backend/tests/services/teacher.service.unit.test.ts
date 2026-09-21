import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TeacherRepository } from '../../src/repositories/teacher.repository';
import { TeacherService } from '../../src/services/teacher.service';
import { teacher } from '../fixtures';

describe('TeacherService', () => {
  const repository = {
    findAll: vi.fn<TeacherRepository['findAll']>(),
    findById: vi.fn<TeacherRepository['findById']>(),
  };
  const service = new TeacherService(repository as unknown as TeacherRepository);

  beforeEach(() => vi.resetAllMocks());

  it('retourne les enseignants du repository', async () => {
    repository.findAll.mockResolvedValue([teacher]);
    await expect(service.getAll()).resolves.toEqual([teacher]);
    expect(repository.findAll).toHaveBeenCalledExactlyOnceWith();
  });

  it('retourne une liste vide sans enseignant', async () => {
    repository.findAll.mockResolvedValue([]);
    await expect(service.getAll()).resolves.toEqual([]);
  });

  it('recherche un enseignant par son identifiant', async () => {
    repository.findById.mockResolvedValue(teacher);
    await expect(service.getById(3)).resolves.toEqual(teacher);
    expect(repository.findById).toHaveBeenCalledExactlyOnceWith(3);
  });

  it('retourne null pour un enseignant absent', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.getById(99)).resolves.toBeNull();
  });

  it('propage une erreur de lecture de la liste', async () => {
    const error = new Error('Lecture impossible');
    repository.findAll.mockRejectedValue(error);
    await expect(service.getAll()).rejects.toBe(error);
  });

  it('propage une erreur de recherche individuelle', async () => {
    const error = new Error('Lecture impossible');
    repository.findById.mockRejectedValue(error);
    await expect(service.getById(3)).rejects.toBe(error);
  });
});
