import { render, screen, act } from '@testing-library/react';
import { useContext } from 'react';
import { AuthContext, AuthProvider } from './AuthContext';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { API_BASE_URL } from '../config';
import type { Mock } from 'vitest';

// Create a test component to access the context
const TestComponent = () => {
    const { user, setUser, logout } = useContext(AuthContext);

    return (
        <div>
            <div data-testid="user">{user ? user.name : 'No User'}</div>
            <button onClick={() => setUser({ id: 1, name: 'Test User', email: 'test@example.com', role: 'member' })}>
                Login
            </button>
            <button onClick={logout}>Logout</button>
        </div>
    );
};

describe('AuthContext', () => {
    let mockFetch: Mock;

    beforeEach(() => {
        // Clear mocks and local storage before each test
        localStorage.clear();
        vi.clearAllMocks();

        // Mock global fetch
        mockFetch = vi.fn();
        globalThis.fetch = mockFetch;
    });

    afterEach(() => {
        // Restore original fetch
        vi.restoreAllMocks();
    });

    it('logout function should clear user state, local storage and call API', async () => {
        // Set an initial user in local storage to simulate a logged-in state
        const initialUser = { id: 1, name: 'Initial User', email: 'initial@example.com', role: 'member' };
        localStorage.setItem('user', JSON.stringify(initialUser));

        mockFetch.mockImplementation((url) => {
            if (url.includes('/api/auth/me')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ user: initialUser, csrfToken: 'mock-token' })
                });
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ message: 'Logged out successfully' })
            });
        });

        await act(async () => {
            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );
        });

        // Verify initial state
        expect(screen.getByTestId('user')).toHaveTextContent('Initial User');

        // Spy on localStorage.removeItem
        const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

        // Trigger logout
        await act(async () => {
            screen.getByText('Logout').click();
        });

        // 1. Verify user state is cleared
        expect(screen.getByTestId('user')).toHaveTextContent('No User');

        // 2. Verify localStorage.removeItem is called with 'user'
        expect(removeItemSpy).toHaveBeenCalledWith('user');

        // 3. Verify fetch is called with correct parameters
        expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/auth/logout`, expect.objectContaining({
            method: 'POST',
            credentials: 'include',
            headers: expect.objectContaining({ 'X-CSRF-Token': 'mock-token' })
        }));
    });
});
