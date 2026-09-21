import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { authService } from "../services/auth.service";
import Navbar from "./Navbar";

describe('Navbar', () => {
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
