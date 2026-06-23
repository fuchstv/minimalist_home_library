import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import DynamicPage from './DynamicPage';
import { AuthContext } from '../context/AuthContext';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import '@testing-library/jest-dom';

vi.mock('axios');

const mockPageData = {
    slug: 'regeln',
    title_de: 'Bibliotheksregeln DE',
    title_pl: 'Regulamin PL',
    content_de: 'Inhalt DE',
    content_pl: 'Inhalt PL'
};

const renderDynamicPage = (user: { id: number; name: string; email: string; role: string } | null) => {
    return render(
        <I18nextProvider i18n={i18n}>
            <AuthContext.Provider value={{ user, setUser: () => {}, logout: () => {} }}>
                <MemoryRouter initialEntries={['/page/regeln']}>
                    <Routes>
                        <Route path="/page/:slug" element={<DynamicPage />} />
                    </Routes>
                </MemoryRouter>
            </AuthContext.Provider>
        </I18nextProvider>
    );
};

describe('DynamicPage Component inline editing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (axios.get as any).mockResolvedValue({ data: mockPageData });
    });

    it('renders page content successfully', async () => {
        renderDynamicPage(null);
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/pages/regeln'));
        
        await waitFor(() => {
            expect(screen.getByText('Bibliotheksregeln DE')).toBeInTheDocument();
            expect(screen.getByText('Inhalt DE')).toBeInTheDocument();
        });
    });

    it('does not show Edit button for guests or members', async () => {
        renderDynamicPage({ id: 2, name: 'Member User', email: 'member@test.com', role: 'member' });
        await waitFor(() => {
            expect(screen.getByText('Bibliotheksregeln DE')).toBeInTheDocument();
        });
        expect(screen.queryByText('Seite bearbeiten')).not.toBeInTheDocument();
    });

    it('shows Edit button for admins and opens editor when clicked', async () => {
        renderDynamicPage({ id: 1, name: 'Admin User', email: 'admin@test.com', role: 'admin' });
        
        await waitFor(() => {
            expect(screen.getByText('Seite bearbeiten')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Seite bearbeiten'));

        // Should render editor inputs
        expect(screen.getByLabelText('Titel (DE)')).toHaveValue('Bibliotheksregeln DE');
        expect(screen.getByLabelText('Inhalt (DE)')).toHaveValue('Inhalt DE');
        expect(screen.getByLabelText('Titel (PL)')).toHaveValue('Regulamin PL');
        expect(screen.getByLabelText('Inhalt (PL)')).toHaveValue('Inhalt PL');
    });

    it('reverts changes and exits editing mode when cancel is clicked', async () => {
        renderDynamicPage({ id: 1, name: 'Admin User', email: 'admin@test.com', role: 'admin' });
        
        await waitFor(() => {
            expect(screen.getByText('Seite bearbeiten')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Seite bearbeiten'));

        const titleDeInput = screen.getByLabelText('Titel (DE)');
        fireEvent.change(titleDeInput, { target: { value: 'Modified Title' } });
        expect(titleDeInput).toHaveValue('Modified Title');

        fireEvent.click(screen.getByText('Abbrechen'));

        // Should return to normal view
        await waitFor(() => {
            expect(screen.getByText('Bibliotheksregeln DE')).toBeInTheDocument();
            expect(screen.queryByLabelText('Titel (DE)')).not.toBeInTheDocument();
        });
    });

    it('saves changes successfully when save is clicked', async () => {
        (axios.post as any).mockResolvedValue({ data: { message: 'Page updated successfully' } });

        renderDynamicPage({ id: 1, name: 'Admin User', email: 'admin@test.com', role: 'admin' });
        
        await waitFor(() => {
            expect(screen.getByText('Seite bearbeiten')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Seite bearbeiten'));

        fireEvent.change(screen.getByLabelText('Titel (DE)'), { target: { value: 'New Rules Title' } });
        fireEvent.change(screen.getByLabelText('Inhalt (DE)'), { target: { value: 'New content for German' } });

        fireEvent.click(screen.getByText('Speichern'));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/admin/pages/regeln'),
                expect.objectContaining({
                    slug: 'regeln',
                    title_de: 'New Rules Title',
                    content_de: 'New content for German',
                    title_pl: 'Regulamin PL',
                    content_pl: 'Inhalt PL'
                }),
                expect.objectContaining({ withCredentials: true })
            );
        });

        await waitFor(() => {
            expect(screen.getByText('New Rules Title')).toBeInTheDocument();
            expect(screen.getByText('New content for German')).toBeInTheDocument();
        });
    });
});
