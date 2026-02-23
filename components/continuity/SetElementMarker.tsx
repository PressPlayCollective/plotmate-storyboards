import React from 'react';
import type { SetElement, SetElementType } from '../../types';
import { XIcon } from '../icons';
import { type Mode, type SelectedObject } from './shared';
import RotationHandle from './RotationHandle';

const renderShape = (type: SetElementType, w: number, h: number): React.ReactNode => {
    const cx = w / 2;
    const cy = h / 2;
    const s = 'rgba(255,255,255,0.6)';
    const sW = 0.12;
    const f = 'rgba(255,255,255,0.06)';
    switch (type) {
        case 'window': return <>
            <line x1={0} y1={cy} x2={w} y2={cy} stroke={s} strokeWidth={sW} />
            <line x1={0.15} y1={cy - h * 0.4} x2={0.15} y2={cy + h * 0.4} stroke={s} strokeWidth={sW} />
            <line x1={w - 0.15} y1={cy - h * 0.4} x2={w - 0.15} y2={cy + h * 0.4} stroke={s} strokeWidth={sW} />
        </>;
        case 'door_open': return <>
            <line x1={0} y1={0} x2={0} y2={h} stroke={s} strokeWidth={sW} strokeLinecap="round" />
            <path d={`M 0 0 A ${w} ${w} 0 0 1 ${w} 0`} fill="none" stroke={s} strokeWidth={sW * 0.8} opacity={0.6} />
        </>;
        case 'door_closed': return <>
            <line x1={0} y1={0} x2={0} y2={h} stroke={s} strokeWidth={sW} strokeLinecap="round" />
            <line x1={0} y1={0} x2={w} y2={0} stroke={s} strokeWidth={sW} strokeLinecap="round" />
        </>;
        case 'double_door_open': return <>
            <path d={`M 0 ${h} A ${w * 0.5} ${w * 0.5} 0 0 1 ${cx} ${h - w * 0.5}`} fill="none" stroke={s} strokeWidth={sW * 0.8} opacity={0.6} />
            <path d={`M ${w} ${h} A ${w * 0.5} ${w * 0.5} 0 0 0 ${cx} ${h - w * 0.5}`} fill="none" stroke={s} strokeWidth={sW * 0.8} opacity={0.6} />
        </>;
        case 'double_door_closed': return <>
            <line x1={0} y1={0} x2={0} y2={h} stroke={s} strokeWidth={sW} />
            <line x1={w} y1={0} x2={w} y2={h} stroke={s} strokeWidth={sW} />
            <line x1={0} y1={0} x2={cx} y2={0} stroke={s} strokeWidth={sW} />
            <line x1={w} y1={0} x2={cx} y2={0} stroke={s} strokeWidth={sW} />
        </>;
        case 'medium_opening': return <>
            <line x1={0.15} y1={cy - h * 0.4} x2={0.15} y2={cy + h * 0.4} stroke={s} strokeWidth={sW} />
            <line x1={w - 0.15} y1={cy - h * 0.4} x2={w - 0.15} y2={cy + h * 0.4} stroke={s} strokeWidth={sW} />
        </>;
        case 'prison_bars': return <>
            <line x1={0} y1={cy} x2={w} y2={cy} stroke={s} strokeWidth={sW} />
            {Array.from({ length: Math.max(3, Math.round(w / 0.35)) }, (_, i) => {
                const bx = (i + 0.5) * (w / Math.max(3, Math.round(w / 0.35)));
                return <line key={i} x1={bx} y1={cy - h * 0.4} x2={bx} y2={cy + h * 0.4} stroke={s} strokeWidth={sW * 0.7} />;
            })}
        </>;
        case 'table': return <rect x={0} y={0} width={w} height={h} rx={0.2} fill={f} stroke={s} strokeWidth={sW} />;
        case 'chair': return <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill={f} stroke={s} strokeWidth={sW} />;
        case 'sofa': return <>
            <rect x={0} y={h * 0.3} width={w} height={h * 0.7} rx={0.12} fill={f} stroke={s} strokeWidth={sW} />
            <rect x={0.1} y={0} width={w - 0.2} height={h * 0.35} rx={0.1} fill="rgba(255,255,255,0.03)" stroke={s} strokeWidth={0.05} />
        </>;
        case 'bed': return <>
            <rect x={0} y={0} width={w} height={h} rx={0.15} fill={f} stroke={s} strokeWidth={sW} />
            <rect x={0.1} y={0.1} width={w - 0.2} height={h * 0.25} rx={0.1} fill="rgba(255,255,255,0.04)" stroke={s} strokeWidth={0.04} />
        </>;
        case 'desk': return <>
            <rect x={0} y={0} width={w} height={h} rx={0.1} fill={f} stroke={s} strokeWidth={sW} />
            <rect x={w * 0.55} y={h * 0.15} width={w * 0.35} height={h * 0.7} rx={0.05} fill="rgba(255,255,255,0.04)" stroke={s} strokeWidth={0.04} />
        </>;
        case 'car': return <>
            <rect x={0} y={0} width={w} height={h} rx={0.3} fill={f} stroke={s} strokeWidth={sW} />
            <line x1={0.2} y1={h * 0.3} x2={w - 0.2} y2={h * 0.3} stroke={s} strokeWidth={0.04} />
        </>;
        case 'tree': return <circle cx={cx} cy={cy} r={Math.min(w, h) / 2} fill="rgba(100,180,100,0.1)" stroke="rgba(100,180,100,0.3)" strokeWidth={sW} />;
        case 'stairs': return <>
            <rect x={0} y={0} width={w} height={h} fill={f} stroke={s} strokeWidth={sW} rx={0.08} />
            {Array.from({ length: Math.max(2, Math.round(h / 0.6)) }, (_, i) => {
                const sy = (i + 0.5) * (h / Math.max(2, Math.round(h / 0.6)));
                return <line key={i} x1={0.1} y1={sy} x2={w - 0.1} y2={sy} stroke={s} strokeWidth={0.04} />;
            })}
        </>;
        case 'round_table': return <circle cx={cx} cy={cy} r={Math.min(w, h) / 2} fill={f} stroke={s} strokeWidth={sW} />;
        case 'oval_table': return <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill={f} stroke={s} strokeWidth={sW} />;
        case 'monitor': return <>
            <rect x={0} y={0} width={w} height={h * 0.85} rx={0.08} fill={f} stroke={s} strokeWidth={sW} />
            <line x1={cx - w * 0.15} y1={h * 0.85} x2={cx + w * 0.15} y2={h} stroke={s} strokeWidth={sW} />
        </>;
        case 'laptop': return <>
            <rect x={0} y={0} width={w} height={h * 0.6} rx={0.06} fill={f} stroke={s} strokeWidth={sW} />
            <rect x={w * 0.1} y={h * 0.55} width={w * 0.8} height={h * 0.2} rx={0.04} fill={f} stroke={s} strokeWidth={sW} />
        </>;
        case 'keyboard': return <>
            <rect x={0} y={0} width={w} height={h} rx={0.08} fill={f} stroke={s} strokeWidth={sW} />
            {Array.from({ length: Math.max(4, Math.round(w / 0.25)) }, (_, i) => {
                const kx = (i + 0.5) * (w / Math.max(4, Math.round(w / 0.25)));
                return <line key={i} x1={kx} y1={h * 0.2} x2={kx} y2={h * 0.8} stroke={s} strokeWidth={0.03} />;
            })}
        </>;
        case 'bottle': return <circle cx={cx} cy={cy} r={Math.min(w, h) * 0.35} fill={f} stroke={s} strokeWidth={sW} />;
        case 'cell_phone': return <rect x={w * 0.15} y={h * 0.2} width={w * 0.7} height={h * 0.6} rx={0.15} fill={f} stroke={s} strokeWidth={sW} />;
        case 'paper': return <>
            <rect x={0} y={0} width={w} height={h} rx={0.05} fill={f} stroke={s} strokeWidth={sW} />
            <path d={`M ${w - 0.15} 0 L ${w} 0 L ${w} 0.15 Z`} fill="rgba(255,255,255,0.08)" stroke={s} strokeWidth={sW * 0.6} />
        </>;
        case 'plate': return <circle cx={cx} cy={cy} r={Math.min(w, h) / 2} fill="none" stroke={s} strokeWidth={sW} />;
        case 'big_opening': return <>
            <line x1={0.1} y1={cy - h * 0.45} x2={0.1} y2={cy + h * 0.45} stroke={s} strokeWidth={sW} />
            <line x1={w - 0.1} y1={cy - h * 0.45} x2={w - 0.1} y2={cy + h * 0.45} stroke={s} strokeWidth={sW} />
        </>;
        case 'small_opening': return <>
            <line x1={0.12} y1={cy - h * 0.35} x2={0.12} y2={cy + h * 0.35} stroke={s} strokeWidth={sW} />
            <line x1={w - 0.12} y1={cy - h * 0.35} x2={w - 0.12} y2={cy + h * 0.35} stroke={s} strokeWidth={sW} />
        </>;
        case 'bush': return <circle cx={cx} cy={cy} r={Math.min(w, h) / 2} fill="rgba(100,180,100,0.1)" stroke="rgba(100,180,100,0.3)" strokeWidth={sW} />;
        case 'minibus': return <>
            <rect x={0} y={0} width={w} height={h} rx={0.25} fill={f} stroke={s} strokeWidth={sW} />
            <line x1={w * 0.25} y1={h * 0.25} x2={w * 0.25} y2={h * 0.75} stroke={s} strokeWidth={0.04} />
        </>;
        case 'motorcycle': return <>
            <rect x={w * 0.2} y={h * 0.3} width={w * 0.6} height={h * 0.4} rx={0.1} fill={f} stroke={s} strokeWidth={sW} />
            <line x1={cx} y1={0} x2={cx - w * 0.2} y2={h * 0.15} stroke={s} strokeWidth={sW} />
            <line x1={cx} y1={0} x2={cx + w * 0.2} y2={h * 0.15} stroke={s} strokeWidth={sW} />
        </>;
        case 'semi_truck': return <>
            <rect x={0} y={0} width={w * 0.25} height={h} rx={0.1} fill={f} stroke={s} strokeWidth={sW} />
            <rect x={w * 0.25} y={0} width={w * 0.75} height={h} rx={0.08} fill={f} stroke={s} strokeWidth={sW} />
        </>;
        case 'truck_trailer': return <>
            <rect x={0} y={0} width={w * 0.3} height={h} rx={0.1} fill={f} stroke={s} strokeWidth={sW} />
            <rect x={w * 0.3} y={0} width={w * 0.7} height={h} rx={0.06} fill={f} stroke={s} strokeWidth={sW} />
        </>;
        case 'tank': return <>
            <rect x={0} y={0} width={w} height={h} rx={0.08} fill={f} stroke={s} strokeWidth={sW} />
            <circle cx={cx} cy={h * 0.35} r={Math.min(w, h) * 0.2} fill={f} stroke={s} strokeWidth={sW} />
            <line x1={cx} y1={h * 0.35} x2={cx} y2={0} stroke={s} strokeWidth={sW} />
        </>;
        case 'commercial_jet': return <>
            <ellipse cx={cx} cy={cy} rx={w / 2} ry={h * 0.25} fill={f} stroke={s} strokeWidth={sW} />
            <line x1={w * 0.1} y1={cy} x2={w * 0.5} y2={cy - h * 0.35} stroke={s} strokeWidth={sW * 0.8} />
            <line x1={w * 0.1} y1={cy} x2={w * 0.5} y2={cy + h * 0.35} stroke={s} strokeWidth={sW * 0.8} />
        </>;
        case 'fighter_jet': return <>
            <ellipse cx={cx} cy={cy} rx={w * 0.4} ry={h * 0.2} fill={f} stroke={s} strokeWidth={sW} />
            <path d={`M ${w * 0.15} ${cy} L ${w * 0.85} ${cy - h * 0.4} L ${w * 0.95} ${cy} L ${w * 0.85} ${cy + h * 0.4} Z`} fill={f} stroke={s} strokeWidth={sW} />
        </>;
        case 'small_plane': return <>
            <ellipse cx={cx} cy={cy} rx={w * 0.45} ry={h * 0.28} fill={f} stroke={s} strokeWidth={sW} />
            <line x1={w * 0.15} y1={cy} x2={w * 0.55} y2={cy - h * 0.38} stroke={s} strokeWidth={sW * 0.8} />
            <line x1={w * 0.15} y1={cy} x2={w * 0.55} y2={cy + h * 0.38} stroke={s} strokeWidth={sW * 0.8} />
        </>;
        case 'crane': return <>
            <circle cx={cx} cy={h - 0.2} r={Math.min(w, h) * 0.15} fill={f} stroke={s} strokeWidth={sW} />
            <line x1={cx} y1={h - 0.2} x2={cx} y2={h * 0.3} stroke={s} strokeWidth={sW} />
            <line x1={cx} y1={h * 0.3} x2={w - 0.1} y2={0.2} stroke={s} strokeWidth={sW} />
        </>;
        case 'boom_microphone': return <>
            <line x1={cx} y1={h} x2={cx} y2={h * 0.4} stroke={s} strokeWidth={sW} />
            <line x1={cx} y1={h * 0.4} x2={w * 0.85} y2={h * 0.1} stroke={s} strokeWidth={sW} />
            <circle cx={w * 0.85} cy={h * 0.1} r={Math.min(w, h) * 0.12} fill={f} stroke={s} strokeWidth={sW} />
        </>;
        case 'equipment': return <>
            <rect x={0} y={0} width={w} height={h} rx={0.1} fill={f} stroke={s} strokeWidth={sW} />
            <line x1={0} y1={0} x2={w} y2={h} stroke={s} strokeWidth={sW * 0.8} />
            <line x1={w} y1={0} x2={0} y2={h} stroke={s} strokeWidth={sW * 0.8} />
        </>;
        case 'monitor_village': return <>
            <rect x={w * 0.05} y={h * 0.2} width={w * 0.25} height={h * 0.6} rx={0.05} fill={f} stroke={s} strokeWidth={sW} />
            <rect x={w * 0.375} y={h * 0.2} width={w * 0.25} height={h * 0.6} rx={0.05} fill={f} stroke={s} strokeWidth={sW} />
            <rect x={w * 0.7} y={h * 0.2} width={w * 0.25} height={h * 0.6} rx={0.05} fill={f} stroke={s} strokeWidth={sW} />
        </>;
        case 'gun': return <>
            <rect x={w * 0.2} y={h * 0.35} width={w * 0.5} height={h * 0.3} rx={0.05} fill={f} stroke="rgba(200,150,150,0.6)" strokeWidth={sW} />
            <line x1={w * 0.7} y1={cy} x2={w} y2={cy} stroke="rgba(200,150,150,0.6)" strokeWidth={sW} />
        </>;
        case 'rifle': return <>
            <rect x={w * 0.1} y={h * 0.35} width={w * 0.7} height={h * 0.28} rx={0.05} fill={f} stroke="rgba(200,150,150,0.6)" strokeWidth={sW} />
            <line x1={w * 0.8} y1={cy} x2={w - 0.05} y2={cy} stroke="rgba(200,150,150,0.6)" strokeWidth={sW} />
        </>;
        case 'dog': return <>
            <ellipse cx={cx} cy={cy} rx={w * 0.35} ry={h * 0.3} fill="rgba(100,180,100,0.1)" stroke="rgba(100,180,100,0.3)" strokeWidth={sW} />
            <circle cx={cx + w * 0.25} cy={cy - h * 0.1} r={Math.min(w, h) * 0.18} fill="rgba(100,180,100,0.1)" stroke="rgba(100,180,100,0.3)" strokeWidth={sW} />
            <line x1={cx - w * 0.2} y1={cy + h * 0.2} x2={cx - w * 0.25} y2={h - 0.05} stroke="rgba(100,180,100,0.3)" strokeWidth={sW * 0.8} />
            <line x1={cx + w * 0.05} y1={cy + h * 0.25} x2={cx + w * 0.05} y2={h - 0.05} stroke="rgba(100,180,100,0.3)" strokeWidth={sW * 0.8} />
            <line x1={cx + w * 0.25} y1={cy + h * 0.2} x2={cx + w * 0.3} y2={h - 0.05} stroke="rgba(100,180,100,0.3)" strokeWidth={sW * 0.8} />
        </>;
        case 'horse': return <>
            <ellipse cx={cx} cy={cy} rx={w * 0.4} ry={h * 0.35} fill="rgba(100,180,100,0.1)" stroke="rgba(100,180,100,0.3)" strokeWidth={sW} />
            <circle cx={cx + w * 0.3} cy={cy - h * 0.15} r={Math.min(w, h) * 0.2} fill="rgba(100,180,100,0.1)" stroke="rgba(100,180,100,0.3)" strokeWidth={sW} />
            <line x1={cx - w * 0.35} y1={cy + h * 0.25} x2={cx - w * 0.4} y2={h - 0.05} stroke="rgba(100,180,100,0.3)" strokeWidth={sW * 0.8} />
            <line x1={cx - w * 0.1} y1={cy + h * 0.3} x2={cx - w * 0.1} y2={h - 0.05} stroke="rgba(100,180,100,0.3)" strokeWidth={sW * 0.8} />
            <line x1={cx + w * 0.15} y1={cy + h * 0.3} x2={cx + w * 0.15} y2={h - 0.05} stroke="rgba(100,180,100,0.3)" strokeWidth={sW * 0.8} />
            <line x1={cx + w * 0.4} y1={cy + h * 0.25} x2={cx + w * 0.45} y2={h - 0.05} stroke="rgba(100,180,100,0.3)" strokeWidth={sW * 0.8} />
        </>;
        case 'straight_arrow': return <>
            <defs><marker id="arrowhead-sa" markerWidth={0.35} markerHeight={0.25} refX={0.15} refY={0.125} orient="auto"><polygon points="0 0, 0.35 0.125, 0 0.25" fill={s} /></marker></defs>
            <line x1={cx} y1={h} x2={cx} y2={0} stroke={s} strokeWidth={sW} markerEnd="url(#arrowhead-sa)" />
        </>;
        case 'curved_arrow': return <>
            <defs><marker id="arrowhead-ca" markerWidth={0.35} markerHeight={0.25} refX={0.15} refY={0.125} orient="auto"><polygon points="0 0, 0.35 0.125, 0 0.25" fill={s} /></marker></defs>
            <path d={`M ${cx} ${h} Q ${w * 0.8} ${h * 0.2} ${cx} 0`} fill="none" stroke={s} strokeWidth={sW} markerEnd="url(#arrowhead-ca)" />
        </>;
        default: return <rect x={0} y={0} width={w} height={h} fill={f} stroke={s} strokeWidth={sW} strokeDasharray="0.18 0.1" rx={0.15} />;
    }
};

