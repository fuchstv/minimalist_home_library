import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminUsers from './AdminUsers';
import AdminLoans from './AdminLoans';
import AdminPages from './AdminPages';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { parseBibTeX } from '../utils/bibtexParser';

interface Book {
    id: number | null;
    title: string;
    author: string;
    category: string;
    publication_year: string;
    publisher: string;
    isbn: string;
    description: string;
    signature: string;
    cover_image: File | string | null;
}

interface PreviewBook extends Omit<Book, 'id' | 'cover_image'> {
    tempId: string;
    selected: boolean;
    description: string;
}

const Admin: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, csrfToken } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('books');

    const [books, setBooks] = useState<any[]>([]);
    const [bookForm, setBookForm] = useState<Book>({
        id: null,
        title: '',
        author: '',
        category: 'belytrystyka_polska',
        publication_year: '',
        publisher: '',
        isbn: '',
        description: '',
        signature: '',
        cover_image: null
    });

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [message, setMessage] = useState('');
    const [isLookingUp, setIsLookingUp] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const limit = 10;

    // BibTeX Import State
    const [bibtexInput, setBibtexInput] = useState('');
    const [previewBooks, setPreviewBooks] = useState<PreviewBook[]>([]);
    const [showBibtexArea, setShowBibtexArea] = useState(false);

    const fetchBooks = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/books?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setBooks(data.data);
                setTotalPages(data.meta.totalPages);

                // Handle edit redirect from Katalog
                const params = new URLSearchParams(location.search);
                const editId = params.get('edit');
                if (editId && data.data) {
                    const bookToEdit = data.data.find((b: any) => b.id === parseInt(editId));
                    if (bookToEdit) {
                        handleEdit(bookToEdit);
                        // Clean up URL
                        navigate('/admin', { replace: true });
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching books:', error);
        }
    }, [page, search, location.search, navigate]);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/login');
            return;
        }
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

        const headers: HeadersInit = {};
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const res = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: formData,
            credentials: 'include'
        });

        if (res.ok) {
            setMessage(bookForm.id ? t('admin.books.update_success') : t('admin.books.create_success'));
            setBookForm({ id: null, title: '', author: '', category: 'belytrystyka_polska', publication_year: '', publisher: '', isbn: '', description: '', signature: '', cover_image: null });
            fetchBooks();
            setTimeout(() => setMessage(''), 3000);
        } else {
            const data = await res.json();
            alert(data.message || 'Fehler beim Speichern');
        }
    };


    const handleOpenLibraryLookup = async () => {
        if (!bookForm.isbn) return;
        setIsLookingUp(true);
        try {
            const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${bookForm.isbn}&format=json&jscmd=data`);
            const data = await res.json();
            const bookKey = `ISBN:${bookForm.isbn}`;
            if (data[bookKey]) {
                const info = data[bookKey];
                setBookForm(prev => ({
                    ...prev,
                    title: info.title || prev.title,
                    author: info.authors ? info.authors.map((a: any) => a.name).join(", ") : prev.author,
                    publication_year: info.publish_date || prev.publication_year,
                    publisher: info.publishers ? info.publishers.map((p: any) => p.name).join(", ") : prev.publisher,
                    description: info.notes || (info.subtitle ? info.subtitle : prev.description)
                }));
                setMessage(t("admin.books.lookup_success"));
                setTimeout(() => setMessage(""), 3000);
            } else {
                alert(t("admin.books.isbn_not_found"));
            }
        } catch (error) {
            console.error("Open Library lookup failed:", error);
            alert(t("admin.books.isbn_error"));
        } finally {
            setIsLookingUp(false);
        }
    };

    const handleEdit = (book: any) => {
        setBookForm({
            id: book.id,
            title: book.title || '',
            author: book.author || '',
            category: book.category || 'belytrystyka_polska',
            publication_year: book.publication_year || '',
            publisher: book.publisher || '',
            isbn: book.isbn || '',
            description: book.description || '',
            signature: book.signature || '',
            cover_image: book.cover_image || null
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm(t('admin.books.confirm_delete'))) return;

        const headers: HeadersInit = {};
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const res = await fetch(`${API_BASE_URL}/api/admin/books/${id}`, {
            method: 'DELETE',
            headers: headers,
            credentials: 'include'
        });
        if (res.ok) {
            fetchBooks();
        }
    };

    const handleParseBibtex = () => {
        try {
            const parsed = parseBibTeX(bibtexInput);
            if (parsed.length === 0) {
                alert(t('admin.bibtex.no_entries_found'));
                return;
            }
            const previewData: PreviewBook[] = parsed.map(entry => ({
                tempId: Math.random().toString(36).substr(2, 9),
                selected: true,
                title: entry.title || '',
                author: entry.author || '',
                category: 'belytrystyka_polska',
                publication_year: entry.publication_year || '',
                publisher: entry.publisher || '',
                isbn: entry.isbn || '',
                description: entry.description || '',
                signature: ''
            }));
            setPreviewBooks(prev => [...prev, ...previewData]);
            setBibtexInput('');
            setShowBibtexArea(false);
        } catch (e) {
            alert(t('admin.bibtex.parse_error'));
            console.error(e);
        }
    };

    const handleImportSelected = async () => {
        const toImport = previewBooks.filter(b => b.selected);
        if (toImport.length === 0) return;

        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const res = await fetch(`${API_BASE_URL}/api/admin/books/import`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ books: toImport }),
            credentials: 'include'
        });

        if (res.ok) {
            const data = await res.json();
            alert(data.message);
            setPreviewBooks(prev => prev.filter(b => !b.selected));
            fetchBooks();
        } else {
            alert('Import fehlgeschlagen');
        }
    };

    const handlePreviewBookChange = (tempId: string, field: keyof PreviewBook, value: any) => {
        setPreviewBooks(prev => prev.map(b => b.tempId === tempId ? { ...b, [field]: value } : b));
    };

    const toggleAllPreview = (selected: boolean) => {
        setPreviewBooks(prev => prev.map(b => ({ ...b, selected })));
    };

    return (
        <div className="flex-grow flex flex-col gap-8 p-margin-mobile md:p-margin-desktop bg-surface max-w-7xl mx-auto w-full">
            <h1 className="font-display-lg text-display-lg text-on-surface">{t('nav.admin')}</h1>

            <div className="flex flex-wrap gap-2 border-b border-outline-variant pb-4">
                {[
                    { id: 'books', label: t('admin.tabs.edit_book'), icon: 'book' },
                    { id: 'users', label: t('admin.tabs.users'), icon: 'group' },
                    { id: 'loans', label: t('admin.tabs.loans'), icon: 'receipt_long' },
                    { id: 'pages', label: t('admin.tabs.pages'), icon: 'description' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-label-lg transition-all ${
                            activeTab === tab.id
                            ? 'bg-primary text-on-primary shadow-md'
                            : 'text-on-surface-variant hover:bg-surface-variant/20'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'users' && <AdminUsers />}
            {activeTab === 'loans' && <AdminLoans />}
            {activeTab === 'pages' && <AdminPages />}

            {activeTab === 'books' && (
                <div className="flex flex-col gap-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Manual Form */}
                        <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm h-fit">
                            <h2 className="font-headline-md text-headline-md mb-6">
                                {bookForm.id ? t('admin.books.edit_title') : t('admin.books.add_title')}
                            </h2>
                            {message && <div className="bg-secondary-container text-on-secondary-container p-3 rounded mb-4 font-body-sm">{message}</div>}
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="font-label-md block mb-1">{t('admin.books.title')}</label>
                                        <input name="title" required value={bookForm.title} onChange={handleInputChange} className="w-full border border-outline-variant rounded p-2 text-body-md bg-surface" />
                                    </div>
                                    <div>
                                        <label className="font-label-md block mb-1">{t('admin.books.author')}</label>
                                        <input name="author" value={bookForm.author} onChange={handleInputChange} className="w-full border border-outline-variant rounded p-2 text-body-md bg-surface" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="font-label-md block mb-1">{t('admin.books.category')}</label>
                                        <select name="category" value={bookForm.category} onChange={handleInputChange} className="w-full border border-outline-variant rounded p-2 text-body-md bg-surface">
                                            {Object.entries(t('catalog.categories', { returnObjects: true })).map(([key, value]) => (
                                                <option key={key} value={key}>{value as string}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="font-label-md block mb-1">{t('admin.books.signature')}</label>
                                        <input name="signature" value={bookForm.signature} onChange={handleInputChange} className="w-full border border-outline-variant rounded p-2 text-body-md bg-surface font-mono" placeholder={t('admin.books.signature_placeholder')} />
                                    </div>
                                </div>

                                <div className="flex flex-wrap md:flex-nowrap gap-4">
                                    <div>
                                        <label className="font-label-md block mb-1">{t('admin.books.year')}</label>
                                        <input name="publication_year" value={bookForm.publication_year} onChange={handleInputChange} className="w-full border border-outline-variant rounded p-2 text-body-md bg-surface" />
                                    </div>
                                    <div>
                                        <label className="font-label-md block mb-1">{t('admin.books.publisher')}</label>
                                        <input name="publisher" value={bookForm.publisher} onChange={handleInputChange} className="w-full border border-outline-variant rounded p-2 text-body-md bg-surface" />
                                    </div>
                                    <div>
                                        <label className="font-label-md block mb-1">{t('admin.books.isbn')}</label>
                                        <div className="flex gap-1">
                                            <input name="isbn" value={bookForm.isbn} onChange={handleInputChange} className="flex-grow border border-outline-variant rounded p-2 text-body-md bg-surface" placeholder="e.g. 978..." />
                                            <button
                                                type="button"
                                                onClick={handleOpenLibraryLookup}
                                                disabled={isLookingUp || !bookForm.isbn}
                                                className="bg-secondary text-on-secondary px-3 rounded hover:bg-secondary/90 disabled:opacity-50 transition-colors text-xs font-label-md"
                                                title={t("admin.books.isbn_lookup_hint")}
                                            >
                                                {isLookingUp ? t("admin.books.isbn_looking_up") : t("admin.books.isbn_lookup")}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-on-surface-variant mt-0.5">{t("admin.books.isbn_lookup_hint")}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="font-label-md block mb-1">{t('admin.books.description')}</label>
                                    <textarea name="description" value={bookForm.description} onChange={handleInputChange} className="w-full border border-outline-variant rounded p-2 text-body-md h-24 bg-surface" />
                                </div>

                                <div>
                                    <label className="font-label-md block mb-1">{t("admin.books.cover_image")}</label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-2 px-4 py-2 border border-outline rounded-md hover:bg-surface-variant/20 transition-colors text-body-sm font-label-md cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-sm">upload_file</span>
                                            {t("admin.books.browse")}
                                        </button>
                                        <span className="text-xs text-on-surface-variant truncate">
                                            {bookForm.cover_image instanceof File ? bookForm.cover_image.name : (typeof bookForm.cover_image === "string" ? bookForm.cover_image : t("admin.books.no_file_selected"))}
                                        </span>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden"
                                            accept="image/*"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-2">
                                    <button type="submit" className="flex-grow bg-primary text-on-primary font-label-lg py-3 rounded-full hover:bg-primary/90 transition-colors shadow-sm">
                                        {bookForm.id ? t('admin.books.save_btn') : t('admin.books.add_btn')}
                                    </button>
                                    {bookForm.id && (
                                        <button type="button" onClick={() => setBookForm({ id: null, title: '', author: '', category: 'belytrystyka_polska', publication_year: '', publisher: '', isbn: '', description: '', signature: '', cover_image: null })} className="px-6 border border-outline rounded-full font-label-lg hover:bg-surface-variant/20 transition-colors">
                                            Abbrechen
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* Import Area */}
                        {!bookForm.id && (
                            <div className="flex flex-col gap-8">
                                <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="font-headline-md text-headline-md">{t('admin.bibtex.title')}</h2>
                                        <button
                                            onClick={() => setShowBibtexArea(!showBibtexArea)}
                                            className="text-primary font-label-md flex items-center gap-1 hover:bg-primary/5 px-3 py-1 rounded-full transition-colors cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined">{showBibtexArea ? 'close' : 'add'}</span>
                                            {showBibtexArea ? t('admin.bibtex.cancel') : t('admin.bibtex.add_btn')}
                                        </button>
                                    </div>

                                    {showBibtexArea && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                            <textarea
                                                value={bibtexInput}
                                                onChange={(e) => setBibtexInput(e.target.value)}
                                                placeholder={t('admin.bibtex.placeholder')}
                                                className="w-full border border-outline-variant rounded p-3 font-mono text-xs h-48 bg-surface-container-low mb-4 focus:bg-surface focus:border-primary outline-none transition-all"
                                            />
                                            <button
                                                onClick={handleParseBibtex}
                                                disabled={!bibtexInput.trim()}
                                                className="w-full bg-secondary text-on-secondary font-label-lg py-3 rounded-full hover:bg-secondary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {t('admin.bibtex.parse_btn')}
                                            </button>
                                        </div>
                                    )}

                                    {!showBibtexArea && previewBooks.length === 0 && (
                                        <div className="text-center py-10 text-on-surface-variant">
                                            <span className="material-symbols-outlined text-[48px] opacity-20 mb-2">library_add</span>
                                            <p className="text-body-md">{t('admin.bibtex.hint')}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Preview Table */}
                                {previewBooks.length > 0 && (
                                    <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-title-lg text-title-lg">{t('admin.bibtex.preview_title')}</h3>
                                            <div className="flex gap-2">
                                                <button onClick={() => toggleAllPreview(true)} className="text-xs font-label-md text-primary hover:underline">{t('admin.bibtex.select_all')}</button>
                                                <span className="text-outline">|</span>
                                                <button onClick={() => toggleAllPreview(false)} className="text-xs font-label-md text-primary hover:underline">{t('admin.bibtex.select_none')}</button>
                                            </div>
                                        </div>

                                        <div className="max-h-[600px] overflow-y-auto border border-outline-variant rounded-md">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="sticky top-0 bg-surface-container-low shadow-sm z-10">
                                                    <tr className="text-xs font-bold uppercase tracking-wider text-on-surface-variant border-b border-outline-variant">
                                                        <th className="p-3 w-8"></th>
                                                        <th className="p-3">{t('admin.bibtex.table.book')}</th>
                                                        <th className="p-3 w-20 text-center">{t('admin.bibtex.table.year')}</th>
                                                        <th className="p-3 w-32 text-center">{t('admin.bibtex.table.isbn')}</th>
                                                        <th className="p-3">{t('admin.bibtex.table.publisher')}</th>
                                                        <th className="p-3 w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-outline-variant">
                                                    {previewBooks.map((book) => {
                                                        return (
                                                            <tr key={book.tempId} className={`hover:bg-surface-variant/10 transition-colors ${!book.selected ? 'opacity-60 bg-surface-container-low' : ''}`}>
                                                                <td className="p-2 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={book.selected}
                                                                        onChange={(e) => handlePreviewBookChange(book.tempId, 'selected', e.target.checked)}
                                                                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                                                                    />
                                                                </td>
                                                                <td className="p-2">
                                                                    <div className="flex flex-col gap-1">
                                                                        <input
                                                                            value={book.title}
                                                                            onChange={(e) => handlePreviewBookChange(book.tempId, 'title', e.target.value)}
                                                                            placeholder={t('admin.bibtex.table.title')}
                                                                            className="w-full border-none bg-transparent font-bold text-sm focus:ring-1 focus:ring-primary rounded p-1"
                                                                        />
                                                                        <input
                                                                            value={book.author}
                                                                            onChange={(e) => handlePreviewBookChange(book.tempId, 'author', e.target.value)}
                                                                            placeholder={t('admin.bibtex.table.author')}
                                                                            className="w-full border-none bg-transparent text-xs text-on-surface-variant focus:ring-1 focus:ring-primary rounded p-1"
                                                                        />
                                                                        <select
                                                                            value={book.category}
                                                                            onChange={(e) => handlePreviewBookChange(book.tempId, 'category', e.target.value)}
                                                                            className="w-full border border-outline-variant rounded p-1 text-[10px] bg-surface-container-low mt-1"
                                                                        >
                                                                            {Object.entries(t('catalog.categories', { returnObjects: true })).map(([key, value]) => (
                                                                                <option key={key} value={key}>{value as string}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </td>
                                                                <td className="p-2 align-top text-center">
                                                                    <input
                                                                        value={book.publication_year}
                                                                        onChange={(e) => handlePreviewBookChange(book.tempId, 'publication_year', e.target.value)}
                                                                        placeholder={t('admin.bibtex.table.year')}
                                                                        className="w-full border border-outline-variant rounded p-1 text-sm text-center"
                                                                    />
                                                                </td>
                                                                <td className="p-2 align-top text-center">
                                                                    <input
                                                                        value={book.isbn}
                                                                        onChange={(e) => handlePreviewBookChange(book.tempId, 'isbn', e.target.value)}
                                                                        placeholder={t('admin.bibtex.table.isbn')}
                                                                        className="w-full border border-outline-variant rounded p-1 text-sm font-mono"
                                                                    />
                                                                </td>
                                                                <td className="p-2 align-top">
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
                                                                <td className="p-2 align-top text-center">
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
            )}
        </div>
    );
};

export default Admin;
