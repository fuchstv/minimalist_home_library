import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ForcePasswordChangeModal from './ForcePasswordChangeModal';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import '@testing-library/jest-dom';
import { AuthContext } from '../context/AuthContext';

vi.stubGlobal('fetch', vi.fn());

const renderModal = (user = { id: 1, name: 'User', email: 'u@test.com', role: 'member', must_change_password: 1 }, setUser = vi.fn()) => {
    return render(
        <I18nextProvider i18n={i18n}>
            <AuthContext.Provider value={{ user, setUser, csrfToken: 'test-csrf', setCsrfToken: vi.fn(), logout: vi.fn() }}>
                <ForcePasswordChangeModal />
            </AuthContext.Provider>
        </I18nextProvider>
    );
};

describe('ForcePasswordChangeModal Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does not render when user is null or must_change_password is 0', () => {
        const { container } = renderModal({ id: 1, name: 'User', email: 'u@test.com', role: 'member', must_change_password: 0 });
        expect(container.firstChild).toBeNull();
    });

    it('renders modal when user must_change_password is 1', () => {
        renderModal();
        expect(screen.getByText(/Passwortänderung erforderlich/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Neues Passwort/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Passwort bestätigen/i)).toBeInTheDocument();
    });

    it('shows error if passwords do not match', async () => {
        renderModal();
        fireEvent.change(screen.getByLabelText(/^Neues Passwort$/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/Passwort bestätigen/i), { target: { value: 'password456' } });

        fireEvent.click(screen.getByRole('button', { name: /Neues Passwort speichern/i }));

        await waitFor(() => {
            expect(screen.getByText(/Die Passwörter stimmen nicht überein/i)).toBeInTheDocument();
        });
    });

    it('submits password change successfully', async () => {
        const setUserMock = vi.fn();
        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: 'Password changed successfully' })
        });

        renderModal({ id: 1, name: 'User', email: 'u@test.com', role: 'member', must_change_password: 1 }, setUserMock);

        fireEvent.change(screen.getByLabelText(/^Neues Passwort$/i), { target: { value: 'newsecret123' } });
        fireEvent.change(screen.getByLabelText(/Passwort bestätigen/i), { target: { value: 'newsecret123' } });

        fireEvent.click(screen.getByRole('button', { name: /Neues Passwort speichern/i }));

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/auth/change-password'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ new_password: 'newsecret123' })
                })
            );
            expect(setUserMock).toHaveBeenCalledWith(expect.objectContaining({ must_change_password: 0 }));
        });
    });
});
