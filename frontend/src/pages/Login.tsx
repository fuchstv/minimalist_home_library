import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const Login: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setUser, setCsrfToken } = useContext(AuthContext);
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showHelpModal, setShowHelpModal] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });
            
            const data = await response.json();
            if (response.ok) {
                setUser(data.user);
                setCsrfToken(data.csrfToken);
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/');
            } else {
                setError(data.message || 'Login fehlgeschlagen');
            }
        } catch {
            setError('Netzwerkfehler');
        }
    };

    return (
        <div className="flex-grow flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-surface">
            <div className="bg-surface-container-low dark:bg-white/10 p-8 rounded-lg border border-outline-variant w-full max-w-md shadow-sm">
                <h1 className="font-headline-lg text-headline-lg text-on-surface mb-6 text-center">{t('auth.login_title')}</h1>
                
                {error && <div className="bg-error-container text-on-error-container p-3 rounded mb-4 font-body-sm text-body-sm">{error}</div>}
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="email" className="font-label-md text-label-md text-on-surface-variant mb-1 block">{t('auth.email')}</label>
                        <input 
                            id="email"
                            type="email" 
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full border border-outline-variant rounded p-3 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="font-label-md text-label-md text-on-surface-variant mb-1 block">{t('auth.password')}</label>
                        <input 
                            id="password"
                            type="password" 
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full border border-outline-variant rounded p-3 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        />
                        <div className="mt-1.5 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowHelpModal(true)}
                                className="text-xs font-label-sm text-primary hover:underline transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[14px]">help_outline</span>
                                {t('auth.forgot_password_link')}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-primary text-on-primary font-label-lg text-label-lg py-3 rounded-full hover:bg-primary/90 transition-colors mt-2">
                        {t('auth.submit_login')}
                    </button>
                </form>
                
                <div className="mt-6 text-center">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{t('auth.no_account')} </span>
                    <Link to="/register" className="font-label-sm text-label-sm text-primary hover:underline">{t('auth.submit_register')}</Link>
                </div>
            </div>

            {showHelpModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-surface-container-low dark:bg-zinc-800 p-6 rounded-xl border border-outline-variant max-w-md w-full shadow-2xl flex flex-col gap-4">
                        <div className="flex items-center gap-2.5 text-primary font-headline-sm">
                            <span className="material-symbols-outlined text-[28px]">lock_reset</span>
                            <h3 className="text-title-lg font-bold text-on-surface">{t('auth.forgot_password_help_title')}</h3>
                        </div>
                        <p className="text-body-md text-on-surface-variant leading-relaxed">
                            {t('auth.forgot_password_help_text')}
                        </p>
                        <div className="flex justify-end mt-2">
                            <button
                                type="button"
                                onClick={() => setShowHelpModal(false)}
                                className="bg-primary text-on-primary font-label-md px-6 py-2 rounded-full hover:bg-primary/90 transition-colors cursor-pointer"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
