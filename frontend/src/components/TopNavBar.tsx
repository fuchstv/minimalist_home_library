import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from "../config";

const TopNavBar: React.FC = () => {
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const { user, logout } = useContext(AuthContext);
    const [notificationCount, setNotificationCount] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        }
        return 'light';
    });

    const toggleLanguage = () => {
        const newLang = i18n.language === 'de' ? 'pl' : 'de';
        i18n.changeLanguage(newLang);
        localStorage.setItem('language', newLang);
    };

    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        if (nextTheme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
        setTheme(nextTheme);
    };

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            if (!localStorage.getItem('theme')) {
                if (e.matches) {
                    document.documentElement.classList.add('dark');
                    setTheme('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                    setTheme('light');
                }
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        if (user) {
            const fetchNotifications = async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/notifications`, { credentials: 'include' });
                    if (res.ok) {
                        const data = await res.json();
                        setNotificationCount(data.count || 0);
                    }
                } catch (error) {
                    console.error("Failed to fetch notifications", error);
                }
            };

            fetchNotifications();
            // Refresh every 5 minutes
            const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
            return () => clearInterval(interval);
        } else {
            setNotificationCount(0);
        }
    }, [user]);

    // Close menu on navigation
    useEffect(() => {
        setIsMenuOpen(false);
    }, [location.pathname]);

    const notificationLink = user?.role === 'admin' ? '/admin?tab=loans' : '/ausleihen';

    return (
        <nav className="bg-surface sticky top-0 w-full z-50 shadow-[0_1px_4px_rgba(0,0,0,0.03)] border-b border-outline-variant/30">
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
                    {user && notificationCount > 0 && (
                        <Link
                            to={notificationLink}
                            className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant"
                            title={t('nav.overdue_loans')}
                        >
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-1.5 right-1.5 bg-error text-on-error text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-surface">
                                {notificationCount}
                            </span>
                        </Link>
                    )}

                    <button
                        onClick={toggleTheme}
                        className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-low dark:bg-white/10 text-on-surface dark:text-surface-variant hover:bg-surface-variant dark:hover:bg-white/20 border border-outline-variant dark:border-outline/30 transition-colors"
                        title={theme === 'dark' ? t('nav.light_mode') : t('nav.dark_mode')}
                        aria-label={theme === 'dark' ? t('nav.light_mode') : t('nav.dark_mode')}
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                        </span>
                    </button>

                    <button onClick={toggleLanguage} className="hidden sm:block font-label-md text-label-md bg-surface-container-low text-on-surface hover:bg-surface-variant px-3 py-1.5 rounded-full transition-colors border border-outline-variant">
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

                    <button aria-label="Menü" className="md:hidden text-on-surface-variant p-2 -mr-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <span className="material-symbols-outlined">{isMenuOpen ? "close" : "menu"}</span>
                    </button>
                </div>
            </div>

            {/* Mobile Menu Backdrop */}
            {isMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 top-16 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity duration-200"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Mobile Menu Content */}
            <div className={`md:hidden absolute top-16 left-0 w-full bg-surface shadow-lg z-50 border-t border-outline-variant transition-all duration-300 origin-top ${isMenuOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'}`}>
                <ul className="flex flex-col p-4 gap-2">
                    <li>
                        <Link
                            to="/"
                            className={`block py-3 px-4 rounded-lg font-body-md transition-colors ${location.pathname === '/' ? 'bg-primary-container text-on-primary-container font-bold' : 'text-on-surface-variant hover:bg-surface-variant'}`}>
                            {t('nav.catalog')}
                        </Link>
                    </li>
                    {user && (
                        <>
                            <li>
                                <Link
                                    to="/profil"
                                    className={`block py-3 px-4 rounded-lg font-body-md transition-colors ${location.pathname === '/profil' ? 'bg-primary-container text-on-primary-container font-bold' : 'text-on-surface-variant hover:bg-surface-variant'}`}>
                                    {t('nav.profile')}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/ausleihen"
                                    className={`block py-3 px-4 rounded-lg font-body-md transition-colors ${location.pathname === '/ausleihen' ? 'bg-primary-container text-on-primary-container font-bold' : 'text-on-surface-variant hover:bg-surface-variant'}`}>
                                    {t('nav.loans')}
                                </Link>
                            </li>
                            {user.role === 'admin' && (
                                <li>
                                    <Link
                                        to="/admin"
                                        className={`block py-3 px-4 rounded-lg font-body-md transition-colors ${location.pathname === '/admin' ? 'bg-primary-container text-on-primary-container font-bold' : 'text-on-surface-variant hover:bg-surface-variant'}`}>
                                        {t('nav.admin')}
                                    </Link>
                                </li>
                            )}
                        </>
                    )}

                    {/* Mobile theme and language toggles */}
                    <li className="border-t border-outline-variant mt-2 pt-4 flex items-center justify-between px-4 sm:hidden">
                        <span className="font-body-md text-on-surface-variant dark:text-surface-variant">{t('nav.theme')}</span>
                        <button
                            onClick={toggleTheme}
                            className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-low dark:bg-white/10 text-on-surface dark:text-surface-variant hover:bg-surface-variant dark:hover:bg-white/20 border border-outline-variant dark:border-outline/30 transition-colors"
                            title={theme === 'dark' ? t('nav.light_mode') : t('nav.dark_mode')}
                            aria-label={theme === 'dark' ? t('nav.light_mode') : t('nav.dark_mode')}
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                            </span>
                        </button>
                    </li>
                    <li className="flex items-center justify-between px-4 pb-2 sm:hidden">
                        <span className="font-body-md text-on-surface-variant dark:text-surface-variant">{t('nav.language')}</span>
                        <button onClick={toggleLanguage} className="font-label-md text-label-md bg-surface-container-low text-on-surface hover:bg-surface-variant px-3 py-1.5 rounded-full transition-colors border border-outline-variant">
                            {i18n.language.toUpperCase()}
                        </button>
                    </li>
                    <li className="border-t border-outline-variant mt-2 pt-2">
                        {user ? (
                            <button
                                onClick={logout}
                                className="w-full text-left py-3 px-4 rounded-lg font-body-md text-on-surface-variant hover:bg-surface-variant transition-colors"
                            >
                                {t('nav.logout')}
                            </button>
                        ) : (
                            <Link
                                to="/login"
                                className="block py-3 px-4 rounded-lg font-body-md text-on-surface-variant hover:bg-surface-variant transition-colors"
                            >
                                {t('nav.login')}
                            </Link>
                        )}
                    </li>
                </ul>
            </div>
        </nav>
    );
};

export default TopNavBar;
