import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';

const Register: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [acceptData, setAcceptData] = useState(false);
    const [acceptRules, setAcceptRules] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (password.length < 8) {
            setError(t("auth.password_too_short"));
            return;
        }

        if (!acceptData || !acceptRules) {
            setError(t('auth.accept_terms_error'));
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, phone, acceptData, acceptRules }),
                credentials: 'include'
            });
            
            if (response.ok) {
                setSuccess(true);
                setTimeout(() => navigate('/login'), 2000);
            } else {
                const data = await response.json();
                setError(data.message || 'Registrierung fehlgeschlagen');
            }
        } catch {
            setError('Netzwerkfehler');
        }
    };

    return (
        <div className="flex-grow flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-surface">
            <div className="bg-surface-container-low dark:bg-white/10 p-8 rounded-lg border border-outline-variant w-full max-w-md shadow-sm">
                <h1 className="font-headline-lg text-headline-lg text-on-surface mb-6 text-center">{t('auth.register_title')}</h1>
                
                {error && <div className="bg-error-container text-on-error-container p-3 rounded mb-4 font-body-sm text-body-sm">{error}</div>}
                {success && <div className="bg-secondary-container text-on-secondary-container p-3 rounded mb-4 font-body-sm text-body-sm">Erfolgreich! Leite zum Login weiter...</div>}
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="name" className="font-label-md text-label-md text-on-surface-variant mb-1 block">{t('auth.name')}</label>
                        <input 
                            id="name"
                            type="text" 
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full border border-outline-variant rounded p-3 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        />
                    </div>
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
                        <label htmlFor="phone" className="font-label-md text-label-md text-on-surface-variant mb-1 block">{t('auth.phone')}</label>
                        <input
                            id="phone"
                            type="tel"
                            required
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            className="w-full border border-outline-variant rounded p-3 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="font-label-md text-label-md text-on-surface-variant mb-1 block">{t('auth.password')}</label>
                        <input 
                            id="password"
                            minLength={8}
                            type="password" 
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full border border-outline-variant rounded p-3 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        />
                    </div>

                    <div className="flex flex-col gap-3 mt-2">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={acceptData}
                                onChange={e => setAcceptData(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                            />
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                                {t('auth.data_consent')}
                            </span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={acceptRules}
                                onChange={e => setAcceptRules(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                            />
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                                {t('auth.rules_consent_1')} <Link to="/page/regeln" className="text-primary hover:underline">{t('auth.rules_link')}</Link> {t('auth.rules_consent_2')}
                            </span>
                        </label>
                    </div>

                    <button type="submit" className="w-full bg-primary text-on-primary font-label-lg text-label-lg py-3 rounded-full hover:bg-primary/90 transition-colors mt-2">
                        {t('auth.submit_register')}
                    </button>
                </form>
                
                <div className="mt-6 text-center">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{t('auth.has_account')} </span>
                    <Link to="/login" className="font-label-sm text-label-sm text-primary hover:underline">{t('auth.submit_login')}</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
