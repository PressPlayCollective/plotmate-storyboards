import type { SceneContinuityData, SetElementType } from '../../types';

export type Mode = 'none' | 'place_camera' | 'place_character' | 'draw_line_start' | 'draw_line_end' | 'place_set_element' | 'draw_wall' | 'place_light' | 'draw_track' | 'draw_walk_arrow' | 'place_caption' | 'draw_freehand';

export interface DragTarget {
    type: 'character' | 'camera' | 'camera_rotate' | 'character_rotate' | 'light' | 'set_element' | 'light_rotate' | 'light_icon_rotate' | 'set_element_rotate' | 'caption';
    id: string;
}

export interface SelectedObject {
    type: 'character' | 'camera' | 'light' | 'set_element' | 'caption' | 'camera_track' | 'walk_arrow' | 'drawing' | 'oneEightyLine';
    id: string;
}

export interface CharacterInputState {
    x: number;
    y: number;
    name: string;
}

export interface SetElementInputState {
    x: number;
    y: number;
    label: string;
    type: SetElementType;
}

export interface LightInputState {
    x: number;
    y: number;
}

export interface ContinuitySnapshot {
    continuityData: SceneContinuityData;
    shotPositions: Record<string, import('../../types').ShotPositionData | undefined>;
}

export const BASE_GRID = 24;
export const MAX_UNDO_STEPS = 20;
export const FOV_CONE_LENGTH = 8;
export const MIN_ZOOM = 0.15;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.15;

export const SHOT_COLORS = [
    'rgba(34,197,94,0.2)',
    'rgba(59,130,246,0.2)',
    'rgba(168,85,247,0.2)',
    'rgba(251,146,60,0.2)',
    'rgba(236,72,153,0.2)',
    'rgba(20,184,166,0.2)',
    'rgba(245,158,11,0.2)',
    'rgba(139,92,246,0.2)',
];

export const SHOT_STROKE_COLORS = [
    'rgba(34,197,94,0.6)',
    'rgba(59,130,246,0.6)',
    'rgba(168,85,247,0.6)',
    'rgba(251,146,60,0.6)',
    'rgba(236,72,153,0.6)',
    'rgba(20,184,166,0.6)',
    'rgba(245,158,11,0.6)',
    'rgba(139,92,246,0.6)',
];

export const SHOT_SOLID_COLORS = [
    '#22c55e',
    '#3b82f6',
    '#a855f7',
    '#fb923c',
    '#ec4899',
    '#14b8a6',
    '#f59e0b',
    '#8b5cf6',
];

export const CHARACTER_COLORS = [
    '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
    '#6366f1', '#06b6d4', '#84cc16', '#e11d48',
];

export const getCharacterColor = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return CHARACTER_COLORS[Math.abs(hash) % CHARACTER_COLORS.length];
};

export const getInitials = (name: string): string => {
    const safe = (name ?? '').trim();
    if (!safe) return '??';
    const parts = safe.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return safe.slice(0, 2).toUpperCase();
};

export const getSideOfLine = (p: { x: number; y: number }, line: SceneContinuityData['oneEightyLine']): number => {
    if (!line) return 0;
    return Math.sign((line.p2.x - line.p1.x) * (p.y - line.p1.y) - (line.p2.y - line.p1.y) * (p.x - line.p1.x));
};

export const computeSafeZonePoints = (
    line: NonNullable<SceneContinuityData['oneEightyLine']>,
    safeSide: number,
    gridSize: number
): string => {
    // Offset by +0.5 to match visual SVG coordinates (line is rendered at cell center)
    const p1 = { x: line.p1.x + 0.5, y: line.p1.y + 0.5 };
    const p2 = { x: line.p2.x + 0.5, y: line.p2.y + 0.5 };
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    const minEdge = -0.5;
    const maxEdge = gridSize - 0.5;

    const tValues: number[] = [];
    if (dx !== 0) {
        tValues.push((minEdge - p1.x) / dx);
        tValues.push((maxEdge - p1.x) / dx);
    }
    if (dy !== 0) {
        tValues.push((minEdge - p1.y) / dy);
        tValues.push((maxEdge - p1.y) / dy);
    }

    const margin = 0.01;
    const boundaryPoints = tValues
        .map(t => ({ x: p1.x + t * dx, y: p1.y + t * dy }))
        .filter(p => p.x >= minEdge - margin && p.x <= maxEdge + margin &&
                     p.y >= minEdge - margin && p.y <= maxEdge + margin)
        .map(p => ({
            x: Math.max(minEdge, Math.min(maxEdge, p.x)),
            y: Math.max(minEdge, Math.min(maxEdge, p.y)),
        }));

    const unique: { x: number; y: number }[] = [];
    for (const pt of boundaryPoints) {
        if (!unique.some(u => Math.abs(u.x - pt.x) < 0.1 && Math.abs(u.y - pt.y) < 0.1)) {
            unique.push(pt);
        }
    }
    if (unique.length < 2) return '';

    const corners = [
        { x: minEdge, y: minEdge },
        { x: maxEdge, y: minEdge },
        { x: maxEdge, y: maxEdge },
        { x: minEdge, y: maxEdge },
    ];
    const safeCorners = corners.filter(c => {
        const side = Math.sign(dx * (c.y - p1.y) - dy * (c.x - p1.x));
        return side === safeSide;
    });

    const allPoints = [...unique, ...safeCorners];
    if (allPoints.length < 3) return '';
    const cx = allPoints.reduce((s, p) => s + p.x, 0) / allPoints.length;
    const cy = allPoints.reduce((s, p) => s + p.y, 0) / allPoints.length;
    allPoints.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));

    return allPoints.map(p => `${p.x},${p.y}`).join(' ');
};

export const computeFOVConePoints = (
    position: import('../../types').Position,
    focalLength: number,
    sensorWidth: number,
    coneLength: number
): string => {
    const cx = position.x + 0.5;
    const cy = position.y + 0.5;
    const angleRad = ((position.angle || 0) * Math.PI) / 180;
    const fovRad = 2 * Math.atan(sensorWidth / (2 * focalLength));
    const halfFov = fovRad / 2;

    const leftAngle = angleRad - halfFov;
    const rightAngle = angleRad + halfFov;

    const lx = cx + coneLength * Math.cos(leftAngle);
    const ly = cy + coneLength * Math.sin(leftAngle);
    const rx = cx + coneLength * Math.cos(rightAngle);
    const ry = cy + coneLength * Math.sin(rightAngle);

    return `${cx},${cy} ${lx},${ly} ${rx},${ry}`;
};
