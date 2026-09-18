import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { authService } from '../services/auth.service';
import type { AuthResponse, Session } from '../types';
import api from '../services/api';
import SessionDetail from './SessionDetail';

const user: AuthResponse = {
    id: 1,
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    admin: false,
    token: 'fake-token',
};
const teacher = { id: 3, firstName: 'Alice', lastName: 'Martin' };
const session: Session = {
    id: 7,
    name: 'Yoga du matin',
    date: '2026-09-18T12:00:00Z',
    description: 'Une séance pour débuter la journée.',
    teacher,
    users: [2],
};

beforeEach(() => {
    vi.spyOn(authService, 'getCurrentUser').mockReturnValue(user);
    vi.spyOn(authService, 'getToken').mockReturnValue(user.token);
    vi.spyOn(api, 'get').mockResolvedValue({ data: session });
});

describe('SessionDetail', () => {
    it('affiche le chargement avant les détails', async () => {
        let resolveRequest!: (value: { data: Session }) => void;
        const pendingRequest = new Promise<{ data: Session }>((resolve) => { resolveRequest = resolve; });
        vi.mocked(api.get).mockReturnValue(pendingRequest);
        render(
            <MemoryRouter initialEntries={['/sessions/7']}>
                <Routes>
                    <Route path="/sessions/:id" element={<SessionDetail />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/sessions/edit/:id" element={<p>Edit page</p>} />
                </Routes>
            </MemoryRouter>,
        );
        expect(screen.getByText('Loading session...')).not.toBeNull();
        await act(async () => { resolveRequest({ data: session }); });
        await screen.findByRole('heading', { name: session.name });
        expect(screen.queryByText('Loading session...')).toBeNull();
    });

    it('charge les détails et propose la participation à un utilisateur non inscrit', async () => {
        render(
            <MemoryRouter initialEntries={['/sessions/7']}>
                <Routes>
                    <Route path="/sessions/:id" element={<SessionDetail />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/sessions/edit/:id" element={<p>Edit page</p>} />
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('heading', { name: session.name });
        expect(api.get).toHaveBeenCalledExactlyOnceWith('/session/7', {
            signal: expect.any(AbortSignal), headers: { Authorization: 'Bearer fake-token' },
        });
        expect(screen.getByText(session.description)).not.toBeNull();
        expect(screen.getByText(/Alice Martin/)).not.toBeNull();
        expect(screen.getByText(/Friday, September 18, 2026/)).not.toBeNull();
        expect(screen.getByText(/Participants:/).parentElement?.textContent).toBe('Participants: 1');
        expect(screen.getByRole('button', { name: 'Join Session' })).not.toBeNull();
        expect(screen.queryByRole('button', { name: 'Leave Session' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    });

    it('affiche une erreur si le chargement échoue', async () => {
        vi.mocked(api.get).mockRejectedValue(new Error('Échec du chargement'));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <MemoryRouter initialEntries={['/sessions/7']}>
                <Routes>
                    <Route path="/sessions/:id" element={<SessionDetail />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/sessions/edit/:id" element={<p>Edit page</p>} />
                </Routes>
            </MemoryRouter>,
        );
        expect(await screen.findByText('Failed to load session details')).not.toBeNull();
    });

    it('signale une séance absente de la réponse', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: null });
        render(
            <MemoryRouter initialEntries={['/sessions/7']}>
                <Routes>
                    <Route path="/sessions/:id" element={<SessionDetail />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/sessions/edit/:id" element={<p>Edit page</p>} />
                </Routes>
            </MemoryRouter>,
        );
        expect(await screen.findByText('Session not found')).not.toBeNull();
    });

    it('ne charge rien si l’identifiant est absent', async () => {
        render(
            <MemoryRouter initialEntries={['/detail']}>
                <Routes>
                    <Route path="/detail" element={<SessionDetail />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        expect(await screen.findByText('Invalid session identifier')).not.toBeNull();
        expect(api.get).not.toHaveBeenCalled();
    });

    it('inscrit l’utilisateur et actualise les participants', async () => {
        const participate = vi.spyOn(api, 'post').mockResolvedValue({});
        vi.mocked(api.get).mockResolvedValueOnce({ data: session })
            .mockResolvedValueOnce({ data: { ...session, users: [2, user.id] } });
        render(
            <MemoryRouter initialEntries={['/sessions/7']}>
                <Routes>
                    <Route path="/sessions/:id" element={<SessionDetail />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/sessions/edit/:id" element={<p>Edit page</p>} />
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('heading', { name: session.name });
        fireEvent.click(screen.getByRole('button', { name: 'Join Session' }));

        expect(await screen.findByRole('button', { name: 'Leave Session' })).not.toBeNull();
        expect(participate).toHaveBeenCalledExactlyOnceWith('/session/7/participate/1', {}, {
            headers: { Authorization: 'Bearer fake-token' },
        });
        expect(api.get).toHaveBeenCalledTimes(2);
        expect(screen.getByText(/Participants:/).parentElement?.textContent).toBe('Participants: 2');
        expect(screen.queryByRole('button', { name: 'Join Session' })).toBeNull();
    });

    it('désinscrit l’utilisateur et actualise les participants', async () => {
        const leave = vi.spyOn(api, 'delete').mockResolvedValue({});
        vi.mocked(api.get).mockResolvedValueOnce({ data: { ...session, users: [2, user.id] } })
            .mockResolvedValueOnce({ data: session });
        render(
            <MemoryRouter initialEntries={['/sessions/7']}>
                <Routes>
                    <Route path="/sessions/:id" element={<SessionDetail />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/sessions/edit/:id" element={<p>Edit page</p>} />
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('heading', { name: session.name });
        fireEvent.click(screen.getByRole('button', { name: 'Leave Session' }));

        expect(await screen.findByRole('button', { name: 'Join Session' })).not.toBeNull();
        expect(leave).toHaveBeenCalledExactlyOnceWith('/session/7/participate/1', {
            headers: { Authorization: 'Bearer fake-token' },
        });
        expect(api.get).toHaveBeenCalledTimes(2);
        expect(screen.getByText(/Participants:/).parentElement?.textContent).toBe('Participants: 1');
        expect(screen.queryByRole('button', { name: 'Leave Session' })).toBeNull();
    });

    it('affiche une alerte si la participation échoue', async () => {
        vi.spyOn(api, 'post').mockRejectedValue(new Error('Inscription impossible'));
        const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <MemoryRouter initialEntries={['/sessions/7']}>
                <Routes>
                    <Route path="/sessions/:id" element={<SessionDetail />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/sessions/edit/:id" element={<p>Edit page</p>} />
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('heading', { name: session.name });
        fireEvent.click(screen.getByRole('button', { name: 'Join Session' }));
        await waitFor(() => { expect(alert).toHaveBeenCalledExactlyOnceWith('Failed to join session'); });
        expect(screen.getByRole('button', { name: 'Join Session' })).not.toBeNull();
        expect(api.get).toHaveBeenCalledTimes(1);
    });

    it('affiche une alerte si la désinscription échoue', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { ...session, users: [user.id] } });
        vi.spyOn(api, 'delete').mockRejectedValue(new Error('Désinscription impossible'));
        const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <MemoryRouter initialEntries={['/sessions/7']}>
                <Routes>
                    <Route path="/sessions/:id" element={<SessionDetail />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/sessions/edit/:id" element={<p>Edit page</p>} />
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('heading', { name: session.name });
        fireEvent.click(screen.getByRole('button', { name: 'Leave Session' }));
        await waitFor(() => { expect(alert).toHaveBeenCalledExactlyOnceWith('Failed to leave session'); });
        expect(screen.getByRole('button', { name: 'Leave Session' })).not.toBeNull();
        expect(api.get).toHaveBeenCalledTimes(1);
    });

    it('propose les actions administrateur et ouvre la modification', async () => {
        vi.mocked(authService.getCurrentUser).mockReturnValue({ ...user, admin: true });
        render(
            <MemoryRouter initialEntries={['/sessions/7']}>
                <Routes>
                    <Route path="/sessions/:id" element={<SessionDetail />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/sessions/edit/:id" element={<p>Edit page</p>} />
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('heading', { name: session.name });
        expect(screen.getByRole('button', { name: 'Delete' })).not.toBeNull();
        expect(screen.queryByRole('button', { name: 'Join Session' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Leave Session' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        expect(await screen.findByText('Edit page')).not.toBeNull();
    });

    it('annule la suppression de la séance', async () => {
        vi.mocked(authService.getCurrentUser).mockReturnValue({ ...user, admin: true });
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
        const remove = vi.spyOn(api, 'delete').mockResolvedValue({});
        render(
            <MemoryRouter initialEntries={['/sessions/7']}>
                <Routes>
                    <Route path="/sessions/:id" element={<SessionDetail />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/sessions/edit/:id" element={<p>Edit page</p>} />
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('heading', { name: session.name });
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(confirm).toHaveBeenCalledExactlyOnceWith('Are you sure you want to delete this session?');
        expect(remove).not.toHaveBeenCalled();
        expect(screen.getByRole('heading', { name: session.name })).not.toBeNull();
        expect(screen.queryByText('Sessions page')).toBeNull();
    });

    it('supprime la séance confirmée et revient à la liste', async () => {
        vi.mocked(authService.getCurrentUser).mockReturnValue({ ...user, admin: true });
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const remove = vi.spyOn(api, 'delete').mockResolvedValue({});
        render(
            <MemoryRouter initialEntries={['/sessions/7']}>
                <Routes>
                    <Route path="/sessions/:id" element={<SessionDetail />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/sessions/edit/:id" element={<p>Edit page</p>} />
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('heading', { name: session.name });
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(await screen.findByText('Sessions page')).not.toBeNull();
        expect(remove).toHaveBeenCalledExactlyOnceWith('/session/7', { headers: { Authorization: 'Bearer fake-token' } });
    });

    it('reste sur les détails si la suppression échoue', async () => {
        vi.mocked(authService.getCurrentUser).mockReturnValue({ ...user, admin: true });
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.spyOn(api, 'delete').mockRejectedValue(new Error('Suppression impossible'));
        const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <MemoryRouter initialEntries={['/sessions/7']}>
                <Routes>
                    <Route path="/sessions/:id" element={<SessionDetail />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/sessions/edit/:id" element={<p>Edit page</p>} />
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('heading', { name: session.name });
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        await waitFor(() => { expect(alert).toHaveBeenCalledExactlyOnceWith('Failed to delete session'); });
        expect(screen.getByRole('heading', { name: session.name })).not.toBeNull();
        expect(screen.queryByText('Sessions page')).toBeNull();
    });

    it('revient aux séances avec le bouton de retour', async () => {
        render(
            <MemoryRouter initialEntries={['/sessions/7']}>
                <Routes>
                    <Route path="/sessions/:id" element={<SessionDetail />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/sessions/edit/:id" element={<p>Edit page</p>} />
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('heading', { name: session.name });
        fireEvent.click(screen.getByRole('button', { name: 'Back to Sessions' }));
        expect(await screen.findByText('Sessions page')).not.toBeNull();
    });

    it('refuse la participation sans utilisateur connecté', async () => {
        vi.mocked(authService.getCurrentUser).mockReturnValue(null);
        const participate = vi.spyOn(api, 'post').mockResolvedValue({});
        const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <MemoryRouter initialEntries={['/sessions/7']}>
                <Routes>
                    <Route path="/sessions/:id" element={<SessionDetail />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    <Route path="/sessions/edit/:id" element={<p>Edit page</p>} />
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('heading', { name: session.name });
        fireEvent.click(screen.getByRole('button', { name: 'Join Session' }));
        expect(alert).toHaveBeenCalledExactlyOnceWith('Failed to join session');
        expect(participate).not.toHaveBeenCalled();
    });

});
