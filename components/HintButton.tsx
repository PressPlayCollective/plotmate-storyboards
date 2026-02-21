import React from 'react';

interface HintButtonProps {
  onClick: () => void;
  className?: string;
}

/**
 * A small persistent "?" button that lets users re-trigger the feature hint
 * for the current view at any time.
 */
const HintButton: React.FC<HintButtonProps> = ({ onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-accent hover:border-accent/30 hover:bg-accent/10 transition-colors text-sm font-bold ${className}`}
      title="Show feature hint"
      data-testid="hint-button"
    >
      ?
    </button>
  );
};

export default HintButton;
