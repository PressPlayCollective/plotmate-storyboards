import React from 'react';
import { FilmIcon, SparklesIcon, PencilIcon, MapPinIcon, ShareIcon, UserIcon } from './icons';
import { useTranslation } from '../context/i18nContext';
import LanguageSwitcher from './LanguageSwitcher';

interface FeaturesPageProps {
    onShowAuth: () => void;
    onBackToLanding: () => void;
    onShowPricing: () => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string; }> = ({ icon, title, description }) => (
    <div className="bg-surface border border-white/10 rounded-lg p-6 text-center transform hover:-translate-y-2 transition-transform duration-300">
        <div className="inline-block p-3 bg-accent/10 border border-accent/30 rounded-full mb-4">
            {icon}
        </div>
        <h3 className="font-oswald text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm text-white/70">{description}</p>
    </div>
);

const FeaturesPage: React.FC<FeaturesPageProps> = ({ onShowAuth, onBackToLanding, onShowPricing }) => {
    const { t } = useTranslation();

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
                    <button onClick={onShowPricing} className="hover:text-accent transition-colors">{t('header.pricing')}</button>
                    <a href="https://pressplaycollective.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">{t('header.about')}</a>
                </nav>
                <div className="flex items-center gap-4">
                    <LanguageSwitcher />
                    <button onClick={onShowAuth} className="hidden sm:block text-sm hover:text-accent transition-colors">{t('header.login')}</button>
                    <button onClick={onShowAuth} className="px-4 py-2 text-sm bg-accent font-bold rounded-md hover:bg-accent/90 transition-colors">{t('header.createAccount')}</button>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-48 pb-24 text-center bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1598122353381-5de15f36705c?q=80&w=2070&auto=format&fit=crop')` }}>
                 <div className="absolute inset-0 bg-black/70"></div>
                 <div className="relative z-10 p-4">
                    <h1 className="font-oswald text-6xl md:text-8xl font-bold tracking-wider">{t('featuresPage.hero.title')}</h1>
                    <p className="text-lg md:text-xl font-light tracking-widest mt-2 uppercase">{t('featuresPage.hero.subtitle')}</p>
                </div>
            </section>

            {/* Main Features Grid */}
            <section className="py-20 px-6 max-w-7xl mx-auto">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={<SparklesIcon className="w-8 h-8 text-accent" />}
                        title={t('featuresPage.cards.generation.title')}
                        description={t('featuresPage.cards.generation.description')}
                    />
                    <FeatureCard
                        icon={<PencilIcon className="w-8 h-8 text-accent" />}
                        title={t('featuresPage.cards.workflow.title')}
                        description={t('featuresPage.cards.workflow.description')}
                    />
                    <FeatureCard
                        icon={<UserIcon className="w-8 h-8 text-accent" />}
                        title={t('featuresPage.cards.library.title')}
                        description={t('featuresPage.cards.library.description')}
                    />
                    <FeatureCard
                        icon={<MapPinIcon className="w-8 h-8 text-accent" />}
                        title={t('featuresPage.cards.scouting.title')}
                        description={t('featuresPage.cards.scouting.description')}
                    />
                    <FeatureCard
                        icon={<ShareIcon className="w-8 h-8 text-accent" />}
                        title={t('featuresPage.cards.continuity.title')}
                        description={t('featuresPage.cards.continuity.description')}
                    />
                </div>
            </section>
            
            {/* CTA Section */}
            <section className="py-20 px-6 text-center bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1574267432553-4b4628081c31?q=80&w=1931&auto=format&fit=crop')` }}>
                <div className="bg-black/70 py-16">
                    <h2 className="font-oswald text-4xl font-bold mb-4">{t('landing.ctaSection.title')}</h2>
                    <p className="text-lg text-white/80 mb-8">{t('landing.ctaSection.description')}</p>
                    <button onClick={onShowAuth} className="px-8 py-3 bg-accent font-bold rounded-md hover:bg-accent/90 text-lg transition-colors">{t('landing.ctaSection.cta')}</button>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-black py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-center md:text-left">
                    <div className="mb-6 md:mb-0">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                            <FilmIcon className="w-6 h-6 text-accent" />
                            <span className="font-oswald text-xl tracking-wider">{t('footer.title')}</span>
                        </div>
                        <p className="text-sm text-white/60">{t('footer.copyright')}</p>
                    </div>
                    <div className="text-sm text-white/80 flex gap-6">
                        <a href="#" className="hover:text-accent transition-colors">{t('footer.terms')}</a>
                        <a href="#" className="hover:text-accent transition-colors">{t('footer.privacy')}</a>
                        <a href="#" className="hover:text-accent transition-colors">{t('footer.contact')}</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default FeaturesPage;