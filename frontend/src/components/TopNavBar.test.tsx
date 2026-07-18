import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
        // Should find at least one Katalog link
        expect(screen.getAllByText(/Katalog/i).length).toBeGreaterThan(0);
    });

    it('shows login and register links when user is not logged in', () => {
        renderNavBar(null);
        // There might be two now (desktop and mobile)
        expect(screen.getAllByText(/Anmelden/i).length).toBeGreaterThan(0);
    });

    it('shows profile and logout links when user is logged in', () => {
        renderNavBar({ id: 1, name: 'John Doe', email: 'test@test.com', role: 'member' });
        expect(screen.getAllByText(/Mein Profil/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Abmelden/i).length).toBeGreaterThan(0);
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
        expect(screen.getAllByText(/Admin/i).length).toBeGreaterThan(0);
    });

    it('calls logout function when logout button is clicked', () => {
        const logoutMock = vi.fn();
        renderNavBar({ id: 1, name: 'John Doe', email: 'test@test.com', role: 'member' }, logoutMock);
        // Click the desktop one (visible in tests by default unless we filter)
        const logoutButtons = screen.getAllByText(/Abmelden/i);
        fireEvent.click(logoutButtons[0]);
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

    it('toggles mobile menu when menu button is clicked', () => {
        renderNavBar(null);
        const menuButton = screen.getByLabelText(/Menü/i);

        // Initial state: mobile links are present but may be hidden by CSS (which JSDOM doesn't fully support)
        // In our case, they are always in the DOM but with scale-y-0
        const catalogLinks = screen.getAllByText(/Katalog/i);
        expect(catalogLinks.length).toBe(2);

        fireEvent.click(menuButton);
        // Menu button text should change to close icon (material symbol)
        expect(screen.getByText('close')).toBeInTheDocument();

        fireEvent.click(menuButton);
        expect(screen.getByText('menu')).toBeInTheDocument();
    });

    it('toggles dark mode when theme button is clicked', () => {
        renderNavBar(null);
        const toggleButton = screen.getByLabelText(/Dunkelmodus/i);
        expect(toggleButton).toBeInTheDocument();

        fireEvent.click(toggleButton);
        expect(document.documentElement.classList.contains('dark')).toBe(true);

        fireEvent.click(screen.getByLabelText(/Hellmodus/i));
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
});
