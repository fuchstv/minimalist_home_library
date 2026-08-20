import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';

const ResetPassword: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError(t('auth.reset_password_error'));
            return;
        }

        if (password.length < 8) {
            setError(t('auth.password_too_short'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('auth.password_mismatch') || 'Passwörter stimmen nicht überein');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess(true);
            } else {
                setError(data.message || t('auth.reset_password_error'));
            }
        } catch {
            setError('Netzwerkfehler');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-grow flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-surface">
            <div className="bg-surface-container-low dark:bg-white/10 p-8 rounded-lg border border-outline-variant w-full max-w-md shadow-sm">
                <div className="flex items-center justify-center mb-4 text-primary">
                    <span className="material-symbols-outlined text-[40px]">lock_reset</span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2 text-center">
                    {t('auth.reset_password_title')}
                </h1>
                <p className="text-body-sm text-on-surface-variant text-center mb-6">
                    {t('auth.reset_password_desc')}
                </p>

                {error && (
                    <div className="bg-error-container text-on-error-container p-3 rounded mb-4 font-body-sm">
                        {error}
                    </div>
                )}

                {success ? (
                    <div className="flex flex-col gap-4 text-center">
                        <div className="p-4 bg-secondary-container text-on-secondary-container rounded-md font-body-md border border-secondary/20">
                            {t('auth.reset_password_success')}
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="w-full bg-primary text-on-primary font-label-lg py-3 rounded-full hover:bg-primary/90 transition-colors cursor-pointer"
                        >
                            {t('nav.login')} &rarr;
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="new_pwd" className="font-label-md text-on-surface-variant mb-1 block">
                                {t('auth.new_password')}
                            </label>
                            <input
                                id="new_pwd"
                                type="password"
                                required
                                minLength={8}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full border border-outline-variant rounded p-3 font-body-md bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirm_pwd" className="font-label-md text-on-surface-variant mb-1 block">
                                {t('auth.confirm_password')}
                            </label>
                            <input
                                id="confirm_pwd"
                                type="password"
                                required
                                minLength={8}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full border border-outline-variant rounded p-3 font-body-md bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !token}
                            className="w-full bg-primary text-on-primary font-label-lg py-3 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer mt-2"
                        >
                            {loading ? 'Wird gespeichert...' : t('auth.reset_password_btn')}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center">
                    <Link to="/login" className="font-label-sm text-primary hover:underline">
                        &larr; {t('auth.login_title')}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
