import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from '../utils/api';
import { API_BASE_URL } from '../config';

interface User {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: string;
    fee_paid: number;
    data_consent: number;
    rules_consent: number;
    is_blocked: number;
    must_change_password?: number;
    created_at: string;
}

interface Loan {
    id: number;
    book_id: number;
    book_title: string;
    book_author: string;
    book_signature: string;
    loan_date: string;
    due_date: string;
    return_date: string | null;
    status: 'active' | 'returned' | 'overdue';
}

interface Book {
    id: number;
    title: string;
    author: string;
    signature: string;
    availability_status: string;
}

const AdminUsers: React.FC = () => {
    const { t } = useTranslation();
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userLoans, setUserLoans] = useState<Loan[]>([]);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [tempPasswordModal, setTempPasswordModal] = useState<{ show: boolean; password: string; copied: boolean }>({ show: false, password: '', copied: false });
    
    // Lending state
    const [bookSearch, setBookSearch] = useState('');
    const [foundBooks, setFoundBooks] = useState<Book[]>([]);
    const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
    const [customDueDate, setCustomDueDate] = useState('');
    
    // Status feedback
    const [message, setMessage] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

                const fetchUsers = useCallback(async () => {

        try {
            const res = await axios.get(`${API_BASE_URL}/api/admin/users`, { withCredentials: true });
            setUsers(res.data.data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            setErrorMsg(t('admin.users.load_error'));
        }
    }, [t]);

    useEffect(() => {
                                        /* eslint-disable-next-line react-hooks/set-state-in-effect */
        fetchUsers();
    }, [fetchUsers]);

            const fetchUserLoans = useCallback(async (userId: number) => {

        try {
            const res = await axios.get(`${API_BASE_URL}/api/admin/users/${userId}/loans`, { withCredentials: true });
            setUserLoans(res.data.data || []);
        } catch (error) {
            console.error('Error fetching user loans:', error);
        }
    }, []);

    const handleSelectUser = (user: User) => {
        setSelectedUser(user);
        setEditingUser(null);
        fetchUserLoans(user.id);
        
        // Reset lending state
        setBookSearch('');
        setFoundBooks([]);
        setSelectedBookId(null);
        
        // Default custom due date is 4 weeks from now
        const fourWeeks = new Date();
        fourWeeks.setDate(fourWeeks.getDate() + 28);
        setCustomDueDate(fourWeeks.toISOString().split('T')[0]);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        
        try {
            await axios.put(`${API_BASE_URL}/api/admin/users/${editingUser.id}`, editingUser, { withCredentials: true });
            setMessage(t('admin.users.update_success'));
                            fetchUsers();
            
            if (selectedUser?.id === editingUser.id) {
                setSelectedUser(editingUser);
            }
            setEditingUser(null);
            setTimeout(() => setMessage(''), 3000);
        } catch (error: any) {
            console.error('Error updating user:', error);
            setErrorMsg(error.response?.data?.message || t('admin.users.update_error'));
            setTimeout(() => setErrorMsg(''), 4000);
        }
    };

            const searchAvailableBooks = useCallback(async (query: string) => {

        if (!query.trim()) {
            setFoundBooks([]);
            return;
        }
        try {
            // Find books matching query. We filter on the frontend or backend.
            // Let's use backend search endpoint and filter for available status
            const res = await axios.get(`${API_BASE_URL}/api/books?limit=10&search=${encodeURIComponent(query)}&status=available`, { withCredentials: true });
            setFoundBooks(res.data.data || []);
        } catch (error) {
            console.error('Error searching books:', error);
        }
    }, []);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            searchAvailableBooks(bookSearch);
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [bookSearch, searchAvailableBooks]);

    const handleLendBook = async () => {
        if (!selectedUser || !selectedBookId) return;
        try {
            await axios.post(`${API_BASE_URL}/api/admin/users/${selectedUser.id}/loans`, {
                book_id: selectedBookId,
                due_date: customDueDate || null
            }, { withCredentials: true });
            
            setMessage(t('admin.users.lend.success'));
            fetchUserLoans(selectedUser.id);
            
            // Reset lending form
            setSelectedBookId(null);
            setBookSearch('');
            setFoundBooks([]);
            
            setTimeout(() => setMessage(''), 3000);
        } catch (error: any) {
            console.error('Error lending book:', error);
            setErrorMsg(error.response?.data?.message || t('admin.users.lend.error'));
            setTimeout(() => setErrorMsg(''), 4000);
        }
    };

    const handleLoanAction = async (loanId: number, action: 'return' | 'extend') => {
        if (!selectedUser) return;
        try {
            await axios.put(`${API_BASE_URL}/api/admin/users/${selectedUser.id}/loans/${loanId}`, {
                action
            }, { withCredentials: true });
            
            setMessage(action === 'return' ? t('admin.users.loans.actions.return_success') : t('admin.users.loans.actions.extend_success'));
            fetchUserLoans(selectedUser.id);
            setTimeout(() => setMessage(''), 3000);
        } catch (error: any) {
            console.error('Error modifying loan:', error);
            setErrorMsg(error.response?.data?.message || t('admin.users.loans.actions.error'));
            setTimeout(() => setErrorMsg(''), 4000);
        }
    };

    const handleResetPassword = async () => {
        if (!selectedUser) return;
        if (!window.confirm(t('admin.users.reset_password_confirm'))) return;

        try {
            const res = await axios.post(`${API_BASE_URL}/api/admin/users/${selectedUser.id}/reset-password`, {}, { withCredentials: true });
            const tempPass = res.data.temp_password;
            setTempPasswordModal({ show: true, password: tempPass, copied: false });
            setMessage(t('admin.users.temp_password_title'));
            fetchUsers();
            setSelectedUser(prev => prev ? { ...prev, must_change_password: 1 } : null);
            setTimeout(() => setMessage(''), 3000);
        } catch (error: any) {
            console.error('Error resetting password:', error);
            setErrorMsg(error.response?.data?.message || t('admin.users.update_error'));
            setTimeout(() => setErrorMsg(''), 4000);
        }
    };

    // Filter users
    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.phone && user.phone.includes(searchQuery))
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Users List */}
            <div className="lg:col-span-1 bg-surface-container-low dark:bg-white/10 p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col gap-4">
                <h2 className="font-headline-sm text-headline-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">group</span>
                    {t('admin.users.title', { count: filteredUsers.length })}
                </h2>

                <div className="relative">
                    <input 
                        type="text" 
                        placeholder={t("admin.users.search_placeholder")}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full border border-outline-variant rounded-full py-2.5 pl-10 pr-4 text-body-md bg-surface-container-low focus:bg-surface focus:border-primary outline-none transition-all"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant">search</span>
                </div>

                <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
                    {filteredUsers.length === 0 ? (
                        <p className="text-on-surface-variant text-center py-8 text-body-md">{t("admin.users.no_users")}</p>
                    ) : (
                        filteredUsers.map(u => (
                            <button
                                key={u.id}
                                onClick={() => handleSelectUser(u)}
                                className={`w-full text-left p-3.5 rounded-lg border transition-all flex justify-between items-start ${selectedUser?.id === u.id ? 'border-primary bg-primary-container/20 shadow-sm' : 'border-outline-variant hover:border-primary-container hover:bg-surface-variant/20'}`}
                            >
                                <div className="flex flex-col gap-1 max-w-[70%]">
                                    <span className="font-title-md text-title-md line-clamp-1">{u.name}</span>
                                    <span className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">{u.email}</span>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${u.role === 'admin' ? 'bg-primary text-on-primary' : 'bg-secondary-container text-on-secondary-container'}`}>
                                        {u.role}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.fee_paid ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-error-container text-on-error-container'}`}>
                                        {u.fee_paid ? t('admin.users.fee_paid') : t('admin.users.fee_unpaid')}
                                    </span>
                                    {u.is_blocked === 1 && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 uppercase">
                                            {t('admin.users.status_blocked')}
                                        </span>
                                    )}
                                    {u.must_change_password === 1 && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 uppercase">
                                            {t('admin.users.must_change_password_badge')}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Column 2 & 3: Details or Edit panel */}
            <div className="lg:col-span-2 flex flex-col gap-6">
                {message && (
                    <div className="bg-secondary-container text-on-secondary-container p-4 rounded-lg flex items-center gap-2 font-body-medium shadow-sm transition-all duration-200">
                        <span className="material-symbols-outlined">check_circle</span>
                        {message}
                    </div>
                )}
                {errorMsg && (
                    <div className="bg-error-container text-on-error-container p-4 rounded-lg flex items-center gap-2 font-body-medium shadow-sm transition-all duration-200">
                        <span className="material-symbols-outlined">error</span>
                        {errorMsg}
                    </div>
                )}

                {selectedUser ? (
                    <div className="flex flex-col gap-6">
                        {/* Selected User Overview */}
                        <div className="bg-surface-container-low dark:bg-white/10 p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex flex-col gap-1.5">
                                <h2 className="font-headline-md text-headline-md">{selectedUser.name}</h2>
                                <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">mail</span> {selectedUser.email}
                                    {selectedUser.phone && (
                                        <>
                                            <span className="text-outline-variant">|</span>
                                            <span className="material-symbols-outlined text-sm">phone</span> {selectedUser.phone}
                                        </>
                                    )}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                                <button 
                                    onClick={handleResetPassword}
                                    className="border border-amber-500/50 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 py-2 px-4 rounded-full font-label-md transition-colors flex items-center gap-1.5 cursor-pointer"
                                    title={t('admin.users.reset_password_btn')}
                                >
                                    <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                                    {t('admin.users.reset_password_btn')}
                                </button>
                                <button 
                                    onClick={() => setEditingUser(selectedUser)}
                                    className="border border-outline hover:bg-surface-variant/30 text-on-surface py-2 px-5 rounded-full font-label-md transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                    {t('admin.users.edit_btn')}
                                </button>
                            </div>
                        </div>

                        {/* Edit User Mode */}
                        {editingUser && (
                            <form onSubmit={handleUpdateUser} className="bg-surface-container-low dark:bg-white/10 p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col gap-4">
                                <h3 className="font-title-lg text-title-lg pb-2 border-b border-outline-variant">{t('admin.users.edit_title')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="font-label-md block mb-1">{t("admin.users.name")}</label>
                                        <input 
                                            value={editingUser.name} 
                                            onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} 
                                            required 
                                            className="w-full border border-outline-variant rounded p-2 text-body-md" 
                                        />
                                    </div>
                                    <div>
                                        <label className="font-label-md block mb-1">{t("admin.users.email")}</label>
                                        <input 
                                            type="email"
                                            value={editingUser.email} 
                                            onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} 
                                            required 
                                            className="w-full border border-outline-variant rounded p-2 text-body-md" 
                                        />
                                    </div>
                                    <div>
                                        <label className="font-label-md block mb-1">{t("admin.users.phone")}</label>
                                        <input 
                                            value={editingUser.phone || ''} 
                                            onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })} 
                                            className="w-full border border-outline-variant rounded p-2 text-body-md" 
                                        />
                                    </div>
                                    <div>
                                        <label className="font-label-md block mb-1">{t("admin.users.role")}</label>
                                        <select 
                                            value={editingUser.role} 
                                            onChange={e => setEditingUser({ ...editingUser, role: e.target.value })} 
                                            className="w-full border border-outline-variant rounded p-2 text-body-md bg-surface"
                                        >
                                            <option value="member">{t("admin.users.roles.member")}</option>
                                            <option value="admin">{t("admin.users.roles.admin")}</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2.5 mt-2">
                                    <label className="flex items-center gap-3 font-body-md select-none cursor-pointer">
                                        <input 
                                            type="checkbox"
                                            checked={editingUser.fee_paid === 1}
                                            onChange={e => setEditingUser({ ...editingUser, fee_paid: e.target.checked ? 1 : 0 })}
                                            className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                                        />
                                        {t('admin.users.fee_label')}
                                    </label>
                                    <label className="flex items-center gap-3 font-body-md select-none cursor-pointer text-red-600 dark:text-red-400 font-bold">
                                        <input
                                            type="checkbox"
                                            checked={editingUser.is_blocked === 1}
                                            onChange={e => setEditingUser({ ...editingUser, is_blocked: e.target.checked ? 1 : 0 })}
                                            className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                                        />
                                        {t('admin.users.is_blocked_label')}
                                    </label>
                                    <label className="flex items-center gap-3 font-body-sm text-on-surface-variant select-none cursor-pointer">
                                        <input 
                                            type="checkbox"
                                            checked={editingUser.data_consent === 1}
                                            onChange={e => setEditingUser({ ...editingUser, data_consent: e.target.checked ? 1 : 0 })}
                                            className="h-4 w-4 rounded border-outline-variant text-primary"
                                        />
                                        {t('admin.users.data_consent')}
                                    </label>
                                    <label className="flex items-center gap-3 font-body-sm text-on-surface-variant select-none cursor-pointer">
                                        <input 
                                            type="checkbox"
                                            checked={editingUser.rules_consent === 1}
                                            onChange={e => setEditingUser({ ...editingUser, rules_consent: e.target.checked ? 1 : 0 })}
                                            className="h-4 w-4 rounded border-outline-variant text-primary"
                                        />
                                        {t('admin.users.rules_consent')}
                                    </label>
                                </div>

                                <div className="flex justify-end gap-3 mt-4">
                                    <button 
                                        type="button" 
                                        onClick={() => setEditingUser(null)} 
                                        className="border border-outline text-on-surface px-6 py-2 rounded-full font-label-md hover:bg-surface-variant/30 transition-colors cursor-pointer"
                                    >
                                        {t('admin.users.cancel_btn')}
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="bg-primary text-on-primary px-8 py-2 rounded-full font-label-md hover:bg-primary/95 transition-colors shadow-sm cursor-pointer"
                                    >
                                        {t('admin.users.save_btn')}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Lending Utility (Buch ausleihen) */}
                        <div className="bg-surface-container-low dark:bg-white/10 p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col gap-4">
                            <h3 className="font-title-lg text-title-lg pb-1.5 border-b border-outline-variant flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">bookmark_add</span>
                                {t('admin.users.lend.title', { name: selectedUser.name })}
                            </h3>
                            
                            {userLoans.filter(l => l.status !== 'returned').length >= 3 && (
                                <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 p-3.5 rounded-lg flex items-start gap-2.5 text-body-sm">
                                    <span className="material-symbols-outlined">warning</span>
                                    <span>{t('admin.users.lend.limit_warning', { count: userLoans.filter(l => l.status !== 'returned').length })}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative">
                                    <label className="font-label-md block mb-1">{t("admin.users.lend.search_label")}</label>
                                    <input 
                                        type="text"
                                        placeholder={t("admin.users.lend.search_placeholder")}
                                        value={bookSearch}
                                        onChange={e => setBookSearch(e.target.value)}
                                        className="w-full border border-outline-variant rounded p-2 text-body-md"
                                    />
                                    {foundBooks.length > 0 && (
                                        <div className="absolute left-0 right-0 mt-1 bg-surface-container border border-outline-variant rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                                            {foundBooks.map(b => (
                                                <button
                                                    key={b.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedBookId(b.id);
                                                        setBookSearch(`${b.signature || b.id} - ${b.title}`);
                                                        setFoundBooks([]);
                                                    }}
                                                    className="w-full text-left p-2.5 hover:bg-primary-container/20 text-body-sm border-b border-outline-variant last:border-0"
                                                >
                                                    <span className="font-bold font-mono text-xs block text-primary">{b.signature}</span>
                                                    <span>{b.title} – <span className="text-on-surface-variant font-light">{b.author}</span></span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="font-label-md block mb-1">{t("admin.users.lend.due_date")}</label>
                                    <input 
                                        type="date"
                                        value={customDueDate}
                                        onChange={e => setCustomDueDate(e.target.value)}
                                        className="w-full border border-outline-variant rounded p-2 text-body-md bg-surface"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={handleLendBook}
                                    disabled={!selectedBookId}
                                    className={`py-2.5 px-8 rounded-full font-label-md shadow-sm transition-all flex items-center gap-1.5 ${selectedBookId ? 'bg-primary text-on-primary hover:bg-primary/95 cursor-pointer' : 'bg-outline-variant text-on-surface-variant cursor-not-allowed'}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">key</span>
                                    {t('admin.users.lend.confirm_btn')}
                                </button>
                            </div>
                        </div>

                        {/* Active & Past Loans */}
                        <div className="bg-surface-container-low dark:bg-white/10 p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col gap-4">
                            <h3 className="font-title-lg text-title-lg pb-1.5 border-b border-outline-variant">{t("admin.users.loans.title")}</h3>
                            {userLoans.length === 0 ? (
                                <p className="text-on-surface-variant text-center py-6">{t("admin.users.loans.no_loans")}</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-outline-variant bg-surface-container-low text-body-sm font-bold text-on-surface">
                                                <th className="p-3">{t("admin.users.loans.table.signature")}</th>
                                                <th className="p-3">{t("admin.users.loans.table.book")}</th>
                                                <th className="p-3">{t("admin.users.loans.table.loan_date")}</th>
                                                <th className="p-3">{t("admin.users.loans.table.due_date")}</th>
                                                <th className="p-3">{t("admin.users.loans.table.return_date")}</th>
                                                <th className="p-3">{t("admin.users.loans.table.status")}</th>
                                                <th className="p-3 text-right">{t("admin.users.loans.table.actions")}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-outline-variant text-body-sm">
                                            {userLoans.map(loan => (
                                                <tr key={loan.id} className="hover:bg-surface-variant/10">
                                                    <td className="p-3 font-mono font-bold text-primary">{loan.book_signature || loan.book_id}</td>
                                                    <td className="p-3">
                                                        <div className="font-medium line-clamp-1" title={loan.book_title}>{loan.book_title}</div>
                                                        <div className="text-[11px] text-on-surface-variant line-clamp-1">{loan.book_author}</div>
                                                    </td>
                                                    <td className="p-3 whitespace-nowrap">{new Date(loan.loan_date).toLocaleDateString()}</td>
                                                    <td className="p-3 whitespace-nowrap font-medium">{new Date(loan.due_date).toLocaleDateString()}</td>
                                                    <td className="p-3 whitespace-nowrap text-on-surface-variant">
                                                        {loan.return_date ? new Date(loan.return_date).toLocaleDateString() : '-'}
                                                    </td>
                                                    <td className="p-3 whitespace-nowrap">
                                                        {loan.status === 'returned' && (
                                                            <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                                                                {t('admin.users.loans.status.returned')}
                                                            </span>
                                                        )}
                                                        {loan.status === 'active' && (
                                                            <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                                                                {t('admin.users.loans.status.active')}
                                                            </span>
                                                        )}
                                                        {loan.status === 'overdue' && (
                                                            <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                                                                {t('admin.users.loans.status.overdue')}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-right whitespace-nowrap">
                                                        {loan.status !== 'returned' && (
                                                            <div className="flex gap-2 justify-end">
                                                                <button
                                                                    onClick={() => handleLoanAction(loan.id, 'extend')}
                                                                    className="text-primary hover:underline font-bold px-2 py-1 border border-primary/20 rounded hover:bg-primary-container/10 transition-colors"
                                                                    title={t("admin.users.loans.actions.extend")}
                                                                >
                                                                    Verlängern
                                                                </button>
                                                                <button
                                                                    onClick={() => handleLoanAction(loan.id, 'return')}
                                                                    className="text-green-700 dark:text-green-400 hover:underline font-bold px-2 py-1 border border-green-700/20 dark:border-green-400/20 rounded hover:bg-green-100 dark:hover:bg-green-950/20 transition-colors"
                                                                    title={t("admin.users.loans.actions.return")}
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
                    </div>
                ) : (
                    <div className="bg-surface-container-low dark:bg-white/10 p-10 rounded-xl border border-outline-variant shadow-sm flex flex-col items-center justify-center text-center text-on-surface-variant min-h-[400px]">
                        <span className="material-symbols-outlined text-[64px] text-primary/40 mb-3">account_box</span>
                        <h3 className="font-headline-sm text-headline-sm mb-1 text-on-surface">{t("admin.users.no_user_selected")}</h3>
                        <p className="max-w-xs text-body-md">{t("admin.users.select_user_hint")}</p>
                    </div>
                )}
            </div>

            {tempPasswordModal.show && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-surface-container-low dark:bg-zinc-800 p-6 rounded-xl border border-outline-variant max-w-md w-full shadow-2xl flex flex-col gap-4">
                        <div className="flex items-center gap-2.5 text-primary font-headline-sm">
                            <span className="material-symbols-outlined text-[28px]">key</span>
                            <h3 className="text-title-lg font-bold text-on-surface">{t('admin.users.temp_password_title')}</h3>
                        </div>
                        <p className="text-body-md text-on-surface-variant leading-relaxed">
                            {t('admin.users.temp_password_hint')}
                        </p>

                        <div className="flex items-center gap-2 bg-surface p-3.5 rounded-lg border border-outline-variant">
                            <span className="font-mono font-bold text-lg text-primary tracking-wider flex-grow text-center select-all">
                                {tempPasswordModal.password}
                            </span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(tempPasswordModal.password);
                                    setTempPasswordModal(prev => ({ ...prev, copied: true }));
                                    setTimeout(() => setTempPasswordModal(prev => ({ ...prev, copied: false })), 2000);
                                }}
                                className="bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-sm">
                                    {tempPasswordModal.copied ? 'check' : 'content_copy'}
                                </span>
                                {tempPasswordModal.copied ? t('admin.users.temp_password_copied') : t('admin.users.temp_password_copy')}
                            </button>
                        </div>

                        <div className="flex justify-end mt-2">
                            <button
                                type="button"
                                onClick={() => setTempPasswordModal({ show: false, password: '', copied: false })}
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

export default AdminUsers;
