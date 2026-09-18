import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { authService } from '../services/auth.service';
import PrivateRoute from './PrivateRoute';

describe('PrivateRoute', () => {
  it('affiche la page protégée si l’utilisateur est connecté', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/login" element={<p>Login to Yoga Studio</p>} />

          <Route element={<PrivateRoute />}>
            <Route path="/profile" element={<p>My profile</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText('My profile')).not.toBeNull();
    expect(screen.queryByText('Login to Yoga Studio')).toBeNull();
  });

  it('affiche la connexion si l’utilisateur n’est pas connecté', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/login" element={<p>Login to Yoga Studio</p>} />

          <Route element={<PrivateRoute />}>
            <Route path="/profile" element={<p>My profile</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Login to Yoga Studio')).not.toBeNull();
    expect(screen.queryByText('My profile')).toBeNull();
  });
});