import React from 'react';
import { useTranslation, supportedLocales, Locale } from '../context/i18nContext';

const languageNames: Record<Locale, string> = {
    en: 'EN',
    ru: 'RU',
    es: 'ES',
    zh: '中文',
};

const LanguageSwitcher: React.FC = () => {
    const { locale, setLocale } = useTranslation();

    return (
        <div className="flex items-center gap-1 border border-white/20 rounded-full p-0.5 bg-canvas/50">
            {supportedLocales.map(loc => (
                <button
                    key={loc}
                    onClick={() => setLocale(loc)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        locale === loc ? 'bg-white text-black font-semibold' : 'text-white/70 hover:bg-white/10'
                    }`}
                    aria-label={`Switch to ${languageNames[loc]}`}
                >
                    {languageNames[loc]}
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
