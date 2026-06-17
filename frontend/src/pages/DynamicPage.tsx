import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

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
    const [page, setPage] = useState<PageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPage = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_URL || '/api'}/pages/${slug}`);
                setPage(response.data);
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
        }
    }, [slug]);

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

    return (
        <div className="flex-grow p-margin-mobile md:p-margin-desktop bg-surface">
            <div className="max-w-3xl mx-auto bg-surface-container-lowest p-8 rounded-lg border border-outline-variant shadow-sm">
                <h1 className="font-headline-lg text-headline-lg text-on-surface mb-6">{title}</h1>

                <div className="prose prose-sm md:prose-base text-on-surface-variant font-body-md whitespace-pre-wrap">
                    {content}
                </div>
            </div>
        </div>
    );
};

export default DynamicPage;
