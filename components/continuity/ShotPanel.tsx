import React from 'react';
import type { Shot } from '../../types';
import { ExclamationTriangleIcon, MapPinIcon, TrashIcon, ViewfinderCircleIcon } from '../icons';
import { SHOT_SOLID_COLORS } from './shared';

interface ShotPanelProps {
    shots: Shot[];
    activeShotId: string | null;
    setActiveShotId: (id: string | null) => void;
    onSelectShot: (shotId: string) => void;
    computedWarnings: Record<string, boolean>;
    onDeleteShot: (shotId: string) => void;
}

const ShotPanel: React.FC<ShotPanelProps> = ({
    shots, activeShotId, setActiveShotId, onSelectShot, computedWarnings, onDeleteShot,
}) => {
    return (
        <div className="w-64 flex-shrink-0 bg-[#0f1012] border-l border-white/[0.08] flex flex-col overflow-hidden z-10">
            <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.08]">
                <h4 className="text-xs font-semibold text-white/60 uppercase tracking-widest">Shots</h4>
                <span className="text-[10px] text-white/30 font-mono bg-white/5 px-1.5 py-0.5 rounded">{shots.length}</span>
            </div>

            <div className="flex-grow overflow-y-auto p-2 space-y-1">
                {shots.map((shot, idx) => {
                    const isActive = activeShotId === shot.id;
                    const shotColor = shot.positions?.cameraColor || SHOT_SOLID_COLORS[idx % SHOT_SOLID_COLORS.length];
                    return (
                        <button
                            key={shot.id}
                            onClick={() => setActiveShotId(shot.id)}
                            onDoubleClick={() => onSelectShot(shot.id)}
                            className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2.5 transition-all group/shot ${
                                isActive
                                    ? 'bg-white/[0.08] shadow-lg border border-white/[0.08]'
                                    : 'hover:bg-white/[0.04] bg-transparent border border-transparent'
                            }`}
                        >
                            <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: isActive ? shotColor : `${shotColor}66` }} />

                            <div className="w-12 h-8 rounded flex-shrink-0 overflow-hidden bg-surface border border-white/[0.06]">
                                {shot.generatedImage ? (
                                    <img src={shot.generatedImage} alt={`Shot ${shot.shotNumber}`} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-[9px] text-white/25 font-mono">{shot.shotNumber}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className={`font-mono font-bold text-sm ${isActive ? 'text-white' : 'text-white/50'}`} style={isActive ? { color: shotColor } : undefined}>
                                        {shot.shotNumber}
                                    </span>
                                    <p className={`text-[11px] truncate ${isActive ? 'text-white/90' : 'text-white/50'}`}>
                                        {shot.parameters.shotSize || 'Unset'}
                                    </p>
                                </div>
                                <p className="text-[10px] text-white/30 truncate">
                                    {shot.positions?.cameraLabel ? `${shot.positions.cameraLabel} \u00b7 ` : ''}
                                    {shot.parameters.focalLength ? `${shot.parameters.focalLength}mm` : ''}{shot.parameters.composition ? ` \u00b7 ${shot.parameters.composition}` : ''}
                                    {!shot.parameters.focalLength && !shot.parameters.composition && !shot.positions?.cameraLabel ? '...' : ''}
                                </p>
                            </div>

                            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                                {shot.positions?.camera && (
                                    <div title="Camera placed" style={{ color: shotColor }}>
                                        <MapPinIcon className="w-3.5 h-3.5" />
                                    </div>
                                )}
                                {computedWarnings[shot.id] && (
                                    <div title="Crosses 180° line">
                                        <ExclamationTriangleIcon className="w-3.5 h-3.5 text-yellow-400" />
                                    </div>
                                )}
                            </div>

                            <div
                                className="flex-shrink-0 opacity-0 group-hover/shot:opacity-100 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); onDeleteShot(shot.id); }}
                                title={`Delete Shot ${shot.shotNumber}`}
                            >
                                <TrashIcon className="w-3.5 h-3.5 text-white/50 hover:text-red-400 transition-colors cursor-pointer" />
                            </div>
                        </button>
                    );
                })}
                {shots.length === 0 && (
                    <div className="text-center py-10 px-4">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                            <ViewfinderCircleIcon className="w-6 h-6 text-white/50" />
                        </div>
                        <p className="text-xs text-white/30 font-medium">No shots yet</p>
                        <p className="text-[10px] text-white/50 mt-1">Create shots in the Shot Builder first.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShotPanel;
