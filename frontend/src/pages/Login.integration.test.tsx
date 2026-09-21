import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "./Login";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { AuthResponse } from "../types";
import { authService } from "../services/auth.service";

describe('Login', () => {
    it('connecte l’utilisateur et affiche les sessions après soumission', async () => {
        const login = vi.spyOn(authService, 'login').mockResolvedValue({
            id: 1,
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            admin: false,
            token: 'fake-token',
        });

        render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                </Routes>
            </MemoryRouter>,
        );

        fireEvent.change(screen.getByLabelText('Email'), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByLabelText('Password'), {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Login' }));

        expect(login).toHaveBeenCalledExactlyOnceWith({
            email: 'user@example.com',
            password: 'password123',
        });
        expect(await screen.findByText('Sessions page')).not.toBeNull();
    });

    it('désactive le bouton et affiche le chargement pendant la connexion', async () => {
        // Le test décide quand la requête se termine.
        let rejectLogin!: (error: Error) => void;
        const pendingLogin = new Promise<AuthResponse>((_resolve, reject) => {
            rejectLogin = reject;
        });
        const login = vi.spyOn(authService, 'login').mockReturnValue(pendingLogin);

        render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                </Routes>
            </MemoryRouter>,
        );

        fireEvent.change(screen.getByLabelText('Email'), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByLabelText('Password'), {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Login' }));

        const button = screen.getByRole('button', { name: 'Loading...' });
        expect(button.hasAttribute('disabled')).toBe(true);

        fireEvent.click(button);
        expect(login).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('Sessions page')).toBeNull();

        // Termine la requête pour vérifier que le bouton redevient utilisable.
        await act(async () => {
            rejectLogin(new Error('Connexion impossible'));
        });
        expect(screen.getByRole('button', { name: 'Login' }).hasAttribute('disabled')).toBe(false);
    });

    it('affiche le message renvoyé par l’API en cas d’échec', async () => {
        vi.spyOn(authService, 'login').mockRejectedValue({
            isAxiosError: true,
            response: { data: { message: 'Identifiants incorrects' } },
        });

        render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                </Routes>
            </MemoryRouter>,
        );

        fireEvent.change(screen.getByLabelText('Email'), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByLabelText('Password'), {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Login' }));

        expect(await screen.findByText('Identifiants incorrects')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Login' }).hasAttribute('disabled')).toBe(false);
        expect(screen.getByRole('heading', { name: 'Login to Yoga Studio' })).not.toBeNull();
        expect(screen.queryByText('Sessions page')).toBeNull();
    });

    it('affiche un message de secours si l’erreur API ne contient pas de message', async () => {
        vi.spyOn(authService, 'login').mockRejectedValue({
            isAxiosError: true,
        });

        render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                </Routes>
            </MemoryRouter>,
        );

        fireEvent.change(screen.getByLabelText('Email'), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByLabelText('Password'), {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Login' }));

        expect(await screen.findByText('Login failed')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Login' }).hasAttribute('disabled')).toBe(false);
        expect(screen.getByRole('heading', { name: 'Login to Yoga Studio' })).not.toBeNull();
        expect(screen.queryByText('Sessions page')).toBeNull();
    });

    it('affiche un message pour une erreur inattendue', async () => {
        vi.spyOn(authService, 'login').mockRejectedValue(new Error('Erreur inattendue'));

        render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                </Routes>
            </MemoryRouter>,
        );

        fireEvent.change(screen.getByLabelText('Email'), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByLabelText('Password'), {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Login' }));

        expect(await screen.findByText('An unexpected error occurred')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Login' }).hasAttribute('disabled')).toBe(false);
        expect(screen.getByRole('heading', { name: 'Login to Yoga Studio' })).not.toBeNull();
        expect(screen.queryByText('Sessions page')).toBeNull();
    });

    it('efface l’erreur lors d’une nouvelle tentative et permet de se connecter', async () => {
        let resolveLogin!: (user: AuthResponse) => void;
        const pendingLogin = new Promise<AuthResponse>((resolve) => {
            resolveLogin = resolve;
        });
        const login = vi.spyOn(authService, 'login')
            .mockRejectedValueOnce(new Error('Connexion impossible'))
            .mockReturnValueOnce(pendingLogin);

        render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/sessions" element={<p>Sessions page</p>} />
                </Routes>
            </MemoryRouter>,
        );

        fireEvent.change(screen.getByLabelText('Email'), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByLabelText('Password'), {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Login' }));

        expect(await screen.findByText('An unexpected error occurred')).not.toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Login' }));

        expect(screen.queryByText('An unexpected error occurred')).toBeNull();
        expect(screen.getByRole('button', { name: 'Loading...' }).hasAttribute('disabled')).toBe(true);
        expect(login).toHaveBeenCalledTimes(2);
        expect(login).toHaveBeenLastCalledWith({
            email: 'user@example.com',
            password: 'password123',
        });

        await act(async () => {
            resolveLogin({
                id: 1,
                email: 'user@example.com',
                firstName: 'John',
                lastName: 'Doe',
                admin: false,
                token: 'fake-token',
            });
        });

        expect(await screen.findByText('Sessions page')).not.toBeNull();
    });
});
