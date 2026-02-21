/**
 * continuityTranslator.ts
 *
 * Pure-function module that converts raw overhead-canvas data (character/camera
 * positions, set elements, 180-line, walls, lights) into natural-language scene
 * descriptions suitable for AI image generation.
 *
 * CRITICAL RULE: No grid coordinates, no angle numbers, no mention of "camera",
 * "180-degree line", "grid", "axis", or any production equipment terms in the
 * output. Only describe what the final photograph looks like.
 */

import type {
    Position,
    CharacterPosition,
    SetElement,
    ShotPositionData,
    SceneContinuityData,
    LightingSetup,
    LightingPosition,
    WallSegment,
} from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScreenThird = 'left' | 'center' | 'right';
type DepthBucket = 'foreground' | 'midground' | 'background';

interface VisibleObject {
    name: string;
    screenPosition: ScreenThird;
    depth: DepthBucket;
    distance: number;
    facingDescription?: string;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Point-in-triangle using barycentric coordinates. */
function pointInTriangle(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number,
    cx: number, cy: number,
): boolean {
    const v0x = cx - ax, v0y = cy - ay;
    const v1x = bx - ax, v1y = by - ay;
    const v2x = px - ax, v2y = py - ay;

    const dot00 = v0x * v0x + v0y * v0y;
    const dot01 = v0x * v1x + v0y * v1y;
    const dot02 = v0x * v2x + v0y * v2y;
    const dot11 = v1x * v1x + v1y * v1y;
    const dot12 = v1x * v2x + v1y * v2y;

    const inv = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * inv;
    const v = (dot00 * dot12 - dot01 * dot02) * inv;

    return u >= 0 && v >= 0 && u + v <= 1;
}

/** Compute the three vertices of the FOV cone triangle. */
function fovConeTriangle(
    camera: Position,
    focalLength: number,
    sensorWidth: number,
    coneLength: number,
): { apex: { x: number; y: number }; left: { x: number; y: number }; right: { x: number; y: number } } {
    const cx = camera.x + 0.5;
    const cy = camera.y + 0.5;
    const angleRad = ((camera.angle || 0) * Math.PI) / 180;
    const fovRad = 2 * Math.atan(sensorWidth / (2 * focalLength));
    const halfFov = fovRad / 2;

    const leftAngle = angleRad - halfFov;
    const rightAngle = angleRad + halfFov;

    return {
        apex: { x: cx, y: cy },
        left: { x: cx + coneLength * Math.cos(leftAngle), y: cy + coneLength * Math.sin(leftAngle) },
        right: { x: cx + coneLength * Math.cos(rightAngle), y: cy + coneLength * Math.sin(rightAngle) },
    };
}

/**
 * Project a world point onto the camera's view plane and return the normalised
 * horizontal position (-1 = far left, 0 = center, +1 = far right).
 */
function projectToScreen(camera: Position, point: { x: number; y: number }): number {
    const angleRad = ((camera.angle || 0) * Math.PI) / 180;
    const dx = (point.x + 0.5) - (camera.x + 0.5);
    const dy = (point.y + 0.5) - (camera.y + 0.5);

    // Perpendicular to the camera's forward direction (screen-X axis)
    const perpX = -Math.sin(angleRad);
    const perpY = Math.cos(angleRad);

    // Forward axis dot product (depth)
    const forwardDot = dx * Math.cos(angleRad) + dy * Math.sin(angleRad);
    if (forwardDot <= 0) return 0; // behind camera

    // Screen-X dot product
    const screenX = dx * perpX + dy * perpY;

    // Normalise by depth to get perspective-correct screen position
    return screenX / forwardDot;
}

function screenThird(normalised: number): ScreenThird {
    if (normalised < -0.25) return 'left';
    if (normalised > 0.25) return 'right';
    return 'center';
}

function depthBucket(distance: number, maxDistance: number): DepthBucket {
    const ratio = distance / Math.max(maxDistance, 1);
    if (ratio < 0.35) return 'foreground';
    if (ratio < 0.65) return 'midground';
    return 'background';
}

function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ---------------------------------------------------------------------------
// Side-of-line helpers (for 180-line translation)
// ---------------------------------------------------------------------------

function sideOfLine(
    p: { x: number; y: number },
    line: { p1: { x: number; y: number }; p2: { x: number; y: number } },
): number {
    return Math.sign(
        (line.p2.x - line.p1.x) * (p.y - line.p1.y) -
        (line.p2.y - line.p1.y) * (p.x - line.p1.x)
    );
}

// ---------------------------------------------------------------------------
// Compass direction helper
// ---------------------------------------------------------------------------

function compassDirection(angleDeg: number): string {
    const norm = ((angleDeg % 360) + 360) % 360;
    if (norm < 22.5 || norm >= 337.5) return 'to the right';
    if (norm < 67.5) return 'to the lower-right';
    if (norm < 112.5) return 'downward';
    if (norm < 157.5) return 'to the lower-left';
    if (norm < 202.5) return 'to the left';
    if (norm < 247.5) return 'to the upper-left';
    if (norm < 292.5) return 'upward';
    return 'to the upper-right';
}

// ---------------------------------------------------------------------------
// Character facing description
// ---------------------------------------------------------------------------

function describeFacing(character: CharacterPosition, allCharacters: CharacterPosition[]): string {
    if (character.angle === undefined || character.angle === null) return '';

    // Check if facing toward another character (within ~45 degrees)
    const facingRad = (character.angle * Math.PI) / 180;
    for (const other of allCharacters) {
        if (other.id === character.id) continue;
        const dx = other.x - character.x;
        const dy = other.y - character.y;
        const toOtherAngle = Math.atan2(dy, dx);
        let diff = Math.abs(facingRad - toOtherAngle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff < Math.PI / 4) {
            return `facing toward ${other.name}`;
        }
    }

    return `facing ${compassDirection(character.angle)}`;
}

// Production equipment and annotation markers that exist on the floor plan
// for planning purposes but must never appear in generated images.
const NON_DIEGETIC_TYPES: ReadonlySet<string> = new Set([
    'crane', 'boom_microphone', 'equipment', 'monitor_village',
    'straight_arrow', 'curved_arrow',
]);

// ---------------------------------------------------------------------------
// Public: Compute visible objects
// ---------------------------------------------------------------------------

export function computeVisibleObjects(
    camera: Position,
    characters: CharacterPosition[],
    setElements: SetElement[],
    focalLength: number,
    sensorWidth: number,
    coneLength: number = 12,
): VisibleObject[] {
    const cone = fovConeTriangle(camera, focalLength, sensorWidth, coneLength);
    const results: VisibleObject[] = [];

    const allDistances = [
        ...characters.map(c => distanceBetween(camera, c)),
        ...setElements.map(e => distanceBetween(camera, { x: e.x + e.width / 2, y: e.y + e.height / 2 })),
    ];
    const maxDist = Math.max(...allDistances, 1);

    for (const char of characters) {
        const px = char.x + 0.5;
        const py = char.y + 0.5;
        if (pointInTriangle(px, py, cone.apex.x, cone.apex.y, cone.left.x, cone.left.y, cone.right.x, cone.right.y)) {
            const dist = distanceBetween(camera, char);
            const screenPos = projectToScreen(camera, char);
            results.push({
                name: char.name,
                screenPosition: screenThird(screenPos),
                depth: depthBucket(dist, maxDist),
                distance: dist,
                facingDescription: describeFacing(char, characters),
            });
        }
    }

    for (const elem of setElements) {
        if (NON_DIEGETIC_TYPES.has(elem.type)) continue;
        const center = { x: elem.x + elem.width / 2, y: elem.y + elem.height / 2 };
        const px = center.x;
        const py = center.y;
        if (pointInTriangle(px, py, cone.apex.x, cone.apex.y, cone.left.x, cone.left.y, cone.right.x, cone.right.y)) {
            const dist = distanceBetween(camera, center);
            const screenPos = projectToScreen(camera, center);
            results.push({
                name: elem.label || 'an object',
                screenPosition: screenThird(screenPos),
                depth: depthBucket(dist, maxDist),
                distance: dist,
            });
        }
    }

    // Sort by depth (foreground first)
    results.sort((a, b) => a.distance - b.distance);
    return results;
}

// ---------------------------------------------------------------------------
// Public: Describe character placements
// ---------------------------------------------------------------------------

export function describeCharacterPlacement(visible: VisibleObject): string {
    const parts: string[] = [];
    const positionMap: Record<ScreenThird, string> = {
        left: 'MUST appear in the LEFT THIRD of the frame (this is non-negotiable)',
        center: 'MUST appear in the CENTER of the frame',
        right: 'MUST appear in the RIGHT THIRD of the frame (this is non-negotiable)',
    };
    parts.push(`${visible.name} ${positionMap[visible.screenPosition]}`);
    if (visible.facingDescription) {
        parts.push(visible.facingDescription);
    }
    parts.push(`at ${visible.depth} depth`);
    return parts.join(', ');
}

// ---------------------------------------------------------------------------
// Public: Describe set elements
// ---------------------------------------------------------------------------

export function describeSetElements(visible: VisibleObject[]): string {
    const setItems = visible.filter(v => !v.facingDescription && v.facingDescription !== '');
    if (setItems.length === 0) return '';

    return setItems.map(item =>
        `${item.name} is in the ${item.screenPosition} ${item.depth}`
    ).join('. ');
}

// ---------------------------------------------------------------------------
// Public: 180-line constraint translation
// ---------------------------------------------------------------------------

export function describe180LineConstraints(
    line: { p1: { x: number; y: number }; p2: { x: number; y: number } },
    characters: CharacterPosition[],
    camera: Position,
): string {
    if (characters.length < 2) return '';

    const cameraSide = sideOfLine(camera, line);
    if (cameraSide === 0) return '';

    const leftChars: string[] = [];
    const rightChars: string[] = [];

    for (const char of characters) {
        const charSide = sideOfLine(char, line);
        const screenPos = projectToScreen(camera, char);
        const third = screenThird(screenPos);

        if (third === 'left' || (third === 'center' && screenPos < 0)) {
            leftChars.push(char.name);
        } else {
            rightChars.push(char.name);
        }
    }

    const parts: string[] = [];
    if (leftChars.length > 0 && rightChars.length > 0) {
        parts.push(`${leftChars.join(' and ')} must appear on the LEFT side of frame and ${rightChars.join(' and ')} on the RIGHT side`);
        parts.push(`Their eyelines should cross: ${leftChars.join(' and ')} looking screen-right, ${rightChars.join(' and ')} looking screen-left`);
    }

    return parts.join('. ');
}

// ---------------------------------------------------------------------------
// Public: Lighting context
// ---------------------------------------------------------------------------

export function describeLightingContext(
    lightPositions: LightingPosition[] | undefined,
    lightingSetups: LightingSetup[] | undefined,
    camera: Position,
): string {
    if (!lightPositions || lightPositions.length === 0) return '';

    const descriptions: string[] = [];

    for (const lp of lightPositions) {
        // Resolve the name / source: prefer script setup, fall back to standalone fields
        const setup = lp.setupId ? (lightingSetups || []).find(ls => ls.id === lp.setupId) : undefined;
        const lightName = setup?.name || lp.label || 'A light source';
        const lightColor = setup?.color;

        // Compute angle between light and camera's forward direction
        const dx = (lp.x + 0.5) - (camera.x + 0.5);
        const dy = (lp.y + 0.5) - (camera.y + 0.5);
        const lightAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        const cameraAngle = camera.angle || 0;

        let diff = ((lightAngle - cameraAngle) % 360 + 360) % 360;
        if (diff > 180) diff = 360 - diff;

        // Determine light direction relative to camera view
        const perpAngle = projectToScreen(camera, { x: lp.x, y: lp.y });
        let direction: string;

        if (diff > 135) {
            direction = 'from behind the subjects, creating a rim-light or halo effect';
        } else if (diff < 30) {
            direction = 'from the same direction as the viewpoint, providing flat front lighting';
        } else if (perpAngle < -0.2) {
            direction = 'from the left side, casting shadows to the right side of faces';
        } else if (perpAngle > 0.2) {
            direction = 'from the right side, casting shadows to the left side of faces';
        } else {
            direction = 'from roughly the front at an angle';
        }

        const colorNote = lightColor && lightColor !== 'White' ? `, with a ${lightColor.toLowerCase()} tint` : '';

        const beamNote = (lp.showBeam !== false && lp.angle !== undefined && lp.angle !== null)
            ? `, aimed ${compassDirection(lp.angle + 90)}`
            : '';
        descriptions.push(`${lightName} comes ${direction}${colorNote}${beamNote}`);
    }

    return descriptions.length > 0 ? descriptions.join('. ') + '.' : '';
}

// ---------------------------------------------------------------------------
// Public: Wall context
// ---------------------------------------------------------------------------

export function describeWalls(
    walls: WallSegment[] | undefined,
    camera: Position,
): string {
    if (!walls || walls.length === 0) return '';

    const cameraAngleRad = ((camera.angle || 0) * Math.PI) / 180;
    const forwardX = Math.cos(cameraAngleRad);
    const forwardY = Math.sin(cameraAngleRad);

    const wallDescriptions: string[] = [];

    for (const wall of walls) {
        if (wall.points.length < 2) continue;

        // Check if any segment of the wall is roughly in front of the camera
        let isVisible = false;
        for (const pt of wall.points) {
            const dx = (pt.x + 0.5) - (camera.x + 0.5);
            const dy = (pt.y + 0.5) - (camera.y + 0.5);
            const dot = dx * forwardX + dy * forwardY;
            if (dot > 0) {
                isVisible = true;
                break;
            }
        }

        if (isVisible) {
            if (wall.closedLoop) {
                wallDescriptions.push('enclosed walls forming a room boundary are visible');
            } else {
                wallDescriptions.push('a wall or partition is visible in the scene');
            }
        }
    }

    return wallDescriptions.length > 0 ? wallDescriptions.join('. ') + '.' : '';
}

// ---------------------------------------------------------------------------
// Public: Shot size description helper
// ---------------------------------------------------------------------------

function describeShotFraming(shotSize?: string): string {
    if (!shotSize) return 'a shot';
    const lower = shotSize.toLowerCase();
    if (lower.includes('extreme wide') || lower.includes('ews')) return 'an extreme wide shot';
    if (lower.includes('wide') || lower.includes('ws')) return 'a wide shot';
    if (lower.includes('full') || lower.includes('fs')) return 'a full shot';
    if (lower.includes('medium close') || lower.includes('mcu')) return 'a medium close-up';
    if (lower.includes('medium') || lower.includes('ms')) return 'a medium shot';
    if (lower.includes('close-up') || lower.includes('cu')) return 'a close-up';
    if (lower.includes('extreme close') || lower.includes('ecu')) return 'an extreme close-up';
    if (lower.includes('insert') || lower.includes('detail')) return 'an insert/detail shot';
    return 'a shot';
}

// ---------------------------------------------------------------------------
// Public: Main orchestrator
// ---------------------------------------------------------------------------

export function buildSpatialPrompt(
    continuityData: SceneContinuityData | undefined,
    shotPositions: ShotPositionData | undefined,
    focalLength: number,
    sensorWidth: number,
    shotSize?: string,
    sceneLighting?: LightingSetup[],
): string | undefined {
    if (!continuityData && !shotPositions) return undefined;

    const camera = shotPositions?.camera;
    if (!camera) return undefined;

    const characters = continuityData?.characters || [];
    const setElements = continuityData?.setElements || [];
    const walls = continuityData?.walls;
    const lightPositions = continuityData?.lightPositions;

    const paragraphs: string[] = [];

    // Authority preamble — the continuity view is the single source of truth
    paragraphs.push('CONTINUITY PLAN — ABSOLUTE AUTHORITY: The following describes the definitive scene layout as established in the overhead continuity view. ONLY characters, set elements, and light sources described below exist in this shot. Do not add, invent, or hallucinate any additional people, objects, or lights beyond what is listed.');

    // 1. Shot framing overview
    const framingDesc = describeShotFraming(shotSize);
    paragraphs.push(`This is ${framingDesc}.`);

    // 2. Visible objects (characters + set elements)
    const visible = computeVisibleObjects(camera, characters, setElements, focalLength, sensorWidth);

    if (visible.length > 0) {
        // Separate characters from set elements
        const visibleCharacters = visible.filter(v => v.facingDescription !== undefined);
        const visibleProps = visible.filter(v => v.facingDescription === undefined);

        if (visibleCharacters.length > 0) {
            const charDescriptions = visibleCharacters.map(vc => describeCharacterPlacement(vc));
            paragraphs.push(charDescriptions.join('. ') + '.');
        }

        if (visibleProps.length > 0) {
            const propDesc = visibleProps.map(vp =>
                `${vp.name} is visible in the ${vp.screenPosition} ${vp.depth}`
            ).join('. ');
            paragraphs.push(propDesc + '.');
        }
    } else if (characters.length > 0) {
        // Characters exist on the canvas but aren't in the FOV
        paragraphs.push('The frame does not directly show any of the characters placed in the scene.');
    }

    // 3. Wall context
    const wallDesc = describeWalls(walls, camera);
    if (wallDesc) {
        paragraphs.push(wallDesc);
    }

    // 4. Lighting context
    const lightDesc = describeLightingContext(lightPositions, sceneLighting, camera);
    if (lightDesc) {
        paragraphs.push(lightDesc);
    }

    // 5. 180-line constraints (screen-direction rules)
    if (continuityData?.oneEightyLine && characters.length >= 2) {
        const constraintDesc = describe180LineConstraints(
            continuityData.oneEightyLine,
            characters,
            camera,
        );
        if (constraintDesc) {
            paragraphs.push(constraintDesc + '.');
        }
    }

    if (paragraphs.length > 0) {
        paragraphs.push('IMPORTANT: The left/right/center character positions described above are ABSOLUTE and must be followed exactly. DO NOT reverse, mirror, or swap any character positions.');
    }

    return paragraphs.length > 0 ? paragraphs.join('\n') : undefined;
}
