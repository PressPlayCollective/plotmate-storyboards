import React from 'react';
import type { CharacterPosition } from '../../types';
import { XIcon } from '../icons';
import { getCharacterColor, getInitials, type Mode, type SelectedObject } from './shared';
import RotationHandle from './RotationHandle';

interface CharacterMarkerProps {
    char: CharacterPosition;
    isSelected: boolean;
    mode: Mode;
    gridToPercent: (coord: number) => string;
    onSelect: (obj: SelectedObject | null) => void;
    onDragStart: (e: React.MouseEvent, id: string) => void;
    onRotateStart: (e: React.MouseEvent, id: string) => void;
    onDelete: (id: string) => void;
    isDragging: React.MutableRefObject<boolean>;
}

const MARKER_R = 16;
const DIR_LEN = 28;

const CharacterMarker: React.FC<CharacterMarkerProps> = ({
    char, isSelected, mode, gridToPercent, onSelect, onDragStart, onRotateStart, onDelete, isDragging,
}) => {
    const color = char.color || getCharacterColor(char.name);
    const initials = getInitials(char.name);
    const facingAngle = char.angle || 0;

    const radians = (facingAngle - 90) * Math.PI / 180;
    const dirX = DIR_LEN * Math.cos(radians);
    const dirY = DIR_LEN * Math.sin(radians);

    return (
        <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto group"
            style={{
                left: gridToPercent(char.x),
                top: gridToPercent(char.y),
                cursor: mode === 'none' ? 'grab' : undefined,
            }}
            onMouseDown={(e) => mode === 'none' && onDragStart(e, char.id)}
            onClick={(e) => {
                if (mode === 'none' && !isDragging.current) {
                    e.stopPropagation();
                    onSelect(isSelected ? null : { type: 'character', id: char.id });
                }
            }}
        >
            <div className="relative flex flex-col items-center">
                <svg
                    width="72" height="72" viewBox="-36 -36 72 72"
                    className="block overflow-visible"
                >
                    {isSelected && (
                        <circle cx="0" cy="0" r={MARKER_R + 5} fill="none" stroke={color} strokeWidth="2" opacity="0.35">
                            <animate attributeName="opacity" values="0.35;0.12;0.35" dur="2s" repeatCount="indefinite" />
                        </circle>
                    )}

                    <line
                        x1="0" y1="0" x2={dirX} y2={dirY}
                        stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.7"
                    />
                    <polygon
                        points={(() => {
                            const tipX = dirX;
                            const tipY = dirY;
                            const perpX = -Math.sin(radians) * 4;
                            const perpY = Math.cos(radians) * 4;
                            const backX = DIR_LEN * 0.72 * Math.cos(radians);
                            const backY = DIR_LEN * 0.72 * Math.sin(radians);
                            return `${tipX},${tipY} ${backX + perpX},${backY + perpY} ${backX - perpX},${backY - perpY}`;
                        })()}
                        fill={color} opacity="0.7"
                    />

                    <circle
                        cx="0" cy="0" r={MARKER_R}
                        fill={color}
                        stroke={isSelected ? 'white' : `${color}88`}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                    />

                    <text
                        x="0" y="1"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="white"
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="Roboto, sans-serif"
                    >
                        {initials}
                    </text>
                </svg>

                <span
                    className="-mt-2 text-[10px] text-white/90 px-1.5 py-0.5 rounded-md whitespace-nowrap font-semibold leading-none"
                    style={{ backgroundColor: `${color}30`, borderColor: `${color}20` }}
                >
                    {char.name}
                </span>

                <button
                    className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-red-500/90 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow-md"
                    onClick={(e) => { e.stopPropagation(); onDelete(char.id); }}
                    title="Remove character"
                    aria-label="Remove character"
                >
                    <XIcon className="w-2.5 h-2.5" />
                </button>

                {isSelected && (
                    <RotationHandle
                        angle={facingAngle}
                        color={color}
                        radius={32}
                        onRotateStart={(e) => onRotateStart(e, char.id)}
                    />
                )}
            </div>
        </div>
    );
};

export default CharacterMarker;
