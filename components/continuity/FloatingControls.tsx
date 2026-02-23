import React from 'react';
import type { Scene, SceneContinuityData } from '../../types';
import { TrashIcon, XIcon, SquareIcon, ViewfinderCircleIcon } from '../icons';
import type { Mode } from './shared';

interface FloatingControlsProps {
    scene: Scene;
    mode: Mode;
    hint: string;
    zoom: number;
    continuityData: SceneContinuityData;
    showFOV: boolean;
    setShowFOV: (v: boolean) => void;
    showLightBeam: boolean;
    setShowLightBeam: (v: boolean) => void;
    showSequencePath: boolean;
    setShowSequencePath: (v: boolean) => void;
    showShotPanel: boolean;
    setShowShotPanel: (v: boolean) => void;
    onClearLine: () => void;
    onClearAll: () => void;
    onBackToBuilder: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
}

const FloatingControls: React.FC<FloatingControlsProps> = ({
    scene, mode, hint, zoom, continuityData,
    showFOV, setShowFOV, showLightBeam, setShowLightBeam,
    showSequencePath, setShowSequencePath, showShotPanel, setShowShotPanel,
    onClearLine, onClearAll, onBackToBuilder, onZoomIn, onZoomOut, onZoomReset,
}) => {
    return (
        <>
            {/* Scene Title (top-left) */}
            <div className="absolute top-3 left-3 z-20">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/[0.08]">
                    <span className="text-xs font-bold text-accent">Scene {scene.sceneNumber}</span>
                    <span className="text-[1px] text-white/50">|</span>
                    <span className="text-xs text-white/60 font-medium truncate max-w-[200px]">{scene.slugline}</span>
                </div>
            </div>

            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20 flex-wrap justify-end max-w-[calc(100%-200px)]">
                <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-black/50 backdrop-blur-md border border-white/[0.08]">
                    <ToggleBtn active={showFOV} onClick={() => setShowFOV(!showFOV)} label="Cam">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </ToggleBtn>
                    <ToggleBtn active={showLightBeam} onClick={() => setShowLightBeam(!showLightBeam)} label="Light">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                    </ToggleBtn>
                    <ToggleBtn active={showSequencePath} onClick={() => setShowSequencePath(!showSequencePath)} label="Path">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                    </ToggleBtn>
                </div>

                <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-black/50 backdrop-blur-md border border-white/[0.08]">
                    {continuityData.oneEightyLine && (
                        <button
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            onClick={onClearLine}
                            title="Clear 180° line"
                        >
                            <XIcon className="w-3 h-3" />
                            Line
                        </button>
                    )}
                    <button
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        onClick={onClearAll}
                        title="Clear all"
                    >
                        <TrashIcon className="w-3 h-3" />
                        All
                    </button>
                </div>

                <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-black/50 backdrop-blur-md border border-white/[0.08]">
                    <button
                        onClick={() => setShowShotPanel(!showShotPanel)}
                        className={`p-1.5 rounded-md transition-all ${showShotPanel ? 'bg-white/15 text-white/70' : 'text-white/35 hover:text-white/60'}`}
                        title={showShotPanel ? 'Hide shots' : 'Show shots'}
                        aria-label={showShotPanel ? 'Hide shots' : 'Show shots'}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>
                    </button>
                    <button
                        onClick={onBackToBuilder}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-white/50 hover:text-white hover:bg-white/10 transition-all font-medium"
                        title="Back to Shot Builder"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                        Back
                    </button>
                </div>
            </div>

            {/* Zoom Controls (bottom-left) */}
            <div className="absolute bottom-4 left-4 z-20">
                <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/[0.08]">
                    <button onClick={onZoomOut} className="w-7 h-7 flex items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-all" title="Zoom out" aria-label="Zoom out">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M5 12h14" /></svg>
                    </button>
                    <button onClick={onZoomReset} className="px-1.5 py-0.5 rounded text-[11px] font-mono text-white/60 hover:text-white hover:bg-white/10 transition-all min-w-[3rem] text-center" title="Reset zoom">
                        {Math.round(zoom * 100)}%
                    </button>
                    <button onClick={onZoomIn} className="w-7 h-7 flex items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-all" title="Zoom in" aria-label="Zoom in">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
                    </button>
                </div>
            </div>

            {/* Bottom-Center Hint Pill */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-md border transition-all ${mode !== 'none' ? 'bg-accent/10 border-accent/20' : 'bg-black/50 border-white/[0.06]'}`}>
                    <HintIcon mode={mode} />
                    <span className={`text-xs whitespace-nowrap font-medium ${mode !== 'none' ? 'text-white/70' : 'text-white/50'}`}>{hint}</span>
                </div>
            </div>
        </>
    );
};

const ToggleBtn: React.FC<{ active: boolean; onClick: () => void; label: string; children: React.ReactNode }> = ({ active, onClick, label, children }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${active ? 'bg-white/15 text-white/90' : 'text-white/60 hover:text-white/60'}`}
        title={`Toggle ${label.toLowerCase()}`}
    >
        {children}
        {label}
    </button>
);

const HintIcon: React.FC<{ mode: Mode }> = ({ mode }) => {
    switch (mode) {
        case 'place_character':
            return <svg className="w-4 h-4 flex-shrink-0 text-accent/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>;
        case 'place_camera':
            return <ViewfinderCircleIcon className="w-4 h-4 flex-shrink-0 text-accent/70" />;
        case 'draw_line_start':
        case 'draw_line_end':
            return <svg className="w-4 h-4 flex-shrink-0 text-accent/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M4 20 L20 4" strokeDasharray="3 2"/></svg>;
        case 'place_set_element':
            return <SquareIcon className="w-4 h-4 flex-shrink-0 text-accent/70" />;
        case 'draw_wall':
            return <svg className="w-4 h-4 flex-shrink-0 text-accent/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 6v12h18V6M9 6v12M15 6v12"/></svg>;
        case 'place_light':
            return <svg className="w-4 h-4 flex-shrink-0 text-accent/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>;
        default:
            return <svg className="w-4 h-4 flex-shrink-0 text-accent/50" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>;
    }
};

export default FloatingControls;
