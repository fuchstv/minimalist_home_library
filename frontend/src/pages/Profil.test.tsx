import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Profil from './Profil';
import { AuthContext } from '../context/AuthContext';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import '@testing-library/jest-dom';

// Mock fetch
vi.stubGlobal('fetch', vi.fn());

const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@test.com',
    role: 'member',
    fee_paid: true,
    is_blocked: false
};

const renderProfil = (user: any) => {
    return render(
        <I18nextProvider i18n={i18n}>
            <AuthContext.Provider value={{ user, setUser: vi.fn(), logout: vi.fn(), csrfToken: null, setCsrfToken: vi.fn() }}>
                <MemoryRouter>
                    <Profil />
                </MemoryRouter>
            </AuthContext.Provider>
        </I18nextProvider>
    );
};

describe('Profil Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state initially', async () => {
        // Mock two fetches (loans and notifications)
        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ data: [] }),
        });

        renderProfil(mockUser);
        expect(screen.getAllByText(/Lädt.../i).length).toBeGreaterThan(0);
    });

    it('renders user information and loans', async () => {
        const mockLoans = [
            { id: 1, book_id: 101, title: 'Test Book', author: 'Author Name', loan_date: '2024-01-01', due_date: '2024-01-15', status: 'active' }
        ];

        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ data: mockLoans }),
        });

        renderProfil(mockUser);

        await waitFor(() => {
            expect(screen.getByText(/Test User/i)).toBeInTheDocument();
            expect(screen.getAllByText(/Test Book/i).length).toBeGreaterThan(0);
            expect(screen.getAllByText(/Author Name/i).length).toBeGreaterThan(0);
            expect(screen.getAllByText(/Rückgabe bis:/i).length).toBeGreaterThan(0);
        });
    });

    it('shows overdue status for overdue loans', async () => {
        const mockLoans = [
            { id: 2, book_id: 102, title: 'Overdue Book', author: 'Old Author', loan_date: '2023-12-01', due_date: '2023-12-15', status: 'overdue' }
        ];

        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ data: mockLoans }),
        });

        renderProfil(mockUser);

        await waitFor(() => {
            expect(screen.getByText(/Überfällig/i)).toBeInTheDocument();
        });
    });

    it('renders loan history with return dates', async () => {
        const mockLoans = [
            {
                id: 3,
                book_id: 103,
                title: 'History Book',
                author: 'Past Author',
                loan_date: '2023-11-01',
                due_date: '2023-11-15',
                return_date: '2023-11-10',
                status: 'returned'
            }
        ];

        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ data: mockLoans }),
        });

        renderProfil(mockUser);

        await waitFor(() => {
            expect(screen.getByText(/History Book/i)).toBeInTheDocument();
            // Check if return date is present in some common format
            const returnDateElement = screen.getByText((content) => {
                return content.includes('11/10/2023') || content.includes('10.11.2023');
            });
            expect(returnDateElement).toBeInTheDocument();
        });
    });
});
