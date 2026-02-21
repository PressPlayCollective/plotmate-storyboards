import React from 'react';
import type { Shot } from '../../types';
import { ExclamationTriangleIcon, XIcon } from '../icons';
import { type Mode, type SelectedObject, SHOT_SOLID_COLORS } from './shared';
import RotationHandle from './RotationHandle';

interface CameraMarkerProps {
    shot: Shot;
    idx: number;
    isActive: boolean;
    mode: Mode;
    gridToPercent: (coord: number) => string;
    computedWarnings: Record<string, boolean>;
    onSelect: (obj: SelectedObject | null, shotId: string) => void;
    onDragStart: (e: React.MouseEvent, id: string) => void;
    onRotateStart: (e: React.MouseEvent, id: string) => void;
    onDelete: (id: string) => void;
    isDragging: React.MutableRefObject<boolean>;
}

const CameraMarker: React.FC<CameraMarkerProps> = ({
    shot, idx, isActive, mode, gridToPercent, computedWarnings, onSelect, onDragStart, onRotateStart, onDelete, isDragging,
}) => {
    const shotColor = SHOT_SOLID_COLORS[idx % SHOT_SOLID_COLORS.length];
    const angleDeg = shot.positions!.camera.angle || 0;

    return (
        <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto group"
            style={{
                left: gridToPercent(shot.positions!.camera.x),
                top: gridToPercent(shot.positions!.camera.y),
                cursor: mode === 'none' ? 'grab' : undefined,
            }}
            onMouseDown={(e) => mode === 'none' && onDragStart(e, shot.id)}
            onClick={(e) => {
                if (mode === 'none' && !isDragging.current) {
                    e.stopPropagation();
                    onSelect({ type: 'camera', id: shot.id }, shot.id);
                }
            }}
        >
            <div className="relative flex items-center justify-center">
                <svg
                    width="48" height="36" viewBox="-24 -18 48 36"
                    className="drop-shadow-lg transition-transform"
                    style={{ transform: `rotate(${angleDeg}deg)` }}
                >
                    {isActive && (
                        <rect x="-20" y="-14" width="40" height="28" rx="6" fill="none" stroke={shotColor} strokeWidth="2" opacity="0.4">
                            <animate attributeName="opacity" values="0.4;0.15;0.4" dur="2s" repeatCount="indefinite" />
                        </rect>
                    )}
                    <rect x="10" y="-5" width="10" height="10" rx="2" fill={shotColor} opacity="0.8" />
                    <rect x="-14" y="-10" width="24" height="20" rx="3" fill={isActive ? shotColor : '#1a1a1a'} stroke={shotColor} strokeWidth={isActive ? 2.5 : 2} />
                    <circle cx="-5" cy="-3" r="3.5" fill="none" stroke={isActive ? '#fff' : shotColor} strokeWidth="1" opacity="0.4" />
                    <circle cx="-5" cy="3" r="2" fill="none" stroke={isActive ? '#fff' : shotColor} strokeWidth="1" opacity="0.3" />
                </svg>
                <span
                    className="absolute text-[11px] font-mono font-bold leading-none"
                    style={{ color: isActive ? '#fff' : shotColor, left: '50%', transform: 'translateX(-70%)' }}
                >
                    {shot.shotNumber}
                </span>
                {computedWarnings[shot.id] && (
                    <div className="absolute -top-1 -left-1" title="This shot crosses the 180° line">
                        <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400 drop-shadow-lg" />
                    </div>
                )}
                {shot.positions?.cameraLabel && (
                    <span
                        className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-white/70 px-1.5 py-0.5 rounded-md whitespace-nowrap font-medium leading-none"
                        style={{ backgroundColor: `${shotColor}25` }}
                    >
                        {shot.positions.cameraLabel}
                    </span>
                )}
                {isActive && (
                    <RotationHandle
                        angle={angleDeg}
                        color={shotColor}
                        radius={30}
                        onRotateStart={(e) => onRotateStart(e, shot.id)}
                    />
                )}
                <button
                    className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-red-500/90 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow-md z-10"
                    onClick={(e) => { e.stopPropagation(); onDelete(shot.id); }}
                    title="Remove camera"
                    aria-label="Remove camera"
                >
                    <XIcon className="w-2.5 h-2.5" />
                </button>
            </div>
        </div>
    );
};

export default CameraMarker;
