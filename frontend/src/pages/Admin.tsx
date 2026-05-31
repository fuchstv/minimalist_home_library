import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

interface Book {
    id: number;
    title: string;
    author: string;
    category: string;
}

import { API_BASE_URL } from "../config";

const Admin: React.FC = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [books, setBooks] = useState<Book[]>([]);
    
    // Form state
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [category, setCategory] = useState('');
    const [publisher, setPublisher] = useState('');
    const [publicationYear, setPublicationYear] = useState('');
    const [isbn, setIsbn] = useState('');
    const [description, setDescription] = useState('');
    const [coverImage, setCoverImage] = useState<File | null>(null);

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

    if (!user || user.role !== 'admin') return null;

    return (
        <div className="flex-grow flex flex-col p-margin-mobile md:p-margin-desktop bg-surface max-w-container-max-width mx-auto w-full gap-8">
            <h1 className="font-display-lg text-display-lg text-on-surface">Admin Dashboard</h1>
            
            <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
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
                        <input value={category} onChange={e=>setCategory(e.target.value)} className="w-full border rounded p-2" />
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

            <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
                <h2 className="font-headline-md text-headline-md mb-4">Buchbestand (Letzte 100)</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 font-label-md">ID</th>
                                <th className="p-2 font-label-md">Titel</th>
                                <th className="p-2 font-label-md">Autor</th>
                                <th className="p-2 font-label-md">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {books.map(b => (
                                <tr key={b.id} className="border-b hover:bg-surface-variant">
                                    <td className="p-2 font-body-sm">{b.id}</td>
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
