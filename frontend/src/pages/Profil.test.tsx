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
  email: 'test@example.com',
  role: 'member'
};

const renderProfil = (user = mockUser) => {
  return render(
    <I18nextProvider i18n={i18n}>
      <AuthContext.Provider value={{ user, setUser: vi.fn(), logout: vi.fn() }}>
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
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    renderProfil();
    expect(screen.getByText(/Lädt/i)).toBeInTheDocument();
  });

  it('renders loans correctly', async () => {
    const mockLoans = [
      {
        id: 1,
        book_id: 101,
        title: 'Test Book',
        author: 'Test Author',
        loan_date: '2023-01-01',
        due_date: '2023-01-15',
        status: 'active'
      }
    ];

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockLoans }),
    });

    renderProfil();

    await waitFor(() => {
      expect(screen.getByText('Test Book')).toBeInTheDocument();
      expect(screen.getByText('Test Author')).toBeInTheDocument();
    });
  });

  it('filters out returned loans', async () => {
    const mockLoans = [
      {
        id: 1,
        book_id: 101,
        title: 'Active Book',
        author: 'Author A',
        loan_date: '2023-01-01',
        due_date: '2023-01-15',
        status: 'active'
      },
      {
        id: 2,
        book_id: 102,
        title: 'Returned Book',
        author: 'Author B',
        loan_date: '2023-01-01',
        due_date: '2023-01-15',
        status: 'returned'
      }
    ];

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockLoans }),
    });

    renderProfil();

    await waitFor(() => {
      expect(screen.getByText('Active Book')).toBeInTheDocument();
      expect(screen.queryByText('Returned Book')).not.toBeInTheDocument();
    });
  });
});
