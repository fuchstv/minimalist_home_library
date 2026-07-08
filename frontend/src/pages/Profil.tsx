import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from "../config";

interface Loan {
    id: number;
    book_id: number;
    title: string;
    author: string;
    loan_date: string;
    due_date: string;
    status: string;
}

interface Notification {
    id: number;
    message: string;
    is_read: boolean;
    created_at: string;
}

const Profil: React.FC = () => {
    const { t } = useTranslation();
    const { user, csrfToken } = useContext(AuthContext);
    const navigate = useNavigate();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLoans = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/loans?user_id=${user.id}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const activeLoans = (data.data || []).filter((l: Loan) => l.status !== 'returned');
                setLoans(activeLoans);
            }
        } catch (error) {
            console.error("Error fetching loans:", error);
        }
    }, [user]);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    }, [user]);

    const fetchAllData = useCallback(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        setLoading(true);
        Promise.all([fetchLoans(), fetchNotifications()]).finally(() => setLoading(false));
    }, [user, navigate, fetchLoans, fetchNotifications]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleReturn = async (loanId: number) => {
        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

            const res = await fetch(`${API_BASE_URL}/api/loans`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({ action: 'return', loan_id: loanId }),
                credentials: 'include'
            });

            if (res.ok) {
                await fetchLoans();
                alert('Buch erfolgreich zurückgegeben.');
            } else {
                const errorData = await res.json();
                alert(errorData.message || 'Fehler bei der Rückgabe.');
            }
        } catch {
            alert('Netzwerkfehler bei der Rückgabe.');
        }
    };

    const dismissNotification = async (id?: number) => {
        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

            const res = await fetch(`${API_BASE_URL}/api/notifications`, {
                method: 'DELETE',
                headers: headers,
                body: JSON.stringify({ id }),
                credentials: 'include'
            });

            if (res.ok) {
                fetchNotifications();
            }
        } catch (error) {
            console.error("Error dismissing notification:", error);
        }
    };

    if (!user) return null;

    return (
        <div className="flex-grow flex flex-col p-margin-mobile md:p-margin-desktop bg-surface max-w-container-max-width mx-auto w-full gap-8">
            <h1 className="font-display-lg text-display-lg text-on-surface">{t('nav.profile')} - {user.name}</h1>
            
            {/* Notifications Section */}
            <div className="bg-surface-container-low p-6 rounded-lg border border-outline-variant shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-headline-md text-headline-md">{t('notifications.title') || 'Benachrichtigungen'}</h2>
                    {notifications.length > 0 && (
                        <button onClick={() => dismissNotification()} className="text-primary font-label-md hover:underline">
                            {t('notifications.mark_all_read') || 'Alle als gelesen markieren'}
                        </button>
                    )}
                </div>
                {loading ? (
                    <p className="text-on-surface-variant">Lädt...</p>
                ) : notifications.length === 0 ? (
                    <p className="text-on-surface-variant">{t('notifications.none') || 'Keine Benachrichtigungen.'}</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {notifications.map(n => (
                            <div key={n.id} className="p-4 rounded-lg border bg-primary-container/10 border-primary/20 shadow-sm transition-all hover:bg-primary-container/20">
                                <div className="flex justify-between gap-4">
                                    <p className="font-body-md font-bold text-on-surface">{n.message}</p>
                                    <button
                                        onClick={() => dismissNotification(n.id)}
                                        className="text-primary material-symbols-outlined hover:scale-110 transition-transform"
                                        title={t('notifications.mark_read') || 'Als gelesen markieren'}
                                    >
                                        check_circle
                                    </button>
                                </div>
                                <span className="text-[10px] text-on-surface-variant mt-2 block">
                                    {new Date(n.created_at).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
                <h2 className="font-headline-md text-headline-md mb-4">{t('nav.loans')}</h2>
                {loading ? (
                    <p className="text-on-surface-variant">Lädt...</p>
                ) : loans.length === 0 ? (
                    <p className="text-on-surface-variant">Du hast derzeit keine Bücher ausgeliehen.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loans.map(loan => (
                            <div key={loan.id} className="border border-outline-variant rounded-lg p-4 flex flex-col gap-2 relative">
                                {loan.status === 'overdue' && (
                                    <span className="absolute top-2 right-2 bg-error text-on-error text-[10px] uppercase font-bold px-2 py-1 rounded">Überfällig</span>
                                )}
                                <h3 className="font-title-md text-title-md line-clamp-1" title={loan.title}>{loan.title}</h3>
                                <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">{loan.author}</p>
                                <div className="mt-2 text-sm">
                                    <p>Ausgeliehen am: {new Date(loan.loan_date).toLocaleDateString()}</p>
                                    <p className={loan.status === 'overdue' ? 'text-error font-bold' : ''}>
                                        Rückgabe bis: {new Date(loan.due_date).toLocaleDateString()}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => handleReturn(loan.id)}
                                    className="mt-4 bg-secondary-container text-on-secondary-container py-2 rounded font-label-md hover:bg-secondary-container/80 transition-colors"
                                >
                                    Zurückgeben
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profil;
