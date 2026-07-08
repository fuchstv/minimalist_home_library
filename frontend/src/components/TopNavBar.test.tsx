import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TopNavBar from './TopNavBar';
import { AuthContext } from '../context/AuthContext';
import '@testing-library/jest-dom';

// Mock fetch
const globalFetch = globalThis.fetch;

describe('TopNavBar Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        globalThis.fetch = vi.fn().mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ count: 5 }),
            })
        );
    });

    afterEach(() => {
        globalThis.fetch = globalFetch;
    });

    const renderNavBar = (user: any, logout = vi.fn()) => {
        return render(
            <MemoryRouter>
                <AuthContext.Provider value={{ user, setUser: vi.fn(), logout, csrfToken: null, setCsrfToken: vi.fn() }}>
                    <TopNavBar />
                </AuthContext.Provider>
            </MemoryRouter>
        );
    };

    it('renders the catalog link', () => {
        renderNavBar(null);
        expect(screen.getByText(/Katalog/i)).toBeInTheDocument();
    });

    it('shows login and register links when user is not logged in', () => {
        renderNavBar(null);
        expect(screen.getByText(/Anmelden/i)).toBeInTheDocument();
        // Registrieren is not in TopNavBar
        // expect(screen.getByText(/Registrieren/i)).toBeInTheDocument();
    });

    it('shows profile and logout links when user is logged in', () => {
        renderNavBar({ id: 1, name: 'John Doe', email: 'test@test.com', role: 'member' });
        expect(screen.getByText(/Mein Profil/i)).toBeInTheDocument();
        expect(screen.getByText(/Abmelden/i)).toBeInTheDocument();
    });

    it('shows admin link only for admin users', () => {
        const { rerender } = renderNavBar({ id: 1, name: 'Member User', email: 'test@test.com', role: 'member' });
        expect(screen.queryByText(/Admin/i)).not.toBeInTheDocument();

        rerender(
            <MemoryRouter>
                <AuthContext.Provider value={{ user: { id: 2, name: 'Admin User', email: 'admin@test.com', role: 'admin' }, setUser: vi.fn(), logout: vi.fn(), csrfToken: null, setCsrfToken: vi.fn() }}>
                    <TopNavBar />
                </AuthContext.Provider>
            </MemoryRouter>
        );
        expect(screen.getByText(/Admin/i)).toBeInTheDocument();
    });

    it('calls logout function when logout button is clicked', () => {
        const logoutMock = vi.fn();
        renderNavBar({ id: 1, name: 'John Doe', email: 'test@test.com', role: 'member' }, logoutMock);
        fireEvent.click(screen.getByText(/Abmelden/i));
        expect(logoutMock).toHaveBeenCalled();
    });

    it('displays notification count when user is logged in', async () => {
        renderNavBar({ id: 1, name: 'John Doe', email: 'test@test.com', role: 'member' });
        await waitFor(() => {
            expect(screen.getByText('5')).toBeInTheDocument();
        });
    });

    it('does not fetch notifications when user is not logged in', () => {
        renderNavBar(null);
        expect(globalThis.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/notifications'), expect.anything());
    });
});
