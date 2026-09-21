import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import type { AuthRepository } from '../../src/repositories/auth.repository';
import { AuthService } from '../../src/services/auth.service';
import { generateToken } from '../../src/utils/jwt.util';
import { user } from '../fixtures';

vi.mock('bcrypt', () => ({ compare: vi.fn(), hash: vi.fn() }));
vi.mock('../../src/utils/jwt.util', () => ({ generateToken: vi.fn() }));

describe('AuthService', () => {
  const repository = {
    findUserByEmail: vi.fn<AuthRepository['findUserByEmail']>(),
    createUser: vi.fn<AuthRepository['createUser']>(),
  };
  const service = new AuthService(repository as unknown as AuthRepository);
  // Les signatures avec callback de bcrypt sont remplacées ici par leur variante Promise.
  const compare = vi.mocked(bcrypt.compare) as unknown as ReturnType<typeof vi.fn<(password: string, hash: string) => Promise<boolean>>>;
  const hash = vi.mocked(bcrypt.hash) as unknown as ReturnType<typeof vi.fn<(password: string, rounds: number) => Promise<string>>>;
  const credentials = { email: user.email, password: 'plain-password' };
  const registration = { ...credentials, firstName: 'Alice', lastName: 'Martin' };
  const authenticatedUser = {
    id: 7, email: 'alice@example.com', firstName: 'Alice', lastName: 'Martin',
    admin: false, token: 'signed-token',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    repository.findUserByEmail.mockResolvedValue(user);
    repository.createUser.mockResolvedValue(user);
    compare.mockResolvedValue(true);
    hash.mockResolvedValue('hashed-password');
    vi.mocked(generateToken).mockReturnValue('signed-token');
  });

  describe('login', () => {
    it('authentifie un compte sans exposer le mot de passe', async () => {
      await expect(service.login(credentials)).resolves.toEqual(authenticatedUser);
      expect(repository.findUserByEmail).toHaveBeenCalledExactlyOnceWith(credentials.email);
      expect(compare).toHaveBeenCalledExactlyOnceWith('plain-password', 'hashed-password');
      expect(generateToken).toHaveBeenCalledExactlyOnceWith(7);
    });

    it('conserve le statut administrateur du compte', async () => {
      repository.findUserByEmail.mockResolvedValue({ ...user, admin: true });
      await expect(service.login(credentials)).resolves.toEqual({ ...authenticatedUser, admin: true });
    });

    it('refuse un email inconnu sans comparer le mot de passe', async () => {
      repository.findUserByEmail.mockResolvedValue(null);
      await expect(service.login(credentials)).resolves.toBeNull();
      expect(compare).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('refuse un mot de passe incorrect sans générer de jeton', async () => {
      compare.mockResolvedValue(false);
      await expect(service.login(credentials)).resolves.toBeNull();
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('propage un échec de recherche du compte', async () => {
      const error = new Error('Lecture impossible');
      repository.findUserByEmail.mockRejectedValue(error);
      await expect(service.login(credentials)).rejects.toBe(error);
      expect(compare).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('propage un échec de comparaison du mot de passe', async () => {
      const error = new Error('Comparaison impossible');
      compare.mockRejectedValue(error);
      await expect(service.login(credentials)).rejects.toBe(error);
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('propage un échec de signature du jeton', async () => {
      const error = new Error('Signature impossible');
      vi.mocked(generateToken).mockImplementation(() => { throw error; });
      await expect(service.login(credentials)).rejects.toBe(error);
    });
  });

  describe('register', () => {
    beforeEach(() => {
      repository.findUserByEmail.mockResolvedValue(null);
    });

    it('crée un compte avec un mot de passe haché et retourne son jeton', async () => {
      await expect(service.register(registration)).resolves.toEqual(authenticatedUser);
      expect(repository.findUserByEmail).toHaveBeenCalledExactlyOnceWith(registration.email);
      expect(hash).toHaveBeenCalledExactlyOnceWith('plain-password', 10);
      expect(repository.createUser).toHaveBeenCalledExactlyOnceWith({
        ...registration, password: 'hashed-password', admin: false,
      });
      expect(generateToken).toHaveBeenCalledExactlyOnceWith(7);
    });

    it('impose admin false même si une propriété supplémentaire est fournie', async () => {
      await service.register({ ...registration, admin: true } as typeof registration);
      expect(repository.createUser).toHaveBeenCalledExactlyOnceWith({
        ...registration, password: 'hashed-password', admin: false,
      });
    });

    it('refuse un email déjà enregistré sans créer de compte', async () => {
      repository.findUserByEmail.mockResolvedValue(user);
      await expect(service.register(registration)).resolves.toBeNull();
      expect(hash).not.toHaveBeenCalled();
      expect(repository.createUser).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('propage un échec de recherche avant inscription', async () => {
      const error = new Error('Lecture impossible');
      repository.findUserByEmail.mockRejectedValue(error);
      await expect(service.register(registration)).rejects.toBe(error);
      expect(hash).not.toHaveBeenCalled();
      expect(repository.createUser).not.toHaveBeenCalled();
    });

    it('ne crée pas le compte si le hachage échoue', async () => {
      const error = new Error('Hachage impossible');
      hash.mockRejectedValue(error);
      await expect(service.register(registration)).rejects.toBe(error);
      expect(repository.createUser).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('ne génère pas de jeton si la création échoue', async () => {
      const error = new Error('Création impossible');
      repository.createUser.mockRejectedValue(error);
      await expect(service.register(registration)).rejects.toBe(error);
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('propage un échec de signature après inscription', async () => {
      const error = new Error('Signature impossible');
      vi.mocked(generateToken).mockImplementation(() => { throw error; });
      await expect(service.register(registration)).rejects.toBe(error);
    });
  });
});
