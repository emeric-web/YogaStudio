import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthResponse, RegisterData } from '../types';
import api from './api';
import { authService } from './auth.service';

vi.mock('./api', () => ({
  default: { post: vi.fn() },
}));

const user: AuthResponse = {
  id: 1,
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Martin',
  admin: false,
  token: 'fake-token',
};

const credentials = { email: user.email, password: 'password123' };
const registration: RegisterData = {
  ...credentials,
  firstName: user.firstName,
  lastName: user.lastName,
};

function storeSession(): void {
  localStorage.setItem('token', user.token);
  localStorage.setItem('user', JSON.stringify(user));
}

beforeEach(() => {
  vi.mocked(api.post).mockReset();
});

describe('authService', () => {
  describe('login', () => {
    it('envoie les données et enregistre la session retournée par l’API', async () => {
      localStorage.setItem('token', 'old-token');
      localStorage.setItem('user', JSON.stringify({ ...user, id: 2 }));
      vi.mocked(api.post).mockResolvedValue({ data: user });

      const result = await authService.login(credentials);

      expect(api.post).toHaveBeenCalledExactlyOnceWith('/auth/login', credentials);
      expect(result).toEqual(user);
      expect(localStorage.getItem('token')).toBe(user.token);
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(user);
    });

    it('ne crée pas de session si la réponse ne contient pas de token', async () => {
      const response = { ...user, token: '' };
      vi.mocked(api.post).mockResolvedValue({ data: response });

      const result = await authService.login(credentials);

      expect(result).toEqual(response);
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('propage l’erreur API sans modifier la session existante', async () => {
      storeSession();
      const error = new Error('Authentication failed');
      vi.mocked(api.post).mockRejectedValue(error);

      await expect(authService.login(credentials)).rejects.toBe(error);

      expect(localStorage.getItem('token')).toBe(user.token);
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(user);
    });
  });

  describe('register', () => {
    it('envoie les données et enregistre la session retournée par l’API', async () => {
      localStorage.setItem('token', 'old-token');
      localStorage.setItem('user', JSON.stringify({ ...user, id: 2 }));
      vi.mocked(api.post).mockResolvedValue({ data: user });

      const result = await authService.register(registration);

      expect(api.post).toHaveBeenCalledExactlyOnceWith('/auth/register', registration);
      expect(result).toEqual(user);
      expect(localStorage.getItem('token')).toBe(user.token);
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(user);
    });

    it('ne crée pas de session si la réponse ne contient pas de token', async () => {
      const response = { ...user, token: '' };
      vi.mocked(api.post).mockResolvedValue({ data: response });

      const result = await authService.register(registration);

      expect(result).toEqual(response);
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('propage l’erreur API sans modifier la session existante', async () => {
      storeSession();
      const error = new Error('Authentication failed');
      vi.mocked(api.post).mockRejectedValue(error);

      await expect(authService.register(registration)).rejects.toBe(error);

      expect(localStorage.getItem('token')).toBe(user.token);
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(user);
    });
  });

  describe('logout', () => {
    it('supprime la session sans effacer les autres données du stockage', () => {
      storeSession();
      localStorage.setItem('theme', 'dark');

      authService.logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('peut être appelée sans session existante', () => {
      expect(() => authService.logout()).not.toThrow();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('retourne null si aucun utilisateur n’est enregistré', () => {
      expect(authService.getCurrentUser()).toBeNull();
    });

    it('retourne l’utilisateur enregistré', () => {
      storeSession();

      expect(authService.getCurrentUser()).toEqual(user);
    });

    it('supprime la session et retourne null si le JSON est invalide', () => {
      storeSession();
      localStorage.setItem('user', '{json invalide');

      expect(authService.getCurrentUser()).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('updateCurrentUser', () => {
    it('fusionne et enregistre les modifications en conservant les autres champs', () => {
      storeSession();
      const expectedUser = { ...user, admin: true, firstName: 'Alicia' };

      const result = authService.updateCurrentUser({ admin: true, firstName: 'Alicia' });

      expect(result).toEqual(expectedUser);
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(expectedUser);
      expect(localStorage.getItem('token')).toBe(user.token);
    });

    it('retourne null sans créer d’utilisateur si la session est absente', () => {
      expect(authService.updateCurrentUser({ admin: true })).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('nettoie une session invalide sans créer d’utilisateur', () => {
      storeSession();
      localStorage.setItem('user', '{json invalide');

      expect(authService.updateCurrentUser({ admin: true })).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('getToken', () => {
    it('retourne null en l’absence de token', () => {
      expect(authService.getToken()).toBeNull();
    });

    it('retourne le token enregistré', () => {
      storeSession();

      expect(authService.getToken()).toBe(user.token);
    });
  });

  describe('isAuthenticated', () => {
    it('retourne false en l’absence de token, même si un utilisateur est enregistré', () => {
      localStorage.setItem('user', JSON.stringify(user));

      expect(authService.isAuthenticated()).toBe(false);
    });

    it('retourne false si le token est vide', () => {
      localStorage.setItem('token', '');

      expect(authService.isAuthenticated()).toBe(false);
    });

    it('retourne true si un token est enregistré', () => {
      localStorage.setItem('token', user.token);

      expect(authService.isAuthenticated()).toBe(true);
    });
  });
});
