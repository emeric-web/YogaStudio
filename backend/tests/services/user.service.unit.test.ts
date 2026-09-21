import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserRepository } from '../../src/repositories/user.repository';
import { UserService } from '../../src/services/user.service';
import { publicUser, user } from '../fixtures';

describe('UserService', () => {
  const repository = {
    findById: vi.fn<UserRepository['findById']>(),
    deleteById: vi.fn<UserRepository['deleteById']>(),
    promoteToAdmin: vi.fn<UserRepository['promoteToAdmin']>(),
  };
  const service = new UserService(repository as unknown as UserRepository);

  beforeEach(() => {
    vi.resetAllMocks();
    repository.findById.mockResolvedValue(user);
    repository.deleteById.mockResolvedValue(user);
    repository.promoteToAdmin.mockResolvedValue({ ...user, admin: true });
    vi.stubEnv('NODE_ENV', 'development');
  });

  it('retourne le profil sans son mot de passe', async () => {
    await expect(service.getById(7)).resolves.toEqual(publicUser);
    expect(repository.findById).toHaveBeenCalledExactlyOnceWith(7);
  });

  it('retourne null pour un profil absent', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.getById(99)).resolves.toBeNull();
  });

  it('propage une erreur de lecture du profil', async () => {
    const error = new Error('Lecture impossible');
    repository.findById.mockRejectedValue(error);
    await expect(service.getById(7)).rejects.toBe(error);
  });

  it.each([8, undefined])('refuse la suppression avec un utilisateur authentifié %s', async (authenticatedId) => {
    await expect(service.delete(7, authenticatedId)).resolves.toEqual({ status: 'forbidden' });
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it('signale un compte à supprimer absent', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.delete(7, 7)).resolves.toEqual({ status: 'notFound' });
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it('permet de supprimer son propre compte', async () => {
    await expect(service.delete(7, 7)).resolves.toEqual({ status: 'deleted' });
    expect(repository.deleteById).toHaveBeenCalledExactlyOnceWith(7);
  });

  it('propage un échec de suppression', async () => {
    const error = new Error('Suppression impossible');
    repository.deleteById.mockRejectedValue(error);
    await expect(service.delete(7, 7)).rejects.toBe(error);
  });

  it.each(['production', 'test'])('refuse la promotion en environnement %s', async (environment) => {
    vi.stubEnv('NODE_ENV', environment);
    await expect(service.promoteSelfToAdmin(7)).resolves.toEqual({ status: 'notDevelopment' });
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.promoteToAdmin).not.toHaveBeenCalled();
  });

  it('signale un utilisateur à promouvoir absent', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.promoteSelfToAdmin(7)).resolves.toEqual({ status: 'notFound' });
    expect(repository.promoteToAdmin).not.toHaveBeenCalled();
  });

  it('ne modifie pas un administrateur existant', async () => {
    repository.findById.mockResolvedValue({ ...user, admin: true });
    await expect(service.promoteSelfToAdmin(7)).resolves.toEqual({
      status: 'alreadyAdmin', user: { ...publicUser, admin: true },
    });
    expect(repository.promoteToAdmin).not.toHaveBeenCalled();
  });

  it.each(['development', undefined, ''])('promeut le compte lorsque NODE_ENV vaut %s', async (environment) => {
    vi.stubEnv('NODE_ENV', environment);
    await expect(service.promoteSelfToAdmin(7)).resolves.toEqual({
      status: 'promoted', user: { ...publicUser, admin: true },
    });
    expect(repository.promoteToAdmin).toHaveBeenCalledExactlyOnceWith(7);
  });

  it('propage un échec de promotion', async () => {
    const error = new Error('Promotion impossible');
    repository.promoteToAdmin.mockRejectedValue(error);
    await expect(service.promoteSelfToAdmin(7)).rejects.toBe(error);
  });
});
