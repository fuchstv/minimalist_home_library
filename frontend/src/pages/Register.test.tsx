import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Register from './Register';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = vi.fn();

const renderRegister = () => {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    </I18nextProvider>
  );
};

describe('Register Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits correctly when all fields are filled and checkboxes are checked', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'User registered successfully' }),
    });

    renderRegister();

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/E-Mail Adresse/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/Telefonnummer/i), { target: { value: '123456789' } });
    fireEvent.change(screen.getByLabelText(/Passwort/i), { target: { value: 'password123' } });

    // Checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Data consent
    fireEvent.click(checkboxes[1]); // Rules consent

    fireEvent.click(screen.getByRole('button', { name: /Konto erstellen/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'John Doe',
            email: 'john@example.com',
            password: 'password123',
            phone: '123456789',
            acceptData: true,
            acceptRules: true
          }),
        })
      );
    });
  });

  it('shows error if checkboxes are not checked even if fields are filled', async () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/E-Mail Adresse/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/Telefonnummer/i), { target: { value: '123456789' } });
    fireEvent.change(screen.getByLabelText(/Passwort/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Konto erstellen/i }));

    // Check for error message
    await waitFor(() => {
        expect(screen.getByText(/Bitte akzeptieren Sie die Datenschutzbestimmungen und Bibliotheksregeln/i)).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
