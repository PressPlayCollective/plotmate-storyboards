import React from 'react';
import type { WalkArrow } from '../../types';
import { XIcon } from '../icons';

export interface WalkArrowMarkerProps {
    arrow: WalkArrow;
    characterColor: string;
    isSelected: boolean;
    vbX: number;
    vbY: number;
    GRID_SIZE: number;
    onSelect: (id: string) => void;
    onUpdatePoint: (arrowId: string, pointIndex: number, x: number, y: number) => void;
    onDelete: (id: string) => void;
}

const STROKE_WIDTH = 0.1;
const POINT_R = 0.2;
const ARROW_SIZE = 0.35;

function colorWithOpacity(hexOrRgb: string, opacity: number): string {
    const s = hexOrRgb.trim();
    const hex = s.replace(/^#/, '');
    if (hex.length === 6 || hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r},${g},${b},${opacity})`;
    }
    if (s.startsWith('rgba')) return s.replace(/[\d.]+\)$/, `${opacity})`);
    if (s.startsWith('rgb')) return s.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
    return s;
}

function buildBezierPath(points: { x: number; y: number }[]): string {
    if (points.length < 4) return '';
    let d = `M ${points[0].x + 0.5} ${points[0].y + 0.5}`;
    for (let i = 1; i + 2 < points.length; i += 3) {
        const [c1, c2, p] = [points[i], points[i + 1], points[i + 2]];
        d += ` C ${c1.x + 0.5} ${c1.y + 0.5} ${c2.x + 0.5} ${c2.y + 0.5} ${p.x + 0.5} ${p.y + 0.5}`;
    }
    return d;
}

function buildPolylinePoints(points: { x: number; y: number }[]): string {
    return points.map(p => `${p.x + 0.5},${p.y + 0.5}`).join(' ');
}

function getLastSegmentAngle(points: { x: number; y: number }[]): number {
    if (points.length < 2) return 0;
    const a = points[points.length - 2];
    const b = points[points.length - 1];
    return Math.atan2(b.y - a.y, b.x - a.x);
}

const WalkArrowMarker: React.FC<WalkArrowMarkerProps> = ({
    arrow,
    characterColor,
    isSelected,
    vbX,
    vbY,
    GRID_SIZE,
    onSelect,
    onUpdatePoint,
    onDelete,
}) => {
    const { id, points, isBezier } = arrow;
    const viewBox = `${vbX - 0.5} ${vbY - 0.5} ${GRID_SIZE} ${GRID_SIZE}`;
    const stroke = colorWithOpacity(characterColor, 0.5);

    const pathD =
        isBezier && points.length >= 4
            ? buildBezierPath(points)
            : null;
    const polylinePoints = !pathD && points.length >= 2 ? buildPolylinePoints(points) : null;

    const lastAngle = points.length >= 2 ? getLastSegmentAngle(points) : 0;
    const lastPt = points.length > 0 ? { x: points[points.length - 1].x + 0.5, y: points[points.length - 1].y + 0.5 } : null;

    const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null);
    const dragStartRef = React.useRef({ ix: -1 });
    const svgRef = React.useRef<SVGSVGElement>(null);

    const handlePointMouseDown = (e: React.MouseEvent, pointIndex: number) => {
        e.stopPropagation();
        onSelect(id);
        dragStartRef.current = { ix: pointIndex };
        setDraggingIndex(pointIndex);
    };

    React.useEffect(() => {
        if (draggingIndex === null) return;
        const onMove = (e: MouseEvent) => {
            const svg = svgRef.current;
            if (!svg) return;
            const ctm = svg.getScreenCTM();
            if (!ctm) return;
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const local = pt.matrixTransform(ctm.inverse());
            onUpdatePoint(id, dragStartRef.current.ix, local.x, local.y);
        };
        const onUp = () => setDraggingIndex(null);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [draggingIndex, id, onUpdatePoint]);

    return (
        <div
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            aria-hidden
        >
            <svg
                ref={svgRef}
                className="absolute inset-0 w-full h-full overflow-visible"
                style={{ pointerEvents: 'none' }}
                viewBox={viewBox}
                preserveAspectRatio="xMidYMid meet"
            >
                <g
                    pointerEvents="auto"
                    onClick={(e) => { e.stopPropagation(); onSelect(id); }}
                    style={{ cursor: 'default' }}
                >
                    {pathD && (
                        <path
                            d={pathD}
                            fill="none"
                            stroke={stroke}
                            strokeWidth={STROKE_WIDTH}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}
                    {polylinePoints && (
                        <polyline
                            points={polylinePoints}
                            fill="none"
                            stroke={stroke}
                            strokeWidth={STROKE_WIDTH}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}
                    {lastPt && points.length >= 2 && (
                        <g
                            transform={`translate(${lastPt.x},${lastPt.y}) rotate(${(lastAngle * 180) / Math.PI})`}
                        >
                            <polygon
                                points={`0,${ARROW_SIZE} ${-ARROW_SIZE * 0.6},${-ARROW_SIZE * 0.6} ${0},${-ARROW_SIZE * 0.2} ${ARROW_SIZE * 0.6},${-ARROW_SIZE * 0.6}`}
                                fill={stroke}
                            />
                        </g>
                    )}
                    {isSelected &&
                        points.map((pt, i) => (
                            <circle
                                key={`${id}-pt-${i}`}
                                cx={pt.x + 0.5}
                                cy={pt.y + 0.5}
                                r={POINT_R}
                                fill={characterColor}
                                style={{ cursor: 'grab', pointerEvents: 'auto' }}
                                onMouseDown={(e) => handlePointMouseDown(e, i)}
                            />
                        ))}
                </g>
            </svg>
            {isSelected && points.length > 0 && (
                <div
                    className="absolute pointer-events-auto"
                    style={{
                        left: `${((points[0].x + 0.5 - vbX) / GRID_SIZE) * 100}%`,
                        top: `${((points[0].y + 0.5 - vbY) / GRID_SIZE) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                    }}
                >
                    <button
                        className="w-5 h-5 flex items-center justify-center bg-red-500/90 rounded-full text-white hover:bg-red-500 shadow-md z-10"
                        onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                        title="Remove walk arrow"
                        aria-label="Remove walk arrow"
                    >
                        <XIcon className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default WalkArrowMarker;
