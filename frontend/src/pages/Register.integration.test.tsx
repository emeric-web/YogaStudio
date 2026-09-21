import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { authService } from '../services/auth.service';
import type { AuthResponse } from '../types';
import Register from './Register';

const user: AuthResponse = {
    id: 1,
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    admin: false,
    token: 'fake-token',
};

describe('Register', () => {
    it('affiche les champs du formulaire et le lien de connexion', async () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/register']}>
                <Routes>
                    <Route path="/register" element={<Register />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );

        expect(container.querySelector('input[name="firstName"]')).not.toBeNull();
        expect(container.querySelector('input[name="lastName"]')).not.toBeNull();
        expect(container.querySelector('input[name="email"]')).not.toBeNull();
        expect(container.querySelector('input[name="password"]')?.getAttribute('minlength')).toBe('8');
        expect(screen.getByRole('button', { name: 'Register' }).hasAttribute('disabled')).toBe(false);
        expect(screen.getByRole('link', { name: 'Login here' }).getAttribute('href')).toBe('/login');
    });

    it('envoie les données saisies et redirige après inscription', async () => {
        const register = vi.spyOn(authService, 'register').mockResolvedValue(user);
        const { container } = render(
            <MemoryRouter initialEntries={['/register']}>
                <Routes>
                    <Route path="/register" element={<Register />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        // Les labels ne sont pas associés aux champs : on utilise leur attribut name.
        fireEvent.change(container.querySelector('input[name="firstName"]')!, {
            target: { value: 'John' },
        });
        fireEvent.change(container.querySelector('input[name="lastName"]')!, {
            target: { value: 'Doe' },
        });
        fireEvent.change(container.querySelector('input[name="email"]')!, {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(container.querySelector('input[name="password"]')!, {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Register' }));

        expect(await screen.findByText('Sessions page')).not.toBeNull();
        expect(register).toHaveBeenCalledExactlyOnceWith({
            firstName: 'John', lastName: 'Doe',
            email: 'user@example.com', password: 'password123',
        });
    });

    it('désactive le bouton pendant l’inscription', async () => {
        let resolveRegister!: (value: AuthResponse) => void;
        const pendingRegister = new Promise<AuthResponse>((resolve) => {
            resolveRegister = resolve;
        });
        const register = vi.spyOn(authService, 'register').mockReturnValue(pendingRegister);
        const { container } = render(
            <MemoryRouter initialEntries={['/register']}>
                <Routes>
                    <Route path="/register" element={<Register />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        // Les labels ne sont pas associés aux champs : on utilise leur attribut name.
        fireEvent.change(container.querySelector('input[name="firstName"]')!, {
            target: { value: 'John' },
        });
        fireEvent.change(container.querySelector('input[name="lastName"]')!, {
            target: { value: 'Doe' },
        });
        fireEvent.change(container.querySelector('input[name="email"]')!, {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(container.querySelector('input[name="password"]')!, {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Register' }));

        const button = screen.getByRole('button', { name: 'Registering...' });
        expect(button.hasAttribute('disabled')).toBe(true);
        fireEvent.click(button);
        expect(register).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('Sessions page')).toBeNull();

        await act(async () => { resolveRegister(user); });
        expect(await screen.findByText('Sessions page')).not.toBeNull();
    });

    it('affiche le message d’erreur de l’API', async () => {
        vi.spyOn(authService, 'register').mockRejectedValue({ isAxiosError: true, response: { data: { message: 'Email déjà utilisé' } } });
        const { container } = render(
            <MemoryRouter initialEntries={['/register']}>
                <Routes>
                    <Route path="/register" element={<Register />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        // Les labels ne sont pas associés aux champs : on utilise leur attribut name.
        fireEvent.change(container.querySelector('input[name="firstName"]')!, {
            target: { value: 'John' },
        });
        fireEvent.change(container.querySelector('input[name="lastName"]')!, {
            target: { value: 'Doe' },
        });
        fireEvent.change(container.querySelector('input[name="email"]')!, {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(container.querySelector('input[name="password"]')!, {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Register' }));
        expect(await screen.findByText('Email déjà utilisé')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Register' }).hasAttribute('disabled')).toBe(false);
        expect(screen.queryByText('Sessions page')).toBeNull();
    });

    it('affiche un message de secours pour une erreur API sans message', async () => {
        vi.spyOn(authService, 'register').mockRejectedValue({ isAxiosError: true });
        const { container } = render(
            <MemoryRouter initialEntries={['/register']}>
                <Routes>
                    <Route path="/register" element={<Register />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        // Les labels ne sont pas associés aux champs : on utilise leur attribut name.
        fireEvent.change(container.querySelector('input[name="firstName"]')!, {
            target: { value: 'John' },
        });
        fireEvent.change(container.querySelector('input[name="lastName"]')!, {
            target: { value: 'Doe' },
        });
        fireEvent.change(container.querySelector('input[name="email"]')!, {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(container.querySelector('input[name="password"]')!, {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Register' }));
        expect(await screen.findByText('Registration failed')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Register' }).hasAttribute('disabled')).toBe(false);
        expect(screen.queryByText('Sessions page')).toBeNull();
    });

    it('affiche un message pour une erreur inattendue', async () => {
        vi.spyOn(authService, 'register').mockRejectedValue(new Error('Erreur inattendue'));
        const { container } = render(
            <MemoryRouter initialEntries={['/register']}>
                <Routes>
                    <Route path="/register" element={<Register />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        // Les labels ne sont pas associés aux champs : on utilise leur attribut name.
        fireEvent.change(container.querySelector('input[name="firstName"]')!, {
            target: { value: 'John' },
        });
        fireEvent.change(container.querySelector('input[name="lastName"]')!, {
            target: { value: 'Doe' },
        });
        fireEvent.change(container.querySelector('input[name="email"]')!, {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(container.querySelector('input[name="password"]')!, {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Register' }));
        expect(await screen.findByText('An unexpected error occurred')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Register' }).hasAttribute('disabled')).toBe(false);
        expect(screen.queryByText('Sessions page')).toBeNull();
    });

    it('efface l’erreur à la tentative suivante et permet l’inscription', async () => {
        let resolveRegister!: (value: AuthResponse) => void;
        const pendingRegister = new Promise<AuthResponse>((resolve) => {
            resolveRegister = resolve;
        });
        const register = vi.spyOn(authService, 'register')
            .mockRejectedValueOnce(new Error('Échec'))
            .mockReturnValueOnce(pendingRegister);
        const { container } = render(
            <MemoryRouter initialEntries={['/register']}>
                <Routes>
                    <Route path="/register" element={<Register />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                    
                </Routes>
            </MemoryRouter>,
        );
        // Les labels ne sont pas associés aux champs : on utilise leur attribut name.
        fireEvent.change(container.querySelector('input[name="firstName"]')!, {
            target: { value: 'John' },
        });
        fireEvent.change(container.querySelector('input[name="lastName"]')!, {
            target: { value: 'Doe' },
        });
        fireEvent.change(container.querySelector('input[name="email"]')!, {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(container.querySelector('input[name="password"]')!, {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Register' }));

        await screen.findByText('An unexpected error occurred');
        fireEvent.click(screen.getByRole('button', { name: 'Register' }));
        expect(screen.queryByText('An unexpected error occurred')).toBeNull();
        expect(register).toHaveBeenCalledTimes(2);

        await act(async () => { resolveRegister(user); });
        expect(await screen.findByText('Sessions page')).not.toBeNull();
    });

});
