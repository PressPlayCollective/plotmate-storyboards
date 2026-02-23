import React, { useState, useRef, useCallback } from 'react';
import type { DrawingStroke } from '../../types';
import { XIcon } from '../icons';

interface DrawingLayerProps {
    strokes: DrawingStroke[];
    isActive: boolean;
    vbX: number;
    vbY: number;
    GRID_SIZE: number;
    strokeColor: string;
    strokeWidth: number;
    selectedId: string | null;
    onAddStroke: (stroke: DrawingStroke) => void;
    onSelect: (id: string | null) => void;
    onDelete: (id: string) => void;
}

const pointsToPath = (points: { x: number; y: number }[]): string => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
};

const strokeBounds = (points: { x: number; y: number }[]) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
};

const DrawingLayer: React.FC<DrawingLayerProps> = ({
    strokes, isActive, vbX, vbY, GRID_SIZE, strokeColor, strokeWidth, selectedId, onAddStroke, onSelect, onDelete,
}) => {
    const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
    const currentPointsRef = useRef<{ x: number; y: number }[]>([]);
    const isDrawing = useRef(false);
    const svgRef = useRef<SVGSVGElement>(null);

    const getGridPoint = useCallback((e: React.MouseEvent): { x: number; y: number } | null => {
        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = (e.clientY - rect.top) / rect.height;
        return {
            x: vbX + nx * GRID_SIZE,
            y: vbY + ny * GRID_SIZE,
        };
    }, [vbX, vbY, GRID_SIZE]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!isActive) return;
        e.preventDefault();
        e.stopPropagation();
        isDrawing.current = true;
        const pt = getGridPoint(e);
        if (pt) {
            currentPointsRef.current = [pt];
            setCurrentPoints([pt]);
        }
    }, [isActive, getGridPoint]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDrawing.current) return;
        const pt = getGridPoint(e);
        if (pt) {
            currentPointsRef.current = [...currentPointsRef.current, pt];
            setCurrentPoints(currentPointsRef.current);
        }
    }, [getGridPoint]);

    const handleMouseUp = useCallback(() => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        const pts = currentPointsRef.current;
        if (pts.length >= 2) {
            onAddStroke({
                id: crypto.randomUUID(),
                points: pts,
                color: strokeColor,
                width: strokeWidth,
            });
        }
        currentPointsRef.current = [];
        setCurrentPoints([]);
    }, [strokeColor, strokeWidth, onAddStroke]);

    const handleStrokeClick = useCallback((e: React.MouseEvent, id: string) => {
        if (isDrawing.current) return;
        e.stopPropagation();
        onSelect(selectedId === id ? null : id);
    }, [selectedId, onSelect]);

    const selectedStroke = selectedId ? strokes.find(s => s.id === selectedId) : null;

    return (
        <>
            <svg
                ref={svgRef}
                className="absolute inset-0 w-full h-full"
                viewBox={`${vbX} ${vbY} ${GRID_SIZE} ${GRID_SIZE}`}
                preserveAspectRatio="xMidYMid meet"
                style={{
                    pointerEvents: isActive ? 'auto' : 'none',
                    cursor: isActive ? 'crosshair' : undefined,
                    zIndex: isActive ? 40 : 1,
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {strokes.map(stroke => (
                    <g key={stroke.id}>
                        {/* Wide invisible hit area for easier clicking */}
                        <path
                            d={pointsToPath(stroke.points)}
                            fill="none"
                            stroke="transparent"
                            strokeWidth={Math.max(stroke.width * 0.06, 0.5)}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ pointerEvents: isActive ? 'stroke' : 'none', cursor: 'pointer' }}
                            onClick={(e) => handleStrokeClick(e, stroke.id)}
                        />
                        <path
                            d={pointsToPath(stroke.points)}
                            fill="none"
                            stroke={stroke.color}
                            strokeWidth={stroke.width * 0.06}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={selectedId === stroke.id ? 1 : 0.8}
                            style={{ pointerEvents: 'none' }}
                        />
                        {selectedId === stroke.id && (
                            <path
                                d={pointsToPath(stroke.points)}
                                fill="none"
                                stroke="rgba(96,165,250,0.5)"
                                strokeWidth={stroke.width * 0.06 + 0.15}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ pointerEvents: 'none' }}
                            />
                        )}
                    </g>
                ))}
                {currentPoints.length >= 2 && (
                    <path
                        d={pointsToPath(currentPoints)}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth * 0.06}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.6}
                    />
                )}
            </svg>
            {/* Delete button overlay for selected stroke */}
            {selectedStroke && isActive && (() => {
                const bounds = strokeBounds(selectedStroke.points);
                const pctX = ((bounds.cx - vbX) / GRID_SIZE) * 100;
                const pctY = ((bounds.minY - vbY) / GRID_SIZE) * 100;
                return (
                    <button
                        className="absolute z-50 w-5 h-5 flex items-center justify-center bg-red-500/90 rounded-full text-white hover:bg-red-500 shadow-md pointer-events-auto"
                        style={{
                            left: `${pctX}%`,
                            top: `${pctY}%`,
                            transform: 'translate(-50%, -150%)',
                        }}
                        onClick={(e) => { e.stopPropagation(); onDelete(selectedStroke.id); }}
                        title="Delete drawing"
                        aria-label="Delete drawing"
                    >
                        <XIcon className="w-3 h-3" />
                    </button>
                );
            })()}
        </>
    );
};

export default DrawingLayer;
