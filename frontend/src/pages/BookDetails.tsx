import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from "../config";

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

const BookDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [book, setBook] = useState<Book | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchBook = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/books/${id}`, { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setBook(data);
            } else {
                console.error("Book not found");
            }
        } catch (error) {
            console.error("Failed to fetch book", error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchBook();
    }, [fetchBook]);

    const handleBorrow = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (!book) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/loans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ book_id: book.id }),
                credentials: 'include'
            });

            if (response.ok) {
                alert(t('catalog.borrow_success'));
                fetchBook();
            } else {
                const error = await response.json();
                alert(error.message || t('catalog.borrow_error'));
            }
        } catch (error) {
            console.error("Failed to borrow book", error);
        }
    };

    if (loading) {
        return (
            <div className="flex-grow flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!book) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center p-8">
                <h1 className="text-2xl font-bold mb-4">{t('catalog.no_books')}</h1>
                <Link to="/" className="text-primary hover:underline">{t('catalog.back_to_search')}</Link>
            </div>
        );
    }

    return (
        <div className="flex-grow w-full max-w-container-max-width mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-20">
            {/* Back Navigation */}
            <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 mb-8 text-on-surface-variant hover:text-primary transition-colors duration-200 group"
            >
                <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
                <span className="font-label-md text-label-md uppercase tracking-wider">{t('catalog.back_to_search')}</span>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-gutter items-start">
                {/* Left Column: Cover Image */}
                <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-6">
                    <div className="relative w-full aspect-[2/3] bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                        {book.cover_image ? (
                            <img
                                src={`${API_BASE_URL}/${book.cover_image}`}
                                alt={book.title}
                                className="object-cover w-full h-full"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-surface-container">
                                <span className="material-symbols-outlined text-[80px] text-surface-variant">book_4</span>
                            </div>
                        )}
                    </div>

                    {user?.role === 'admin' && (
                        <button
                            onClick={() => navigate(`/admin?tab=single&editId=${book.id}`)}
                            className="w-full flex items-center justify-center gap-2 border border-outline-variant py-3 rounded-xl hover:bg-surface-variant transition-colors text-on-surface-variant font-label-md"
                        >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                            Buch bearbeiten
                        </button>
                    )}
                </div>

                {/* Right Column: Meta & Actions */}
                <div className="md:col-span-8 lg:col-span-9 flex flex-col">
                    <div className="mb-8">
                        {book.availability_status === 'available' ? (
                            <div className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-1.5 rounded-full font-label-md text-label-md mb-6 shadow-sm">
                                <span className="material-symbols-outlined text-[16px] font-fill" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                {t('catalog.available')}
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-2 bg-surface-variant text-on-surface-variant px-4 py-1.5 rounded-full font-label-md text-label-md mb-6 shadow-sm border border-outline-variant">
                                <span className="material-symbols-outlined text-[16px]">info</span>
                                {t('catalog.borrowed')}
                            </div>
                        )}

                        <h1 className="font-headline-xl text-headline-xl text-on-surface mb-2 tracking-tight leading-tight">
                            {book.title}
                        </h1>
                        <p className="font-headline-md text-headline-md text-primary/70">
                            von {book.author}
                        </p>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                        <div className="border border-outline-variant bg-surface-bright p-5 rounded-xl flex flex-col gap-1 shadow-sm">
                            <span className="font-label-md text-label-md text-on-surface-variant/70 uppercase tracking-widest">{t('catalog.isbn')}</span>
                            <span className="font-body-md text-body-md text-on-surface">{book.isbn || '—'}</span>
                        </div>
                        <div className="border border-outline-variant bg-surface-bright p-5 rounded-xl flex flex-col gap-1 shadow-sm">
                            <span className="font-label-md text-label-md text-on-surface-variant/70 uppercase tracking-widest">{t('catalog.year')}</span>
                            <span className="font-body-md text-body-md text-on-surface">{book.publication_year || '—'}</span>
                        </div>
                        <div className="border border-outline-variant bg-surface-bright p-5 rounded-xl flex flex-col gap-1 shadow-sm">
                            <span className="font-label-md text-label-md text-on-surface-variant/70 uppercase tracking-widest">{t('catalog.publisher')}</span>
                            <span className="font-body-md text-body-md text-on-surface">{book.publisher || '—'}</span>
                        </div>
                        <div className="border border-outline-variant bg-surface-bright p-5 rounded-xl flex flex-col gap-1 shadow-sm border-l-4 border-l-primary/30">
                            <span className="font-label-md text-label-md text-on-surface-variant/70 uppercase tracking-widest flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">location_on</span>
                                {t('catalog.signature')}
                            </span>
                            <span className="font-body-md text-body-md text-on-surface font-mono">{book.signature || '—'}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-12 pb-12 border-b border-outline-variant/30">
                        {book.availability_status === 'available' ? (
                            <button
                                onClick={handleBorrow}
                                className="bg-primary text-on-primary font-label-lg text-label-lg px-10 py-4 rounded-xl hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-3 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <span className="material-symbols-outlined text-[20px]">bookmark_add</span>
                                {t('catalog.borrow_btn')}
                            </button>
                        ) : (
                            <button
                                disabled
                                className="bg-surface-container-high text-on-surface-variant/50 font-label-lg text-label-lg px-10 py-4 rounded-xl flex items-center justify-center gap-3 cursor-not-allowed border border-outline-variant"
                            >
                                <span className="material-symbols-outlined text-[20px]">schedule</span>
                                {t('catalog.reserve_btn')}
                            </button>
                        )}

                        <div className="flex flex-col justify-center">
                            <span className="font-label-sm text-label-sm text-on-surface-variant/70 uppercase tracking-wider mb-1">Kategorie</span>
                            <span className="font-body-md text-body-md text-primary font-semibold">{book.category}</span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="max-w-3xl">
                        <h3 className="font-headline-md text-headline-md text-on-surface mb-6">{t('catalog.description')}</h3>
                        <div className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed space-y-4">
                            {book.description ? (
                                book.description.split('\n').map((para, i) => (
                                    <p key={i}>{para}</p>
                                ))
                            ) : (
                                <p className="italic opacity-60">Keine Beschreibung verfügbar.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookDetails;
