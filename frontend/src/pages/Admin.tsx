import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    
    // Form state (also used for editing)
    const [editingBookId, setEditingBookId] = useState<number | null>(null);
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [category, setCategory] = useState('');
    const [publisher, setPublisher] = useState('');
    const [publicationYear, setPublicationYear] = useState('');
    const [isbn, setIsbn] = useState('');
    const [description, setDescription] = useState('');
    const [signature, setSignature] = useState('');
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [existingCoverImage, setExistingCoverImage] = useState<string | null>(null);

    // BibTeX Import State
    const [bibtexText, setBibtexText] = useState('');
    const [previewBooks, setPreviewBooks] = useState<PreviewBook[]>([]);
    const [batchCategory, setBatchCategory] = useState('Belytrystyka polska');

    const fetchBooks = useCallback(async () => {
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: search
            });
            const response = await fetch(`${API_BASE_URL}/api/books?${queryParams}`, { credentials: 'include' });
            const result = await response.json();
            setBooks(result.data || []);
            setTotalPages(result.meta?.totalPages || 1);
        } catch (error) {
            console.error('Error fetching books:', error);
        }
    }, [page, search]);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/');
        } else {
            fetchBooks();
        }
    }, [user, navigate, fetchBooks]);

    const handleEdit = useCallback((book: Book) => {
        setEditingBookId(book.id);
        setTitle(book.title);
        setAuthor(book.author);
        setCategory(book.category);
        setPublisher(book.publisher || '');
        setPublicationYear(book.publication_year || '');
        setIsbn(book.isbn || '');
        setDescription(book.description || '');
        setSignature(book.signature || '');
        setExistingCoverImage(book.cover_image || null);
        setActiveTab('single');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    // Handle deep link to edit a book
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const editId = params.get('editId');
        if (editId && user?.role === 'admin') {
            const fetchBookAndEdit = async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/books/${editId}`, { credentials: 'include' });
                    if (response.ok) {
                        const book = await response.json();
                        handleEdit(book);
                    }
                } catch (error) {
                    console.error('Error fetching book for edit:', error);
                }
            };
            fetchBookAndEdit();
        }
    }, [location.search, user, handleEdit]);

    const resetForm = () => {
        setEditingBookId(null);
        setTitle('');
        setAuthor('');
        setCategory('');
        setPublisher('');
        setPublicationYear('');
        setIsbn('');
        setDescription('');
        setSignature('');
        setCoverImage(null);
        setExistingCoverImage(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', title);
        formData.append('author', author);
        formData.append('category', category);
        formData.append('publisher', publisher);
        formData.append('publication_year', publicationYear);
        formData.append('isbn', isbn);
        formData.append('description', description);
        formData.append('signature', signature);
        if (coverImage) {
            formData.append('cover_image', coverImage);
        }

        const url = editingBookId
            ? `${API_BASE_URL}/api/admin/books/${editingBookId}`
            : `${API_BASE_URL}/api/admin/books`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            if (response.ok) {
                alert(editingBookId ? t('admin.book_form.success_update') : t('admin.book_form.success_add'));
                resetForm();
                fetchBooks();
                if (editingBookId) {
                    navigate('/admin'); // Clear query params
                }
            } else {
                const errorData = await response.json();
                alert(t('admin.book_form.error_save') + errorData.message);
            }
        } catch (error) {
            console.error('Error saving book:', error);
            alert(t('admin.book_form.error_save'));
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('admin.inventory.delete_confirm'))) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/books/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                fetchBooks();
            }
        } catch (error) {
            console.error('Error deleting book:', error);
        }
    };

    const handleBibtexProcess = () => {
        try {
            const parsed = parseBibTeX(bibtexText);
            const previewData: PreviewBook[] = parsed.map((b, index) => ({
                tempId: `temp-${Date.now()}-${index}`,
                title: b.title,
                author: b.author,
                category: batchCategory,
                publisher: b.publisher || '',
                publication_year: b.publication_year || '',
                isbn: b.isbn || '',
                description: b.description || '',
                selected: true
            }));
            setPreviewBooks(previewData);
        } catch (error) {
            alert(t('admin.bibtex.error_parse'));
            console.error(error);
        }
    };

    const handleImportSelected = async () => {
        const selected = previewBooks.filter(b => b.selected);
        if (selected.length === 0) {
            alert(t('admin.bibtex.error_import') + 'None selected');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/books/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ books: selected }),
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                alert(t('admin.bibtex.success_import', { count: result.count }));
                setPreviewBooks([]);
                setBibtexText('');
                fetchBooks();
            } else {
                const errorData = await response.json();
                alert(t('admin.bibtex.error_import') + errorData.message);
            }
        } catch (error) {
            console.error('Error importing books:', error);
            alert(t('admin.bibtex.error_import'));
        }
    };

    const handlePreviewBookChange = (tempId: string, field: keyof PreviewBook, value: string | number | boolean) => {
        setPreviewBooks(prev => prev.map(b => b.tempId === tempId ? { ...b, [field]: value } : b));
    };

    const toggleSelectAll = (selected: boolean) => {
        setPreviewBooks(prev => prev.map(b => ({ ...b, selected })));
    };

    return (
        <div className="flex-grow p-margin-mobile md:p-margin-desktop bg-surface flex flex-col gap-8">
            <h1 className="font-headline-lg text-headline-lg">{t('admin.dashboard_title')}</h1>

            <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
                <div className="flex border-b border-outline-variant mb-6 overflow-x-auto">
                    <button
                        onClick={() => { setActiveTab('single'); resetForm(); navigate('/admin'); }}
                        className={`px-6 py-3 font-label-lg transition-colors shrink-0 ${activeTab === 'single' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                        {editingBookId ? t('admin.tabs.edit') : t('admin.tabs.single')}
                    </button>
                    <button
                        onClick={() => setActiveTab('bibtex')}
                        className={`px-6 py-3 font-label-lg transition-colors shrink-0 ${activeTab === 'bibtex' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                        {t('admin.tabs.bibtex')}
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-3 font-label-lg transition-colors shrink-0 ${activeTab === 'users' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                        {t('admin.tabs.users')}
                    </button>
                    <button
                        onClick={() => setActiveTab('loans')}
                        className={`px-6 py-3 font-label-lg transition-colors shrink-0 ${activeTab === 'loans' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                        {t('admin.tabs.loans')}
                    </button>
                    <button
                        onClick={() => setActiveTab('pages')}
                        className={`px-6 py-3 font-label-lg transition-colors shrink-0 ${activeTab === 'pages' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                        {t('admin.tabs.pages')}
                    </button>
                </div>

                {activeTab === 'pages' ? (
                    <AdminPages />
                ) : activeTab === 'users' ? (
                    <AdminUsers />
                ) : activeTab === 'loans' ? (
                    <AdminLoans />
                ) : activeTab === 'single' ? (
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="font-label-md block mb-1">{t('admin.book_form.title')}</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} required className="w-full border border-outline-variant rounded p-2" />
                        </div>
                        <div>
                            <label className="font-label-md block mb-1">{t('admin.book_form.author')}</label>
                            <input value={author} onChange={e => setAuthor(e.target.value)} className="w-full border border-outline-variant rounded p-2" />
                        </div>
                        <div>
                            <label className="font-label-md block mb-1">{t('admin.book_form.category')}</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border border-outline-variant rounded p-2 bg-surface">
                                <option value="">{t('admin.book_form.select_category')}</option>
                                <option value="Auf Deutsch">{t('catalog.categories.deutsch')}</option>
                                <option value="Belytrystyka polska">{t('catalog.categories.belytrystyka_polska')}</option>
                                <option value="Belytrystyka zagraniczna">{t('catalog.categories.belytrystyka_zagraniczna')}</option>
                                <option value="Dziecięce">{t('catalog.categories.dzieciece')}</option>
                                <option value="Fantasy | Sci-fi">{t('catalog.categories.fantasy_scifi')}</option>
                                <option value="Historyczne">{t('catalog.categories.historyczne')}</option>
                                <option value="Kryminał | Thriller">{t('catalog.categories.kryminał_thriller')}</option>
                                <option value="Młodzieżowe | Young Adult">{t('catalog.categories.młodziezowe_young_adult')}</option>
                                <option value="Biografie">{t('catalog.categories.biografie')}</option>
                                <option value="Poezja">{t('catalog.categories.poezja')}</option>
                                <option value="Poradniki | Popularnonaukowe">{t('catalog.categories.poradniki_popularnonaukowe')}</option>
                                <option value="Reportaże | Podróżnicze">{t('catalog.categories.reportaze_podroznicze')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="font-label-md block mb-1">{t('admin.book_form.year')}</label>
                            <input value={publicationYear} onChange={e => setPublicationYear(e.target.value)} className="w-full border border-outline-variant rounded p-2" />
                        </div>
                        <div>
                            <label className="font-label-md block mb-1">{t('admin.book_form.publisher')}</label>
                            <input value={publisher} onChange={e => setPublisher(e.target.value)} className="w-full border border-outline-variant rounded p-2" />
                        </div>
                        <div>
                            <label className="font-label-md block mb-1">{t('admin.book_form.isbn')}</label>
                            <input value={isbn} onChange={e => setIsbn(e.target.value)} className="w-full border border-outline-variant rounded p-2" />
                        </div>
                        <div>
                            <label className="font-label-md block mb-1">{t('admin.book_form.signature')}</label>
                            <input value={signature} onChange={e => setSignature(e.target.value)} className="w-full border border-outline-variant rounded p-2" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="font-label-md block mb-1">{t('admin.book_form.description')}</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border border-outline-variant rounded p-2 h-24" />
                        </div>
                        <div>
                            <label className="font-label-md block mb-1">{t('admin.book_form.cover')}</label>
                            {existingCoverImage && !coverImage && (
                                <div className="mb-2">
                                    <p className="text-xs mb-1">{t('admin.book_form.current_cover')}:</p>
                                    <img src={`${API_BASE_URL}/${existingCoverImage}`} alt="Aktuelles Cover" className="h-20 w-auto rounded border" />
                                </div>
                            )}
                            <input type="file" onChange={e => setCoverImage(e.target.files ? e.target.files[0] : null)} className="w-full" />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2">
                            {editingBookId && (
                                <button type="button" onClick={() => { resetForm(); navigate('/admin'); }} className="border border-outline text-on-surface py-2 px-8 rounded-md hover:bg-surface-variant transition-colors font-label-md">
                                    {t('admin.book_form.cancel_btn')}
                                </button>
                            )}
                            <button type="submit" className="bg-primary text-on-primary py-2 px-8 rounded-md hover:bg-primary/90 transition-colors font-label-md shadow-sm">
                                {editingBookId ? t('admin.book_form.save_btn') : t('admin.book_form.add_btn')}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="flex flex-col gap-6">
                        <div>
                            <label className="font-label-md block mb-1">{t('admin.bibtex.batch_category')}</label>
                            <select
                                value={batchCategory}
                                onChange={e => setBatchCategory(e.target.value)}
                                className="w-full border border-outline-variant rounded p-2 bg-surface max-w-md"
                            >
                                <option value="Auf Deutsch">{t('catalog.categories.deutsch')}</option>
                                <option value="Belytrystyka polska">{t('catalog.categories.belytrystyka_polska')}</option>
                                <option value="Belytrystyka zagraniczna">{t('catalog.categories.belytrystyka_zagraniczna')}</option>
                                <option value="Dziecięce">{t('catalog.categories.dzieciece')}</option>
                                <option value="Fantasy | Sci-fi">{t('catalog.categories.fantasy_scifi')}</option>
                                <option value="Historyczne">{t('catalog.categories.historyczne')}</option>
                                <option value="Kryminał | Thriller">{t('catalog.categories.kryminał_thriller')}</option>
                                <option value="Młodzieżowe | Young Adult">{t('catalog.categories.młodziezowe_young_adult')}</option>
                                <option value="Biografie">{t('catalog.categories.biografie')}</option>
                                <option value="Poezja">{t('catalog.categories.poezja')}</option>
                                <option value="Poradniki | Popularnonaukowe">{t('catalog.categories.poradniki_popularnonaukowe')}</option>
                                <option value="Reportaże | Podróżnicze">{t('catalog.categories.reportaze_podroznicze')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-label-md block mb-1">{t('admin.bibtex.content_label')}</label>
                            <textarea
                                value={bibtexText}
                                onChange={e => setBibtexText(e.target.value)}
                                placeholder="@book{...}"
                                className="w-full border border-outline-variant rounded p-2 h-48 font-mono text-sm"
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={handleBibtexProcess}
                                className="bg-secondary text-on-secondary py-2 px-8 rounded-md hover:bg-secondary/90 transition-colors font-label-md shadow-sm cursor-pointer"
                            >
                                {t('admin.bibtex.parse_btn')}
                            </button>
                        </div>

                        {previewBooks.length > 0 && (
                            <div className="mt-8 border-t pt-8">
                                <h3 className="font-headline-sm text-headline-sm mb-4">{t('admin.bibtex.preview_title', { count: previewBooks.length })}</h3>
                                <div className="overflow-x-auto border border-outline-variant rounded-lg">
                                    <table className="w-full text-left border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className="bg-surface-container">
                                                <th className="p-2 border-b">
                                                    <input
                                                        type="checkbox"
                                                        checked={previewBooks.every(b => b.selected)}
                                                        onChange={(e) => toggleSelectAll(e.target.checked)}
                                                        className="w-4 h-4"
                                                    />
                                                </th>
                                                <th className="p-2 border-b font-label-sm">{t('admin.bibtex.col_title')}</th>
                                                <th className="p-2 border-b font-label-sm">{t('admin.bibtex.col_author')}</th>
                                                <th className="p-2 border-b font-label-sm">{t('admin.bibtex.col_category')}</th>
                                                <th className="p-2 border-b font-label-sm">{t('admin.bibtex.col_year')}</th>
                                                <th className="p-2 border-b font-label-sm">{t('admin.bibtex.col_isbn')}</th>
                                                <th className="p-2 border-b font-label-sm">{t('admin.bibtex.col_publisher_desc')}</th>
                                                <th className="p-2 border-b font-label-sm">{t('admin.bibtex.col_actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewBooks.map((book) => {
                                                const titleError = !book.title || book.title.trim() === '';
                                                return (
                                                    <tr key={book.tempId} className="hover:bg-surface-container-low">
                                                        <td className="p-2 border-b align-top">
                                                            <input
                                                                type="checkbox"
                                                                checked={book.selected}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'selected', e.target.checked)}
                                                                className="w-4 h-4"
                                                            />
                                                        </td>
                                                        <td className="p-2 border-b align-top">
                                                            <input
                                                                value={book.title}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'title', e.target.value)}
                                                                className={`w-full border rounded p-1 text-sm ${titleError ? 'border-error' : 'border-outline-variant'}`}
                                                            />
                                                            {titleError && (
                                                                <span className="text-[10px] text-error font-label-sm block mt-0.5">{t('admin.bibtex.title_required')}</span>
                                                            )}
                                                        </td>
                                                        <td className="p-2 border-b align-top">
                                                            <input
                                                                value={book.author}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'author', e.target.value)}
                                                                placeholder={t('admin.bibtex.col_author')}
                                                                className="w-full border border-outline-variant rounded p-1 text-sm"
                                                            />
                                                        </td>
                                                        <td className="p-2 border-b align-top">
                                                            <select
                                                                value={book.category}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'category', e.target.value)}
                                                                className="w-full border border-outline-variant rounded p-1 text-sm bg-surface"
                                                            >
                                                                <option value="Auf Deutsch">{t('catalog.categories.deutsch')}</option>
                                                                <option value="Belytrystyka polska">{t('catalog.categories.belytrystyka_polska')}</option>
                                                                <option value="Belytrystyka zagraniczna">{t('catalog.categories.belytrystyka_zagraniczna')}</option>
                                                                <option value="Dziecięce">{t('catalog.categories.dzieciece')}</option>
                                                                <option value="Fantasy | Sci-fi">{t('catalog.categories.fantasy_scifi')}</option>
                                                                <option value="Historyczne">{t('catalog.categories.historyczne')}</option>
                                                                <option value="Kryminał | Thriller">{t('catalog.categories.kryminał_thriller')}</option>
                                                                <option value="Młodzieżowe | Young Adult">{t('catalog.categories.młodziezowe_young_adult')}</option>
                                                                <option value="Biografie">{t('catalog.categories.biografie')}</option>
                                                                <option value="Poezja">{t('catalog.categories.poezja')}</option>
                                                                <option value="Poradniki | Popularnonaukowe">{t('catalog.categories.poradniki_popularnonaukowe')}</option>
                                                                <option value="Reportaże | Podróżnicze">{t('catalog.categories.reportaze_podroznicze')}</option>
                                                            </select>
                                                        </td>
                                                        <td className="p-2 border-b align-top">
                                                            <input
                                                                value={book.publication_year}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'publication_year', e.target.value)}
                                                                placeholder={t('admin.bibtex.col_year')}
                                                                className="w-full border border-outline-variant rounded p-1 text-sm text-center"
                                                            />
                                                        </td>
                                                        <td className="p-2 border-b align-top">
                                                            <input
                                                                value={book.isbn}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'isbn', e.target.value)}
                                                                placeholder={t('admin.bibtex.col_isbn')}
                                                                className="w-full border border-outline-variant rounded p-1 text-sm font-mono"
                                                            />
                                                        </td>
                                                        <td className="p-2 border-b align-top">
                                                            <div className="flex flex-col gap-1">
                                                                <input
                                                                    value={book.publisher}
                                                                    onChange={(e) => handlePreviewBookChange(book.tempId, 'publisher', e.target.value)}
                                                                    placeholder={t('admin.book_form.publisher')}
                                                                    className="w-full border border-outline-variant rounded p-1 text-xs"
                                                                />
                                                                <textarea
                                                                    value={book.description}
                                                                    onChange={(e) => handlePreviewBookChange(book.tempId, 'description', e.target.value)}
                                                                    placeholder={t('admin.book_form.description')}
                                                                    className="w-full border border-outline-variant rounded p-1 text-xs h-10 resize-y"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="p-2 border-b align-top text-center">
                                                            <button
                                                                onClick={() => setPreviewBooks(prev => prev.filter(b => b.tempId !== book.tempId))}
                                                                className="text-error hover:text-error/80 cursor-pointer p-1"
                                                                title={t('admin.bibtex.remove_tooltip')}
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
                                        {t('admin.bibtex.selected_info', { selected: previewBooks.filter(b => b.selected).length, total: previewBooks.length })}
                                    </span>
                                    <button
                                        onClick={handleImportSelected}
                                        className="bg-primary text-on-primary py-2.5 px-6 rounded-md hover:bg-primary/90 transition-colors font-label-md shadow-sm cursor-pointer"
                                    >
                                        {t('admin.bibtex.import_selected')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                    <h2 className="font-headline-md text-headline-md">{t('admin.inventory.title')}</h2>
                    <div className="relative max-w-sm w-full">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                        <input
                            type="text"
                            placeholder={t('admin.inventory.search_placeholder')}
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
                                <th className="p-2 font-label-md">{t('admin.inventory.col_signature')}</th>
                                <th className="p-2 font-label-md">{t('admin.inventory.col_title')}</th>
                                <th className="p-2 font-label-md">{t('admin.inventory.col_author')}</th>
                                <th className="p-2 font-label-md text-right">{t('admin.inventory.col_actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {books.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center text-on-surface-variant">{t('admin.inventory.no_books')}</td>
                                </tr>
                            ) : (
                                books.map(b => (
                                    <tr key={b.id} className="border-b hover:bg-surface-variant">
                                        <td className="p-2 font-body-sm whitespace-nowrap">{b.signature || b.id}</td>
                                        <td className="p-2 font-body-sm">{b.title}</td>
                                        <td className="p-2 font-body-sm">{b.author}</td>
                                        <td className="p-2 font-body-sm text-right whitespace-nowrap">
                                            <button onClick={() => handleEdit(b)} className="text-primary font-label-sm hover:underline mr-3">{t('admin.inventory.edit')}</button>
                                            <button onClick={() => handleDelete(b.id)} className="text-error font-label-sm hover:underline">{t('admin.inventory.delete')}</button>
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
                        <span className="text-body-sm">{t('admin.inventory.pagination_info', { page, totalPages })}</span>
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
