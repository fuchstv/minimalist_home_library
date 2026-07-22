import React, { useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const ForcePasswordChangeModal: React.FC = () => {
    const { t } = useTranslation();
    const { user, setUser, csrfToken } = useContext(AuthContext);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!user || !user.must_change_password) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 8) {
            setError(t('auth.password_too_short'));
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t('auth.password_mismatch'));
            return;
        }

        setLoading(true);
        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }

            const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ new_password: newPassword }),
                credentials: 'include'
            });

            const data = await response.json();
            if (response.ok) {
                const updatedUser = { ...user, must_change_password: 0 };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
            } else {
                setError(data.message || t('auth.change_password_error'));
            }
        } catch {
            setError(t('auth.network_error') || 'Netzwerkfehler');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-surface-container-low dark:bg-zinc-800 p-8 rounded-xl border border-outline-variant max-w-md w-full shadow-2xl flex flex-col gap-5">
                <div className="flex items-center gap-3 text-primary">
                    <span className="material-symbols-outlined text-[32px]">lock_reset</span>
                    <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('auth.must_change_password_title')}</h2>
                    </div>
                </div>

                <p className="font-body-md text-body-md text-on-surface-variant">
                    {t('auth.must_change_password_subtitle')}
                </p>

                {error && (
                    <div className="bg-error-container text-on-error-container p-3.5 rounded-lg text-body-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">error</span>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="new-password" className="font-label-md text-label-md text-on-surface-variant mb-1 block">
                            {t('auth.new_password')}
                        </label>
                        <input
                            id="new-password"
                            type="password"
                            required
                            minLength={8}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full border border-outline-variant rounded p-3 font-body-md text-body-md bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirm-password" className="font-label-md text-label-md text-on-surface-variant mb-1 block">
                            {t('auth.confirm_password')}
                        </label>
                        <input
                            id="confirm-password"
                            type="password"
                            required
                            minLength={8}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full border border-outline-variant rounded p-3 font-body-md text-body-md bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-on-primary font-label-lg py-3 rounded-full hover:bg-primary/90 transition-colors mt-2 disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? '...' : t('auth.change_password_submit')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForcePasswordChangeModal;
