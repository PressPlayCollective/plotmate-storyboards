import React from 'react';
import { FilmIcon } from './icons';
import { useTranslation } from '../context/i18nContext';
import LanguageSwitcher from './LanguageSwitcher';

interface PricingPageProps {
    onShowAuth: () => void;
    onBackToLanding: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onShowAuth, onBackToLanding }) => {
    const { t } = useTranslation();
    const features = t('pricingPage.features', { returnObjects: true }) as string[];

    return (
        <div className="bg-canvas text-white">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 z-10 p-6 flex justify-between items-center flex-wrap gap-4">
                <button onClick={onBackToLanding} className="flex items-center gap-2">
                    <FilmIcon className="w-8 h-8 text-accent" />
                    <span className="font-oswald text-2xl tracking-wider">{t('header.title')}</span>
                </button>
                <nav className="hidden md:flex items-center gap-6 text-sm">
                    <button onClick={onBackToLanding} className="hover:text-accent transition-colors">Home</button>
                    <a href="https://pressplaycollective.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">{t('header.about')}</a>
                </nav>
                <div className="flex items-center gap-4">
                    <LanguageSwitcher />
                    <button onClick={onShowAuth} className="hidden sm:block text-sm hover:text-accent transition-colors">{t('header.login')}</button>
                    <button onClick={onShowAuth} className="px-4 py-2 text-sm bg-accent font-bold rounded-md hover:bg-accent/90 transition-colors">{t('header.createAccount')}</button>
                </div>
            </header>

            {/* Main Pricing Section */}
            <section className="min-h-screen flex items-center justify-center py-24 px-6">
                <div className="max-w-xl mx-auto text-center">
                    <h1 className="font-oswald text-5xl md:text-6xl font-bold tracking-wider">{t('pricingPage.title')}</h1>
                    <p className="text-lg text-white/70 mt-4">{t('pricingPage.subtitle')}</p>
                    
                    <div className="bg-surface border border-accent/50 rounded-lg p-8 mt-12 shadow-2xl">
                        <div className="flex justify-center items-baseline">
                            <span className="text-5xl font-bold">{t('pricingPage.price')}</span>
                            <span className="text-xl text-white/70 ml-2">{t('pricingPage.period')}</span>
                        </div>
                        <p className="font-bold text-accent mt-2">{t('pricingPage.tagline')}</p>
                        
                        <div className="text-left text-white/80 my-8 space-y-3">
                            <p>{t('pricingPage.description')}</p>
                            <ul className="list-disc list-inside space-y-2 pl-2">
                                {Array.isArray(features) && features.map((feature: string, index: number) => (
                                    <li key={index}>{feature}</li>
                                ))}
                            </ul>
                            <p className="pt-4 text-sm text-white/60">{t('pricingPage.note')}</p>
                        </div>

                        <button onClick={onShowAuth} className="w-full px-8 py-3 bg-accent font-bold rounded-md hover:bg-accent/90 text-lg transition-colors">
                            {t('pricingPage.cta')}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default PricingPage;
