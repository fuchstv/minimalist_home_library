import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Book {
    id: number;
    category: string;
    signature?: string;
    author: string;
    title: string;
    publication_year: string;
    publisher: string;
    isbn: string;
    description: string;
    availability_status: 'available' | 'borrowed';
    cover_image?: string;
}

import { API_BASE_URL } from "../config";

const Katalog: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [books, setBooks] = useState<Book[]>([]);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [limit] = useState(12);
    const [totalBooks, setTotalBooks] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const fetchBooks = useCallback(async () => {
        try {
            let url = `${API_BASE_URL}/api/books?limit=${limit}&page=${page}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (categoryFilter) url += `&category=${encodeURIComponent(categoryFilter)}`;
            if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;

            const response = await fetch(url, { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setBooks(data.data || []);
                if (data.meta) {
                    setTotalBooks(data.meta.total || 0);
                    setTotalPages(data.meta.totalPages || 1);
                }
            }
        } catch (error) {
            console.error("Failed to fetch books", error);
        }
    }, [page, limit, search, categoryFilter, statusFilter]);

    useEffect(() => {
        fetchBooks();
    }, [fetchBooks]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setPage(1);
    };

    const handleCategoryChange = (val: string) => {
        setCategoryFilter(val);
        setPage(1);
    };

    const handleStatusChange = (val: string) => {
        setStatusFilter(val);
        setPage(1);
    };

    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        
        let startPage = Math.max(1, page - 2);
        let endPage = Math.min(totalPages, page + 2);
        
        if (page <= 3) {
            startPage = 1;
            endPage = Math.min(totalPages, maxVisiblePages);
        } else if (page >= totalPages - 2) {
            startPage = Math.max(1, totalPages - maxVisiblePages + 1);
            endPage = totalPages;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    const handleBorrow = async (bookId: number) => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/loans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ book_id: bookId }),
                credentials: 'include'
            });

            if (response.ok) {
                alert(t('catalog.borrow_success'));
                fetchBooks();
            } else {
                const error = await response.json();
                alert(error.message || t('catalog.borrow_error'));
            }
        } catch (error) {
            console.error("Failed to borrow book", error);
        }
    };

    const handleEditBook = (bookId: number) => {
        // We'll pass the bookId via search params so Admin page can potentially use it,
        // though for now it just shows the admin panel.
        navigate(`/admin?editId=${bookId}`);
    };

    return (
        <div className="flex-grow">
            {/* Hero / Header Section */}
            <header className="bg-primary pt-12 pb-24 px-margin-mobile md:px-margin-desktop text-on-primary">
                <div className="max-w-4xl">
                    <h1 className="font-headline-lg text-headline-lg mb-4">{t('catalog.title')}</h1>
                    <p className="font-body-lg text-body-lg text-on-primary/80 mb-8">
                        {t('catalog.subtitle')}
                    </p>

                    {/* Search Bar */}
                    <div className="relative group max-w-2xl">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">search</span>
                        <input
                            type="text"
                            placeholder={t('catalog.search_placeholder')}
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full bg-surface text-on-surface py-4 pl-12 pr-4 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-body-md"
                        />
                    </div>
                </div>
            </header>

            {/* Filters Section */}
            <section className="px-margin-mobile md:px-margin-desktop -mt-12 mb-12">
                <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-outline-variant flex flex-wrap gap-4 items-end">
                    <div className="flex flex-col gap-1.5 min-w-[200px]">
                        <label className="font-label-md text-on-surface-variant ml-1">{t('catalog.filter_category')}</label>
                        <select 
                            value={categoryFilter}
                            onChange={(e) => handleCategoryChange(e.target.value)}
                            className="bg-surface border border-outline-variant rounded-xl px-4 py-2.5 font-body-sm focus:border-primary focus:outline-none transition-colors"
                        >
                            <option value="">{t('catalog.all_categories')}</option>
                            <option value="Auf Deutsch">Auf Deutsch</option>
                            <option value="Belytrystyka polska">Belytrystyka polska</option>
                            <option value="Belytrystyka zagraniczna">Belytrystyka zagraniczna</option>
                            <option value="Dziecięce">Dziecięce</option>
                            <option value="Fantasy | Sci-fi">Fantasy | Sci-fi</option>
                            <option value="Historyczne">Historyczne</option>
                            <option value="Kryminał | Thriller">Kryminał | Thriller</option>
                            <option value="Młodzieżowe | Young Adult">Młodzieżowe | Young Adult</option>
                            <option value="Biografie">Biografie</option>
                            <option value="Poezja">Poezja</option>
                            <option value="Poradniki | Popularnonaukowe">Poradniki | Popularnonaukowe</option>
                            <option value="Reportaże | Podróżnicze">Reportaże | Podróżnicze</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5 min-w-[160px]">
                        <label className="font-label-md text-on-surface-variant ml-1">{t('catalog.filter_status')}</label>
                        <select 
                            value={statusFilter}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="bg-surface border border-outline-variant rounded-xl px-4 py-2.5 font-body-sm focus:border-primary focus:outline-none transition-colors"
                        >
                            <option value="">{t('catalog.all_status')}</option>
                            <option value="available">{t('catalog.available')}</option>
                            <option value="borrowed">{t('catalog.borrowed')}</option>
                        </select>
                    </div>

                    <button
                        onClick={() => {setSearch(''); setCategoryFilter(''); setStatusFilter(''); setPage(1);}}
                        className="font-label-md text-primary px-4 py-2.5 rounded-xl hover:bg-primary/5 transition-colors ml-auto"
                    >
                        {t('catalog.clear_filters')}
                    </button>
                </div>
            </section>

            {/* Catalog Grid */}
            <section className="px-margin-mobile md:px-margin-desktop mb-24">
                <div className="flex justify-between items-center mb-6 px-1">
                    <span className="font-label-md text-label-md text-on-surface-variant">
                        {t('catalog.current_selection')}
                    </span>
                </div>

                {books.length === 0 ? (
                    <div className="text-center py-20 text-on-surface-variant font-body-lg text-body-lg">
                        {t('catalog.no_books')}
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
                                        <span className="font-label-sm text-label-sm text-primary mb-2 uppercase tracking-wider">{book.signature ? book.signature + " | " : ""}{book.category}</span>
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
                                                <button className="flex-grow bg-surface-container-high text-on-surface-variant font-label-md text-label-md py-2.5 rounded-full cursor-not-allowed">
                                                    {t('catalog.reserve_btn')}
                                                </button>
                                            )}
                                            
                                            <button className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors" title={t('catalog.details_btn')}>
                                                <span className="material-symbols-outlined text-[20px]">info</span>
                                            </button>
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
