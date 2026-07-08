import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from '../utils/api';
import { API_BASE_URL } from '../config';
import { AuthContext } from '../context/AuthContext';

interface PageData {
    slug: string;
    title_de: string;
    title_pl: string;
    content_de: string;
    content_pl: string;
}

const DynamicPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { i18n } = useTranslation();
    const { user } = useContext(AuthContext);

    const [page, setPage] = useState<PageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Edit states
    const [isEditing, setIsEditing] = useState(false);
    const [editTitleDe, setEditTitleDe] = useState('');
    const [editTitlePl, setEditTitlePl] = useState('');
    const [editContentDe, setEditContentDe] = useState('');
    const [editContentPl, setEditContentPl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchPage = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${API_BASE_URL}/api/pages/${slug}`);
                setPage(response.data);
                if (response.data) {
                    setEditTitleDe(response.data.title_de || '');
                    setEditTitlePl(response.data.title_pl || '');
                    setEditContentDe(response.data.content_de || '');
                    setEditContentPl(response.data.content_pl || '');
                }
                setError(null);
            } catch (err) {
                console.error('Error fetching page:', err);
                setError('Page not found');
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            fetchPage();
            setIsEditing(false);
            setMessage('');
        }
    }, [slug]);

    const handleSave = async () => {
        if (!slug) return;
        setIsSaving(true);
        setMessage('');
        try {
            await axios.post(
                `${API_BASE_URL}/api/admin/pages/${slug}`,
                {
                    slug,
                    title_de: editTitleDe,
                    title_pl: editTitlePl,
                    content_de: editContentDe,
                    content_pl: editContentPl
                },
                { withCredentials: true }
            );

            // Update local state
            setPage({
                slug,
                title_de: editTitleDe,
                title_pl: editTitlePl,
                content_de: editContentDe,
                content_pl: editContentPl
            });

            setMessage('Seite erfolgreich gespeichert!');
            setIsEditing(false);
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error('Error saving page:', err);
            setMessage('Fehler beim Speichern der Seite.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (page) {
            setEditTitleDe(page.title_de || '');
            setEditTitlePl(page.title_pl || '');
            setEditContentDe(page.content_de || '');
            setEditContentPl(page.content_pl || '');
        }
        setIsEditing(false);
        setMessage('');
    };

    if (loading) {
        return (
            <div className="flex-grow flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="flex-grow flex items-center justify-center p-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-error mb-2">404</h1>
                    <p className="text-on-surface-variant">Page not found</p>
                </div>
            </div>
        );
    }

    const currentLang = i18n.language.split('-')[0]; // 'de' or 'pl'
    const title = currentLang === 'pl' ? page.title_pl : page.title_de;
    const content = currentLang === 'pl' ? page.content_pl : page.content_de;

    if (isEditing) {
        return (
            <div className="flex-grow p-margin-mobile md:p-margin-desktop bg-surface">
                <div className="max-w-5xl mx-auto bg-surface-container-lowest p-6 md:p-8 rounded-lg border border-outline-variant shadow-sm flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant pb-4 gap-4">
                        <div>
                            <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider">Editor</span>
                            <h1 className="font-headline-md text-headline-md text-on-surface">Seite bearbeiten: {slug}</h1>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                className="px-5 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors font-label-md rounded-full shadow-sm cursor-pointer"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-primary text-on-primary py-2.5 px-6 rounded-full hover:bg-primary/95 disabled:opacity-50 transition-colors font-label-md shadow-sm cursor-pointer"
                            >
                                {isSaving ? 'Speichert...' : 'Speichern'}
                            </button>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-md text-body-sm shadow-sm ${message.includes('Fehler') ? 'bg-error-container text-on-error-container border border-error/20' : 'bg-secondary-container text-on-secondary-container border border-secondary/20'}`}>
                            {message}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* German Version */}
                        <div className="flex flex-col gap-5 bg-surface-container-low/30 p-5 rounded-lg border border-outline-variant/50">
                            <h3 className="font-headline-sm text-headline-sm text-secondary border-b border-outline-variant/30 pb-2">Deutsch (DE)</h3>
                            <div>
                                <label htmlFor="edit_title_de" className="font-label-sm block mb-1.5 text-on-surface-variant">Titel (DE)</label>
                                <input
                                    id="edit_title_de"
                                    type="text"
                                    value={editTitleDe}
                                    onChange={e => setEditTitleDe(e.target.value)}
                                    className="w-full border border-outline-variant rounded-md p-3 text-body-md bg-surface-container-lowest focus:outline-primary/70 shadow-sm"
                                />
                            </div>
                            <div className="flex-grow flex flex-col">
                                <label htmlFor="edit_content_de" className="font-label-sm block mb-1.5 text-on-surface-variant">Inhalt (DE)</label>
                                <textarea
                                    id="edit_content_de"
                                    value={editContentDe}
                                    onChange={e => setEditContentDe(e.target.value)}
                                    className="w-full border border-outline-variant rounded-md p-3 text-body-md min-h-[300px] lg:min-h-[400px] font-mono bg-surface-container-lowest focus:outline-primary/70 shadow-sm resize-y"
                                />
                            </div>
                        </div>

                        {/* Polish Version */}
                        <div className="flex flex-col gap-5 bg-surface-container-low/30 p-5 rounded-lg border border-outline-variant/50">
                            <h3 className="font-headline-sm text-headline-sm text-secondary border-b border-outline-variant/30 pb-2">Polnisch (PL)</h3>
                            <div>
                                <label htmlFor="edit_title_pl" className="font-label-sm block mb-1.5 text-on-surface-variant">Titel (PL)</label>
                                <input
                                    id="edit_title_pl"
                                    type="text"
                                    value={editTitlePl}
                                    onChange={e => setEditTitlePl(e.target.value)}
                                    className="w-full border border-outline-variant rounded-md p-3 text-body-md bg-surface-container-lowest focus:outline-primary/70 shadow-sm"
                                />
                            </div>
                            <div className="flex-grow flex flex-col">
                                <label htmlFor="edit_content_pl" className="font-label-sm block mb-1.5 text-on-surface-variant">Inhalt (PL)</label>
                                <textarea
                                    id="edit_content_pl"
                                    value={editContentPl}
                                    onChange={e => setEditContentPl(e.target.value)}
                                    className="w-full border border-outline-variant rounded-md p-3 text-body-md min-h-[300px] lg:min-h-[400px] font-mono bg-surface-container-lowest focus:outline-primary/70 shadow-sm resize-y"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-grow p-margin-mobile md:p-margin-desktop bg-surface">
            <div className="max-w-3xl mx-auto bg-surface-container-lowest p-8 rounded-lg border border-outline-variant shadow-sm relative">
                {message && (
                    <div className="mb-6 p-4 rounded-md text-body-sm shadow-sm bg-secondary-container text-on-secondary-container border border-secondary/20">
                        {message}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <h1 className="font-headline-lg text-headline-lg text-on-surface">{title}</h1>

                    {user?.role === 'admin' && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center justify-center gap-2 px-4 py-2 border border-outline-variant text-primary hover:bg-primary/5 transition-colors font-label-md rounded-full shadow-sm whitespace-nowrap self-start sm:self-auto cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                            Seite bearbeiten
                        </button>
                    )}
                </div>

                <div className="prose prose-sm md:prose-base text-on-surface-variant font-body-md whitespace-pre-wrap">
                    {content}
                </div>
            </div>
        </div>
    );
};

export default DynamicPage;
