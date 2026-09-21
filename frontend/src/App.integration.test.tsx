import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import api from './services/api';
import type { AuthResponse, Session } from './types';

const user: AuthResponse = {
  id: 1,
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  admin: false,
  token: 'integration-token',
};

const session: Session = {
  id: 7,
  name: 'Yoga du matin',
  date: '2026-09-18T12:00:00Z',
  description: 'Une séance pour débuter la journée.',
  teacher: { id: 3, firstName: 'Alice', lastName: 'Martin' },
  users: [2],
};

beforeEach(() => {
  window.history.pushState({}, '', '/login');
});

describe('App integration', () => {
  it('redirige une route protégée vers la connexion', () => {
    window.history.pushState({}, '', '/sessions');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Login to Yoga Studio' })).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Yoga Sessions' })).toBeNull();
  });

  it('connecte l’utilisateur puis charge les sessions', async () => {
    const login = vi.spyOn(api, 'post').mockResolvedValue({ data: user });
    const getSessions = vi.spyOn(api, 'get').mockResolvedValue({ data: [session] });

    render(<App />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: user.email },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByRole('heading', { name: 'Yoga Sessions' })).not.toBeNull();
    expect(login).toHaveBeenCalledExactlyOnceWith('/auth/login', {
      email: user.email,
      password: 'password123',
    });
    expect(getSessions).toHaveBeenCalledExactlyOnceWith('/session', {
      signal: expect.any(AbortSignal),
      headers: { Authorization: `Bearer ${user.token}` },
    });
    expect(localStorage.getItem('token')).toBe(user.token);
    expect(screen.getByRole('heading', { name: session.name })).not.toBeNull();
    expect(screen.getByText(session.description)).not.toBeNull();
  });
});
