import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './Login';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import '@testing-library/jest-dom';
import { AuthContext } from '../context/AuthContext';

vi.stubGlobal('fetch', vi.fn());

const renderLogin = (contextValue = {}) => {
    const defaultContext = {
        user: null,
        setUser: vi.fn(),
        csrfToken: null,
        setCsrfToken: vi.fn(),
        logout: vi.fn(),
        ...contextValue
    };

    return render(
        <I18nextProvider i18n={i18n}>
            <AuthContext.Provider value={defaultContext}>
                <MemoryRouter>
                    <Login />
                </MemoryRouter>
            </AuthContext.Provider>
        </I18nextProvider>
    );
};

describe('Login Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders login form with forgot password link', () => {
        renderLogin();
        expect(screen.getByText(/Anmelden/i)).toBeInTheDocument();
        expect(screen.getByText(/Passwort vergessen\?/i)).toBeInTheDocument();
    });

    it('opens forgot password help modal when clicking help link', async () => {
        renderLogin();
        const helpBtn = screen.getByText(/Passwort vergessen\?/i);
        fireEvent.click(helpBtn);

        await waitFor(() => {
            expect(screen.getByText(/Passwort zurücksetzen/i)).toBeInTheDocument();
            expect(screen.getByText(/Ein Administrator kann ein neues temporäres Passwort/i)).toBeInTheDocument();
        });
    });

    it('submits login credentials successfully', async () => {
        const setUserMock = vi.fn();
        const setCsrfMock = vi.fn();
        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                user: { id: 1, name: 'Test User', email: 'test@example.com', role: 'member' },
                csrfToken: 'mock-csrf'
            })
        });

        renderLogin({ setUser: setUserMock, setCsrfToken: setCsrfMock });

        fireEvent.change(screen.getByLabelText(/E-Mail Adresse/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/Passwort/i), { target: { value: 'secret123' } });

        fireEvent.click(screen.getByRole('button', { name: /Einloggen/i }));

        await waitFor(() => {
            expect(setUserMock).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com' }));
            expect(setCsrfMock).toHaveBeenCalledWith('mock-csrf');
        });
    });
});
