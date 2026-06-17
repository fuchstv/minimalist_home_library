import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { parseBibTeX } from '../utils/bibtexParser';

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

import { API_BASE_URL } from "../config";

const Admin: React.FC = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [books, setBooks] = useState<Book[]>([]);
    
    // Tab state
    const [activeTab, setActiveTab] = useState<'single' | 'bibtex'>('single');
    
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

    const fetchBooks = async () => {
        const res = await fetch(`${API_BASE_URL}/api/books?limit=100`);
        if (res.ok) {
            const data = await res.json();
            setBooks(data.data || []);
        }
    };

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/');
        } else {
            fetchBooks();
        }
    }, [user, navigate]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setCoverImage(e.target.files[0]);
        }
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
        if (coverImage) {
            formData.append('cover_image', coverImage);
        }

        const res = await fetch(`${API_BASE_URL}/api/admin/books`, {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            alert('Buch erfolgreich angelegt!');
            // Reset form
            setTitle(''); setAuthor(''); setCategory(''); setPublisher(''); 
            setPublicationYear(''); setIsbn(''); setDescription(''); setCoverImage(null);
            fetchBooks();
        } else {
            alert('Fehler beim Anlegen');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Buch wirklich löschen?')) {
            const res = await fetch(`${API_BASE_URL}/api/admin/books/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchBooks();
            }
        }
    };

    const handleParse = () => {
        if (!bibtexText.trim()) {
            alert('Bitte BibTeX-Text eingeben.');
            return;
        }
        try {
            const parsed = parseBibTeX(bibtexText);
            if (parsed.length === 0) {
                alert('Keine gültigen BibTeX-Einträge gefunden.');
                return;
            }
            const mapped: PreviewBook[] = parsed.map((b, idx) => ({
                tempId: `${Date.now()}-${idx}-${Math.random()}`,
                title: b.title || '',
                author: b.author || '',
                category: b.category || 'Belytrystyka polska',
                publisher: b.publisher || '',
                publication_year: b.publication_year || '',
                isbn: b.isbn || '',
                description: b.description || '',
                selected: true
            }));
            setPreviewBooks(mapped);
        } catch (err) {
            alert('Fehler beim Parsen der BibTeX-Daten.');
        }
    };

    const handleBibtexFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                if (text) {
                    setBibtexText(text);
                    try {
                        const parsed = parseBibTeX(text);
                        if (parsed.length > 0) {
                            const mapped: PreviewBook[] = parsed.map((b, idx) => ({
                                tempId: `${Date.now()}-${idx}-${Math.random()}`,
                                title: b.title || '',
                                author: b.author || '',
                                category: b.category || 'Belytrystyka polska',
                                publisher: b.publisher || '',
                                publication_year: b.publication_year || '',
                                isbn: b.isbn || '',
                                description: b.description || '',
                                selected: true
                            }));
                            setPreviewBooks(mapped);
                        } else {
                            alert('Keine gültigen BibTeX-Einträge in der Datei gefunden.');
                        }
                    } catch (err) {
                        alert('Fehler beim Parsen der Datei.');
                    }
                }
            };
            reader.readAsText(file);
        }
    };

    const handlePreviewBookChange = (tempId: string, field: keyof PreviewBook, value: any) => {
        setPreviewBooks(prev => prev.map(b => b.tempId === tempId ? { ...b, [field]: value } : b));
    };

    const handleApplyBatchCategory = () => {
        setPreviewBooks(prev => prev.map(b => b.selected ? { ...b, category: batchCategory } : b));
    };

    const handleImportSelected = async () => {
        const selectedBooks = previewBooks.filter(b => b.selected);
        if (selectedBooks.length === 0) {
            alert('Bitte mindestens ein Buch auswählen.');
            return;
        }

        const invalidBook = selectedBooks.find(b => !b.title.trim());
        if (invalidBook) {
            alert('Alle ausgewählten Bücher müssen einen Titel haben.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/books/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    books: selectedBooks.map(b => ({
                        title: b.title,
                        author: b.author,
                        category: b.category,
                        publisher: b.publisher,
                        publication_year: b.publication_year,
                        isbn: b.isbn,
                        description: b.description
                    }))
                })
            });

            if (res.ok) {
                const data = await res.json();
                alert(`${data.count} Bücher erfolgreich importiert!`);
                setPreviewBooks([]);
                setBibtexText('');
                fetchBooks();
            } else {
                const data = await res.json();
                alert('Fehler beim Importieren: ' + (data.message || 'Serverfehler'));
            }
        } catch (err) {
            alert('Netzwerkfehler beim Importieren.');
        }
    };

    if (!user || user.role !== 'admin') return null;

    return (
        <div className="flex-grow flex flex-col p-margin-mobile md:p-margin-desktop bg-surface max-w-container-max-width mx-auto w-full gap-8">
            <h1 className="font-display-lg text-display-lg text-on-surface">Admin Dashboard</h1>
            {/* Tabs */}
            <div className="flex border-b border-outline-variant gap-4 mb-2">
                <button
                    onClick={() => setActiveTab('single')}
                    className={`pb-2 px-1 font-label-md transition-colors border-b-2 cursor-pointer ${
                        activeTab === 'single'
                            ? 'border-primary text-primary font-bold'
                            : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                    Einzelnes Buch anlegen
                </button>
                <button
                    onClick={() => setActiveTab('bibtex')}
                    className={`pb-2 px-1 font-label-md transition-colors border-b-2 cursor-pointer ${
                        activeTab === 'bibtex'
                            ? 'border-primary text-primary font-bold'
                            : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                    Bücher via BibTeX importieren
                </button>
            </div>

            {activeTab === 'single' ? (
                <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm transition-all duration-300">
                    <h2 className="font-headline-md text-headline-md mb-4">Neues Buch anlegen</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="font-label-sm block mb-1">Titel</label>
                            <input required value={title} onChange={e=>setTitle(e.target.value)} className="w-full border rounded p-2" />
                        </div>
                        <div>
                            <label className="font-label-sm block mb-1">Autor</label>
                            <input required value={author} onChange={e=>setAuthor(e.target.value)} className="w-full border rounded p-2" />
                        </div>
                        <div>
                            <label className="font-label-sm block mb-1">Kategorie</label>
                            <select required value={category} onChange={e=>setCategory(e.target.value)} className="w-full border rounded p-2 bg-surface"><option value="">Kategorie wählen</option><option value="Auf Deutsch">Auf Deutsch</option><option value="Belytrystyka polska">Polnische Belletristik</option><option value="Belytrystyka zagraniczna">Internationale Belletristik</option><option value="Dziecięce">Kinder & Jugend</option><option value="Fantasy | Sci-fi">Fantasy & Sci-fi</option><option value="Historyczne">Historische Romane</option><option value="Kryminał | Thriller">Krimi & Thriller</option><option value="Młodzieżowe | Young Adult">Młodzieżowe | Young Adult</option><option value="Biografie">Biografien</option><option value="Poezja">Lyrik & Poesie</option><option value="Poradniki | Popularnonaukowe">Ratgeber & Sachbücher</option><option value="Reportaże | Podróżnicze">Reportagen & Reisen</option></select>
                        </div>
                        <div>
                            <label className="font-label-sm block mb-1">Verlag</label>
                            <input value={publisher} onChange={e=>setPublisher(e.target.value)} className="w-full border rounded p-2" />
                        </div>
                        <div>
                            <label className="font-label-sm block mb-1">Erscheinungsjahr</label>
                            <input value={publicationYear} onChange={e=>setPublicationYear(e.target.value)} className="w-full border rounded p-2" />
                        </div>
                        <div>
                            <label className="font-label-sm block mb-1">ISBN</label>
                            <input value={isbn} onChange={e=>setIsbn(e.target.value)} className="w-full border rounded p-2" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="font-label-sm block mb-1">Beschreibung</label>
                            <textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full border rounded p-2 h-24" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="font-label-sm block mb-1">Cover Bild</label>
                            <input type="file" accept="image/*" onChange={handleFileChange} className="w-full border rounded p-2" />
                        </div>
                        <div className="md:col-span-2">
                            <button type="submit" className="bg-primary text-on-primary py-2 px-6 rounded-md hover:bg-primary/90">Speichern</button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm transition-all duration-300 flex flex-col gap-6">
                    <div>
                        <h2 className="font-headline-md text-headline-md mb-2">Bücher via BibTeX importieren</h2>
                        <p className="text-on-surface-variant text-body-sm mb-4">
                            Kopiere BibTeX-Einträge in das Textfeld unten oder lade eine <code>.bib</code>-Datei hoch, um die Bücher zu parsen.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col">
                            <label className="font-label-sm block mb-1">BibTeX-Text einfügen</label>
                            <textarea
                                value={bibtexText}
                                onChange={(e) => setBibtexText(e.target.value)}
                                placeholder={`@book{key,
  title = {Buchtitel},
  author = {Autor},
  year = {2026},
  publisher = {Verlag}
}`}
                                className="w-full border rounded p-3 h-48 font-mono text-sm bg-surface-container-low focus:bg-surface focus:outline-primary"
                            />
                        </div>
                        <div className="flex flex-col justify-between p-4 border border-dashed rounded-lg border-outline-variant bg-surface-container-low/50">
                            <div>
                                <h3 className="font-title-sm mb-2">Alternativ: Datei hochladen</h3>
                                <p className="text-body-sm text-on-surface-variant mb-4">Wähle eine <code>.bib</code>-Datei von deinem Computer aus.</p>
                                <input
                                    type="file"
                                    accept=".bib,text/plain"
                                    onChange={handleBibtexFileChange}
                                    className="w-full border rounded p-2 bg-surface"
                                />
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={handleParse}
                                    className="bg-primary text-on-primary py-2 px-6 rounded-md hover:bg-primary/90 transition-colors font-label-md cursor-pointer"
                                >
                                    Einträge parsen
                                </button>
                                {previewBooks.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setPreviewBooks([]);
                                            setBibtexText('');
                                        }}
                                        className="border border-outline text-on-surface py-2 px-4 rounded-md hover:bg-surface-variant transition-colors font-label-md cursor-pointer"
                                    >
                                        Zurücksetzen
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {previewBooks.length > 0 && (
                        <div className="border-t border-outline-variant pt-6 mt-4 flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low p-4 rounded-lg">
                                <div>
                                    <h3 className="font-headline-sm text-headline-sm">Geparste Bücher ({previewBooks.length})</h3>
                                    <p className="text-body-sm text-on-surface-variant">
                                        Überprüfe und bearbeite die Einträge vor dem Import. Nur ausgewählte Zeilen werden importiert.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="font-label-sm whitespace-nowrap">Kategorie für Ausgewählte:</label>
                                    <select
                                        value={batchCategory}
                                        onChange={(e) => setBatchCategory(e.target.value)}
                                        className="border rounded p-2 bg-surface text-sm"
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
                                    <button
                                        onClick={handleApplyBatchCategory}
                                        className="bg-secondary text-on-secondary py-2 px-4 rounded-md hover:bg-secondary/90 transition-colors text-sm font-label-md cursor-pointer"
                                    >
                                        Zuweisen
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto border rounded-lg border-outline-variant max-h-96 overflow-y-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead className="bg-surface-container-high sticky top-0 z-10">
                                        <tr className="border-b border-outline-variant">
                                            <th className="p-3 w-12 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={previewBooks.every(b => b.selected)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setPreviewBooks(prev => prev.map(b => ({ ...b, selected: checked })));
                                                    }}
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                            </th>
                                            <th className="p-3 text-sm font-label-md w-1/4">Titel *</th>
                                            <th className="p-3 text-sm font-label-md w-1/5">Autor</th>
                                            <th className="p-3 text-sm font-label-md w-1/5">Kategorie</th>
                                            <th className="p-3 text-sm font-label-md w-24">Jahr</th>
                                            <th className="p-3 text-sm font-label-md w-32">ISBN</th>
                                            <th className="p-3 text-sm font-label-md">Beschreibung & Verlag</th>
                                            <th className="p-3 w-12 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant bg-surface">
                                        {previewBooks.map((book) => {
                                            const isTitleEmpty = !book.title.trim();
                                            return (
                                                <tr
                                                    key={book.tempId}
                                                    className={`hover:bg-surface-container-lowest transition-colors ${
                                                        !book.selected ? 'opacity-60 bg-surface-container-low/20' : ''
                                                    } ${isTitleEmpty ? 'bg-error-container/10' : ''}`}
                                                >
                                                    <td className="p-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={book.selected}
                                                            onChange={(e) => handlePreviewBookChange(book.tempId, 'selected', e.target.checked)}
                                                            className="w-4 h-4 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            required
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
