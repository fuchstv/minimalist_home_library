import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';

const TopNavBar: React.FC = () => {
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const { user, logout } = useContext(AuthContext);

    const toggleLanguage = () => {
        const newLang = i18n.language === 'de' ? 'pl' : 'de';
        i18n.changeLanguage(newLang);
        localStorage.setItem('language', newLang);
    };

    return (
        <nav className="bg-surface dark:bg-inverse-surface sticky top-0 w-full z-50 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
            <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop max-w-container-max-width mx-auto h-16">
                <Link to="/" className="flex items-center gap-2">
                    <img alt="SprachCafé Polnisch Logo" className="h-10 w-auto" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC1tr_UrLa-6nVxJXC8Pdq_B7aQTIi15JttYzPHsKr-qF17H8OoX7Dcn4C2RbZaOgqPU9TZs-PuGrPpsltPL2rCQQdQbk86aaDrmKyUaGhpv8zwFj8vs7QzdfdsYEu5xLk4zw3wZ1TWc1DUT__-XAzaonhX-iljPPQzwySJaH4Bh0-7toNrMHUjAlea3PPsEUTAgC9MQ2VPm803FTkH97OX8zGzuDeh7O8CYtmoPzHaUqtVafAYoAuBLgjw-21t4DyQXhn8ul9q81w"/>
                </Link>

                <ul className="hidden md:flex items-center gap-8 h-full">
                    <li className="h-full flex items-center">
                        <Link to="/" className={`font-body-md text-body-md h-full flex items-center opacity-80 transition-all duration-200 ${location.pathname === '/' ? 'text-primary dark:text-primary-fixed-dim border-b-2 border-primary dark:border-primary-fixed-dim pb-1 font-bold' : 'text-on-surface-variant dark:text-surface-variant hover:text-primary dark:hover:text-primary-fixed-dim'}`}>
                            {t('nav.catalog')}
                        </Link>
                    </li>
                    {user && (
                        <>
                            <li className="h-full flex items-center">
                                <Link to="/profil" className={`font-body-md text-body-md h-full flex items-center transition-colors duration-200 ${location.pathname === '/profil' ? 'text-primary border-b-2 border-primary font-bold' : 'text-on-surface-variant hover:text-primary'}`}>
                                    {t('nav.profile')}
                                </Link>
                            </li>
                            <li className="h-full flex items-center">
                                <Link to="/ausleihen" className={`font-body-md text-body-md h-full flex items-center transition-colors duration-200 ${location.pathname === '/ausleihen' ? 'text-primary border-b-2 border-primary font-bold' : 'text-on-surface-variant hover:text-primary'}`}>
                                    {t('nav.loans')}
                                </Link>
                            </li>
                            {user.role === 'admin' && (
                                <li className="h-full flex items-center">
                                    <Link to="/admin" className={`font-body-md text-body-md h-full flex items-center transition-colors duration-200 ${location.pathname === '/admin' ? 'text-primary border-b-2 border-primary font-bold' : 'text-on-surface-variant hover:text-primary'}`}>
                                        {t('nav.admin')}
                                    </Link>
                                </li>
                            )}
                        </>
                    )}
                </ul>

                <div className="flex items-center gap-4">
                    <button onClick={toggleLanguage} className="font-label-md text-label-md bg-surface-container-low text-on-surface hover:bg-surface-variant px-3 py-1.5 rounded-full transition-colors border border-outline-variant">
                        {i18n.language.toUpperCase()}
                    </button>
                    
                    {user ? (
                        <button onClick={logout} className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors hidden md:block">
                            {t('nav.logout')}
                        </button>
                    ) : (
                        <Link to="/login" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors hidden md:block">
                            {t('nav.login')}
                        </Link>
                    )}

                    <button aria-label="Menü" className="md:hidden text-on-surface-variant">
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default TopNavBar;
