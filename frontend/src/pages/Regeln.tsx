import React from 'react';
import { useTranslation } from 'react-i18next';

const Regeln: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="flex-grow p-margin-mobile md:p-margin-desktop bg-surface">
            <div className="max-w-3xl mx-auto bg-surface-container-lowest p-8 rounded-lg border border-outline-variant shadow-sm">
                <h1 className="font-headline-lg text-headline-lg text-on-surface mb-6">{t('rules.title') + " - Schulzestr. 1"}</h1>

                <div className="prose prose-sm md:prose-base text-on-surface-variant font-body-md">
                    <p className="mb-4">{t('rules.intro')}</p>

                    <h2 className="font-headline-sm text-headline-sm text-on-surface mt-6 mb-2">{t('rules.section1_title')}</h2>
                    <p className="mb-4">{t('rules.section1_content')}</p>

                    <h2 className="font-headline-sm text-headline-sm text-on-surface mt-6 mb-2">{t('rules.section2_title')}</h2>
                    <p className="mb-4">{t('rules.section2_content')}</p>

                    <h2 className="font-headline-sm text-headline-sm text-on-surface mt-6 mb-2">{t('rules.section3_title')}</h2>
                    <p className="mb-4">{t('rules.section3_content')}</p>

                    <h2 className="font-headline-sm text-headline-sm text-on-surface mt-6 mb-2">{t('rules.section4_title')}</h2>
                    <p className="mb-4">{t('rules.section4_content')}</p>
                </div>
            </div>
        </div>
    );
};

export default Regeln;
