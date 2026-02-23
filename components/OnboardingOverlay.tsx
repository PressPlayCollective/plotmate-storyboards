import React, { useState, useCallback } from 'react';
import { SparklesIcon, EyeIcon, ViewfinderCircleIcon } from './icons';

interface OnboardingOverlayProps {
    onComplete: () => void;
}

interface OnboardingStep {
    icon?: React.ReactNode;
    title: string;
    description: string;
    highlights: string[];
    detail: string;
    /** If true, render the logo instead of an icon */
    showLogo?: boolean;
}

const STEPS: OnboardingStep[] = [
    {
        showLogo: true,
        title: 'Welcome to PLOTMATE STORYBOARDS',
        description:
            'The ultimate visual toolkit for filmmakers. Create AI-generated storyboards and shot designs from script to screen \u2014 all running locally in your browser.',
        highlights: [
            'AI image generation \u2014 free tier or pro, your choice',
            'Script breakdown and scene management',
            'Continuity and blocking tools for spatial planning',
            'Export to PDF, ZIP, or portable HTML',
            'Global media library and per-project cast manager',
        ],
        detail: 'You\u2019ll discover tips for each feature as you explore the app. Look for the ? button to revisit any hint.',
    },
    {
        icon: <SparklesIcon className="w-7 h-7" />,
        title: 'Generate Images for Free',
        description:
            'Start generating storyboard frames instantly with Z-Image Turbo \u2014 no account, no API key, zero cost. Powered by the #1 open-source text-to-image model via Hugging Face.',
        highlights: [
            'Works immediately \u2014 no sign-up or configuration needed',
            '~10\u201330 images per hour on the free tier',
            'First image may take 30\u201360 seconds while the model warms up',
            'Add a free Hugging Face token in Settings for higher limits',
            'Switch to Google Gemini anytime for higher fidelity',
        ],
        detail: 'Go to Settings, select Z-Image Turbo as your image provider, and start generating. No account required.',
    },
    {
        icon: <ViewfinderCircleIcon className="w-7 h-7" />,
        title: 'Best Results with Google Gemini',
        description:
            'For the highest fidelity and actor photo matching, use a Google Gemini API key with NanoBanana Pro. Upload actor photos and the AI matches their likeness in every frame.',
        highlights: [
            'Actor photo matching \u2014 AI reproduces likeness across shots',
            'Reference location images for accurate set design',
            'Script analysis automatically extracts scenes, characters, and props',
            'Higher quality and faster generation than the free tier',
            'Free API key from aistudio.google.com',
        ],
        detail: 'Both providers can be switched anytime in Settings. Start free with Z-Image, upgrade to Gemini when you\u2019re ready.',
    },
    {
        icon: <SparklesIcon className="w-7 h-7" />,
        title: 'Light Your Scenes Like a Pro',
        description:
            'Set up realistic lighting for each scene and the AI renders it faithfully \u2014 source type, direction, color, and modifiers all shape your generated storyboard frames.',
        highlights: [
            '7 source types: LED panel, COB + softbox, Fresnel, HMI, and more',
            '8 directions: front, side, backlight, underlight, and more',
            '8 light colors including teal, purple, and neon',
            '8 modifiers: softbox, grid, gobo, haze/fog, and more',
            'Add unlimited lights per scene for complex setups',
        ],
        detail: 'Find the Lighting Setup section at the bottom of every scene form. Even a single key light dramatically improves image quality.',
    },
    {
        icon: <EyeIcon className="w-7 h-7" />,
        title: 'Master Visual Continuity',
        description:
            'Plan camera placements on a top-down floor plan to ensure every shot maintains spatial consistency. The Continuity View is your visual map of the entire scene.',
        highlights: [
            'Place characters, set elements, and lights on an interactive grid',
            'Draw the 180\u00B0 line \u2014 get automatic crossing warnings',
            'FOV cones show exactly what each camera sees',
            'Drawing layer, camera tracks, and walk arrow paths',
            'Full undo/redo and snapshot support',
        ],
        detail: 'Access Continuity View from the Shot Builder toolbar. It prevents the most common editing mistake \u2014 accidentally crossing the line of action.',
    },
];

const TOTAL_STEPS = STEPS.length;

const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);

    const step = STEPS[currentStep];
    const isFirst = currentStep === 0;
    const isLast = currentStep === TOTAL_STEPS - 1;

    const goNext = useCallback(() => {
        if (isLast) {
            onComplete();
        } else {
            setCurrentStep((s) => s + 1);
        }
    }, [isLast, onComplete]);

    const goBack = useCallback(() => {
        if (!isFirst) {
            setCurrentStep((s) => s - 1);
        }
    }, [isFirst]);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            data-testid="onboarding-overlay"
        >
            <div className="relative w-full max-w-lg mx-4">
                {/* Skip button */}
                <button
                    onClick={onComplete}
                    className="absolute -top-10 right-0 text-sm text-white/50 hover:text-white transition-colors"
                    data-testid="onboarding-skip"
                >
                    Skip tour
                </button>

                <div className="bg-surface border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl">
                    {/* Step counter */}
                    <p className="text-[10px] uppercase tracking-widest text-white/30 mb-4 font-bold">
                        STEP {currentStep + 1} OF {TOTAL_STEPS}
                    </p>

                    {/* Icon / Logo */}
                    {step.showLogo ? (
                        <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 mb-5 overflow-hidden">
                            <img src="/logo.png" alt="PLOTMATE" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-14 h-14 rounded-xl bg-accent/10 border border-accent/20 mb-5 flex items-center justify-center text-accent">
                            {step.icon}
                        </div>
                    )}

                    {/* Title */}
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 font-['Oswald',sans-serif] tracking-wide">
                        {step.title}
                    </h2>

                    {/* Description */}
                    <p className="text-white/70 text-base leading-relaxed mb-4">
                        {step.description}
                    </p>

                    {/* Feature highlights */}
                    <ul className="space-y-1.5 mb-4">
                        {step.highlights.map((highlight, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-white/55">
                                <span className="text-accent mt-0.5 flex-shrink-0">&#x2022;</span>
                                <span>{highlight}</span>
                            </li>
                        ))}
                    </ul>

                    {/* Detail / footnote */}
                    <p className="text-white/35 text-sm leading-relaxed">
                        {step.detail}
                    </p>

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-8">
                        {/* Back button */}
                        <div>
                            {!isFirst && (
                                <button
                                    onClick={goBack}
                                    className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
                                    data-testid="onboarding-back"
                                >
                                    &larr; Back
                                </button>
                            )}
                        </div>

                        {/* Dot indicators */}
                        <div className="flex items-center gap-2">
                            {STEPS.map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                        i === currentStep
                                            ? 'bg-accent scale-110'
                                            : i < currentStep
                                            ? 'bg-accent/40'
                                            : 'bg-white/15'
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Next / Get Started button */}
                        <button
                            onClick={goNext}
                            className="px-6 py-2.5 text-sm font-bold rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
                            data-testid="onboarding-next"
                        >
                            {isLast ? 'Get Started' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingOverlay;
