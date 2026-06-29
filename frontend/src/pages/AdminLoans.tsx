import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface GlobalLoan {
    id: number;
    book_id: number;
    user_id: number;
    loan_date: string;
    due_date: string;
    return_date: string | null;
    status: 'active' | 'returned' | 'overdue';
    user_name: string;
    user_email: string;
    user_phone: string;
    book_title: string;
    book_author: string;
    book_signature: string;
}

const AdminLoans: React.FC = () => {
    const [loans, setLoans] = useState<GlobalLoan[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'returned'>('all');
    const [message, setMessage] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const fetchLoans = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/admin/loans`, { withCredentials: true });
            setLoans(res.data.data || []);
        } catch (error) {
            console.error('Error fetching global loans:', error);
            setErrorMsg('Fehler beim Laden des globalen Ausleihregisters.');
        }
    }, []);

    useEffect(() => {
        fetchLoans();
    }, [fetchLoans]);

    const handleLoanAction = async (loanId: number, action: 'return' | 'extend') => {
        try {
            await axios.put(`${API_BASE_URL}/api/admin/loans/${loanId}`, {
                action
            }, { withCredentials: true });
            
            setMessage(`Ausleihe erfolgreich ${action === 'return' ? 'zurückgenommen' : 'um 4 Wochen verlängert'}.`);
            fetchLoans();
            setTimeout(() => setMessage(''), 3000);
        } catch (error: any) {
            console.error('Error modifying loan:', error);
            setErrorMsg(error.response?.data?.message || 'Fehler beim Bearbeiten der Ausleihe.');
            setTimeout(() => setErrorMsg(''), 4000);
        }
    };

    // Filters
    const filteredLoans = loans.filter(loan => {
        const matchesSearch = 
            loan.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            loan.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            loan.book_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (loan.book_signature && loan.book_signature.toLowerCase().includes(searchQuery.toLowerCase()));
            
        const matchesStatus = 
            statusFilter === 'all' || 
            loan.status === statusFilter;
            
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="font-headline-sm text-headline-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">book</span>
                    Globales Ausleihregister ({filteredLoans.length})
                </h2>
                
                {message && (
                    <div className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-lg flex items-center gap-2 font-body-sm shadow-sm transition-all duration-200">
                        <span className="material-symbols-outlined">check_circle</span>
                        {message}
                    </div>
                )}
                {errorMsg && (
                    <div className="bg-error-container text-on-error-container px-4 py-2 rounded-lg flex items-center gap-2 font-body-sm shadow-sm transition-all duration-200">
                        <span className="material-symbols-outlined">error</span>
                        {errorMsg}
                    </div>
                )}
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-grow w-full">
                    <input 
                        type="text" 
                        placeholder="Benutzer, Buchtitel oder Signatur suchen..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full border border-outline-variant rounded-full py-2 pl-10 pr-4 text-body-md bg-surface-container-low focus:bg-surface focus:border-primary outline-none transition-all"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-2 text-on-surface-variant">search</span>
                </div>

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm transition-all border shrink-0 ${statusFilter === 'all' ? 'bg-primary text-on-primary border-primary' : 'bg-surface hover:bg-surface-variant/30 border-outline'}`}
                    >
                        Alle ({loans.length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('active')}
                        className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm transition-all border shrink-0 ${statusFilter === 'active' ? 'bg-blue-600 text-white border-blue-600' : 'bg-surface hover:bg-surface-variant/30 border-outline'}`}
                    >
                        Aktiv ({loans.filter(l => l.status === 'active').length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('overdue')}
                        className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm transition-all border shrink-0 ${statusFilter === 'overdue' ? 'bg-error text-on-error border-error' : 'bg-surface hover:bg-surface-variant/30 border-outline'}`}
                    >
                        Überfällig ({loans.filter(l => l.status === 'overdue').length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('returned')}
                        className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm transition-all border shrink-0 ${statusFilter === 'returned' ? 'bg-green-700 text-white border-green-700' : 'bg-surface hover:bg-surface-variant/30 border-outline'}`}
                    >
                        Zurückgegeben ({loans.filter(l => l.status === 'returned').length})
                    </button>
                </div>
            </div>

            {/* List Table */}
            {filteredLoans.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant font-body-md border border-dashed rounded-lg border-outline-variant">
                    Keine Ausleihen gefunden.
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-outline-variant shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-outline-variant bg-surface-container-low text-body-sm font-bold text-on-surface">
                                <th className="p-3.5">Signatur</th>
                                <th className="p-3.5">Buch details</th>
                                <th className="p-3.5">Nutzer details</th>
                                <th className="p-3.5">Ausleihe</th>
                                <th className="p-3.5">Fälligkeit</th>
                                <th className="p-3.5">Rückgabe</th>
                                <th className="p-3.5">Status</th>
                                <th className="p-3.5 text-right">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant text-body-sm bg-surface">
                            {filteredLoans.map(loan => (
                                <tr key={loan.id} className="hover:bg-surface-variant/10 transition-colors">
                                    <td className="p-3.5 font-mono font-bold text-primary">{loan.book_signature || loan.book_id}</td>
                                    <td className="p-3.5 max-w-[200px]">
                                        <div className="font-semibold line-clamp-1" title={loan.book_title}>{loan.book_title}</div>
                                        <div className="text-[11px] text-on-surface-variant line-clamp-1">{loan.book_author}</div>
                                    </td>
                                    <td className="p-3.5">
                                        <div className="font-semibold">{loan.user_name}</div>
                                        <div className="text-[11px] text-on-surface-variant">{loan.user_email}</div>
                                    </td>
                                    <td className="p-3.5 whitespace-nowrap">{new Date(loan.loan_date).toLocaleDateString()}</td>
                                    <td className="p-3.5 whitespace-nowrap font-medium">{new Date(loan.due_date).toLocaleDateString()}</td>
                                    <td className="p-3.5 whitespace-nowrap text-on-surface-variant">
                                        {loan.return_date ? new Date(loan.return_date).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="p-3.5 whitespace-nowrap">
                                        {loan.status === 'returned' && (
                                            <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                                                Zurückgegeben
                                            </span>
                                        )}
                                        {loan.status === 'active' && (
                                            <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                                                Aktiv
                                            </span>
                                        )}
                                        {loan.status === 'overdue' && (
                                            <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                                                Überfällig
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3.5 text-right whitespace-nowrap">
                                        {loan.status !== 'returned' && (
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => handleLoanAction(loan.id, 'extend')}
                                                    className="text-primary hover:underline font-bold px-2 py-1 border border-primary/20 rounded hover:bg-primary-container/10 transition-colors"
                                                    title="Um 4 Wochen verlängern"
                                                >
                                                    Verlängern
                                                </button>
                                                <button
                                                    onClick={() => handleLoanAction(loan.id, 'return')}
                                                    className="text-green-700 dark:text-green-400 hover:underline font-bold px-2 py-1 border border-green-700/20 dark:border-green-400/20 rounded hover:bg-green-100 dark:hover:bg-green-950/20 transition-colors"
                                                    title="Buch zurückgeben"
                                                >
                                                    Zurückgeben
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminLoans;
