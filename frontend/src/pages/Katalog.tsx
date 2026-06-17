import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Book {
    id: number;
    category: string;
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

    const fetchBooks = useCallback(async () => {
        try {
            let url = `${API_BASE_URL}/api/books?limit=12`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (categoryFilter) url += `&category=${encodeURIComponent(categoryFilter)}`;
            if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setBooks(data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch books", error);
        }
    }, [search, categoryFilter, statusFilter]);

    useEffect(() => {
        fetchBooks();
    }, [fetchBooks]);

    const handleBorrow = async (bookId: number) => {
        if (!user) {
            navigate('/login');
            return;
        }
        
        const res = await fetch(`${API_BASE_URL}/api/loans`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ book_id: bookId, user_id: user.id })
        });
        
        if (res.ok) {
            alert('Buch erfolgreich ausgeliehen!');
            fetchBooks();
        } else {
            const errorData = await res.json();
            alert(errorData.message || 'Fehler beim Ausleihen.');
        }
    };

    return (
        <div className="flex-grow flex flex-col items-center bg-surface w-full overflow-hidden">
            <header className="w-full bg-surface-container-low border-b border-outline-variant px-margin-mobile md:px-margin-desktop py-12 md:py-16 text-center">
                <div className="max-w-container-max-width mx-auto">
                    <h1 className="font-display-md md:font-display-lg text-display-md md:text-display-lg text-on-surface mb-4 max-w-3xl mx-auto">
                        {t('catalog.welcome_title')}
                    </h1>
                    <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
                        {t('catalog.welcome_desc')}
                    </p>
                </div>
            </header>

            <section className="w-full px-margin-mobile md:px-margin-desktop py-12 max-w-container-max-width mx-auto">
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-grow">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                        <input 
                            type="text" 
                            placeholder={t('catalog.search_placeholder')}
                            className="w-full pl-12 pr-4 py-3 rounded-full bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex gap-4 w-full md:w-auto">
                        <select 
                            className="px-4 py-3 rounded-full bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-md text-body-md text-on-surface cursor-pointer shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="">{t('catalog.genre')}</option>
                            <option value="Belytrystyka polska">Polnische Belletristik</option>
                            <option value="Belytrystyka zagraniczna">Internationale Belletristik</option>
                            <option value="Dziecięce">Kinder & Jugend</option>
                            <option value="Biografie">Biografien</option>
                            <option value="Reportaże | Podróżnicze">Reportagen & Reisen</option>
                        </select>

                        <select 
                            className="px-4 py-3 rounded-full bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-md text-body-md text-on-surface cursor-pointer shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">{t('catalog.status')}</option>
                            <option value="available">{t('catalog.available')}</option>
                            <option value="borrowed">{t('catalog.borrowed')}</option>
                        </select>
                    </div>
                </div>

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {books.map((book) => (
                            <div key={book.id} className="group flex flex-col bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                                <div className="h-48 bg-surface-container flex items-center justify-center relative overflow-hidden">
                                    {book.cover_image ? (
                                        <img src={`${API_BASE_URL}/${book.cover_image}`} alt="Cover" className="object-cover w-full h-full" />
                                    ) : (
                                        <span className="material-symbols-outlined text-[64px] text-surface-variant group-hover:scale-110 transition-transform duration-500">book_4</span>
                                    )}
                                    
                                    <div className="absolute top-3 right-3">
                                        {book.availability_status === 'available' ? (
                                            <span className="bg-primary-container text-on-primary-container font-label-sm text-label-sm px-2.5 py-1 rounded-full border border-primary/20 shadow-sm">
                                                {t('catalog.available')}
                                            </span>
                                        ) : (
                                            <span className="bg-surface-variant text-on-surface-variant font-label-sm text-label-sm px-2.5 py-1 rounded-full border border-outline-variant shadow-sm">
                                                {t('catalog.borrowed')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {/* Book Info */}
                                <div className="p-5 flex flex-col flex-grow">
                                    <span className="font-label-sm text-label-sm text-primary mb-2 uppercase tracking-wider">{book.category}</span>
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
                )}
            </section>
        </div>
    );
};

export default Katalog;
