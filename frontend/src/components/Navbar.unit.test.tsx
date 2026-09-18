import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { authService } from "../services/auth.service";
import Navbar from "./Navbar";

describe('Navbar', () => {
    it('affiche seulement les liens de Login et Register si l’utilisateur n’est pas connecté', () => {
        vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);
        vi.spyOn(authService, 'getCurrentUser').mockReturnValue(null);

        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>,
        );

        expect(screen.getByRole('link', { name: 'Login' }).getAttribute('href')).toBe('/login');
        expect(screen.getByRole('link', { name: 'Register' }).getAttribute('href')).toBe('/register');
        expect(screen.queryByRole('link', { name: 'Sessions' })).toBeNull();
        expect(screen.queryByRole('link', { name: 'Profile' })).toBeNull();
        expect(screen.queryByRole('link', { name: 'Create Session' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Logout' })).toBeNull();
    });
    
    it('affiche les liens de Sessions, Profile et Logout si l’utilisateur est connecté', () => {
        vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
        vi.spyOn(authService, 'getCurrentUser').mockReturnValue({
            id: 1,
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            admin: false,
            token: 'fake-token',
        });

        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>,
        );

        expect(screen.queryByRole('link', { name: 'Login' })).toBeNull();
        expect(screen.queryByRole('link', { name: 'Register' })).toBeNull();
        expect(screen.getByRole('link', { name: 'Sessions' }).getAttribute('href')).toBe('/sessions');
        expect(screen.getByRole('link', { name: 'Profile' }).getAttribute('href')).toBe('/profile');
        expect(screen.queryByRole('link', { name: 'Create Session' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Logout' })).not.toBeNull();
    });

    it('affiche le lien de Create Session si l’utilisateur est un admin', () => {
        vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
        vi.spyOn(authService, 'getCurrentUser').mockReturnValue({
            id: 1,
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            admin: true,
            token: 'fake-token',
        });

        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>,
        );

        expect(
            screen.getByRole('link', { name: 'Create Session' }).getAttribute('href')
        ).toBe('/sessions/create');
    });

    it('redirige vers la page de connexion après la déconnexion', () => {
        vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
        vi.spyOn(authService, 'getCurrentUser').mockReturnValue({
            id: 1,
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            admin: false,
            token: 'fake-token',
        });


        const logout = vi.spyOn(authService, 'logout')
            .mockImplementation(() => {});

        render(
            <MemoryRouter initialEntries={['/sessions']}>
                <Routes>
                    <Route path="/sessions" element={<Navbar />} />
                    <Route path="/login" element={<p>Page de connexion</p>} />
                </Routes>
            </MemoryRouter>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    
        expect(logout).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Page de connexion')).not.toBeNull();
    });
});
