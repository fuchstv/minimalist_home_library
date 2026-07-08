import React from 'react';
import { useTranslation } from 'react-i18next';

interface CategoryDisplayProps {
  categoryKey: string;
}

const CategoryDisplay: React.FC<CategoryDisplayProps> = ({ categoryKey }) => {
  const { t } = useTranslation();
  const categories = t('catalog.categories', { returnObjects: true }) as Record<string, string>;
  return <span>{categories[categoryKey] || categoryKey}</span>;
};

export default CategoryDisplay;
