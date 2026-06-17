import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { parseBibTeX } from '../utils/bibtexParser';
import AdminPages from './AdminPages';
import { API_BASE_URL } from "../config";

interface Book {
    id: number;
    title: string;
    author: string;
    category: string;
    signature?: string;
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
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [books, setBooks] = useState<Book[]>([]);
    
    // Tab state
    const [activeTab, setActiveTab] = useState<'single' | 'bibtex' | 'pages'>('single');
    
    // Form state
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [category, setCategory] = useState('');
    const [publisher, setPublisher] = useState('');
    const [publicationYear, setPublicationYear] = useState('');
    const [isbn, setIsbn] = useState('');
    const [description, setDescription] = useState('');
    const [coverImage, setCoverImage] = useState<File | null>(null);

    // BibTeX Import State
    const [bibtexText, setBibtexText] = useState('');
    const [previewBooks, setPreviewBooks] = useState<PreviewBook[]>([]);
    const [batchCategory, setBatchCategory] = useState('Belytrystyka polska');

    const fetchBooks = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/books`);
            const data = await response.json();
            setBooks((data.data || []).slice(0, 100)); // Show last 100 for brevity
        } catch (error) {
            console.error('Error fetching books:', error);
        }
    }, []);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/');
        } else {
            fetchBooks();
        }
    }, [user, navigate, fetchBooks]);

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
        if (coverImage) {
            formData.append('cover_image', coverImage);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/books`, {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                alert('Buch erfolgreich hinzugefügt!');
                setTitle('');
                setAuthor('');
                setCategory('');
                setPublisher('');
                setPublicationYear('');
                setIsbn('');
                setDescription('');
                setCoverImage(null);
                fetchBooks();
            }
        } catch (error) {
            console.error('Error adding book:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Buch wirklich löschen?')) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/books/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                fetchBooks();
            }
        } catch (error) {
            console.error('Error deleting book:', error);
        }
    };

    const handleParseBibTeX = () => {
        try {
            const parsed = parseBibTeX(bibtexText);
            const previewData: PreviewBook[] = parsed.map((b) => ({
                tempId: Math.random().toString(36).substr(2, 9),
                title: b.title || '',
                author: b.author || '',
                publisher: b.publisher || '',
                publication_year: b.publication_year || '',
                isbn: b.isbn || '',
                description: b.description || '',
                category: batchCategory,
                selected: true
            }));
            setPreviewBooks(previewData);
        } catch (_) {
            alert('Fehler beim Parsen der BibTeX-Daten. Bitte Format prüfen.');
        }
    };

    const handleImportSelected = async () => {
        const selected = previewBooks.filter(b => b.selected);
        if (selected.length === 0) {
            alert('Bitte wählen Sie mindestens ein Buch aus.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/books/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ books: selected })
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Erfolgreich ${result.count} Bücher importiert!`);
                setPreviewBooks([]);
                setBibtexText('');
                fetchBooks();
            } else {
                const errorData = await response.json();
                alert('Fehler beim Import: ' + errorData.message);
            }
        } catch (error) {
            console.error('Error importing books:', error);
            alert('Ein Netzwerkfehler ist aufgetreten.');
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
            <h1 className="font-headline-lg text-headline-lg">Admin Dashboard</h1>

            <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
                <div className="flex border-b border-outline-variant mb-6">
                    <button
                        onClick={() => setActiveTab('single')}
                        className={`px-6 py-3 font-label-lg transition-colors ${activeTab === 'single' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                        Einzelnes Buch
                    </button>
                    <button
                        onClick={() => setActiveTab('bibtex')}
                        className={`px-6 py-3 font-label-lg transition-colors ${activeTab === 'bibtex' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                        BibTeX Import
                    </button>
                    <button
                        onClick={() => setActiveTab('pages')}
                        className={`px-6 py-3 font-label-lg transition-colors ${activeTab === 'pages' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                        Seiten bearbeiten
                    </button>
                </div>

                {activeTab === 'pages' ? (
                    <AdminPages />
                ) : activeTab === 'single' ? (
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="font-label-md block mb-1">Titel</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} required className="w-full border border-outline-variant rounded p-2" />
                        </div>
                        <div>
                            <label className="font-label-md block mb-1">Autor</label>
                            <input value={author} onChange={e => setAuthor(e.target.value)} className="w-full border border-outline-variant rounded p-2" />
                        </div>
                        <div>
                            <label className="font-label-md block mb-1">Kategorie</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border border-outline-variant rounded p-2 bg-surface">
                                <option value="">Wähle eine Kategorie</option>
                                <option value="Auf Deutsch">Auf Deutsch</option>
                                <option value="Belytrystyka polska">Polnische Belletristik</option>
                                <option value="Belytrystyka zagraniczna">Internationale Belletristik</option>
                                <option value="Dziecięce">Kinder & Jugend</option>
                                <option value="Fantasy | Sci-fi">Fantasy & Sci-fi</option>
                                <option value="Historyczne">Historische Romane</option>
                                <option value="Kryminał | Thriller">Krimi & Thriller</option>
                                <option value="Młodzieżowe | Young Adult">Młodzieżowe | Young Adult</option>
                                <option value="Biografie">Biografien</option>
                                <option value="Poezja">Lyrik & Poesie</option>
                                <option value="Poradniki | Popularnonaukowe">Ratgeber & Sachbücher</option>
                                <option value="Reportaże | Podróżnicze">Reportagen & Reisen</option>
                            </select>
                        </div>
                        <div>
                            <label className="font-label-md block mb-1">Jahr</label>
                            <input value={publicationYear} onChange={e => setPublicationYear(e.target.value)} className="w-full border border-outline-variant rounded p-2" />
                        </div>
                        <div>
                            <label className="font-label-md block mb-1">Verlag</label>
                            <input value={publisher} onChange={e => setPublisher(e.target.value)} className="w-full border border-outline-variant rounded p-2" />
                        </div>
                        <div>
                            <label className="font-label-md block mb-1">ISBN</label>
                            <input value={isbn} onChange={e => setIsbn(e.target.value)} className="w-full border border-outline-variant rounded p-2" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="font-label-md block mb-1">Beschreibung</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border border-outline-variant rounded p-2 h-24" />
                        </div>
                        <div>
                            <label className="font-label-md block mb-1">Cover Bild</label>
                            <input type="file" onChange={e => setCoverImage(e.target.files ? e.target.files[0] : null)} className="w-full" />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <button type="submit" className="bg-primary text-on-primary py-2 px-8 rounded-md hover:bg-primary/90 transition-colors font-label-md shadow-sm">
                                Buch hinzufügen
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="flex flex-col gap-6">
                        <div>
                            <label className="font-label-md block mb-1">Gemeinsame Kategorie für diesen Import</label>
                            <select
                                value={batchCategory}
                                onChange={e => setBatchCategory(e.target.value)}
                                className="w-full border border-outline-variant rounded p-2 bg-surface max-w-md"
                            >
                                <option value="Auf Deutsch">Auf Deutsch</option>
                                <option value="Belytrystyka polska">Polnische Belletristik</option>
                                <option value="Belytrystyka zagraniczna">Internationale Belletristik</option>
                                <option value="Dziecięce">Kinder & Jugend</option>
                                <option value="Fantasy | Sci-fi">Fantasy & Sci-fi</option>
                                <option value="Historyczne">Historische Romane</option>
                                <option value="Kryminał | Thriller">Krimi & Thriller</option>
                                <option value="Młodzieżowe | Young Adult">Młodzieżowe | Young Adult</option>
                                <option value="Biografie">Biografien</option>
                                <option value="Poezja">Lyrik & Poesie</option>
                                <option value="Poradniki | Popularnonaukowe">Ratgeber & Sachbücher</option>
                                <option value="Reportaże | Podróżnicze">Reportagen & Reisen</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-label-md block mb-1">BibTeX Daten einfügen</label>
                            <textarea
                                value={bibtexText}
                                onChange={e => setBibtexText(e.target.value)}
                                placeholder="@book{key, title={...}, author={...}, ...}"
                                className="w-full border border-outline-variant rounded p-3 h-48 font-mono text-sm"
                            />
                            <button
                                onClick={handleParseBibTeX}
                                className="mt-2 bg-secondary text-on-secondary py-2 px-6 rounded-md hover:bg-secondary/90 transition-colors font-label-md"
                            >
                                Parsen & Vorschau
                            </button>
                        </div>

                        {previewBooks.length > 0 && (
                            <div className="mt-4 border-t pt-6">
                                <h3 className="font-headline-sm text-headline-sm mb-4">Vorschau & Bearbeitung ({previewBooks.length} Bücher)</h3>

                                <div className="mb-4 flex items-center gap-4">
                                    <button
                                        onClick={() => toggleSelectAll(true)}
                                        className="text-primary font-label-sm hover:underline"
                                    >
                                        Alle auswählen
                                    </button>
                                    <button
                                        onClick={() => toggleSelectAll(false)}
                                        className="text-primary font-label-sm hover:underline"
                                    >
                                        Keines auswählen
                                    </button>
                                </div>

                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="w-full text-left border-collapse min-w-[1000px]">
                                        <thead>
                                            <tr className="bg-surface-container-low border-b border-outline-variant">
                                                <th className="p-2 font-label-sm w-10"></th>
                                                <th className="p-2 font-label-sm w-[30%]">Titel</th>
                                                <th className="p-2 font-label-sm w-[20%]">Autor</th>
                                                <th className="p-2 font-label-sm w-[15%]">Kategorie</th>
                                                <th className="p-2 font-label-sm w-20 text-center">Jahr</th>
                                                <th className="p-2 font-label-sm w-40">ISBN</th>
                                                <th className="p-2 font-label-sm">Details</th>
                                                <th className="p-2 font-label-sm w-12 text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-outline-variant">
                                            {previewBooks.map((book) => {
                                                const isTitleEmpty = !book.title.trim();
                                                return (
                                                    <tr key={book.tempId} className={`hover:bg-surface-variant/30 ${isTitleEmpty ? 'bg-error-container/10' : ''}`}>
                                                        <td className="p-2 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={book.selected}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'selected', e.target.checked)}
                                                                className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                value={book.title}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'title', e.target.value)}
                                                                placeholder="Titel (erforderlich)"
                                                                className={`w-full border rounded p-1 text-sm ${isTitleEmpty ? 'border-error bg-error-container/5' : 'border-outline-variant'}`}
                                                            />
                                                            {isTitleEmpty && (
                                                                <span className="text-[10px] text-error font-label-sm block mt-0.5">Titel ist erforderlich</span>
                                                            )}
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                value={book.author}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'author', e.target.value)}
                                                                placeholder="Autor"
                                                                className="w-full border border-outline-variant rounded p-1 text-sm"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <select
                                                                value={book.category}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'category', e.target.value)}
                                                                className="w-full border border-outline-variant rounded p-1 text-sm bg-surface"
                                                            >
                                                                <option value="Auf Deutsch">Auf Deutsch</option>
                                                                <option value="Belytrystyka polska">Polnische Belletristik</option>
                                                                <option value="Belytrystyka zagraniczna">Internationale Belletristik</option>
                                                                <option value="Dziecięce">Kinder & Jugend</option>
                                                                <option value="Fantasy | Sci-fi">Fantasy & Sci-fi</option>
                                                                <option value="Historyczne">Historische Romane</option>
                                                                <option value="Kryminał | Thriller">Krimi & Thriller</option>
                                                                <option value="Młodzieżowe | Young Adult">Młodzieżowe | Young Adult</option>
                                                                <option value="Biografie">Biografien</option>
                                                                <option value="Poezja">Lyrik & Poesie</option>
                                                                <option value="Poradniki | Popularnonaukowe">Ratgeber & Sachbücher</option>
                                                                <option value="Reportaże | Podróżnicze">Reportagen & Reisen</option>
                                                            </select>
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                value={book.publication_year}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'publication_year', e.target.value)}
                                                                placeholder="Jahr"
                                                                className="w-full border border-outline-variant rounded p-1 text-sm text-center"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                value={book.isbn}
                                                                onChange={(e) => handlePreviewBookChange(book.tempId, 'isbn', e.target.value)}
                                                                placeholder="ISBN"
                                                                className="w-full border border-outline-variant rounded p-1 text-sm font-mono"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <div className="flex flex-col gap-1">
                                                                <input
                                                                    value={book.publisher}
                                                                    onChange={(e) => handlePreviewBookChange(book.tempId, 'publisher', e.target.value)}
                                                                    placeholder="Verlag"
                                                                    className="w-full border border-outline-variant rounded p-1 text-xs"
                                                                />
                                                                <textarea
                                                                    value={book.description}
                                                                    onChange={(e) => handlePreviewBookChange(book.tempId, 'description', e.target.value)}
                                                                    placeholder="Beschreibung"
                                                                    className="w-full border border-outline-variant rounded p-1 text-xs h-10 resize-y"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button
                                                                onClick={() => setPreviewBooks(prev => prev.filter(b => b.tempId !== book.tempId))}
                                                                className="text-error hover:text-error/80 cursor-pointer p-1"
                                                                title="Aus Liste entfernen"
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
                                        {previewBooks.filter(b => b.selected).length} von {previewBooks.length} Büchern ausgewählt
                                    </span>
                                    <button
                                        onClick={handleImportSelected}
                                        className="bg-primary text-on-primary py-2.5 px-6 rounded-md hover:bg-primary/90 transition-colors font-label-md shadow-sm cursor-pointer"
                                    >
                                        Ausgewählte importieren
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
                <h2 className="font-headline-md text-headline-md mb-4">Buchbestand (Letzte 100)</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 font-label-md">Signatur</th>
                                <th className="p-2 font-label-md">Titel</th>
                                <th className="p-2 font-label-md">Autor</th>
                                <th className="p-2 font-label-md">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {books.map(b => (
                                <tr key={b.id} className="border-b hover:bg-surface-variant">
                                    <td className="p-2 font-body-sm">{b.signature || b.id}</td>
                                    <td className="p-2 font-body-sm">{b.title}</td>
                                    <td className="p-2 font-body-sm">{b.author}</td>
                                    <td className="p-2 font-body-sm">
                                        <button onClick={() => handleDelete(b.id)} className="text-error font-label-sm hover:underline">Löschen</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Admin;
