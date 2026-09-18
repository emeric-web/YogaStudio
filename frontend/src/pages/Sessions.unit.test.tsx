import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { authService } from '../services/auth.service';
import type { AuthResponse, Session } from '../types';
import api from '../services/api';
import Sessions from './Sessions';

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
    vi.spyOn(api, 'get').mockResolvedValue({ data: [session] });
});

describe('Sessions', () => {
    it('affiche le chargement avant la réponse', async () => {
        let resolveRequest!: (value: { data: Session[] }) => void;
        const pendingRequest = new Promise<{ data: Session[] }>((resolve) => { resolveRequest = resolve; });
        vi.mocked(api.get).mockReturnValue(pendingRequest);
        render(
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>,
        );
        expect(screen.getByText('Loading sessions...')).not.toBeNull();
        await act(async () => { resolveRequest({ data: [session] }); });
        await screen.findByRole('heading', { name: session.name });
        expect(screen.queryByText('Loading sessions...')).toBeNull();
    });

    it('affiche les séances et masque les actions administrateur pour un utilisateur', async () => {
        render(
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>,
        );
        await screen.findByRole('heading', { name: session.name });
        expect(api.get).toHaveBeenCalledExactlyOnceWith('/session', {
            signal: expect.any(AbortSignal),
            headers: { Authorization: 'Bearer fake-token' },
        });
        expect(screen.getByText(session.description)).not.toBeNull();
        expect(screen.getByText('Teacher: Alice Martin')).not.toBeNull();
        expect(screen.getByText('Participants: 1')).not.toBeNull();
        expect(screen.getByRole('link', { name: 'View Details' }).getAttribute('href')).toBe('/sessions/7');
        expect(screen.queryByRole('link', { name: 'Create Session' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    });

    it('affiche un message si la liste est vide', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: [] });
        render(
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>,
        );
        expect(await screen.findByText('No sessions available')).not.toBeNull();
    });

    it('affiche une erreur si le chargement échoue', async () => {
        vi.mocked(api.get).mockRejectedValue(new Error('Échec du chargement'));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>,
        );
        expect(await screen.findByText('Failed to load sessions')).not.toBeNull();
        expect(screen.queryByText('Loading sessions...')).toBeNull();
    });

    it('affiche les actions de création et de suppression pour un administrateur', async () => {
        vi.mocked(authService.getCurrentUser).mockReturnValue({ ...user, admin: true });
        render(
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>,
        );
        await screen.findByRole('heading', { name: session.name });
        expect(screen.getByRole('link', { name: 'Create Session' }).getAttribute('href')).toBe('/sessions/create');
        expect(screen.getByRole('button', { name: 'Delete' })).not.toBeNull();
    });

    it('ne supprime rien si la confirmation est annulée', async () => {
        vi.mocked(authService.getCurrentUser).mockReturnValue({ ...user, admin: true });
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
        const remove = vi.spyOn(api, 'delete').mockResolvedValue({});
        render(
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>,
        );
        await screen.findByRole('heading', { name: session.name });
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(confirm).toHaveBeenCalledExactlyOnceWith('Are you sure you want to delete this session?');
        expect(remove).not.toHaveBeenCalled();
        expect(api.get).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('heading', { name: session.name })).not.toBeNull();
    });

    it('supprime la séance confirmée et actualise la liste', async () => {
        vi.mocked(authService.getCurrentUser).mockReturnValue({ ...user, admin: true });
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const remove = vi.spyOn(api, 'delete').mockResolvedValue({});
        vi.mocked(api.get).mockResolvedValueOnce({ data: [session] }).mockResolvedValueOnce({ data: [] });
        render(
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>,
        );
        await screen.findByRole('heading', { name: session.name });
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(await screen.findByText('No sessions available')).not.toBeNull();
        expect(remove).toHaveBeenCalledExactlyOnceWith('/session/7', { headers: { Authorization: 'Bearer fake-token' } });
        expect(api.get).toHaveBeenCalledTimes(2);
        expect(screen.queryByRole('heading', { name: session.name })).toBeNull();
    });

    it('conserve la liste et affiche une alerte si la suppression échoue', async () => {
        vi.mocked(authService.getCurrentUser).mockReturnValue({ ...user, admin: true });
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.spyOn(api, 'delete').mockRejectedValue(new Error('Suppression impossible'));
        const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>,
        );
        await screen.findByRole('heading', { name: session.name });
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        await waitFor(() => { expect(alert).toHaveBeenCalledExactlyOnceWith('Failed to delete session'); });
        expect(screen.getByRole('heading', { name: session.name })).not.toBeNull();
        expect(api.get).toHaveBeenCalledTimes(1);
    });

});
