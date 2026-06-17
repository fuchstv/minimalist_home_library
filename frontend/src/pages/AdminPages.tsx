import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface PageData {
    slug: string;
    title_de: string;
    title_pl: string;
    content_de: string;
    content_pl: string;
}

const AdminPages: React.FC = () => {
    const [pages, setPages] = useState<PageData[]>([]);
    const [selectedPage, setSelectedPage] = useState<PageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL || '/api'}/admin/pages`, { withCredentials: true });
            setPages(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching pages:', error);
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedPage) return;
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || '/api'}/admin/pages/${selectedPage.slug}`, selectedPage, { withCredentials: true });
            setMessage('Seite erfolgreich gespeichert!');
            fetchPages();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error saving page:', error);
            setMessage('Fehler beim Speichern.');
        }
    };

    if (loading) return <div>Laden...</div>;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-4">
                {pages.map(page => (
                    <button
                        key={page.slug}
                        onClick={() => setSelectedPage(page)}
                        className={`px-4 py-2 rounded-md font-label-md transition-colors ${selectedPage?.slug === page.slug ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'}`}
                    >
                        {page.title_de}
                    </button>
                ))}
            </div>

            {selectedPage && (
                <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm flex flex-col gap-4">
                    <h2 className="font-headline-sm text-headline-sm mb-2">Seite bearbeiten: {selectedPage.slug}</h2>

                    {message && (
                        <div className={`p-3 rounded text-body-sm ${message.includes('Fehler') ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'}`}>
                            {message}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-4">
                            <h3 className="font-title-md border-b pb-1">Deutsch</h3>
                            <div>
                                <label className="font-label-sm block mb-1">Titel (DE)</label>
                                <input
                                    type="text"
                                    value={selectedPage.title_de}
                                    onChange={e => setSelectedPage({ ...selectedPage, title_de: e.target.value })}
                                    className="w-full border border-outline-variant rounded p-2 text-body-md"
                                />
                            </div>
                            <div>
                                <label className="font-label-sm block mb-1">Inhalt (DE)</label>
                                <textarea
                                    value={selectedPage.content_de}
                                    onChange={e => setSelectedPage({ ...selectedPage, content_de: e.target.value })}
                                    className="w-full border border-outline-variant rounded p-2 text-body-md h-64 font-mono"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <h3 className="font-title-md border-b pb-1">Polnisch</h3>
                            <div>
                                <label className="font-label-sm block mb-1">Titel (PL)</label>
                                <input
                                    type="text"
                                    value={selectedPage.title_pl}
                                    onChange={e => setSelectedPage({ ...selectedPage, title_pl: e.target.value })}
                                    className="w-full border border-outline-variant rounded p-2 text-body-md"
                                />
                            </div>
                            <div>
                                <label className="font-label-sm block mb-1">Inhalt (PL)</label>
                                <textarea
                                    value={selectedPage.content_pl}
                                    onChange={e => setSelectedPage({ ...selectedPage, content_pl: e.target.value })}
                                    className="w-full border border-outline-variant rounded p-2 text-body-md h-64 font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={handleSave}
                            className="bg-primary text-on-primary py-2.5 px-8 rounded-full hover:bg-primary/90 transition-colors font-label-md shadow-sm"
                        >
                            Speichern
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPages;
