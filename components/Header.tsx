

import React from 'react';
import SaveStatusIndicator from './SaveStatusIndicator';
import HintButton from './HintButton';

interface HeaderProps {
    onNavigateToLibrary: () => void;
    onShowProfile: () => void;
    onShowHint?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigateToLibrary, onShowProfile, onShowHint }) => {
    return (
        <header className="flex-shrink-0 flex items-center justify-between p-3 border-b border-white/10 bg-canvas/95 backdrop-blur sticky top-0 z-20 h-16" role="banner">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="PLOTMATE" className="w-8 h-8 rounded-full object-cover" />
                    <span className="font-bold text-lg">PLOTMATE STORYBOARDS</span>
                </div>
            </div>
            
            <nav aria-label="Header actions" className="flex items-center gap-4">
                <SaveStatusIndicator />
                {onShowHint && <HintButton onClick={onShowHint} />}
                 <button 
                    onClick={onShowProfile}
                    className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                    aria-label="Go to Dashboard"
                >
                    Dashboard
                </button>
            </nav>
        </header>
    );
};

export default Header;