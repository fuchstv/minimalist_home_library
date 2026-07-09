import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from "../config";
import { AuthContext } from '../context/AuthContext';
import CategoryDisplay from '../components/CategoryDisplay';

interface Book {
    id: number;
    title: string;
    author: string;
    category: string;
    availability_status: 'available' | 'borrowed';
    signature: string;
    cover_image?: string;
}

const Katalog: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, csrfToken } = useContext(AuthContext);

    const [books, setBooks] = useState<Book[]>([]);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalBooks, setTotalBooks] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const limit = 12;

    const fetchBooks = useCallback(async () => {
        setIsLoading(true);
        const url = `${API_BASE_URL}/api/books?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&status=${status}`;
        try {
            const response = await fetch(url, { credentials: 'include' });
            const result = await response.json();
            if (result && result.data) {
                setBooks(result.data);
                setTotalPages(result.meta.totalPages);
                setTotalBooks(result.meta.total);
            }
        } catch (error) {
            console.error("Failed to fetch books", error);
        } finally {
            setIsLoading(false);
        }
    }, [page, search, category, status]);

    useEffect(() => {
        fetchBooks();
    }, [fetchBooks]);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, page - 2);
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, totalPages - maxVisiblePages + 1);
            endPage = totalPages;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    const handleReserve = async (bookId: number) => {
        if (!user) {
            navigate("/login");
            return;
        }

        if (user.is_blocked) {
            alert(t('admin.users.errors.blocked'));
            return;
        }
        if (!user.fee_paid && user.role !== 'admin') {
            alert(t('admin.users.errors.fee_unpaid'));
            return;
        }

        try {
            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (csrfToken) headers["X-CSRF-Token"] = csrfToken;

            const response = await fetch(`${API_BASE_URL}/api/reservations`, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ book_id: bookId }),
                credentials: "include"
            });
            const data = await response.json();
            if (response.ok) {
                alert(t("catalog.reserve_success"));
                fetchBooks();
            } else {
                alert(data.message || t("catalog.reserve_error"));
            }
        } catch {
            alert(t("catalog.reserve_error"));
        }
    };

    const handleBorrow = async (bookId: number) => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (user.is_blocked) {
            alert(t('admin.users.errors.blocked'));
            return;
        }
        if (!user.fee_paid && user.role !== 'admin') {
            alert(t('admin.users.errors.fee_unpaid'));
            return;
        }

        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

            const response = await fetch(`${API_BASE_URL}/api/loans`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ book_id: bookId }),
                credentials: 'include'
            });
            const data = await response.json();
            if (response.ok) {
                alert(t('catalog.borrow_success', { date: new Date(data.due_date).toLocaleDateString() }));
                fetchBooks();
            } else {
                alert(data.message || t('catalog.borrow_error'));
            }
        } catch {
            alert(t('catalog.borrow_error'));
        }
    };

    const handleEditBook = (id: number) => {
        navigate(`/admin?edit=${id}`);
    };

    return (
        <div className="flex-grow flex flex-col gap-6 p-margin-mobile md:p-margin-desktop bg-surface max-w-7xl mx-auto w-full">
            {/* Search and Filters */}
            <section className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                        <input
                            type="text"
                            placeholder={t('catalog.search_placeholder')}
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full bg-surface border border-outline-variant rounded-full py-3 pl-11 pr-4 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        />
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <div className="relative">
                            <select
                                value={category}
                                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                                className="appearance-none bg-surface border border-outline-variant rounded-full py-3 pl-4 pr-10 font-label-md text-label-md focus:border-primary outline-none cursor-pointer"
                            >
                                <option value="">{t('catalog.filter.all_categories')}</option>
                                {Object.entries(t('catalog.categories', { returnObjects: true })).map(([key, value]) => (
                                    <option key={key} value={key}>{value as string}</option>
                                ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
                        </div>
                        <div className="relative">
                            <select
                                value={status}
                                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                                className="appearance-none bg-surface border border-outline-variant rounded-full py-3 pl-4 pr-10 font-label-md text-label-md focus:border-primary outline-none cursor-pointer"
                            >
                                <option value="">{t('catalog.filter.all_status')}</option>
                                <option value="available">{t('catalog.available')}</option>
                                <option value="borrowed">{t('catalog.borrowed')}</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Results */}
            <section className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h2 className="font-title-lg text-title-lg text-on-surface">
                        {totalBooks} {t('catalog.results_found')}
                    </h2>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/30 border-t-primary"></div>
                    </div>
                ) : books.length === 0 ? (
                    <div className="bg-surface-container-lowest py-20 text-center rounded-2xl border border-outline-variant border-dashed">
                        <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-2">search_off</span>
                        <p className="text-on-surface-variant font-body-lg text-body-lg">
                            {t('catalog.no_books')}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {books.map((book) => (
                                <div key={book.id} className="group flex flex-col bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                                    <div className="h-48 bg-surface-container flex items-center justify-center relative overflow-hidden">
                                        {book.cover_image ? (
                                            <img src={`${API_BASE_URL}/${book.cover_image}`} alt="Cover" className="object-cover w-full h-full" />
                                        ) : (
                                            <span className="material-symbols-outlined text-[64px] text-surface-variant group-hover:scale-110 transition-transform duration-500">book_4</span>
                                        )}
                                        
                                        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                                            {book.availability_status === 'available' ? (
                                                <span className="bg-primary-container text-on-primary-container font-label-sm text-label-sm px-2.5 py-1 rounded-full border border-primary/20 shadow-sm">
                                                    {t('catalog.available')}
                                                </span>
                                            ) : (
                                                <span className="bg-surface-variant text-on-surface-variant font-label-sm text-label-sm px-2.5 py-1 rounded-full border border-outline-variant shadow-sm">
                                                    {t('catalog.borrowed')}
                                                </span>
                                            )}

                                            {user?.role === 'admin' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditBook(book.id); }}
                                                    className="bg-secondary text-on-secondary w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                                                    title="Bearbeiten"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {/* Book Info */}
                                    <div className="p-5 flex flex-col flex-grow">
                                        <span className="font-label-sm text-label-sm text-primary mb-2 uppercase tracking-wider">{book.signature ? book.signature + " | " : ""}<CategoryDisplay categoryKey={book.category} /></span>
                                        <h3 className="font-title-md text-title-md text-on-surface mb-1 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                            {book.title}
                                        </h3>
                                        <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 line-clamp-1">
                                            von {book.author}
                                        </p>
                                        
                                        <div className="mt-auto pt-4 border-t border-outline-variant/50 flex gap-2">
                                            {book.availability_status === 'available' ? (
                                                <button onClick={() => handleBorrow(book.id)} className="flex-grow bg-primary text-on-primary font-label-md text-label-md py-2.5 rounded-full hover:bg-primary/90 transition-colors shadow-sm">
                                                    {t('catalog.borrow_btn')}
                                                </button>
                                            ) : (
                                                <button onClick={() => handleReserve(book.id)} className="flex-grow bg-secondary text-on-secondary font-label-md text-label-md py-2.5 rounded-full hover:bg-secondary/90 transition-colors shadow-sm">
                                                    {t('catalog.reserve_btn')}
                                                </button>
                                            )}
                                            
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination UI */}
                        {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-6 border-t border-outline-variant w-full">
                                <span className="font-body-sm text-body-sm text-on-surface-variant">
                                    {t('catalog.pagination.showing', {
                                        start: (page - 1) * limit + 1,
                                        end: Math.min(page * limit, totalBooks),
                                        total: totalBooks
                                    })}
                                </span>
                                
                                <div className="flex items-center gap-1">
                                    <button 
                                        disabled={page === 1}
                                        onClick={() => setPage(1)}
                                        className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-variant/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all"
                                        title={t('catalog.pagination.first')}
                                    >
                                        <span className="material-symbols-outlined">first_page</span>
                                    </button>
                                    <button 
                                        disabled={page === 1}
                                        onClick={() => setPage(p => Math.max(p - 1, 1))}
                                        className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-variant/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all"
                                        title={t('catalog.pagination.prev')}
                                    >
                                        <span className="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    
                                    {getPageNumbers().map((pageNum) => (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center font-label-md text-label-md transition-all ${page === pageNum ? 'bg-primary text-on-primary font-bold shadow-sm' : 'text-on-surface-variant hover:bg-surface-variant/20'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    ))}
                                    
                                    <button 
                                        disabled={page === totalPages}
                                        onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                                        className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-variant/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all"
                                        title={t('catalog.pagination.next')}
                                    >
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>
                                    <button 
                                        disabled={page === totalPages}
                                        onClick={() => setPage(totalPages)}
                                        className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-variant/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all"
                                        title={t('catalog.pagination.last')}
                                    >
                                        <span className="material-symbols-outlined">last_page</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    );
};

export default Katalog;
