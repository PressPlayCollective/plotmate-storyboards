import React from 'react';
import type { LightingPosition } from '../../types';
import type { LightShape } from '../../constants';
import { XIcon } from '../icons';
import { type Mode, type SelectedObject } from './shared';
import LightShapeSVG from './LightShapeSVG';
import RotationHandle from './RotationHandle';

interface LightMarkerProps {
    lp: LightingPosition;
    resolvedLabel: string;
    isSelected: boolean;
    mode: Mode;
    GRID_SIZE: number;
    vbX: number;
    vbY: number;
    onSelect: (obj: SelectedObject | null) => void;
    onDragStart: (e: React.MouseEvent, id: string) => void;
    onRotateStart: (e: React.MouseEvent, id: string) => void;
    onIconRotateStart: (e: React.MouseEvent, id: string) => void;
    onDelete: (id: string) => void;
    onToggleBeam: (id: string) => void;
    isDragging: React.MutableRefObject<boolean>;
}

const LightMarker: React.FC<LightMarkerProps> = ({
    lp, resolvedLabel, isSelected, mode, GRID_SIZE, vbX, vbY, onSelect, onDragStart, onRotateStart, onIconRotateStart, onDelete, onToggleBeam, isDragging,
}) => {
    const lightR = 1.5;
    const lightAngle = lp.angle || 0;
    const iconAngle = lp.iconAngle || 0;
    const lightShape = (lp.shape || 'custom') as LightShape;
    const hitSize = `${(lightR * 2 / GRID_SIZE) * 100}%`;
    const beamVisible = lp.showBeam !== false;

    return (
        <div
            className="absolute pointer-events-auto group"
            style={{
                left: `${((lp.x + 1 - vbX) / GRID_SIZE) * 100}%`,
                top: `${((lp.y + 1 - vbY) / GRID_SIZE) * 100}%`,
                width: hitSize,
                height: hitSize,
                transform: 'translate(-50%, -50%)',
                cursor: mode === 'none' ? 'grab' : undefined,
            }}
            onMouseDown={(e) => mode === 'none' && onDragStart(e, lp.id)}
            onClick={(e) => {
                if (mode === 'none' && !isDragging.current) {
                    e.stopPropagation();
                    onSelect(isSelected ? null : { type: 'light', id: lp.id });
                }
            }}
        >
            <svg
                className="absolute inset-0 w-full h-full overflow-visible"
                viewBox={`${-lightR} ${-lightR} ${lightR * 2} ${lightR * 2}`}
            >
                <g transform={`rotate(${iconAngle} 0 0)`}>
                    <LightShapeSVG shape={lightShape} cx={0} cy={0} r={lightR} />
                </g>
                {beamVisible && (
                    <g transform={`rotate(${lightAngle} 0 0)`}>
                        <line x1={0} y1={0} x2={0} y2={2} stroke="rgba(250,204,21,0.6)" strokeWidth={0.08} strokeLinecap="round" />
                        <polygon points="-0.12,-0.2 0,0.15 0.12,-0.2" fill="rgba(250,204,21,0.6)" transform="translate(0,2)" />
                    </g>
                )}
                {resolvedLabel && (
                    <text
                        x={0} y={-1.7}
                        textAnchor="middle"
                        fontSize="0.38"
                        fill="rgba(160,220,100,0.85)"
                        fontFamily="Roboto, sans-serif"
                        fontWeight={600}
                    >
                        {resolvedLabel}
                    </text>
                )}
            </svg>
            <div className={`absolute inset-0 rounded-full transition-all ${isSelected ? 'ring-2 ring-yellow-400' : ''}`} />
            <button
                className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-red-500/90 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow-md z-10"
                onClick={(e) => { e.stopPropagation(); onDelete(lp.id); }}
                title="Remove light"
                aria-label="Remove light"
            >
                <XIcon className="w-2.5 h-2.5" />
            </button>
            {isSelected && (
                <>
                    <button
                        className={`absolute -top-1 -left-1 w-4 h-4 flex items-center justify-center rounded-full text-white transition-opacity shadow-md z-10 ${beamVisible ? 'bg-yellow-500/90 hover:bg-yellow-500' : 'bg-white/20 hover:bg-white/30'}`}
                        onClick={(e) => { e.stopPropagation(); onToggleBeam(lp.id); }}
                        title={beamVisible ? 'Hide beam direction' : 'Show beam direction'}
                        aria-label={beamVisible ? 'Hide beam direction' : 'Show beam direction'}
                    >
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            {beamVisible ? (
                                <>
                                    <circle cx="8" cy="8" r="3" />
                                    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4" />
                                </>
                            ) : (
                                <path d="M2 14L14 2M4 8a4 4 0 018 0" />
                            )}
                        </svg>
                    </button>
                    <RotationHandle
                        angle={iconAngle + 90}
                        color="#60a5fa"
                        radius={20}
                        onRotateStart={(e) => onIconRotateStart(e, lp.id)}
                    />
                    {beamVisible && (
                        <RotationHandle
                            angle={lightAngle + 90}
                            color="#facc15"
                            radius={34}
                            onRotateStart={(e) => onRotateStart(e, lp.id)}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default LightMarker;
