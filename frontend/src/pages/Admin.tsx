import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { parseBibTeX } from '../utils/bibtexParser';
import AdminPages from './AdminPages';
import AdminUsers from './AdminUsers';
import AdminLoans from './AdminLoans';
import { API_BASE_URL } from "../config";

interface Book {
    id: number;
    title: string;
    author: string;
    category: string;
    signature?: string;
    publisher?: string;
    publication_year?: string;
    isbn?: string;
    description?: string;
    cover_image?: string;
}

interface PreviewBook {
    tempId: string;
    title: string;
    author: string;
    category: string;
    signature?: string;
    publisher: string;
    publication_year: string;
    isbn: string;
    description: string;
    selected: boolean;
}

const Admin: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [books, setBooks] = useState<Book[]>([]);
    
    // Pagination and search for admin book list
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const limit = 20;

    // Tab state
    const [activeTab, setActiveTab] = useState<'single' | 'bibtex' | 'users' | 'loans' | 'pages'>('single');

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const tab = queryParams.get('tab');
        if (tab === 'loans' || tab === 'users' || tab === 'pages' || tab === 'bibtex' || tab === 'single') {
                                                /* eslint-disable-next-line react-hooks/set-state-in-effect */
            setActiveTab(tab as 'single' | 'bibtex' | 'users' | 'loans' | 'pages');
        }
    }, [location]);

    const handleTabChange = (tab: 'single' | 'bibtex' | 'users' | 'loans' | 'pages') => {
        setActiveTab(tab);
        navigate(`/admin?tab=${tab}`, { replace: true });
    };

    const [bookForm, setBookForm] = useState({
        id: null as number | null,
        title: '',
        author: '',
        category: 'Belytrystyka polska',
        publication_year: '',
        publisher: '',
        isbn: '',
        description: '',
        signature: '',
        cover_image: null as File | null
    });

    const [bibtex, setBibtex] = useState('');
    const [previewBooks, setPreviewBooks] = useState<PreviewBook[]>([]);
    const [message, setMessage] = useState('');

        const fetchBooks = useCallback(async () => {
        const res = await fetch(`${API_BASE_URL}/api/books?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            setBooks(data.data);
            setTotalPages(data.meta.total_pages);
        }
    }, [page, search, limit]);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/login');
            return;
        }
                                /* eslint-disable-next-line react-hooks/set-state-in-effect */
        fetchBooks();
    }, [user, navigate, fetchBooks]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setBookForm(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setBookForm(prev => ({ ...prev, cover_image: e.target.files![0] }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        Object.entries(bookForm).forEach(([key, value]) => {
            if (value !== null) formData.append(key, value as string | Blob);
        });

        const url = bookForm.id ? `${API_BASE_URL}/api/admin/books/${bookForm.id}` : `${API_BASE_URL}/api/admin/books`;
        const res = await fetch(url, {
            method: 'POST', // Use POST for both (multipart/form-data)
            body: formData,
            credentials: 'include'
        });

        if (res.ok) {
            setMessage(bookForm.id ? t('admin.books.update_success') : t('admin.books.create_success'));
            setBookForm({ id: null, title: '', author: '', category: 'Belytrystyka polska', publication_year: '', publisher: '', isbn: '', description: '', signature: '', cover_image: null });
                            fetchBooks();
            setTimeout(() => setMessage(''), 3000);
        } else {
            const err = await res.json();
            alert(err.message || t('admin.books.save_error'));
        }
    };

    const handleEdit = (book: Book) => {
        setBookForm({
            id: book.id,
            title: book.title,
            author: book.author,
            category: book.category,
            publication_year: book.publication_year || '',
            publisher: book.publisher || '',
            isbn: book.isbn || '',
            description: book.description || '',
            signature: book.signature || '',
            cover_image: null
        });
        handleTabChange('single');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('admin.books.confirm_delete'))) return;
        const res = await fetch(`${API_BASE_URL}/api/admin/books/${id}`, { method: 'DELETE', credentials: 'include' });
        if (res.ok) {
                            fetchBooks();
        }
    };

    const handleBibtexImport = () => {
        try {
            const parsed = parseBibTeX(bibtex);
            const preview = parsed.map((b, i) => ({
                ...b,
                tempId: `temp-${Date.now()}-${i}`,
                selected: true
            }));
            setPreviewBooks(preview);
        } catch {
            alert(t('admin.bibtex.parse_error'));
        }
    };

    const handlePreviewBookChange = (tempId: string, field: keyof PreviewBook, value: string | boolean) => {
        setPreviewBooks(prev => prev.map(b => b.tempId === tempId ? { ...b, [field]: value } : b));
    };

    const handleImportSelected = async () => {
        const selected = previewBooks.filter(b => b.selected);
        if (selected.length === 0) return;

        const res = await fetch(`${API_BASE_URL}/api/admin/books/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ books: selected }),
            credentials: 'include'
        });

        if (res.ok) {
            const result = await res.json();
            setMessage(t('admin.bibtex.import_success', { count: result.count, skipped: result.skipped }));
            setPreviewBooks([]);
            setBibtex('');
                            fetchBooks();
            setTimeout(() => setMessage(''), 5000);
        } else {
            const err = await res.json();
            alert(err.message || t('admin.bibtex.import_error'));
        }
    };

    if (!user || user.role !== 'admin') return null;

    return (
        <div className="flex-grow flex flex-col p-margin-mobile md:p-margin-desktop bg-surface max-w-container-max-width mx-auto w-full gap-8">
            <h1 className="font-display-lg text-display-lg text-on-surface">{t('admin.title')}</h1>

            {message && (
                <div className="bg-primary-container text-on-primary-container p-4 rounded-lg font-label-md">
                    {message}
                </div>
            )}

            <div className="flex border-b border-outline-variant overflow-x-auto whitespace-nowrap">
                <button
                    onClick={() => handleTabChange('single')}
                    className={`px-6 py-3 font-label-lg transition-colors ${activeTab === 'single' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
                >
                    {t('admin.tabs.edit_book')}
                </button>
                <button
                    onClick={() => handleTabChange('bibtex')}
                    className={`px-6 py-3 font-label-lg transition-colors ${activeTab === 'bibtex' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
                >
                    {t('admin.tabs.bibtex_import')}
                </button>
                <button
                    onClick={() => handleTabChange('users')}
                    className={`px-6 py-3 font-label-lg transition-colors ${activeTab === 'users' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
                >
                    {t('admin.tabs.users')}
                </button>
                <button
                    onClick={() => handleTabChange('loans')}
                    className={`px-6 py-3 font-label-lg transition-colors ${activeTab === 'loans' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
                >
                    {t('admin.tabs.loans')}
                </button>
                <button
                    onClick={() => handleTabChange('pages')}
                    className={`px-6 py-3 font-label-lg transition-colors ${activeTab === 'pages' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
                >
                    {t('admin.tabs.pages')}
                </button>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
                {activeTab === 'users' ? (
                    <AdminUsers />
                ) : activeTab === 'loans' ? (
                    <AdminLoans />
                ) : activeTab === 'pages' ? (
                    <AdminPages />
                ) : activeTab === 'single' ? (
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block font-label-medium mb-1">{t('admin.books.form.title')}</label>
                                <input name="title" value={bookForm.title} onChange={handleInputChange} required className="w-full border border-outline-variant rounded p-2" />
                            </div>
                            <div>
                                <label className="block font-label-medium mb-1">{t('admin.books.form.author')}</label>
                                <input name="author" value={bookForm.author} onChange={handleInputChange} className="w-full border border-outline-variant rounded p-2" />
                            </div>
                            <div>
                                <label className="block font-label-medium mb-1">{t('admin.books.form.category')}</label>
                                <select name="category" value={bookForm.category} onChange={handleInputChange} className="w-full border border-outline-variant rounded p-2">
                                    <option value="Auf Deutsch">{t('catalog.categories.deutsch')}</option>
                                    <option value="Belytrystyka polska">{t('catalog.categories.belytrystyka_polska')}</option>
                                    <option value="Belytrystyka zagraniczna">{t('catalog.categories.belytrystyka_polska')}</option>
                                    <option value="Dla dzieci">{t('catalog.categories.dzieciece')}</option>
                                    <option value="Fantasy | Sci-Fi">{t('catalog.categories.fantasy_scifi')}</option>
                                    <option value="Powieści historyczne">{t('catalog.categories.historyczne')}</option>
                                    <option value="Kryminał | Thriller">{t('catalog.categories.kryminał_thriller')}</option>
                                    <option value="Młodzieżowe | Young Adult">{t('catalog.categories.młodziezowe_young_adult')}</option>
                                    <option value="Biografie">{t('catalog.categories.biografie')}</option>
                                    <option value="Poezja">{t('catalog.categories.poezja')}</option>
                                    <option value="Poradniki | Popularnonaukowe">{t('catalog.categories.poradniki_popularnonaukowe')}</option>
                                    <option value="Reportaże | Podróżnicze">{t('catalog.categories.reportaze_podroznicze')}</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-label-medium mb-1">{t('admin.books.form.year')}</label>
                                    <input name="publication_year" value={bookForm.publication_year} onChange={handleInputChange} className="w-full border border-outline-variant rounded p-2" />
                                </div>
                                <div>
                                    <label className="block font-label-medium mb-1">{t('admin.books.form.publisher')}</label>
                                    <input name="publisher" value={bookForm.publisher} onChange={handleInputChange} className="w-full border border-outline-variant rounded p-2" />
                                </div>
                            </div>
                            <div>
                                <label className="block font-label-medium mb-1">{t('admin.books.form.isbn')}</label>
                                <input name="isbn" value={bookForm.isbn} onChange={handleInputChange} className="w-full border border-outline-variant rounded p-2" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block font-label-medium mb-1">{t('admin.books.form.signature_optional')}</label>
                                <input name="signature" value={bookForm.signature} onChange={handleInputChange} placeholder={t('admin.books.form.signature_placeholder')} className="w-full border border-outline-variant rounded p-2 font-mono" />
                            </div>
                            <div>
                                <label className="block font-label-medium mb-1">{t('admin.books.form.description')}</label>
                                <textarea name="description" value={bookForm.description} onChange={handleInputChange} rows={5} className="w-full border border-outline-variant rounded p-2" />
                            </div>
                            <div>
                                <label className="block font-label-medium mb-1">{t('admin.books.form.cover_image')}</label>
                                <input type="file" onChange={handleFileChange} accept="image/*" className="w-full" />
                            </div>
                            <div className="mt-4 flex gap-4">
                                <button type="submit" className="bg-primary text-on-primary py-2 px-6 rounded font-label-md hover:bg-primary/90 transition-colors">
                                    {bookForm.id ? t('admin.books.form.update') : t('admin.books.form.save')}
                                </button>
                                {bookForm.id && (
                                    <button
                                        type="button"
                                        onClick={() => setBookForm({ id: null, title: '', author: '', category: 'Belytrystyka polska', publication_year: '', publisher: '', isbn: '', description: '', signature: '', cover_image: null })}
                                        className="bg-surface-variant text-on-surface-variant py-2 px-6 rounded font-label-md hover:bg-surface-variant/80 transition-colors"
                                    >
                                        {t('admin.books.form.cancel')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                ) : (
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="font-label-medium">{t('admin.bibtex.label')}</label>
                            <textarea
                                value={bibtex}
                                onChange={(e) => setBibtex(e.target.value)}
                                rows={10}
                                placeholder="@book{...}"
                                className="w-full border border-outline-variant rounded p-4 font-mono text-sm bg-surface-container-low"
                            />
                            <button
                                onClick={handleBibtexImport}
                                className="self-start bg-secondary text-on-secondary py-2 px-6 rounded font-label-md hover:bg-secondary/90 transition-colors"
                            >
                                {t('admin.bibtex.load_btn')}
                            </button>
                        </div>

                        {previewBooks.length > 0 && (
                            <div className="mt-4 border-t pt-6">
                                <h3 className="font-headline-small mb-4">{t('admin.bibtex.preview', { count: previewBooks.length })}</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-surface-container">
                                                <th className="p-2 border-b text-center"><input type="checkbox" checked={previewBooks.every(b => b.selected)} onChange={(e) => setPreviewBooks(prev => prev.map(b => ({ ...b, selected: e.target.checked })))} /></th>
                                                <th className="p-2 border-b">{t('admin.bibtex.table.title')}</th>
                                                <th className="p-2 border-b">{t('admin.bibtex.table.author')}</th>
                                                <th className="p-2 border-b">{t('admin.bibtex.table.category')}</th>
                                                <th className="p-2 border-b">{t('admin.bibtex.table.year')}</th>
                                                <th className="p-2 border-b">{t('admin.bibtex.table.isbn')}</th>
                                                <th className="p-2 border-b">{t('admin.bibtex.table.details')}</th>
                                                <th className="p-2 border-b">{t('admin.bibtex.table.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewBooks.map((book) => {
                                                return (
                                                    <tr key={book.tempId} className="hover:bg-surface-variant/30">
                                                        <td className="p-2 border-b text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={book.selected}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'selected', e.target.checked)}
                                                            />
                                                        </td>
                                                        <td className="p-2 border-b align-top">
                                                            <input
                                                                value={book.title}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'title', e.target.value)}
                                                                className="w-full border border-outline-variant rounded p-1 text-sm font-semibold"
                                                            />
                                                        </td>
                                                        <td className="p-2 border-b align-top">
                                                            <input
                                                                value={book.author}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'author', e.target.value)}
                                                                className="w-full border border-outline-variant rounded p-1 text-sm"
                                                            />
                                                        </td>
                                                        <td className="p-2 border-b align-top">
                                                            <select
                                                                value={book.category}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'category', e.target.value)}
                                                                className="w-full border border-outline-variant rounded p-1 text-xs"
                                                            >
                                                                <option value="Auf Deutsch">{t('catalog.categories.deutsch')}</option>
                                                                <option value="Belytrystyka polska">{t('catalog.categories.belytrystyka_polska')}</option>
                                                                <option value="Belytrystyka zagraniczna">{t('catalog.categories.belytrystyka_polska')}</option>
                                                                <option value="Dla dzieci">{t('catalog.categories.dzieciece')}</option>
                                                                <option value="Fantasy | Sci-Fi">{t('catalog.categories.fantasy_scifi')}</option>
                                                                <option value="Powieści historyczne">{t('catalog.categories.historyczne')}</option>
                                                                <option value="Kryminał | Thriller">{t('catalog.categories.kryminał_thriller')}</option>
                                                                <option value="Młodzieżowe | Young Adult">{t('catalog.categories.młodziezowe_young_adult')}</option>
                                                                <option value="Biografie">{t('catalog.categories.biografie')}</option>
                                                                <option value="Poezja">{t('catalog.categories.poezja')}</option>
                                                                <option value="Poradniki | Popularnonaukowe">{t('catalog.categories.poradniki_popularnonaukowe')}</option>
                                                                <option value="Reportaże | Podróżnicze">{t('catalog.categories.reportaze_podroznicze')}</option>
                                                            </select>
                                                        </td>
                                                        <td className="p-2 border-b align-top text-center">
                                                            <input
                                                                value={book.publication_year}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'publication_year', e.target.value)}
                                                                placeholder={t('admin.bibtex.table.year')}
                                                                className="w-full border border-outline-variant rounded p-1 text-sm text-center"
                                                            />
                                                        </td>
                                                        <td className="p-2 border-b align-top text-center">
                                                            <input
                                                                value={book.isbn}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'isbn', e.target.value)}
                                                                placeholder={t('admin.bibtex.table.isbn')}
                                                                className="w-full border border-outline-variant rounded p-1 text-sm font-mono"
                                                            />
                                                        </td>
                                                        <td className="p-2 border-b align-top">
                                                            <div className="flex flex-col gap-1">
                                                                <input
                                                                    value={book.publisher}
                                                                    onChange={(e) => handlePreviewBookChange(book.tempId, 'publisher', e.target.value)}
                                                                    placeholder={t('admin.bibtex.table.publisher')}
                                                                    className="w-full border border-outline-variant rounded p-1 text-xs"
                                                                />
                                                                <textarea
                                                                    value={book.description}
                                                                    onChange={(e) => handlePreviewBookChange(book.tempId, 'description', e.target.value)}
                                                                    placeholder={t('admin.bibtex.table.description')}
                                                                    className="w-full border border-outline-variant rounded p-1 text-xs h-10 resize-y"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="p-2 border-b align-top text-center">
                                                            <button
                                                                onClick={() => setPreviewBooks(prev => prev.filter(b => b.tempId !== book.tempId))}
                                                                className="text-error hover:text-error/80 cursor-pointer p-1"
                                                                title={t('admin.bibtex.table.remove')}
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-4 flex items-center justify-end gap-4">
                                    <span className="text-body-sm text-on-surface-variant">
                                        {t('admin.bibtex.selected_count', { selected: previewBooks.filter(b => b.selected).length, total: previewBooks.length })}
                                    </span>
                                    <button
                                        onClick={handleImportSelected}
                                        className="bg-primary text-on-primary py-2.5 px-6 rounded-md hover:bg-primary/90 transition-colors font-label-md shadow-sm cursor-pointer"
                                    >
                                        {t('admin.bibtex.import_btn')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                    <h2 className="font-headline-md text-headline-md">{t('admin.books.inventory')}</h2>
                    <div className="relative max-w-sm w-full">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                        <input
                            type="text"
                            placeholder={t('admin.books.search_placeholder')}
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2 bg-surface-container border border-outline-variant rounded-full text-body-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 font-label-md">{t('admin.books.signature')}</th>
                                <th className="p-2 font-label-md">{t('admin.books.title')}</th>
                                <th className="p-2 font-label-md">{t('admin.books.author')}</th>
                                <th className="p-2 font-label-md text-right">{t('admin.books.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {books.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center text-on-surface-variant">{t('admin.books.no_books')}</td>
                                </tr>
                            ) : (
                                books.map(b => (
                                    <tr key={b.id} className="border-b hover:bg-surface-variant">
                                        <td className="p-2 font-body-sm whitespace-nowrap">{b.signature || b.id}</td>
                                        <td className="p-2 font-body-sm">{b.title}</td>
                                        <td className="p-2 font-body-sm">{b.author}</td>
                                        <td className="p-2 font-body-sm text-right whitespace-nowrap">
                                            <button onClick={() => handleEdit(b)} className="text-primary font-label-sm hover:underline mr-3">{t('admin.books.edit')}</button>
                                            <button onClick={() => handleDelete(b.id)} className="text-error font-label-sm hover:underline">{t('admin.books.delete')}</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(p - 1, 1))}
                            className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-variant disabled:opacity-30"
                        >
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <span className="text-body-sm">{t('admin.books.page_of', { page: page, total: totalPages })}</span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                            className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-variant disabled:opacity-30"
                        >
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Admin;
