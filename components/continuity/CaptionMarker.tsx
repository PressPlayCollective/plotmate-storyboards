import React, { useRef, useEffect } from 'react';
import type { Caption } from '../../types';
import { XIcon } from '../icons';
import type { Mode } from './shared';

export interface CaptionMarkerProps {
    caption: Caption;
    isSelected: boolean;
    isEditing: boolean;
    mode: Mode;
    vbX: number;
    vbY: number;
    GRID_SIZE: number;
    onSelect: (id: string) => void;
    onDragStart: (e: React.MouseEvent, id: string) => void;
    onUpdate: (id: string, updates: Partial<Caption>) => void;
    onDelete: (id: string) => void;
    isDragging: React.MutableRefObject<boolean>;
}

const CaptionMarker: React.FC<CaptionMarkerProps> = ({
    caption,
    isSelected,
    isEditing,
    mode,
    vbX,
    vbY,
    GRID_SIZE,
    onSelect,
    onDragStart,
    onUpdate,
    onDelete,
    isDragging,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && isSelected && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing, isSelected]);

    const leftPct = ((caption.x + 1 - vbX) / GRID_SIZE) * 100;
    const topPct = ((caption.y + 1 - vbY) / GRID_SIZE) * 100;
    const fontSizePx = caption.fontSize;

    return (
        <div
            className="absolute pointer-events-auto group"
            style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                transform: 'translate(-50%, -50%)',
                cursor: mode === 'none' ? 'grab' : undefined,
            }}
            onMouseDown={(e) => mode === 'none' && onDragStart(e, caption.id)}
            onClick={(e) => {
                if (mode === 'none' && !isDragging.current) {
                    e.stopPropagation();
                    onSelect(caption.id);
                }
            }}
        >
            {isSelected && (
                <div
                    className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 flex items-center gap-0.5 p-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/[0.08] shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${caption.bold ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/90 hover:bg-white/10'}`}
                        onClick={() => onUpdate(caption.id, { bold: !caption.bold })}
                        title="Bold"
                        aria-label="Toggle bold"
                    >
                        <span className="text-xs font-bold">B</span>
                    </button>
                    <button
                        type="button"
                        className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${caption.italic ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/90 hover:bg-white/10'}`}
                        onClick={() => onUpdate(caption.id, { italic: !caption.italic })}
                        title="Italic"
                        aria-label="Toggle italic"
                    >
                        <span className="text-xs italic font-serif">I</span>
                    </button>
                    <label className="w-7 h-7 rounded overflow-hidden cursor-pointer flex items-center justify-center hover:bg-white/10 transition-colors" title="Color">
                        <input
                            type="color"
                            value={caption.color}
                            onChange={(e) => onUpdate(caption.id, { color: e.target.value })}
                            className="w-0 h-0 opacity-0 absolute"
                            aria-label="Text color"
                        />
                        <span
                            className="w-4 h-4 rounded border border-white/30"
                            style={{ backgroundColor: caption.color }}
                        />
                    </label>
                </div>
            )}

            <div className={`relative inline-block rounded ${isSelected ? 'ring-2 ring-white/50' : ''}`}>
                {isEditing && isSelected ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={caption.text}
                        onChange={(e) => onUpdate(caption.id, { text: e.target.value })}
                        onBlur={() => onUpdate(caption.id, { text: caption.text })}
                        className="min-w-[80px] max-w-[200px] px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/[0.08] text-white outline-none focus:ring-1 ring-white/30"
                        style={{
                            fontSize: `${fontSizePx}px`,
                            fontWeight: caption.bold ? 'bold' : undefined,
                            fontStyle: caption.italic ? 'italic' : undefined,
                            color: caption.color,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span
                        className="select-none whitespace-nowrap"
                        style={{
                            fontSize: `${fontSizePx}px`,
                            fontWeight: caption.bold ? 'bold' : undefined,
                            fontStyle: caption.italic ? 'italic' : undefined,
                            color: caption.color,
                        }}
                    >
                        {caption.text || 'Caption'}
                    </span>
                )}
            </div>

            <button
                className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-red-500/90 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow-md z-10"
                onClick={(e) => { e.stopPropagation(); onDelete(caption.id); }}
                title="Remove caption"
                aria-label="Remove caption"
            >
                <XIcon className="w-2.5 h-2.5" />
            </button>
        </div>
    );
};

export default CaptionMarker;
