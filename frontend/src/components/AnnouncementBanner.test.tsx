import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AnnouncementBanner from './AnnouncementBanner';
import '@testing-library/jest-dom';

const globalFetch = globalThis.fetch;

describe('AnnouncementBanner Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        globalThis.fetch = globalFetch;
    });

    it('renders nothing when announcement content is empty strings', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                slug: 'announcement',
                title_de: 'Globale Ankündigung',
                title_pl: 'Ogłoszenie globalne',
                content_de: '',
                content_pl: ''
            })
        });

        const { container } = render(<AnnouncementBanner />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalled();
        });

        expect(screen.queryByTestId('announcement-banner')).toBeNull();
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when announcement content consists only of whitespace', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                slug: 'announcement',
                title_de: 'Globale Ankündigung',
                title_pl: 'Ogłoszenie globalne',
                content_de: '   \n  \t  ',
                content_pl: '   '
            })
        });

        const { container } = render(<AnnouncementBanner />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalled();
        });

        expect(screen.queryByTestId('announcement-banner')).toBeNull();
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when API returns 404 or fails', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404
        });

        const { container } = render(<AnnouncementBanner />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalled();
        });

        expect(screen.queryByTestId('announcement-banner')).toBeNull();
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when fetch throws a network error', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        const { container } = render(<AnnouncementBanner />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalled();
        });

        expect(screen.queryByTestId('announcement-banner')).toBeNull();
        expect(container.firstChild).toBeNull();
    });

    it('displays the announcement text when content is provided', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                slug: 'announcement',
                title_de: 'Globale Ankündigung',
                title_pl: 'Ogłoszenie globalne',
                content_de: 'Bibliothek bleibt heute wegen Umbau geschlossen.',
                content_pl: 'Biblioteka jest dziś zamknięta z powodu remontu.'
            })
        });

        render(<AnnouncementBanner />);

        await waitFor(() => {
            expect(screen.getByTestId('announcement-banner')).toBeInTheDocument();
            expect(screen.getByText(/Bibliothek bleibt heute wegen Umbau geschlossen/i)).toBeInTheDocument();
        });
    });
});
