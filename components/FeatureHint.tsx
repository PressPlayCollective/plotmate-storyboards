import React, { useEffect, useState, useCallback } from 'react';
import { FEATURE_HINTS } from '../utils/featureHints';
import type { FeatureId } from '../utils/useFeatureDiscovery';
import {
  FolderIcon,
  Squares2x2Icon,
  SparklesIcon,
  ListBulletIcon,
  ViewfinderCircleIcon,
  EyeIcon,
  FilmIcon,
  ArrowDownTrayIcon,
  XIcon,
} from './icons';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  FolderIcon,
  Squares2x2Icon,
  SparklesIcon,
  ListBulletIcon,
  ViewfinderCircleIcon,
  EyeIcon,
  FilmIcon,
  ArrowDownTrayIcon,
};

interface FeatureHintProps {
  featureId: FeatureId;
  /** Called when the hint is dismissed (either by user or auto-timeout) */
  onDismiss: () => void;
  /** If true, the hint is visible */
  visible: boolean;
}

const AUTO_DISMISS_MS = 15000;

const FeatureHint: React.FC<FeatureHintProps> = ({ featureId, onDismiss, visible }) => {
  const [isExiting, setIsExiting] = useState(false);

  const hint = FEATURE_HINTS[featureId];
  const IconComponent = ICON_MAP[hint.iconName];

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 200);
  }, [onDismiss]);

  // Auto-dismiss after timeout
  useEffect(() => {
    if (!visible) return;
    setIsExiting(false);
    const timer = setTimeout(handleDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, handleDismiss]);

  if (!visible) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-[9000] w-80 pointer-events-none transition-all duration-200 ease-out ${
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      }`}
      data-testid={`feature-hint-${featureId}`}
    >
      <div className="pointer-events-auto bg-surface border border-accent/30 rounded-xl p-5 shadow-2xl shadow-black/40">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 text-white/60 hover:text-white transition-colors"
          aria-label="Dismiss hint"
          data-testid="feature-hint-dismiss"
        >
          <XIcon className="w-4 h-4" />
        </button>

        {/* Icon + title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent flex-shrink-0">
            {IconComponent && <IconComponent className="w-5 h-5" />}
          </div>
          <h3 className="text-sm font-bold text-white font-['Oswald',sans-serif] tracking-wide">
            {hint.title}
          </h3>
        </div>

        {/* Description */}
        <p className="text-xs text-white/60 leading-relaxed mb-3">
          {hint.description}
        </p>

        {/* Highlights */}
        <ul className="space-y-1 mb-4">
          {hint.highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-white/50">
              <span className="text-accent mt-0.5 flex-shrink-0">&#x2022;</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>

        {/* Got it button */}
        <button
          onClick={handleDismiss}
          className="w-full py-1.5 text-xs font-bold rounded-md bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-colors"
          data-testid="feature-hint-got-it"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default FeatureHint;
