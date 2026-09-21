import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import Login from "./Login";

describe('Login', () => {
    it('affiche le formulaire de connexion correctement', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>,
        );

        expect(screen.getByLabelText('Email')).not.toBeNull();
        expect(screen.getByLabelText('Password')).not.toBeNull();
        expect(screen.getByRole('button', {name: 'Login'})).not.toBeNull();
        expect(screen.getByRole('link', {name: 'Register here'}).getAttribute('href')).toBe('/register');
    });
});
