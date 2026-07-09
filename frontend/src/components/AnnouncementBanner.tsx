import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';

interface PageData {
    content_de: string;
    content_pl: string;
}

const AnnouncementBanner: React.FC = () => {
    const { i18n } = useTranslation();
    const [announcement, setAnnouncement] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnnouncement = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/pages/announcement`);
                if (res.ok) {
                    const data: PageData = await res.json();
                    const content = i18n.language === 'pl' ? data.content_pl : data.content_de;
                    if (content && content.trim() !== '') {
                        setAnnouncement(content);
                    } else {
                        setAnnouncement(null);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch announcement", error);
            }
        };

        fetchAnnouncement();
        // Check for updates every 10 minutes
        const interval = setInterval(fetchAnnouncement, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, [i18n.language]);

    if (!announcement) return null;

    return (
        <div className="bg-primary dark:bg-primary-container text-on-primary dark:text-on-primary-container py-3 px-margin-mobile md:px-margin-desktop w-full">
            <div className="max-w-container-max-width mx-auto flex items-center gap-3">
                <span className="material-symbols-outlined flex-shrink-0">info</span>
                <p className="font-label-md text-label-md flex-grow">
                    {announcement}
                </p>
            </div>
        </div>
    );
};

export default AnnouncementBanner;
