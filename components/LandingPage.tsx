import React from 'react';
import { FilmIcon } from './icons';
import { useTranslation } from '../context/i18nContext';
import LanguageSwitcher from './LanguageSwitcher';

interface LandingPageProps {
    onShowAuth: () => void;
    onShowFeatures: () => void;
    onShowPricing: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onShowAuth, onShowFeatures, onShowPricing }) => {
    const { t } = useTranslation();

    return (
        <div className="bg-canvas text-white">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 z-10 p-6 flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <FilmIcon className="w-8 h-8 text-accent" />
                    <span className="font-oswald text-2xl tracking-wider">{t('header.title')}</span>
                </div>
                <nav className="hidden md:flex items-center gap-6 text-sm">
                    <button onClick={onShowFeatures} className="hover:text-accent transition-colors">{t('header.features')}</button>
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
            <section className="relative h-screen flex items-center justify-center text-center bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1535016120720-40c646be5580?q=80&w=2070&auto=format&fit=crop')` }}>
                <div className="absolute inset-0 bg-black/60"></div>
                <div className="relative z-10 p-4">
                    <h1 className="font-oswald text-7xl md:text-9xl font-bold tracking-wider">{t('landing.hero.title')}</h1>
                    <p className="text-xl md:text-2xl font-light tracking-widest mt-2 uppercase">{t('landing.hero.subtitle1')}</p>
                    <p className="text-xl md:text-2xl font-light tracking-widest uppercase">{t('landing.hero.subtitle2')}</p>
                    <button onClick={onShowAuth} className="mt-8 px-8 py-3 bg-accent font-bold rounded-md hover:bg-accent/90 text-lg transition-colors">{t('landing.hero.cta')}</button>
                </div>
            </section>
            
            {/* What is ShotDeck AI Section */}
            <section className="py-20 px-6 max-w-7xl mx-auto text-center">
                <h2 className="font-oswald text-4xl font-bold mb-4">{t('landing.whatIs.title')}</h2>
                <p className="max-w-3xl mx-auto text-lg text-white/80 mb-12">
                    {t('landing.whatIs.description')}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {Array.from({ length: 18 }).map((_, i) => (
                        <div key={i} className="aspect-video bg-gray-700">
                            <img src={`https://picsum.photos/seed/${i+10}/400/225`} alt={`Film shot ${i+1}`} className="w-full h-full object-cover"/>
                        </div>
                    ))}
                </div>
            </section>
            
            {/* Features Section */}
            <section className="py-20 px-6 bg-surface">
                <div className="max-w-7xl mx-auto space-y-20">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h3 className="font-oswald text-3xl font-bold mb-4">{t('landing.featuresSection.generate.title')}</h3>
                            <p className="text-lg text-white/80">{t('landing.featuresSection.generate.description')}</p>
                        </div>
                        <div className="bg-gray-700 aspect-video rounded-lg">
                            <img src="https://picsum.photos/seed/feature1/800/450" alt="Generated shot" className="w-full h-full object-cover rounded-lg"/>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1">
                            <h3 className="font-oswald text-3xl font-bold mb-4">{t('landing.featuresSection.workflow.title')}</h3>
                            <p className="text-lg text-white/80">{t('landing.featuresSection.workflow.description')}</p>
                        </div>
                        <div className="order-1 md:order-2 bg-gray-700 aspect-video rounded-lg">
                            <img src="https://picsum.photos/seed/feature2/800/450" alt="Script breakdown" className="w-full h-full object-cover rounded-lg"/>
                        </div>
                    </div>
                </div>
            </section>
            
            {/* Testimonials Section */}
            <section className="py-20 px-6 max-w-4xl mx-auto text-center">
                <p className="text-2xl italic text-white/90">{t('landing.testimonial.quote')}</p>
                <p className="mt-4 font-bold text-lg">{t('landing.testimonial.author')}</p>
                <p className="text-sm text-white/60">{t('landing.testimonial.title')}</p>
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

export default LandingPage;
