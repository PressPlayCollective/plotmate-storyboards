import React from 'react';
import type { CameraTrack } from '../../types';
import { XIcon } from '../icons';

export interface CameraTrackMarkerProps {
    track: CameraTrack;
    isSelected: boolean;
    vbX: number;
    vbY: number;
    GRID_SIZE: number;
    onSelect: (id: string) => void;
    onUpdatePoint: (trackId: string, pointIndex: number, x: number, y: number) => void;
    onDelete: (id: string) => void;
}

const TRACK_STROKE = 'rgba(255,107,53,0.5)';
const TRACK_STROKE_WIDTH = 0.1;
const TRACK_DASH = '0.3 0.15';
const POINT_R = 0.2;
const POINT_FILL = '#FF6B35';

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

const CameraTrackMarker: React.FC<CameraTrackMarkerProps> = ({
    track,
    isSelected,
    vbX,
    vbY,
    GRID_SIZE,
    onSelect,
    onUpdatePoint,
    onDelete,
}) => {
    const { id, points, isBezier, dollyMarks } = track;
    const viewBox = `${vbX - 0.5} ${vbY - 0.5} ${GRID_SIZE} ${GRID_SIZE}`;

    const pathD =
        isBezier && points.length >= 4
            ? buildBezierPath(points)
            : null;
    const polylinePoints = !pathD && points.length >= 2 ? buildPolylinePoints(points) : null;

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
                            stroke={TRACK_STROKE}
                            strokeWidth={TRACK_STROKE_WIDTH}
                            strokeDasharray={TRACK_DASH}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}
                    {polylinePoints && (
                        <polyline
                            points={polylinePoints}
                            fill="none"
                            stroke={TRACK_STROKE}
                            strokeWidth={TRACK_STROKE_WIDTH}
                            strokeDasharray={TRACK_DASH}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}
                    {isSelected &&
                        points.map((pt, i) => (
                            <circle
                                key={`${id}-pt-${i}`}
                                cx={pt.x + 0.5}
                                cy={pt.y + 0.5}
                                r={POINT_R}
                                fill={POINT_FILL}
                                style={{ cursor: 'grab', pointerEvents: 'auto' }}
                                onMouseDown={(e) => handlePointMouseDown(e, i)}
                            />
                        ))}
                    {dollyMarks?.map((mark, i) => {
                        const t = Math.max(0, Math.min(1, mark.position));
                        const idx = Math.floor(t * (points.length - 1));
                        const frac = t * (points.length - 1) - idx;
                        const p0 = points[idx];
                        const p1 = points[Math.min(idx + 1, points.length - 1)];
                        if (!p0) return null;
                        const x = (p1 ? p0.x + frac * (p1.x - p0.x) : p0.x) + 0.5;
                        const y = (p1 ? p0.y + frac * (p1.y - p0.y) : p0.y) + 0.5;
                        return (
                            <g key={`dolly-${i}`}>
                                <circle cx={x} cy={y} r={0.15} fill={POINT_FILL} opacity={0.8} />
                                <text
                                    x={x}
                                    y={y - 0.35}
                                    textAnchor="middle"
                                    fontSize="0.25"
                                    fill="rgba(255,255,255,0.9)"
                                    fontFamily="Roboto, sans-serif"
                                >
                                    {mark.label}
                                </text>
                            </g>
                        );
                    })}
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
                        title="Remove track"
                        aria-label="Remove track"
                    >
                        <XIcon className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default CameraTrackMarker;
