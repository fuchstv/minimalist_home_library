import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from '../utils/api';
import { API_BASE_URL } from '../config';
import { logger } from '../utils/logger';


interface PageData {
    slug: string;
    title_de: string;
    title_pl: string;
    content_de: string;
    content_pl: string;
}

const AdminPages: React.FC = () => {
    const { t } = useTranslation();
    const [pages, setPages] = useState<PageData[]>([]);
    const [selectedPage, setSelectedPage] = useState<PageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

        const fetchPages = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/admin/pages`, { withCredentials: true });
            setPages(response.data);
            setLoading(false);
        } catch (error) {
            logger.error('Error fetching pages:', error);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
                                /* eslint-disable-next-line react-hooks/set-state-in-effect */
        fetchPages();
    }, [fetchPages]);

    const handleClearAnnouncement = () => {
        if (!selectedPage) return;
        setSelectedPage({
            ...selectedPage,
            content_de: '',
            content_pl: ''
        });
    };

    const handleSave = async () => {
        if (!selectedPage) return;
        try {
            const pageToSave = {
                ...selectedPage,
                title_de: selectedPage.title_de || (selectedPage.slug === 'announcement' ? 'Globale Ankündigung' : ''),
                title_pl: selectedPage.title_pl || (selectedPage.slug === 'announcement' ? 'Ogłoszenie globalne' : '')
            };
            await axios.post(`${API_BASE_URL}/api/admin/pages/${selectedPage.slug}`, pageToSave, { withCredentials: true });
            setMessage(t('admin.pages.save_success'));
            setIsError(false);
            fetchPages();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            logger.error('Error saving page:', error);
            setMessage(t('admin.pages.save_error'));
            setIsError(true);
        }
    };

    if (loading) return <div>{t('admin.pages.loading')}</div>;

    const isAnnouncement = selectedPage?.slug === 'announcement';

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-4">
                {pages.map(page => (
                    <button
                        key={page.slug}
                        onClick={() => setSelectedPage(page)}
                        className={`px-4 py-2 rounded-md font-label-md transition-colors cursor-pointer ${selectedPage?.slug === page.slug ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'}`}
                    >
                        {t(`admin.pages.slugs.${page.slug}`, { defaultValue: page.title_de })}
                    </button>
                ))}
            </div>

            {selectedPage && (
                <div className="bg-surface-container-low dark:bg-white/10 p-6 rounded-lg border border-outline-variant shadow-sm flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-outline-variant pb-3">
                        <h2 className="font-headline-sm text-headline-sm">
                            {t('admin.pages.edit_title', { slug: isAnnouncement ? t('admin.pages.slugs.announcement') : selectedPage.slug })}
                        </h2>
                    </div>

                    {isAnnouncement && (
                        <div className="p-4 rounded-lg bg-primary-container/20 border border-primary/30 text-on-surface text-body-sm flex items-start gap-3">
                            <span className="material-symbols-outlined text-primary text-2xl flex-shrink-0 mt-0.5">info</span>
                            <div>
                                <p className="font-bold text-primary mb-1">
                                    {t('admin.pages.announcement_info_title', { defaultValue: 'Globale Ankündigung (Banner oben auf allen Seiten)' })}
                                </p>
                                <p className="text-on-surface-variant text-xs leading-relaxed">
                                    {t('admin.pages.announcement_info_desc', { defaultValue: 'Lassen Sie das Textfeld leer, wenn kein Ankündigungsbanner auf der Website angezeigt werden soll. Sobald Text gespeichert wird, erscheint das Banner oben auf der Seite.' })}
                                </p>
                            </div>
                        </div>
                    )}

                    {message && (
                        <div className={`p-3 rounded text-body-sm ${isError ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'}`}>
                            {message}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-4">
                            <h3 className="font-title-md border-b pb-1">{t("admin.pages.german")}</h3>
                            {!isAnnouncement && (
                                <div>
                                    <label htmlFor="title_de" className="font-label-sm block mb-1">{t("admin.pages.title_de")}</label>
                                    <input
                                        id="title_de"
                                        type="text"
                                        value={selectedPage.title_de}
                                        onChange={e => setSelectedPage({ ...selectedPage, title_de: e.target.value })}
                                        className="w-full border border-outline-variant rounded p-2 text-body-md"
                                    />
                                </div>
                            )}
                            <div>
                                <label htmlFor="content_de" className="font-label-sm block mb-1">
                                    {isAnnouncement ? t("admin.pages.announcement_content_de_label", { defaultValue: "Banner-Text (DE) – Leer lassen = kein Banner" }) : t("admin.pages.content_de")}
                                </label>
                                <textarea
                                    id="content_de"
                                    value={selectedPage.content_de}
                                    onChange={e => setSelectedPage({ ...selectedPage, content_de: e.target.value })}
                                    placeholder={isAnnouncement ? t("admin.pages.announcement_placeholder_de", { defaultValue: "z. B. Unsere Bibliothek bleibt am Samstag, 30. August geschlossen..." }) : undefined}
                                    className={`w-full border border-outline-variant rounded p-2 text-body-md font-mono ${isAnnouncement ? 'h-36' : 'h-64'}`}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <h3 className="font-title-md border-b pb-1">{t("admin.pages.polish")}</h3>
                            {!isAnnouncement && (
                                <div>
                                    <label htmlFor="title_pl" className="font-label-sm block mb-1">{t("admin.pages.title_pl")}</label>
                                    <input
                                        id="title_pl"
                                        type="text"
                                        value={selectedPage.title_pl}
                                        onChange={e => setSelectedPage({ ...selectedPage, title_pl: e.target.value })}
                                        className="w-full border border-outline-variant rounded p-2 text-body-md"
                                    />
                                </div>
                            )}
                            <div>
                                <label htmlFor="content_pl" className="font-label-sm block mb-1">
                                    {isAnnouncement ? t("admin.pages.announcement_content_pl_label", { defaultValue: "Banner-Text (PL) – Leer lassen = kein Banner" }) : t("admin.pages.content_pl")}
                                </label>
                                <textarea
                                    id="content_pl"
                                    value={selectedPage.content_pl}
                                    onChange={e => setSelectedPage({ ...selectedPage, content_pl: e.target.value })}
                                    placeholder={isAnnouncement ? t("admin.pages.announcement_placeholder_pl", { defaultValue: "np. Nasza biblioteka będzie nieczynna w sobotę, 30 sierpnia..." }) : undefined}
                                    className={`w-full border border-outline-variant rounded p-2 text-body-md font-mono ${isAnnouncement ? 'h-36' : 'h-64'}`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        {isAnnouncement && (
                            <button
                                type="button"
                                onClick={handleClearAnnouncement}
                                className="px-4 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-variant/30 rounded-full font-label-md transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                                {t('admin.pages.clear_announcement', { defaultValue: 'Ankündigung leeren & ausblenden' })}
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            className="bg-primary text-on-primary py-2.5 px-8 rounded-full hover:bg-primary/90 transition-colors font-label-md shadow-sm ml-auto cursor-pointer"
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
