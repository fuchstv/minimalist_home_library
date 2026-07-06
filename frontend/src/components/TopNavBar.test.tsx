import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopNavBar from './TopNavBar';
import { AuthContext } from '../context/AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mock fetch
const globalFetch = globalThis.fetch;
beforeEach(() => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ count: 0 }),
        })
    );
});

afterEach(() => {
    globalThis.fetch = globalFetch;
});

// Mock react-i18next
const changeLanguageMock = vi.fn();
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: {
            language: 'de',
            changeLanguage: changeLanguageMock,
        },
    }),
}));

describe('TopNavBar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    const renderNavBar = (user: any = null, logout = vi.fn()) => {
        render(
            <MemoryRouter>
                <AuthContext.Provider value={{ user, setUser: vi.fn(), logout }}>
                    <TopNavBar />
                </AuthContext.Provider>
            </MemoryRouter>
        );
    };

    it('renders the catalog link', () => {
        renderNavBar();
        expect(screen.getByText('nav.catalog')).toBeInTheDocument();
    });

    it('shows login link when user is not logged in', () => {
        renderNavBar();
        expect(screen.getByText('nav.login')).toBeInTheDocument();
        expect(screen.queryByText('nav.profile')).not.toBeInTheDocument();
        expect(screen.queryByText('nav.loans')).not.toBeInTheDocument();
        expect(screen.queryByText('nav.logout')).not.toBeInTheDocument();
    });

    it('shows profile, loans, and logout links when user is logged in as member', () => {
        const user = { id: 1, name: 'Test User', email: 'test@example.com', role: 'member' };
        renderNavBar(user);

        expect(screen.getByText('nav.profile')).toBeInTheDocument();
        expect(screen.getByText('nav.loans')).toBeInTheDocument();
        expect(screen.getByText('nav.logout')).toBeInTheDocument();

        // Admin link should not be visible
        expect(screen.queryByText('nav.admin')).not.toBeInTheDocument();
        // Login link should not be visible
        expect(screen.queryByText('nav.login')).not.toBeInTheDocument();
    });

    it('shows admin link when user is logged in as admin', () => {
        const user = { id: 1, name: 'Admin User', email: 'admin@example.com', role: 'admin' };
        renderNavBar(user);

        expect(screen.getByText('nav.admin')).toBeInTheDocument();
    });

    it('calls logout function when logout button is clicked', async () => {
        const user = { id: 1, name: 'Test User', email: 'test@example.com', role: 'member' };
        const logoutMock = vi.fn();
        renderNavBar(user, logoutMock);

        const logoutButton = screen.getByText('nav.logout');
        await userEvent.click(logoutButton);

        expect(logoutMock).toHaveBeenCalledTimes(1);
    });

    it('toggles language and saves to localStorage when language button is clicked', async () => {
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
        renderNavBar();

        // The button displays the current language in uppercase ('DE')
        const langButton = screen.getByText('DE');
        await userEvent.click(langButton);

        // Should change to 'pl'
        expect(changeLanguageMock).toHaveBeenCalledWith('pl');
        expect(setItemSpy).toHaveBeenCalledWith('language', 'pl');
    });

    it('shows notifications count when user has overdue loans', async () => {
        (globalThis.fetch as any).mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ count: 5 }),
            })
        );

        const user = { id: 1, name: 'Test User', email: 'test@example.com', role: 'member' };
        renderNavBar(user);

        await waitFor(() => {
            expect(screen.getByText('5')).toBeInTheDocument();
        });
        expect(screen.getByText('notifications')).toBeInTheDocument();
    });
});
