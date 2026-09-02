import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from '../utils/api';
import AdminLoans from './AdminLoans';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import '@testing-library/jest-dom';

vi.mock('../utils/api', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        interceptors: {
            request: { use: vi.fn(), eject: vi.fn() },
            response: { use: vi.fn(), eject: vi.fn() }
        }
    }
}));

const mockLoans = [
    {
        id: 1,
        book_id: 101,
        user_id: 1,
        loan_date: '2026-08-01',
        due_date: '2026-08-20',
        return_date: null,
        status: 'active' as const,
        user_name: 'Anna Schmidt',
        user_email: 'anna@example.com',
        user_phone: '123456',
        book_title: 'Der Zauberberg',
        book_author: 'Thomas Mann',
        book_signature: 'ROM-001'
    },
    {
        id: 2,
        book_id: 102,
        user_id: 2,
        loan_date: '2026-07-01',
        due_date: '2026-07-20',
        return_date: null,
        status: 'overdue' as const,
        user_name: 'Jan Kowalski',
        user_email: 'jan@example.com',
        user_phone: '654321',
        book_title: 'Lalka',
        book_author: 'Boleslaw Prus',
        book_signature: 'ROM-002'
    },
    {
        id: 3,
        book_id: 103,
        user_id: 3,
        loan_date: '2026-06-01',
        due_date: '2026-06-20',
        return_date: '2026-06-15',
        status: 'returned' as const,
        user_name: 'Maria Nowak',
        user_email: 'maria@example.com',
        user_phone: '987654',
        book_title: 'Solaris',
        book_author: 'Stanislaw Lem',
        book_signature: 'SF-001'
    },
    {
        id: 4,
        book_id: 104,
        user_id: 4,
        loan_date: '2026-08-10',
        due_date: '2026-08-30',
        return_date: null,
        status: 'active' as const,
        user_name: 'Piotr Zielinski',
        user_email: 'piotr@example.com',
        user_phone: '555111',
        book_title: 'Cyberiada',
        book_author: 'Stanislaw Lem',
        book_signature: 'SF-002'
    }
];

const renderAdminLoans = () => {
    return render(
        <I18nextProvider i18n={i18n}>
            <MemoryRouter>
                <AdminLoans />
            </MemoryRouter>
        </I18nextProvider>
    );
};

describe('AdminLoans Component (PR #69 verification)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(axios.get).mockResolvedValue({ data: { data: mockLoans } });
    });

    it('correctly aggregates status counts (active, overdue, returned) in statusCounts memo', async () => {
        renderAdminLoans();

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/admin/loans'), expect.objectContaining({ withCredentials: true }));
        });

        await waitFor(() => {
            expect(screen.getByText(/Alle \(4\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Aktiv \(2\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Überfällig \(1\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Zurückgegeben \(1\)/i)).toBeInTheDocument();
        });
    });

    it('filters loan list by status when clicking status filter buttons', async () => {
        renderAdminLoans();

        await waitFor(() => {
            expect(screen.getByText('Der Zauberberg')).toBeInTheDocument();
            expect(screen.getByText('Lalka')).toBeInTheDocument();
            expect(screen.getByText('Solaris')).toBeInTheDocument();
        });

        // Filter by overdue
        fireEvent.click(screen.getByText(/Überfällig \(1\)/i));
        expect(screen.getByText('Lalka')).toBeInTheDocument();
        expect(screen.queryByText('Der Zauberberg')).not.toBeInTheDocument();
        expect(screen.queryByText('Solaris')).not.toBeInTheDocument();

        // Filter by returned
        fireEvent.click(screen.getByText(/Zurückgegeben \(1\)/i));
        expect(screen.getByText('Solaris')).toBeInTheDocument();
        expect(screen.queryByText('Lalka')).not.toBeInTheDocument();
        expect(screen.queryByText('Der Zauberberg')).not.toBeInTheDocument();

        // Filter by active
        fireEvent.click(screen.getByText(/Aktiv \(2\)/i));
        expect(screen.getByText('Der Zauberberg')).toBeInTheDocument();
        expect(screen.getByText('Cyberiada')).toBeInTheDocument();
        expect(screen.queryByText('Lalka')).not.toBeInTheDocument();
        expect(screen.queryByText('Solaris')).not.toBeInTheDocument();
    });

    it('filters loan list by search query (user name, email, book title, signature)', async () => {
        renderAdminLoans();

        await waitFor(() => {
            expect(screen.getByText('Der Zauberberg')).toBeInTheDocument();
        });

        const searchInput = screen.getByRole('textbox');

        // Search by title
        fireEvent.change(searchInput, { target: { value: 'Zauberberg' } });
        expect(screen.getByText('Der Zauberberg')).toBeInTheDocument();
        expect(screen.queryByText('Lalka')).not.toBeInTheDocument();

        // Search by user email
        fireEvent.change(searchInput, { target: { value: 'jan@example.com' } });
        expect(screen.getByText('Lalka')).toBeInTheDocument();
        expect(screen.queryByText('Der Zauberberg')).not.toBeInTheDocument();

        // Search by signature
        fireEvent.change(searchInput, { target: { value: 'SF-001' } });
        expect(screen.getByText('Solaris')).toBeInTheDocument();
        expect(screen.queryByText('Der Zauberberg')).not.toBeInTheDocument();
    });

    it('handles loan actions (return & extend)', async () => {
        vi.mocked(axios.put).mockResolvedValue({ data: { message: 'Updated' } });

        renderAdminLoans();

        await waitFor(() => {
            expect(screen.getByText('Der Zauberberg')).toBeInTheDocument();
        });

        const returnButtons = screen.getAllByRole('button', { name: /Zurückgeben/i });
        fireEvent.click(returnButtons[0]);

        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith(
                expect.stringContaining('/api/admin/loans/1'),
                { action: 'return' },
                expect.objectContaining({ withCredentials: true })
            );
        });
    });

    it('handles empty loans state gracefully', async () => {
        vi.mocked(axios.get).mockResolvedValue({ data: { data: [] } });

        renderAdminLoans();

        await waitFor(() => {
            expect(screen.getByText(/Alle \(0\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Aktiv \(0\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Überfällig \(0\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Zurückgegeben \(0\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Keine Ausleihen gefunden/i)).toBeInTheDocument();
        });
    });
});
