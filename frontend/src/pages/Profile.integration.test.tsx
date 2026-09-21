import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AuthResponse, User } from '../types';
import { authService } from '../services/auth.service';
import api from '../services/api';
import Profile from './Profile';

const user: User = {
    id: 1,
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    admin: false,
    createdAt: '2026-01-15T12:00:00Z',
};
const authenticatedUser: AuthResponse = { ...user, token: 'fake-token' };

beforeEach(() => {
    vi.stubEnv('DEV', true);
    vi.spyOn(authService, 'getCurrentUser').mockReturnValue(authenticatedUser);
    vi.spyOn(authService, 'getToken').mockReturnValue('fake-token');
    vi.spyOn(api, 'get').mockResolvedValue({ data: user });
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('Profile', () => {
    it('affiche le chargement pendant la récupération du profil', async () => {
        // Cette promesse permet de choisir quand la réponse arrive.
        let resolveRequest!: (response: { data: User }) => void;
        const pendingRequest = new Promise<{ data: User }>((resolve) => {
            resolveRequest = resolve;
        });
        vi.mocked(api.get).mockReturnValue(pendingRequest);

        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/login" element={<p>Page de connexion</p>} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByText('Loading profile...')).not.toBeNull();
        expect(screen.queryByRole('heading', { name: 'My Profile' })).toBeNull();

        await act(async () => {
            resolveRequest({ data: user });
        });

        expect(await screen.findByRole('heading', { name: 'My Profile' })).not.toBeNull();
        expect(screen.queryByText('Loading profile...')).toBeNull();
    });

    it('charge le bon utilisateur et affiche ses informations', async () => {

        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/login" element={<p>Page de connexion</p>} />
                </Routes>
            </MemoryRouter>,
        );

        await screen.findByRole('heading', { name: 'My Profile' });
        expect(api.get).toHaveBeenCalledExactlyOnceWith('/user/1', {
            signal: expect.any(AbortSignal),
            headers: { Authorization: 'Bearer fake-token' },
        });
        expect(screen.getByText('John')).not.toBeNull();
        expect(screen.getByText('Doe')).not.toBeNull();
        expect(screen.getByText('user@example.com')).not.toBeNull();
        expect(screen.getByText('User')).not.toBeNull();
        expect(screen.getByText('January 15, 2026')).not.toBeNull();
    });

    it('affiche une erreur si le chargement échoue', async () => {
        vi.mocked(api.get).mockRejectedValue(new Error('Serveur indisponible'));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/login" element={<p>Page de connexion</p>} />
                </Routes>
            </MemoryRouter>,
        );

        expect(await screen.findByText('Failed to load user information')).not.toBeNull();
        expect(screen.queryByText('Loading profile...')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Delete Account' })).toBeNull();
    });

    it('ne lance aucune requête si aucun utilisateur n’est connecté', async () => {
        vi.mocked(authService.getCurrentUser).mockReturnValue(null);

        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/login" element={<p>Page de connexion</p>} />
                </Routes>
            </MemoryRouter>,
        );

        expect(await screen.findByText('Failed to load profile')).not.toBeNull();
        expect(api.get).not.toHaveBeenCalled();
    });

    it('revient à la liste des séances', async () => {

        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/login" element={<p>Page de connexion</p>} />
                </Routes>
            </MemoryRouter>,
        );

        await screen.findByRole('heading', { name: 'My Profile' });
        fireEvent.click(screen.getByRole('button', { name: 'Back to Sessions' }));

        expect(await screen.findByText('Sessions page')).not.toBeNull();
    });

    it('ne supprime pas le compte si la confirmation est annulée', async () => {
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
        const deleteAccount = vi.spyOn(api, 'delete').mockResolvedValue({});
        const logout = vi.spyOn(authService, 'logout').mockImplementation(() => {});

        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/login" element={<p>Page de connexion</p>} />
                </Routes>
            </MemoryRouter>,
        );

        await screen.findByRole('heading', { name: 'My Profile' });
        fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));

        expect(confirm).toHaveBeenCalledExactlyOnceWith(
            'Are you sure you want to delete your account? This action cannot be undone.',
        );
        expect(deleteAccount).not.toHaveBeenCalled();
        expect(logout).not.toHaveBeenCalled();
        expect(screen.getByRole('heading', { name: 'My Profile' })).not.toBeNull();
        expect(screen.queryByText('Page de connexion')).toBeNull();
    });

    it('supprime le compte confirmé puis déconnecte et redirige vers la connexion', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const deleteAccount = vi.spyOn(api, 'delete').mockResolvedValue({});
        const logout = vi.spyOn(authService, 'logout').mockImplementation(() => {});

        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/login" element={<p>Page de connexion</p>} />
                </Routes>
            </MemoryRouter>,
        );

        await screen.findByRole('heading', { name: 'My Profile' });
        fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));

        expect(await screen.findByText('Page de connexion')).not.toBeNull();
        expect(deleteAccount).toHaveBeenCalledExactlyOnceWith('/user/1', {
            headers: { Authorization: 'Bearer fake-token' },
        });
        expect(logout).toHaveBeenCalledTimes(1);
    });

    it('reste sur le profil si la suppression échoue', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.spyOn(api, 'delete').mockRejectedValue(new Error('Suppression impossible'));
        const logout = vi.spyOn(authService, 'logout').mockImplementation(() => {});
        const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/login" element={<p>Page de connexion</p>} />
                </Routes>
            </MemoryRouter>,
        );

        await screen.findByRole('heading', { name: 'My Profile' });
        fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));

        await waitFor(() => {
            expect(alert).toHaveBeenCalledExactlyOnceWith('Failed to delete account');
        });
        expect(logout).not.toHaveBeenCalled();
        expect(screen.queryByText('Page de connexion')).toBeNull();
        expect(screen.getByRole('heading', { name: 'My Profile' })).not.toBeNull();
    });

    it('affiche la promotion pour un utilisateur non administrateur en développement', async () => {

        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/login" element={<p>Page de connexion</p>} />
                </Routes>
            </MemoryRouter>,
        );

        await screen.findByRole('heading', { name: 'My Profile' });
        expect(screen.getByRole('button', { name: 'Promote to Admin (Dev)' })).not.toBeNull();
    });

    it('masque la promotion pour un administrateur', async () => {
        vi.mocked(authService.getCurrentUser).mockReturnValue({ ...authenticatedUser, admin: true });
        vi.mocked(api.get).mockResolvedValue({ data: { ...user, admin: true } });

        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/login" element={<p>Page de connexion</p>} />
                </Routes>
            </MemoryRouter>,
        );

        await screen.findByRole('heading', { name: 'My Profile' });
        expect(screen.getByText('Administrator')).not.toBeNull();
        expect(screen.queryByRole('button', { name: 'Promote to Admin (Dev)' })).toBeNull();
    });

    it('masque la promotion en dehors du développement', async () => {
        vi.stubEnv('DEV', false);

        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/login" element={<p>Page de connexion</p>} />
                </Routes>
            </MemoryRouter>,
        );

        await screen.findByRole('heading', { name: 'My Profile' });
        expect(screen.queryByRole('button', { name: 'Promote to Admin (Dev)' })).toBeNull();
    });

    it('désactive le bouton pendant la promotion', async () => {
        let resolveRequest!: (response: { data: User }) => void;
        const pendingRequest = new Promise<{ data: User }>((resolve) => {
            resolveRequest = resolve;
        });
        const promote = vi.spyOn(api, 'post').mockReturnValue(pendingRequest);
        vi.spyOn(authService, 'updateCurrentUser').mockReturnValue({ ...authenticatedUser, admin: true });

        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/login" element={<p>Page de connexion</p>} />
                </Routes>
            </MemoryRouter>,
        );

        await screen.findByRole('heading', { name: 'My Profile' });
        fireEvent.click(screen.getByRole('button', { name: 'Promote to Admin (Dev)' }));

        const button = screen.getByRole('button', { name: 'Promoting...' });
        expect(button.hasAttribute('disabled')).toBe(true);
        fireEvent.click(button);
        expect(promote).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveRequest({ data: { ...user, admin: true } });
        });
        expect(await screen.findByText('Administrator')).not.toBeNull();
        expect(screen.queryByRole('button', { name: 'Promoting...' })).toBeNull();
    });

    it('met à jour le rôle affiché et la session après une promotion réussie', async () => {
        const promote = vi.spyOn(api, 'post').mockResolvedValue({ data: { ...user, admin: true } });
        const updateUser = vi.spyOn(authService, 'updateCurrentUser')
            .mockReturnValue({ ...authenticatedUser, admin: true });

        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/login" element={<p>Page de connexion</p>} />
                </Routes>
            </MemoryRouter>,
        );

        await screen.findByRole('heading', { name: 'My Profile' });
        fireEvent.click(screen.getByRole('button', { name: 'Promote to Admin (Dev)' }));

        expect(await screen.findByText('Administrator')).not.toBeNull();
        expect(promote).toHaveBeenCalledExactlyOnceWith('/user/promote-admin', {}, {
            headers: { Authorization: 'Bearer fake-token' },
        });
        expect(updateUser).toHaveBeenCalledExactlyOnceWith({ admin: true });
        expect(screen.queryByRole('button', { name: 'Promote to Admin (Dev)' })).toBeNull();
    });

    it('affiche une erreur et réactive le bouton si la promotion échoue', async () => {
        vi.spyOn(api, 'post').mockRejectedValue(new Error('Promotion impossible'));
        const updateUser = vi.spyOn(authService, 'updateCurrentUser').mockReturnValue(null);
        vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/login" element={<p>Page de connexion</p>} />
                </Routes>
            </MemoryRouter>,
        );

        await screen.findByRole('heading', { name: 'My Profile' });
        fireEvent.click(screen.getByRole('button', { name: 'Promote to Admin (Dev)' }));

        expect(await screen.findByText('Failed to promote to admin')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Promote to Admin (Dev)' }).hasAttribute('disabled')).toBe(false);
        expect(screen.getByText('User')).not.toBeNull();
        expect(updateUser).not.toHaveBeenCalled();
    });

});