export { renderShape as renderSetElementShape };

interface SetElementMarkerProps {
    elem: SetElement;
    isSelected: boolean;
    mode: Mode;
    vbX: number;
    vbY: number;
    GRID_SIZE: number;
    onSelect: (obj: SelectedObject | null) => void;
    onDragStart: (e: React.MouseEvent, id: string) => void;
    onRotateStart: (e: React.MouseEvent, id: string) => void;
    onDelete: (id: string) => void;
    isDragging: React.MutableRefObject<boolean>;
}

const SetElementMarker: React.FC<SetElementMarkerProps> = ({
    elem, isSelected, mode, vbX, vbY, GRID_SIZE, onSelect, onDragStart, onRotateStart, onDelete, isDragging,
}) => {
    const w = elem.width;
    const h = elem.height;
    const padW = Math.max(w, 1.5);
    const padH = Math.max(h, 1.5);
    const elemAngle = elem.angle || 0;
    const type = elem.type;
    const isLinearType = type === 'window' || type === 'medium_opening' || type === 'prison_bars';

    return (
        <div
            className="absolute pointer-events-auto group"
            style={{
                left: `${((elem.x + w / 2 - vbX + 0.5) / GRID_SIZE) * 100}%`,
                top: `${((elem.y + h / 2 - vbY + 0.5) / GRID_SIZE) * 100}%`,
                width: `${(padW / GRID_SIZE) * 100}%`,
                height: `${(padH / GRID_SIZE) * 100}%`,
                transform: `translate(-50%, -50%) rotate(${elemAngle}deg)`,
                cursor: mode === 'none' ? 'grab' : undefined,
            }}
            onMouseDown={(e) => mode === 'none' && onDragStart(e, elem.id)}
            onClick={(e) => {
                if (mode === 'none' && !isDragging.current) {
                    e.stopPropagation();
                    onSelect(isSelected ? null : { type: 'set_element', id: elem.id });
                }
            }}
        >
            <svg
                className="absolute inset-0 w-full h-full overflow-visible"
                viewBox={`0 0 ${padW} ${padH}`}
                preserveAspectRatio="xMidYMid meet"
            >
                <g transform={`translate(${(padW - w) / 2}, ${(padH - h) / 2})`}>
                    {renderShape(type, w, h)}
                    {elem.label && (
                        <text
                            x={w / 2}
                            y={isLinearType ? h / 2 + h * 0.7 : h / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="rgba(255,255,255,0.65)"
                            fontSize={0.4}
                            fontFamily="Roboto, sans-serif"
                            fontWeight="600"
                        >
                            {elem.label}
                        </text>
                    )}
                </g>
            </svg>
            <div className={`absolute inset-0 rounded transition-all ${isSelected ? 'ring-2 ring-white/60' : ''}`} />
            <button
                className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-red-500/90 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow-md z-10"
                onClick={(e) => { e.stopPropagation(); onDelete(elem.id); }}
                title={`Remove "${elem.label}"`}
                aria-label={`Remove "${elem.label}"`}
            >
                <XIcon className="w-2.5 h-2.5" />
            </button>
            {isSelected && (
                <RotationHandle
                    angle={elemAngle}
                    color="rgba(255,255,255,0.8)"
                    radius={30}
                    onRotateStart={(e) => onRotateStart(e, elem.id)}
                />
            )}
        </div>
    );
};

export default SetElementMarker;
