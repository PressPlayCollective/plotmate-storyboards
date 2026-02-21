import React from 'react';
import type { Shot } from '../../types';
import { UndoIcon, RedoIcon, SquareIcon, ViewfinderCircleIcon } from '../icons';
import type { Mode } from './shared';

interface ToolPaletteProps {
    mode: Mode;
    setMode: (mode: Mode) => void;
    modeLabel: string;
    activeShotId: string | null;
    activeShot: Shot | undefined;
    wallPoints: { x: number; y: number }[];
    onFinishWall: () => void;
    setWallPoints: (pts: { x: number; y: number }[]) => void;
    onUndo: () => void;
    onRedo: () => void;
    undoDisabled: boolean;
    redoDisabled: boolean;
    snapToGrid: boolean;
    setSnapToGrid: (v: boolean) => void;
    onSnapshot?: () => void;
    trackPoints?: { x: number; y: number }[];
    onFinishTrack?: () => void;
    walkArrowPoints?: { x: number; y: number }[];
    onFinishWalkArrow?: () => void;
}

const ToolPalette: React.FC<ToolPaletteProps> = ({
    mode, setMode, modeLabel, activeShotId, activeShot, wallPoints, onFinishWall, setWallPoints,
    onUndo, onRedo, undoDisabled, redoDisabled, snapToGrid, setSnapToGrid, onSnapshot,
    trackPoints, onFinishTrack, walkArrowPoints, onFinishWalkArrow,
}) => {
    return (
        <div className="w-12 flex-shrink-0 bg-[#111214] border-r border-white/[0.08] flex flex-col items-center py-3 gap-0.5 z-10">
            <div className="mb-2 px-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-accent/70 text-center block leading-tight">{modeLabel}</span>
            </div>

            <ToolButton active={mode === 'none'} onClick={() => setMode('none')} label="Select / Drag">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/></svg>
            </ToolButton>

            <ToolButton active={mode === 'place_character'} onClick={() => setMode(mode === 'place_character' ? 'none' : 'place_character')} label="Place Character">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
            </ToolButton>

            <ToolButton
                active={mode === 'place_camera'}
                onClick={() => setMode(mode === 'place_camera' ? 'none' : 'place_camera')}
                label={activeShotId ? `Place Camera (Shot ${activeShot?.shotNumber || '?'})` : 'Place Camera'}
            >
                <ViewfinderCircleIcon className="w-5 h-5" />
            </ToolButton>

            <ToolButton active={mode === 'draw_line_start' || mode === 'draw_line_end'} onClick={() => setMode(mode === 'draw_line_start' ? 'none' : 'draw_line_start')} label="180° Line">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M4 20 L20 4" strokeDasharray="3 2"/><circle cx="4" cy="20" r="2" fill="currentColor"/><circle cx="20" cy="4" r="2" fill="currentColor"/></svg>
            </ToolButton>

            <ToolButton active={mode === 'place_set_element'} onClick={() => setMode(mode === 'place_set_element' ? 'none' : 'place_set_element')} label="Set Element">
                <SquareIcon className="w-5 h-5" />
            </ToolButton>

            <ToolButton
                active={mode === 'draw_wall'}
                onClick={() => {
                    if (mode === 'draw_wall') {
                        if (wallPoints.length >= 2) onFinishWall();
                        setMode('none');
                    } else {
                        setWallPoints([]);
                        setMode('draw_wall');
                    }
                }}
                label="Wall"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 6v12h18V6M9 6v12M15 6v12"/></svg>
            </ToolButton>

            <ToolButton active={mode === 'place_light'} onClick={() => setMode(mode === 'place_light' ? 'none' : 'place_light')} label="Light">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            </ToolButton>

            <ToolButton
                active={mode === 'draw_track'}
                onClick={() => {
                    if (mode === 'draw_track') {
                        if ((trackPoints?.length || 0) >= 2 && onFinishTrack) onFinishTrack();
                        setMode('none');
                    } else {
                        setMode('draw_track');
                    }
                }}
                label="Camera Track"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 19c2 0 4-1.5 6-3 2 1.5 4 3 6 3" strokeDasharray="2 1.5"/><path strokeLinecap="round" strokeLinejoin="round" d="M4 5c2 0 4 1.5 6 3 2-1.5 4-3 6-3"/><circle cx="4" cy="5" r="1.5" fill="currentColor"/><circle cx="20" cy="19" r="1.5" fill="currentColor"/></svg>
            </ToolButton>

            <ToolButton
                active={mode === 'draw_walk_arrow'}
                onClick={() => {
                    if (mode === 'draw_walk_arrow') {
                        if ((walkArrowPoints?.length || 0) >= 2 && onFinishWalkArrow) onFinishWalkArrow();
                        setMode('none');
                    } else {
                        setMode('draw_walk_arrow');
                    }
                }}
                label="Walk Arrow"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M12 5l4 4m-4-4l-4 4"/><circle cx="12" cy="4" r="2" fill="currentColor"/><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h2l1 4 2-8 1 4h2"/></svg>
            </ToolButton>

            <ToolButton active={mode === 'place_caption'} onClick={() => setMode(mode === 'place_caption' ? 'none' : 'place_caption')} label="Caption">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M12 6v12" />
                </svg>
            </ToolButton>

            <ToolButton active={mode === 'draw_freehand'} onClick={() => setMode(mode === 'draw_freehand' ? 'none' : 'draw_freehand')} label="Freehand Draw">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
                </svg>
            </ToolButton>

            <div className="w-6 h-px bg-white/10 my-2" />

            <button
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group relative ${snapToGrid ? 'bg-white/15 text-white/90' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]'}`}
                onClick={() => setSnapToGrid(!snapToGrid)}
                title={snapToGrid ? 'Grid Snap: ON' : 'Grid Snap: OFF'}
                aria-label="Toggle grid snap"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
                <span className="absolute left-full ml-2 px-2 py-1 text-[10px] font-medium bg-[#1E1E1E] text-white/80 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg border border-white/10">
                    {snapToGrid ? 'Snap: ON' : 'Snap: OFF'}
                </span>
            </button>

            <div className="flex-grow" />
            <div className="w-6 h-px bg-white/10 my-1" />

            {onSnapshot && (
                <button onClick={onSnapshot} className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all group relative" title="Snapshots" aria-label="Snapshots">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0Z"/></svg>
                    <span className="absolute left-full ml-2 px-2 py-1 text-[10px] font-medium bg-[#1E1E1E] text-white/80 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg border border-white/10">Snapshots</span>
                </button>
            )}

            <button
                onClick={onUndo}
                disabled={undoDisabled}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:text-white/70 hover:bg-white/[0.08] disabled:opacity-20 disabled:cursor-not-allowed transition-all group relative"
                title="Undo (Ctrl+Z)"
                aria-label="Undo (Ctrl+Z)"
            >
                <UndoIcon className="w-4.5 h-4.5" />
                <span className="absolute left-full ml-2 px-2 py-1 text-[10px] font-medium bg-[#1E1E1E] text-white/80 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg border border-white/10">Undo</span>
            </button>

            <button
                onClick={onRedo}
                disabled={redoDisabled}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:text-white/70 hover:bg-white/[0.08] disabled:opacity-20 disabled:cursor-not-allowed transition-all group relative"
                title="Redo (Ctrl+Shift+Z)"
                aria-label="Redo (Ctrl+Shift+Z)"
            >
                <RedoIcon className="w-4.5 h-4.5" />
                <span className="absolute left-full ml-2 px-2 py-1 text-[10px] font-medium bg-[#1E1E1E] text-white/80 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg border border-white/10">Redo</span>
            </button>
        </div>
    );
};

const ToolButton: React.FC<{ active: boolean; onClick: () => void; label: string; children: React.ReactNode }> = ({ active, onClick, label, children }) => (
    <button
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group relative ${active ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.08]'}`}
        onClick={onClick}
        title={label}
        aria-label={label}
    >
        {children}
        <span className="absolute left-full ml-2 px-2 py-1 text-[10px] font-medium bg-[#1E1E1E] text-white/80 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg border border-white/10">{label}</span>
    </button>
);

export default ToolPalette;
