import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Loan {
    id: number;
    book_id: number;
    title: string;
    author: string;
    loan_date: string;
    due_date: string;
    status: string;
}

import { API_BASE_URL } from "../config";

const Profil: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [loans, setLoans] = useState<Loan[]>([]);

    const fetchLoans = async () => {
        if (!user) return;
        // Fetch loans for this user
        const res = await fetch(`${API_BASE_URL}/api/loans?user_id=${user.id}`);
        if (res.ok) {
            const data = await res.json();
            setLoans(data.data || []);
        }
    };

    useEffect(() => {
        if (!user) {
            navigate('/login');
        } else {
            fetchLoans();
        }
    }, [user, navigate]);

    const handleReturn = async (loanId: number) => {
        const res = await fetch(`${API_BASE_URL}/api/loans`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'return', loan_id: loanId })
        });
        
        if (res.ok) {
            fetchLoans();
            alert('Buch erfolgreich zurückgegeben.');
        } else {
            alert('Fehler bei der Rückgabe.');
        }
    };

    if (!user) return null;

    return (
        <div className="flex-grow flex flex-col p-margin-mobile md:p-margin-desktop bg-surface max-w-container-max-width mx-auto w-full gap-8">
            <h1 className="font-display-lg text-display-lg text-on-surface">{t('nav.profile')} - {user.name}</h1>
            
            <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
                <h2 className="font-headline-md text-headline-md mb-4">{t('nav.loans')}</h2>
                {loans.length === 0 ? (
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
