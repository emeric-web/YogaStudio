import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { authService } from '../services/auth.service';
import type { AuthResponse, Session } from '../types';
import api from '../services/api';
import SessionForm from './SessionForm';

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
    vi.spyOn(authService, 'getCurrentUser').mockReturnValue({ ...user, admin: true });
    vi.spyOn(authService, 'getToken').mockReturnValue(user.token);
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
        if (url === '/teacher') return { data: [teacher] };
        if (url === '/session/7') return { data: session };
        throw new Error(`URL inattendue : ${url}`);
    });
});

describe('SessionForm', () => {
    it('redirige un utilisateur non administrateur sans charger de données', async () => {
        vi.mocked(authService.getCurrentUser).mockReturnValue(user);
        render(
            <MemoryRouter initialEntries={['/sessions/create']}>
                <Routes>
                    <Route path="/sessions/create" element={<SessionForm />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        expect(await screen.findByText('Sessions page')).not.toBeNull();
        expect(api.get).not.toHaveBeenCalled();
    });

    it('redirige en l’absence d’utilisateur sans charger de données', async () => {
        vi.mocked(authService.getCurrentUser).mockReturnValue(null);
        render(
            <MemoryRouter initialEntries={['/sessions/create']}>
                <Routes>
                    <Route path="/sessions/create" element={<SessionForm />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        expect(await screen.findByText('Sessions page')).not.toBeNull();
        expect(api.get).not.toHaveBeenCalled();
    });

    it('charge les professeurs et affiche un formulaire de création vide', async () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/sessions/create']}>
                <Routes>
                    <Route path="/sessions/create" element={<SessionForm />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('option', { name: 'Alice Martin' });
        expect(api.get).toHaveBeenCalledExactlyOnceWith('/teacher', {
            signal: expect.any(AbortSignal), headers: { Authorization: 'Bearer fake-token' },
        });
        expect(screen.getByRole('heading', { name: 'Create New Session' })).not.toBeNull();
        expect(container.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe('');
        expect(container.querySelector<HTMLInputElement>('input[name="date"]')?.value).toBe('');
        expect(container.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('');
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('');
        expect(screen.getByRole('option', { name: 'Alice Martin' }).getAttribute('value')).toBe('3');
    });

    it('préremplit les champs en mode modification', async () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/sessions/edit/7']}>
                <Routes>
                    <Route path="/sessions/edit/:id" element={<SessionForm />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('option', { name: 'Alice Martin' });
        await waitFor(() => {
            expect(container.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe(session.name);
        });
        expect(api.get).toHaveBeenCalledWith('/session/7', {
            signal: expect.any(AbortSignal), headers: { Authorization: 'Bearer fake-token' },
        });
        expect(screen.getByRole('heading', { name: 'Edit Session' })).not.toBeNull();
        expect(container.querySelector<HTMLInputElement>('input[name="date"]')?.value).toBe('2026-09-18');
        expect(container.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe(session.description);
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('3');
        expect(screen.getByRole('button', { name: 'Update Session' })).not.toBeNull();
    });

    it('crée une séance avec un identifiant de professeur numérique', async () => {
        const post = vi.spyOn(api, 'post').mockResolvedValue({});
        const put = vi.spyOn(api, 'put').mockResolvedValue({});
        const { container } = render(
            <MemoryRouter initialEntries={['/sessions/create']}>
                <Routes>
                    <Route path="/sessions/create" element={<SessionForm />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('option', { name: 'Alice Martin' });
        // Les champs sont sélectionnés par name, sans modifier le composant.
        fireEvent.change(container.querySelector('input[name="name"]')!, {
            target: { value: 'Yoga du soir' },
        });
        fireEvent.change(container.querySelector('input[name="date"]')!, {
            target: { value: '2026-09-20' },
        });
        fireEvent.change(screen.getByRole('combobox'), {
            target: { value: '3' },
        });
        fireEvent.change(container.querySelector('textarea[name="description"]')!, {
            target: { value: 'Une séance relaxante.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Create Session' }));
        expect(await screen.findByText('Sessions page')).not.toBeNull();
        expect(post).toHaveBeenCalledExactlyOnceWith('/session', { name: 'Yoga du soir', date: '2026-09-20', teacherId: 3, description: 'Une séance relaxante.' }, { headers: { Authorization: 'Bearer fake-token' } });
        expect(put).not.toHaveBeenCalled();
    });

    it('enregistre les modifications de la bonne séance', async () => {
        const put = vi.spyOn(api, 'put').mockResolvedValue({});
        const post = vi.spyOn(api, 'post').mockResolvedValue({});
        const { container } = render(
            <MemoryRouter initialEntries={['/sessions/edit/7']}>
                <Routes>
                    <Route path="/sessions/edit/:id" element={<SessionForm />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('option', { name: 'Alice Martin' });
        await screen.findByDisplayValue(session.name);
        // Les champs sont sélectionnés par name, sans modifier le composant.
        fireEvent.change(container.querySelector('input[name="name"]')!, {
            target: { value: 'Yoga du soir' },
        });
        fireEvent.change(container.querySelector('input[name="date"]')!, {
            target: { value: '2026-09-20' },
        });
        fireEvent.change(screen.getByRole('combobox'), {
            target: { value: '3' },
        });
        fireEvent.change(container.querySelector('textarea[name="description"]')!, {
            target: { value: 'Une séance relaxante.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Update Session' }));
        expect(await screen.findByText('Sessions page')).not.toBeNull();
        expect(put).toHaveBeenCalledExactlyOnceWith('/session/7', { name: 'Yoga du soir', date: '2026-09-20', teacherId: 3, description: 'Une séance relaxante.' }, { headers: { Authorization: 'Bearer fake-token' } });
        expect(post).not.toHaveBeenCalled();
    });

    it('refuse l’enregistrement sans professeur sélectionné', async () => {
        const post = vi.spyOn(api, 'post').mockResolvedValue({});
        const put = vi.spyOn(api, 'put').mockResolvedValue({});
        const { container } = render(
            <MemoryRouter initialEntries={['/sessions/create']}>
                <Routes>
                    <Route path="/sessions/create" element={<SessionForm />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('option', { name: 'Alice Martin' });
        // Les champs sont sélectionnés par name, sans modifier le composant.
        fireEvent.change(container.querySelector('input[name="name"]')!, {
            target: { value: 'Yoga du soir' },
        });
        fireEvent.change(container.querySelector('input[name="date"]')!, {
            target: { value: '2026-09-20' },
        });
        fireEvent.change(screen.getByRole('combobox'), {
            target: { value: '3' },
        });
        fireEvent.change(container.querySelector('textarea[name="description"]')!, {
            target: { value: 'Une séance relaxante.' },
        });
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
        // Soumission directe pour tester la validation du composant,
        // indépendamment de la validation HTML du champ required.
        fireEvent.submit(container.querySelector('form')!);

        expect(await screen.findByText('Please select a teacher')).not.toBeNull();
        expect(post).not.toHaveBeenCalled();
        expect(put).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Create Session' }).hasAttribute('disabled')).toBe(false);
    });

    it('désactive le bouton pendant l’enregistrement', async () => {
        let resolveSave!: (value: { data: Session }) => void;
        const pendingSave = new Promise<{ data: Session }>((resolve) => { resolveSave = resolve; });
        const post = vi.spyOn(api, 'post').mockReturnValue(pendingSave);
        const { container } = render(
            <MemoryRouter initialEntries={['/sessions/create']}>
                <Routes>
                    <Route path="/sessions/create" element={<SessionForm />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('option', { name: 'Alice Martin' });
        // Les champs sont sélectionnés par name, sans modifier le composant.
        fireEvent.change(container.querySelector('input[name="name"]')!, {
            target: { value: 'Yoga du soir' },
        });
        fireEvent.change(container.querySelector('input[name="date"]')!, {
            target: { value: '2026-09-20' },
        });
        fireEvent.change(screen.getByRole('combobox'), {
            target: { value: '3' },
        });
        fireEvent.change(container.querySelector('textarea[name="description"]')!, {
            target: { value: 'Une séance relaxante.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Create Session' }));
        const button = screen.getByRole('button', { name: 'Saving...' });
        expect(button.hasAttribute('disabled')).toBe(true);
        fireEvent.click(button);
        expect(post).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('Sessions page')).toBeNull();
        await act(async () => { resolveSave({ data: session }); });
        expect(await screen.findByText('Sessions page')).not.toBeNull();
    });

    it('annule sans enregistrer et revient aux séances', async () => {
        const post = vi.spyOn(api, 'post').mockResolvedValue({});
        const put = vi.spyOn(api, 'put').mockResolvedValue({});
        render(
            <MemoryRouter initialEntries={['/sessions/create']}>
                <Routes>
                    <Route path="/sessions/create" element={<SessionForm />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('option', { name: 'Alice Martin' });
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(await screen.findByText('Sessions page')).not.toBeNull();
        expect(post).not.toHaveBeenCalled();
        expect(put).not.toHaveBeenCalled();
    });

    it('affiche une erreur si la séance à modifier ne peut pas être chargée', async () => {
        vi.mocked(api.get).mockImplementation(async (url) => {
            if (url === '/teacher') return { data: [teacher] };
            throw new Error('Séance introuvable');
        });
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <MemoryRouter initialEntries={['/sessions/edit/7']}>
                <Routes>
                    <Route path="/sessions/edit/:id" element={<SessionForm />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        expect(await screen.findByText('Failed to load session')).not.toBeNull();
    });

    it('conserve le formulaire sans professeurs si leur chargement échoue', async () => {
        const error = new Error('Professeurs indisponibles');
        vi.mocked(api.get).mockRejectedValue(error);
        const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <MemoryRouter initialEntries={['/sessions/create']}>
                <Routes>
                    <Route path="/sessions/create" element={<SessionForm />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        await waitFor(() => { expect(logError).toHaveBeenCalledWith('Failed to fetch teachers', error); });
        expect(screen.getByRole('heading', { name: 'Create New Session' })).not.toBeNull();
        expect(screen.getAllByRole('option')).toHaveLength(1);
        expect(screen.getByRole('option', { name: 'Select a teacher' })).not.toBeNull();
    });

    it('affiche le message de l’API si la création échoue', async () => {
        vi.spyOn(api, 'post').mockRejectedValue({ isAxiosError: true, response: { data: { message: 'Date invalide' } } });
        const { container } = render(
            <MemoryRouter initialEntries={['/sessions/create']}>
                <Routes>
                    <Route path="/sessions/create" element={<SessionForm />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('option', { name: 'Alice Martin' });
        // Les champs sont sélectionnés par name, sans modifier le composant.
        fireEvent.change(container.querySelector('input[name="name"]')!, {
            target: { value: 'Yoga du soir' },
        });
        fireEvent.change(container.querySelector('input[name="date"]')!, {
            target: { value: '2026-09-20' },
        });
        fireEvent.change(screen.getByRole('combobox'), {
            target: { value: '3' },
        });
        fireEvent.change(container.querySelector('textarea[name="description"]')!, {
            target: { value: 'Une séance relaxante.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Create Session' }));
        expect(await screen.findByText('Date invalide')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Create Session' }).hasAttribute('disabled')).toBe(false);
        expect(screen.queryByText('Sessions page')).toBeNull();
        expect(container.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe('Yoga du soir');
    });

    it('affiche un message de secours pour une erreur API sans message', async () => {
        vi.spyOn(api, 'post').mockRejectedValue({ isAxiosError: true });
        const { container } = render(
            <MemoryRouter initialEntries={['/sessions/create']}>
                <Routes>
                    <Route path="/sessions/create" element={<SessionForm />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('option', { name: 'Alice Martin' });
        // Les champs sont sélectionnés par name, sans modifier le composant.
        fireEvent.change(container.querySelector('input[name="name"]')!, {
            target: { value: 'Yoga du soir' },
        });
        fireEvent.change(container.querySelector('input[name="date"]')!, {
            target: { value: '2026-09-20' },
        });
        fireEvent.change(screen.getByRole('combobox'), {
            target: { value: '3' },
        });
        fireEvent.change(container.querySelector('textarea[name="description"]')!, {
            target: { value: 'Une séance relaxante.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Create Session' }));
        expect(await screen.findByText('Failed to save session')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Create Session' }).hasAttribute('disabled')).toBe(false);
        expect(screen.queryByText('Sessions page')).toBeNull();
        expect(container.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe('Yoga du soir');
    });

    it('affiche un message pour une erreur inattendue', async () => {
        vi.spyOn(api, 'post').mockRejectedValue(new Error('Échec'));
        const { container } = render(
            <MemoryRouter initialEntries={['/sessions/create']}>
                <Routes>
                    <Route path="/sessions/create" element={<SessionForm />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('option', { name: 'Alice Martin' });
        // Les champs sont sélectionnés par name, sans modifier le composant.
        fireEvent.change(container.querySelector('input[name="name"]')!, {
            target: { value: 'Yoga du soir' },
        });
        fireEvent.change(container.querySelector('input[name="date"]')!, {
            target: { value: '2026-09-20' },
        });
        fireEvent.change(screen.getByRole('combobox'), {
            target: { value: '3' },
        });
        fireEvent.change(container.querySelector('textarea[name="description"]')!, {
            target: { value: 'Une séance relaxante.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Create Session' }));
        expect(await screen.findByText('An unexpected error occurred')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Create Session' }).hasAttribute('disabled')).toBe(false);
        expect(screen.queryByText('Sessions page')).toBeNull();
        expect(container.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe('Yoga du soir');
    });

    it('reste sur le formulaire si la modification échoue', async () => {
        vi.spyOn(api, 'put').mockRejectedValue({ isAxiosError: true });
        render(
            <MemoryRouter initialEntries={['/sessions/edit/7']}>
                <Routes>
                    <Route path="/sessions/edit/:id" element={<SessionForm />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('option', { name: 'Alice Martin' });
        await screen.findByDisplayValue(session.name);
        fireEvent.click(screen.getByRole('button', { name: 'Update Session' }));
        expect(await screen.findByText('Failed to save session')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Update Session' }).hasAttribute('disabled')).toBe(false);
        expect(screen.queryByText('Sessions page')).toBeNull();
    });

    it('efface l’erreur à la tentative suivante et enregistre la séance', async () => {
        let resolveSave!: (value: { data: Session }) => void;
        const pendingSave = new Promise<{ data: Session }>((resolve) => { resolveSave = resolve; });
        const post = vi.spyOn(api, 'post').mockRejectedValueOnce(new Error('Échec'))
            .mockReturnValueOnce(pendingSave);
        const { container } = render(
            <MemoryRouter initialEntries={['/sessions/create']}>
                <Routes>
                    <Route path="/sessions/create" element={<SessionForm />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        await screen.findByRole('option', { name: 'Alice Martin' });
        // Les champs sont sélectionnés par name, sans modifier le composant.
        fireEvent.change(container.querySelector('input[name="name"]')!, {
            target: { value: 'Yoga du soir' },
        });
        fireEvent.change(container.querySelector('input[name="date"]')!, {
            target: { value: '2026-09-20' },
        });
        fireEvent.change(screen.getByRole('combobox'), {
            target: { value: '3' },
        });
        fireEvent.change(container.querySelector('textarea[name="description"]')!, {
            target: { value: 'Une séance relaxante.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Create Session' }));
        await screen.findByText('An unexpected error occurred');
        fireEvent.click(screen.getByRole('button', { name: 'Create Session' }));
        expect(screen.queryByText('An unexpected error occurred')).toBeNull();
        expect(post).toHaveBeenCalledTimes(2);
        await act(async () => { resolveSave({ data: session }); });
        expect(await screen.findByText('Sessions page')).not.toBeNull();
    });

});
