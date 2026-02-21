import React, { useState, useMemo, useEffect, useCallback, useRef, useContext } from 'react';
import type { Scene, Shot, SceneContinuityData, CharacterPosition, Position, SetElement, ShotPositionData, SetElementType, WallSegment, LightingPosition, DrawingStroke, Caption, CameraTrack, WalkArrow, CanvasLayer, SceneSnapshot } from '../types';
import type { LightShape } from '../constants';
import { SquareIcon, ViewfinderCircleIcon } from './icons';
import { ProjectContext } from '../context/ProjectContext';
import { SENSOR_WIDTHS, SET_ELEMENT_DIMENSIONS } from '../constants';
import {
    CharacterMarker, SetElementMarker, LightMarker, CameraMarker,
    ToolPalette, FloatingControls, ShotPanel, ObjectPropertiesPanel, PlacementPopups,
    CameraTrackMarker, WalkArrowMarker, CaptionMarker, LayerPanel, SnapshotPanel, DrawingLayer,
} from './continuity';
import {
    type Mode, type DragTarget, type SelectedObject,
    type CharacterInputState, type SetElementInputState, type LightInputState, type ContinuitySnapshot,
    BASE_GRID, MAX_UNDO_STEPS, FOV_CONE_LENGTH, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP,
    SHOT_COLORS, SHOT_STROKE_COLORS,
    getCharacterColor, getSideOfLine, computeSafeZonePoints, computeFOVConePoints,
} from './continuity/shared';

interface ContinuityViewProps {
    scene: Scene;
    shots: Shot[];
    activeShotId: string | null;
    setActiveShotId: (id: string | null) => void;
    onUpdateScene: (scene: Scene) => void;
    onUpdateShots: (shots: Shot[]) => void;
    onBackToBuilder: () => void;
    onSelectShot: (shotId: string) => void;
}

const ContinuityView: React.FC<ContinuityViewProps> = ({
    scene, shots, activeShotId, setActiveShotId, onUpdateScene, onUpdateShots, onBackToBuilder, onSelectShot
}) => {
    const { projectSettings } = useContext(ProjectContext);

    // --- State ---
    const [mode, setMode] = useState<Mode>('none');
    const [tempLineStart, setTempLineStart] = useState<{ x: number; y: number } | null>(null);
    const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
    const [cameraAngle, setCameraAngle] = useState(0);
    const [selectedObject, setSelectedObject] = useState<SelectedObject | null>(null);
    const [showFOV, setShowFOV] = useState(true);
    const [showLightBeam, setShowLightBeam] = useState(true);
    const [showSequencePath, setShowSequencePath] = useState(true);
    const [showShotPanel, setShowShotPanel] = useState(true);

    const [snapToGrid, setSnapToGrid] = useState(false);

    // Zoom & Pan
    const [zoom, setZoom] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ w: 1, h: 1 });

    // Inline input states
    const [charInput, setCharInput] = useState<CharacterInputState | null>(null);
    const [setElementInput, setSetElementInput] = useState<SetElementInputState | null>(null);
    const [lightInput, setLightInput] = useState<LightInputState | null>(null);

    // Wall drawing state
    const [wallPoints, setWallPoints] = useState<{ x: number; y: number }[]>([]);

    // Drawing layer state
    const [drawingColor, setDrawingColor] = useState('#FF6B35');
    const [drawingWidth, setDrawingWidth] = useState(2);

    // Track / Walk Arrow drawing state (click-to-add-point, like wall tool)
    const [trackPoints, setTrackPoints] = useState<{ x: number; y: number }[]>([]);
    const [walkArrowPoints, setWalkArrowPoints] = useState<{ x: number; y: number }[]>([]);
    const [walkArrowCharId, setWalkArrowCharId] = useState<string | null>(null);

    // Drag state
    const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
    const isDragging = useRef(false);

    // Undo/Redo
    const [undoStack, setUndoStack] = useState<ContinuitySnapshot[]>([]);
    const [redoStack, setRedoStack] = useState<ContinuitySnapshot[]>([]);

    // --- Derived Values ---
    const continuityData: SceneContinuityData = useMemo(() => (
        scene.continuityData || { characters: [], setElements: [], walls: [], lightPositions: [] }
    ), [scene.continuityData]);

    const sceneRef = useRef(scene);
    sceneRef.current = scene;
    const continuityDataRef = useRef(continuityData);
    continuityDataRef.current = continuityData;

    const activeShot = useMemo(() => shots.find(s => s.id === activeShotId), [shots, activeShotId]);

    const safeSide = useMemo(() => {
        const firstCameraShot = shots.find(s => s.positions?.camera);
        if (!firstCameraShot || !continuityData.oneEightyLine) return 0;
        return getSideOfLine(firstCameraShot.positions!.camera, continuityData.oneEightyLine);
    }, [shots, continuityData.oneEightyLine]);

    const computedWarnings = useMemo((): Record<string, boolean> => {
        if (!continuityData.oneEightyLine) return {};
        const shotsWithCameras = shots.filter(s => s.positions?.camera);
        if (shotsWithCameras.length < 2) return {};
        const referenceSide = getSideOfLine(
            shotsWithCameras[0].positions!.camera,
            continuityData.oneEightyLine
        );
        const warnings: Record<string, boolean> = {};
        shots.forEach(shot => {
            if (shot.positions?.camera) {
                warnings[shot.id] = getSideOfLine(shot.positions.camera, continuityData.oneEightyLine!) !== referenceSide;
            }
        });
        return warnings;
    }, [shots, continuityData.oneEightyLine]);

    const prevWarningsRef = useRef<Record<string, boolean>>({});
    useEffect(() => {
        const prev = prevWarningsRef.current;
        const allIds = new Set([...Object.keys(prev), ...Object.keys(computedWarnings)]);
        const changed = Array.from(allIds).some(id => (prev[id] || false) !== (computedWarnings[id] || false));
        if (changed) {
            prevWarningsRef.current = computedWarnings;
            onUpdateShots(shots.map(shot => ({
                ...shot,
                continuityWarning: computedWarnings[shot.id] || false
            })));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [computedWarnings]);

    const sensorWidth = useMemo(() => {
        const sensorMode = projectSettings?.sensorMode || 'Full frame';
        return SENSOR_WIDTHS[sensorMode] || 36;
    }, [projectSettings?.sensorMode]);

    // --- Dynamic workspace (viewBox-driven zoom) ---
    const viewExtent = BASE_GRID / zoom;
    const center = BASE_GRID / 2;

    const workspaceBounds = useMemo(() => {
        const ext = BASE_GRID / zoom;
        const pad = 2;
        return {
            minX: Math.floor(center - ext / 2) - pad,
            minY: Math.floor(center - ext / 2) - pad,
            maxX: Math.ceil(center + ext / 2) + pad,
            maxY: Math.ceil(center + ext / 2) + pad,
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoom]);

    const vbX = workspaceBounds.minX - panOffset.x;
    const vbY = workspaceBounds.minY - panOffset.y;
    const GRID_SIZE = workspaceBounds.maxX - workspaceBounds.minX;

    const gridToPercent = useCallback((coord: number): string => {
        return `${((coord - vbX + 1) / GRID_SIZE) * 100}%`;
    }, [vbX, GRID_SIZE]);

    const svgContentArea = useMemo(() => {
        const { w, h } = containerSize;
        const scale = Math.min(w / GRID_SIZE, h / GRID_SIZE);
        const contentW = GRID_SIZE * scale;
        const contentH = GRID_SIZE * scale;
        return {
            left: (w - contentW) / 2,
            top: (h - contentH) / 2,
            width: contentW,
            height: contentH,
        };
    }, [containerSize, GRID_SIZE]);

    const safeZonePoints = useMemo(() => {
        if (!continuityData.oneEightyLine || safeSide === 0) return '';
        return computeSafeZonePoints(continuityData.oneEightyLine, -safeSide, BASE_GRID);
    }, [continuityData.oneEightyLine, safeSide]);

    const hint = useMemo(() => {
        if (mode === 'place_character') return "Click on the grid to place a character.";
        if (mode === 'place_camera') return 'Click to place a new camera. Each click creates a new shot.';
        if (mode === 'draw_line_start') return "Click to set the first point of the 180\u00B0 line.";
        if (mode === 'draw_line_end') return "Click to set the second point of the 180\u00B0 line.";
        if (mode === 'place_set_element') return "Click to place a set element (table, door, etc).";
        if (mode === 'draw_wall') return wallPoints.length === 0 ? "Click to start drawing a wall." : "Click to add points. Double-click or press Enter to finish.";
        if (mode === 'place_light') return "Click to place a light source.";
        if (mode === 'draw_track') return trackPoints.length === 0 ? "Click to start a camera track." : "Click to add points. Double-click or Enter to finish.";
        if (mode === 'draw_walk_arrow') return !walkArrowCharId ? "Click near a character to start a walk path." : "Click to add points. Double-click or Enter to finish.";
        if (mode === 'place_caption') return "Click to place a text caption.";
        if (mode === 'draw_freehand') return "Click and drag to draw. Use the toolbar below to change color and size.";
        if (continuityData.characters.length === 0) return "Place your characters on the grid to define the scene blocking.";
        if (!continuityData.oneEightyLine) return "Draw the 180\u00B0 Line between characters to set the axis of action.";
        if (!activeShotId && shots.length === 0) return "Use the Camera tool to place cameras and create shots.";
        if (!activeShotId) return "Select a shot from the panel, or use the Camera tool to add a new one.";
        if (!activeShot?.positions?.camera) return `Select the Camera tool and click to place Shot ${activeShot?.shotNumber || '?'}.`;
        return "Camera placed. Adjust angle with the slider, or drag to reposition.";
    }, [continuityData, activeShot, activeShotId, mode, wallPoints, shots]);

    const modeLabel = useMemo(() => {
        switch (mode) {
            case 'place_character': return 'Character';
            case 'place_camera': return 'Camera';
            case 'draw_line_start': case 'draw_line_end': return '180\u00B0 Line';
            case 'place_set_element': return 'Set Piece';
            case 'draw_wall': return 'Wall';
            case 'place_light': return 'Light';
            case 'draw_track': return 'Camera Track';
            case 'draw_walk_arrow': return 'Walk Arrow';
            case 'place_caption': return 'Caption';
            case 'draw_freehand': return 'Draw';
            default: return 'Select';
        }
    }, [mode]);

    const lineAngleDeg = useMemo(() => {
        if (!continuityData.oneEightyLine) return 0;
        const { p1, p2 } = continuityData.oneEightyLine;
        return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
    }, [continuityData.oneEightyLine]);

    useEffect(() => {
        if (activeShot?.positions?.camera) {
            setCameraAngle(activeShot.positions.camera.angle || 0);
        }
    }, [activeShot]);

    // Track container dimensions for SVG↔HTML alignment
    useEffect(() => {
        const el = canvasContainerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) setContainerSize({ w: width, h: height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // --- Zoom & Pan ---
    useEffect(() => {
        const el = canvasContainerRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if ((e.target as HTMLElement)?.closest?.('.z-50')) return;
            e.preventDefault();
            const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
            setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta)));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    const handleZoomIn = useCallback(() => setZoom(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP)), []);
    const handleZoomOut = useCallback(() => setZoom(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP)), []);
    const handleZoomReset = useCallback(() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }, []);

    const handlePanStart = useCallback((e: React.MouseEvent) => {
        if (mode !== 'none' || dragTarget) return;
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            e.preventDefault();
            setIsPanning(true);
            panStart.current = { x: e.clientX, y: e.clientY, panX: panOffset.x, panY: panOffset.y };
        }
    }, [mode, dragTarget, panOffset]);

    const handlePanMove = useCallback((e: React.MouseEvent) => {
        if (!isPanning) return;
        const container = canvasContainerRef.current;
        if (!container) return;
        const pxDx = e.clientX - panStart.current.x;
        const pxDy = e.clientY - panStart.current.y;
        const gridPerPx = GRID_SIZE / Math.min(container.clientWidth, container.clientHeight);
        setPanOffset({
            x: panStart.current.panX + pxDx * gridPerPx,
            y: panStart.current.panY + pxDy * gridPerPx,
        });
    }, [isPanning, GRID_SIZE]);

    const handlePanEnd = useCallback(() => setIsPanning(false), []);

    // --- Undo/Redo ---
    const takeSnapshot = useCallback((): ContinuitySnapshot => {
        const shotPositions: Record<string, ShotPositionData | undefined> = {};
        shots.forEach(s => { shotPositions[s.id] = s.positions; });
        return {
            continuityData: JSON.parse(JSON.stringify(continuityData)),
            shotPositions: JSON.parse(JSON.stringify(shotPositions)),
        };
    }, [continuityData, shots]);

    const pushUndo = useCallback(() => {
        const snapshot = takeSnapshot();
        setUndoStack(prev => [...prev.slice(-(MAX_UNDO_STEPS - 1)), snapshot]);
        setRedoStack([]);
    }, [takeSnapshot]);

    const handleUndo = useCallback(() => {
        if (undoStack.length === 0) return;
        const current = takeSnapshot();
        setRedoStack(prev => [...prev, current]);
        const previous = undoStack[undoStack.length - 1];
        setUndoStack(prev => prev.slice(0, -1));
        onUpdateScene({ ...scene, continuityData: previous.continuityData });
        onUpdateShots(shots.map(shot => ({ ...shot, positions: previous.shotPositions[shot.id] })));
    }, [undoStack, takeSnapshot, onUpdateScene, onUpdateShots, scene, shots]);

    const handleRedo = useCallback(() => {
        if (redoStack.length === 0) return;
        const current = takeSnapshot();
        setUndoStack(prev => [...prev, current]);
        const next = redoStack[redoStack.length - 1];
        setRedoStack(prev => prev.slice(0, -1));
        onUpdateScene({ ...scene, continuityData: next.continuityData });
        onUpdateShots(shots.map(shot => ({ ...shot, positions: next.shotPositions[shot.id] })));
    }, [redoStack, takeSnapshot, onUpdateScene, onUpdateShots, scene, shots]);

    const handleFinishWall = useCallback(() => {
        if (wallPoints.length < 2) { setWallPoints([]); return; }
        pushUndo();
        const newWall: WallSegment = { id: crypto.randomUUID(), points: [...wallPoints], closedLoop: false };
        onUpdateScene({
            ...scene,
            continuityData: { ...continuityData, walls: [...(continuityData.walls || []), newWall] }
        });
        setWallPoints([]);
    }, [wallPoints, pushUndo, onUpdateScene, scene, continuityData]);

    // --- Grid Interaction ---
    const getGridCoords = (e: React.MouseEvent<HTMLDivElement>): { x: number; y: number } => {
        const rect = e.currentTarget.getBoundingClientRect();
        const normalX = (e.clientX - rect.left) / rect.width;
        const normalY = (e.clientY - rect.top) / rect.height;
        const aspect = rect.width / rect.height;
        let gx: number, gy: number;
        if (aspect >= 1) {
            const svgWidth = GRID_SIZE * aspect;
            const padX = (svgWidth - GRID_SIZE) / 2;
            gx = normalX * svgWidth - padX + vbX - 0.5;
            gy = normalY * GRID_SIZE + vbY - 0.5;
        } else {
            const svgHeight = GRID_SIZE / aspect;
            const padY = (svgHeight - GRID_SIZE) / 2;
            gx = normalX * GRID_SIZE + vbX - 0.5;
            gy = normalY * svgHeight - padY + vbY - 0.5;
        }
        if (snapToGrid) {
            return { x: Math.round(gx), y: Math.round(gy) };
        }
        return { x: Math.floor(gx), y: Math.floor(gy) };
    };

    const handleGridClick = (x: number, y: number) => {
        if (charInput || setElementInput || lightInput) return;
        if (selectedObject) setSelectedObject(null);

        if (mode === 'place_camera') {
            pushUndo();
            const newShotId = crypto.randomUUID();
            const newShot: Shot = {
                id: newShotId, shotNumber: shots.length + 1,
                parameters: { flags: ['None'], actorsInShot: scene.actors || [], objectsInShot: '' },
                generatedImage: null, description: '', technicalData: null,
                positions: { camera: { x, y, angle: cameraAngle } },
            };
            const isFirstCamera = !shots.some(s => s.positions?.camera);
            if (isFirstCamera && continuityData.oneEightyLine) {
                const flipped = autoFlipLineForCamera(continuityData.oneEightyLine, { x, y });
                if (flipped !== continuityData.oneEightyLine) {
                    onUpdateScene({ ...scene, continuityData: { ...continuityData, oneEightyLine: flipped } });
                }
            }
            onUpdateShots([...shots, newShot]);
            setActiveShotId(newShotId);
        } else if (mode === 'place_character') {
            setCharInput({ x, y, name: `Character ${continuityData.characters.length + 1}` });
        } else if (mode === 'draw_line_start') {
            setTempLineStart({ x, y });
            setMode('draw_line_end');
        } else if (mode === 'draw_line_end' && tempLineStart) {
            pushUndo();
            let newLine = { p1: tempLineStart, p2: { x, y } };
            const firstCam = shots.find(s => s.positions?.camera)?.positions?.camera;
            if (firstCam) newLine = autoFlipLineForCamera(newLine, firstCam);
            onUpdateScene({ ...scene, continuityData: { ...continuityData, oneEightyLine: newLine } });
            setTempLineStart(null);
            setMode('none');
        } else if (mode === 'place_set_element') {
            setSetElementInput({ x, y, label: '', type: 'custom' });
        } else if (mode === 'draw_wall') {
            setWallPoints(prev => [...prev, { x, y }]);
        } else if (mode === 'place_light') {
            setLightInput({ x, y });
        } else if (mode === 'place_caption') {
            handleAddCaption(x, y);
        } else if (mode === 'draw_track') {
            setTrackPoints(prev => [...prev, { x, y }]);
        } else if (mode === 'draw_walk_arrow') {
            if (!walkArrowCharId) {
                const nearestChar = continuityData.characters.find(c => Math.abs(c.x - x) <= 1 && Math.abs(c.y - y) <= 1);
                if (nearestChar) {
                    setWalkArrowCharId(nearestChar.id);
                    setWalkArrowPoints([{ x: nearestChar.x, y: nearestChar.y }, { x, y }]);
                }
            } else {
                setWalkArrowPoints(prev => [...prev, { x, y }]);
            }
        }
    };

    // --- Confirm/Cancel handlers ---
    const handleConfirmCharacter = (name: string) => {
        if (!charInput) return;
        pushUndo();
        const newChar: CharacterPosition = { id: crypto.randomUUID(), name, x: charInput.x, y: charInput.y, angle: 0 };
        onUpdateScene({ ...scene, continuityData: { ...continuityData, characters: [...continuityData.characters, newChar] } });
        setCharInput(null);
    };

    const handleConfirmSetElement = (label: string, type: SetElementType) => {
        if (!setElementInput) return;
        pushUndo();
        const dims = SET_ELEMENT_DIMENSIONS[type] || { width: 2, height: 2 };
        const newElement: SetElement = { id: crypto.randomUUID(), label, type, x: setElementInput.x, y: setElementInput.y, width: dims.width, height: dims.height };
        onUpdateScene({ ...scene, continuityData: { ...continuityData, setElements: [...(continuityData.setElements || []), newElement] } });
        setSetElementInput(null);
    };

    const inferShape = (src?: string): LightShape => {
        if (!src) return 'custom';
        const t = src.toLowerCase();
        if (t.includes('fresnel')) return 'fresnel_md';
        if (t.includes('led') && t.includes('panel')) return 'led_1x1';
        if (t.includes('led')) return 'led';
        if (t.includes('softbox') || t.includes('soft box')) return 'softbox';
        if (t.includes('kino') || t.includes('flo')) return 'flo_4';
        if (t.includes('hmi') || t.includes('sun')) return 'sun';
        if (t.includes('par')) return 'par';
        if (t.includes('bounce')) return 'bounce_board';
        if (t.includes('china') || t.includes('lantern')) return 'china_ball';
        if (t.includes('practical')) return 'practical';
        if (t.includes('scoop')) return 'scoop';
        return 'custom';
    };

    const handleConfirmLightSetup = (setupId: string) => {
        if (!lightInput) return;
        pushUndo();
        const setup = (scene.lighting || []).find(ls => ls.id === setupId);
        const newLight: LightingPosition = {
            id: crypto.randomUUID(), setupId, label: setup?.name, sourceType: setup?.sourceType,
            shape: inferShape(setup?.sourceType), direction: setup?.direction,
            x: lightInput.x, y: lightInput.y, angle: 0,
        };
        onUpdateScene({ ...scene, continuityData: { ...continuityData, lightPositions: [...(continuityData.lightPositions || []), newLight] } });
        setLightInput(null);
        setMode('none');
    };

    const handleConfirmLightCustom = (label: string, sourceType: string, shape: LightShape) => {
        if (!lightInput) return;
        pushUndo();
        const newLight: LightingPosition = { id: crypto.randomUUID(), label, sourceType, shape, x: lightInput.x, y: lightInput.y, angle: 0 };
        onUpdateScene({ ...scene, continuityData: { ...continuityData, lightPositions: [...(continuityData.lightPositions || []), newLight] } });
        setLightInput(null);
        setMode('none');
    };

    // --- Delete Handlers ---
    const handleChangeCharacterColor = useCallback((charId: string, color: string) => {
        pushUndo();
        onUpdateScene({ ...scene, continuityData: { ...continuityData, characters: continuityData.characters.map(c => c.id === charId ? { ...c, color } : c) } });
    }, [pushUndo, onUpdateScene, scene, continuityData]);

    const handleDeleteCharacter = useCallback((charId: string) => {
        pushUndo();
        onUpdateScene({ ...scene, continuityData: { ...continuityData, characters: continuityData.characters.filter(c => c.id !== charId) } });
        if (selectedObject?.id === charId) setSelectedObject(null);
    }, [pushUndo, onUpdateScene, scene, continuityData, selectedObject]);

    const handleDeleteSetElement = useCallback((elemId: string) => {
        pushUndo();
        onUpdateScene({ ...scene, continuityData: { ...continuityData, setElements: (continuityData.setElements || []).filter(e => e.id !== elemId) } });
        if (selectedObject?.id === elemId) setSelectedObject(null);
    }, [pushUndo, onUpdateScene, scene, continuityData, selectedObject]);

    const handleDeleteLight = useCallback((lightId: string) => {
        pushUndo();
        onUpdateScene({ ...scene, continuityData: { ...continuityData, lightPositions: (continuityData.lightPositions || []).filter(l => l.id !== lightId) } });
        if (selectedObject?.id === lightId) setSelectedObject(null);
    }, [pushUndo, onUpdateScene, scene, continuityData, selectedObject]);

    const handleToggleLightBeam = useCallback((lightId: string) => {
        onUpdateScene({ ...scene, continuityData: { ...continuityData, lightPositions: (continuityData.lightPositions || []).map(l => l.id === lightId ? { ...l, showBeam: l.showBeam === false ? true : false } : l) } });
    }, [onUpdateScene, scene, continuityData]);

    const handleDeleteWall = (wallId: string) => {
        pushUndo();
        onUpdateScene({ ...scene, continuityData: { ...continuityData, walls: (continuityData.walls || []).filter(w => w.id !== wallId) } });
    };

    const handleRemoveCamera = useCallback(() => {
        if (!activeShotId) return;
        pushUndo();
        onUpdateShots(shots.map(shot => shot.id === activeShotId ? { ...shot, positions: undefined } : shot));
    }, [activeShotId, pushUndo, onUpdateShots, shots]);

    const handleClearLine = () => {
        pushUndo();
        onUpdateScene({ ...scene, continuityData: { ...continuityData, oneEightyLine: undefined } });
    };

    const handleFlipLine = () => {
        if (!continuityData.oneEightyLine) return;
        pushUndo();
        const { p1, p2 } = continuityData.oneEightyLine;
        onUpdateScene({ ...scene, continuityData: { ...continuityData, oneEightyLine: { p1: p2, p2: p1 } } });
    };

    const autoFlipLineForCamera = (line: { p1: { x: number; y: number }; p2: { x: number; y: number } }, cameraPos: { x: number; y: number }) => {
        const side = getSideOfLine(cameraPos, line);
        if (side < 0) {
            return { p1: line.p2, p2: line.p1 };
        }
        return line;
    };

    const handleClearAll = () => {
        if (!window.confirm("Clear all characters, set elements, cameras, and the 180\u00B0 line? This can be undone with Ctrl+Z.")) return;
        pushUndo();
        onUpdateScene({ ...scene, continuityData: { characters: [], setElements: [], walls: [], lightPositions: [] } });
        onUpdateShots(shots.map(shot => ({ ...shot, positions: shot.positions ? { ...shot.positions, camera: undefined } : undefined })));
        setActiveShotId(null);
    };

    const handleDeleteShot = (shotId: string) => {
        if (!window.confirm(`Delete this shot? This can be undone with Ctrl+Z.`)) return;
        pushUndo();
        const remaining = shots.filter(s => s.id !== shotId).map((s, i) => ({ ...s, shotNumber: i + 1 }));
        onUpdateShots(remaining);
        if (activeShotId === shotId) setActiveShotId(null);
    };

    // --- Track/WalkArrow Finish Handlers ---
    const handleFinishTrack = useCallback(() => {
        if (trackPoints.length >= 2) {
            pushUndo();
            const s = sceneRef.current;
            const cd = continuityDataRef.current;
            const newTrack: CameraTrack = { id: crypto.randomUUID(), points: trackPoints, isBezier: trackPoints.length >= 4, dollyMarks: [] };
            onUpdateScene({ ...s, continuityData: { ...cd, cameraTracks: [...(cd.cameraTracks || []), newTrack] } });
        }
        setTrackPoints([]);
    }, [trackPoints, onUpdateScene, pushUndo]);

    const handleFinishWalkArrow = useCallback(() => {
        if (walkArrowPoints.length >= 2 && walkArrowCharId) {
            pushUndo();
            const s = sceneRef.current;
            const cd = continuityDataRef.current;
            const newArrow: WalkArrow = { id: crypto.randomUUID(), characterId: walkArrowCharId, points: walkArrowPoints, isBezier: walkArrowPoints.length >= 4 };
            onUpdateScene({ ...s, continuityData: { ...cd, walkArrows: [...(cd.walkArrows || []), newArrow] } });
        }
        setWalkArrowPoints([]);
        setWalkArrowCharId(null);
    }, [walkArrowPoints, walkArrowCharId, onUpdateScene, pushUndo]);

    // --- Caption/Track/WalkArrow Delete Handlers (useCallback for dependency safety) ---
    const handleDeleteCaption = useCallback((id: string) => {
        pushUndo();
        onUpdateScene({ ...scene, continuityData: { ...continuityData, captions: (continuityData.captions || []).filter(c => c.id !== id) } });
        if (selectedObject?.id === id) setSelectedObject(null);
    }, [pushUndo, onUpdateScene, scene, continuityData, selectedObject]);

    const handleDeleteTrack = useCallback((id: string) => {
        pushUndo();
        onUpdateScene({ ...scene, continuityData: { ...continuityData, cameraTracks: (continuityData.cameraTracks || []).filter(t => t.id !== id) } });
        if (selectedObject?.id === id) setSelectedObject(null);
    }, [pushUndo, onUpdateScene, scene, continuityData, selectedObject]);

    const handleDeleteWalkArrow = useCallback((id: string) => {
        pushUndo();
        onUpdateScene({ ...scene, continuityData: { ...continuityData, walkArrows: (continuityData.walkArrows || []).filter(a => a.id !== id) } });
        if (selectedObject?.id === id) setSelectedObject(null);
    }, [pushUndo, onUpdateScene, scene, continuityData, selectedObject]);

    const handleDeleteDrawing = useCallback((id: string) => {
        pushUndo();
        onUpdateScene({ ...scene, continuityData: { ...continuityData, drawings: (continuityData.drawings || []).filter(d => d.id !== id) } });
        if (selectedObject?.id === id) setSelectedObject(null);
    }, [pushUndo, onUpdateScene, scene, continuityData, selectedObject]);

    // --- Duplicate Handler ---
    const handleDuplicateSelected = useCallback(() => {
        if (!selectedObject) return;
        pushUndo();
        if (selectedObject.type === 'character') {
            const char = continuityData.characters.find(c => c.id === selectedObject.id);
            if (char) {
                const dup: CharacterPosition = { ...char, id: crypto.randomUUID(), x: char.x + 1, y: char.y + 1 };
                onUpdateScene({ ...scene, continuityData: { ...continuityData, characters: [...continuityData.characters, dup] } });
                setSelectedObject({ type: 'character', id: dup.id });
            }
        } else if (selectedObject.type === 'set_element') {
            const elem = (continuityData.setElements || []).find(e => e.id === selectedObject.id);
            if (elem) {
                const dup: SetElement = { ...elem, id: crypto.randomUUID(), x: elem.x + 1, y: elem.y + 1 };
                onUpdateScene({ ...scene, continuityData: { ...continuityData, setElements: [...(continuityData.setElements || []), dup] } });
                setSelectedObject({ type: 'set_element', id: dup.id });
            }
        } else if (selectedObject.type === 'light') {
            const lp = (continuityData.lightPositions || []).find(l => l.id === selectedObject.id);
            if (lp) {
                const dup: LightingPosition = { ...lp, id: crypto.randomUUID(), x: lp.x + 1, y: lp.y + 1 };
                onUpdateScene({ ...scene, continuityData: { ...continuityData, lightPositions: [...(continuityData.lightPositions || []), dup] } });
                setSelectedObject({ type: 'light', id: dup.id });
            }
        } else if (selectedObject.type === 'caption') {
            const cap = (continuityData.captions || []).find(c => c.id === selectedObject.id);
            if (cap) {
                const dup: Caption = { ...cap, id: crypto.randomUUID(), x: cap.x + 1, y: cap.y + 1 };
                onUpdateScene({ ...scene, continuityData: { ...continuityData, captions: [...(continuityData.captions || []), dup] } });
                setSelectedObject({ type: 'caption', id: dup.id });
            }
        } else if (selectedObject.type === 'camera_track') {
            const track = (continuityData.cameraTracks || []).find(t => t.id === selectedObject.id);
            if (track) {
                const dup: CameraTrack = { ...track, id: crypto.randomUUID(), points: track.points.map(p => ({ x: p.x + 1, y: p.y + 1 })) };
                onUpdateScene({ ...scene, continuityData: { ...continuityData, cameraTracks: [...(continuityData.cameraTracks || []), dup] } });
                setSelectedObject({ type: 'camera_track', id: dup.id });
            }
        } else if (selectedObject.type === 'walk_arrow') {
            const arrow = (continuityData.walkArrows || []).find(a => a.id === selectedObject.id);
            if (arrow) {
                const dup: WalkArrow = { ...arrow, id: crypto.randomUUID(), points: arrow.points.map(p => ({ x: p.x + 1, y: p.y + 1 })) };
                onUpdateScene({ ...scene, continuityData: { ...continuityData, walkArrows: [...(continuityData.walkArrows || []), dup] } });
                setSelectedObject({ type: 'walk_arrow', id: dup.id });
            }
        }
    }, [selectedObject, continuityData, scene, onUpdateScene, pushUndo]);

    // --- Delete Selected Handler ---
    const handleDeleteSelected = useCallback(() => {
        if (!selectedObject) return;
        if (selectedObject.type === 'character') handleDeleteCharacter(selectedObject.id);
        else if (selectedObject.type === 'set_element') handleDeleteSetElement(selectedObject.id);
        else if (selectedObject.type === 'light') handleDeleteLight(selectedObject.id);
        else if (selectedObject.type === 'camera') handleRemoveCamera();
        else if (selectedObject.type === 'caption') handleDeleteCaption(selectedObject.id);
        else if (selectedObject.type === 'camera_track') handleDeleteTrack(selectedObject.id);
        else if (selectedObject.type === 'walk_arrow') handleDeleteWalkArrow(selectedObject.id);
        else if (selectedObject.type === 'drawing') handleDeleteDrawing(selectedObject.id);
        else if (selectedObject.type === 'oneEightyLine') { handleClearLine(); setSelectedObject(null); }
    }, [selectedObject, handleDeleteCharacter, handleDeleteSetElement, handleDeleteLight, handleRemoveCamera, handleDeleteCaption, handleDeleteTrack, handleDeleteWalkArrow, handleDeleteDrawing]);

    // --- Nudge Selected Handler ---
    const handleNudgeSelected = useCallback((dx: number, dy: number) => {
        if (!selectedObject) return;
        pushUndo();
        if (selectedObject.type === 'character') {
            onUpdateScene({ ...scene, continuityData: { ...continuityData, characters: continuityData.characters.map(c => c.id === selectedObject.id ? { ...c, x: c.x + dx, y: c.y + dy } : c) } });
        } else if (selectedObject.type === 'set_element') {
            onUpdateScene({ ...scene, continuityData: { ...continuityData, setElements: (continuityData.setElements || []).map(e => e.id === selectedObject.id ? { ...e, x: e.x + dx, y: e.y + dy } : e) } });
        } else if (selectedObject.type === 'light') {
            onUpdateScene({ ...scene, continuityData: { ...continuityData, lightPositions: (continuityData.lightPositions || []).map(l => l.id === selectedObject.id ? { ...l, x: l.x + dx, y: l.y + dy } : l) } });
        } else if (selectedObject.type === 'camera') {
            onUpdateShots(shots.map(shot => shot.id === selectedObject.id && shot.positions?.camera ? { ...shot, positions: { ...shot.positions, camera: { ...shot.positions.camera, x: shot.positions.camera.x + dx, y: shot.positions.camera.y + dy } } } : shot));
        } else if (selectedObject.type === 'caption') {
            onUpdateScene({ ...scene, continuityData: { ...continuityData, captions: (continuityData.captions || []).map(c => c.id === selectedObject.id ? { ...c, x: c.x + dx, y: c.y + dy } : c) } });
        } else if (selectedObject.type === 'camera_track') {
            onUpdateScene({ ...scene, continuityData: { ...continuityData, cameraTracks: (continuityData.cameraTracks || []).map(t => t.id === selectedObject.id ? { ...t, points: t.points.map(p => ({ x: p.x + dx, y: p.y + dy })) } : t) } });
        } else if (selectedObject.type === 'walk_arrow') {
            onUpdateScene({ ...scene, continuityData: { ...continuityData, walkArrows: (continuityData.walkArrows || []).map(a => a.id === selectedObject.id ? { ...a, points: a.points.map(p => ({ x: p.x + dx, y: p.y + dy })) } : a) } });
        }
    }, [selectedObject, continuityData, scene, shots, onUpdateScene, onUpdateShots, pushUndo]);

    // --- Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeyboard = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) handleRedo(); else handleUndo();
                return;
            }

            if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
                e.preventDefault();
                handleDuplicateSelected();
                return;
            }

            if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput && selectedObject) {
                e.preventDefault();
                handleDeleteSelected();
                return;
            }

            if (!isInput && selectedObject && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                const step = e.shiftKey ? 0.5 : 1;
                switch (e.key) {
                    case 'ArrowUp': handleNudgeSelected(0, -step); break;
                    case 'ArrowDown': handleNudgeSelected(0, step); break;
                    case 'ArrowLeft': handleNudgeSelected(-step, 0); break;
                    case 'ArrowRight': handleNudgeSelected(step, 0); break;
                }
                return;
            }

            if (mode === 'draw_wall') {
                if (e.key === 'Enter' && wallPoints.length >= 2) { e.preventDefault(); handleFinishWall(); }
                else if (e.key === 'Escape') { setWallPoints([]); setMode('none'); }
                return;
            }

            if (mode === 'draw_track') {
                if (e.key === 'Enter' && trackPoints.length >= 2) { e.preventDefault(); handleFinishTrack(); }
                else if (e.key === 'Escape') { setTrackPoints([]); setMode('none'); }
                return;
            }

            if (mode === 'draw_walk_arrow') {
                if (e.key === 'Enter' && walkArrowPoints.length >= 2) { e.preventDefault(); handleFinishWalkArrow(); }
                else if (e.key === 'Escape') { setWalkArrowPoints([]); setWalkArrowCharId(null); setMode('none'); }
                return;
            }

            if (e.key === 'Escape') {
                if (selectedObject) setSelectedObject(null);
                else if (mode !== 'none') setMode('none');
            }
        };
        window.addEventListener('keydown', handleKeyboard);
        return () => window.removeEventListener('keydown', handleKeyboard);
    }, [handleUndo, handleRedo, mode, wallPoints, handleFinishWall, selectedObject,
        trackPoints, handleFinishTrack, walkArrowPoints, handleFinishWalkArrow,
        handleDuplicateSelected, handleDeleteSelected, handleNudgeSelected]);

    // --- Caption Handlers ---
    const handleAddCaption = (x: number, y: number) => {
        pushUndo();
        const newCaption: Caption = { id: crypto.randomUUID(), text: 'Text', x, y, fontSize: 14, bold: false, italic: false, color: '#ffffff' };
        onUpdateScene({ ...scene, continuityData: { ...continuityData, captions: [...(continuityData.captions || []), newCaption] } });
    };

    const handleUpdateCaption = (id: string, updates: Partial<Caption>) => {
        onUpdateScene({ ...scene, continuityData: { ...continuityData, captions: (continuityData.captions || []).map(c => c.id === id ? { ...c, ...updates } : c) } });
    };

    // --- Drawing Handlers ---
    const handleAddStroke = (stroke: DrawingStroke) => {
        pushUndo();
        onUpdateScene({ ...scene, continuityData: { ...continuityData, drawings: [...(continuityData.drawings || []), stroke] } });
    };

    // --- Track Handlers ---
    const handleUpdateTrackPoint = (trackId: string, pointIndex: number, x: number, y: number) => {
        onUpdateScene({ ...scene, continuityData: { ...continuityData, cameraTracks: (continuityData.cameraTracks || []).map(t => t.id === trackId ? { ...t, points: t.points.map((p, i) => i === pointIndex ? { x, y } : p) } : t) } });
    };

    // --- Walk Arrow Handlers ---
    const handleUpdateWalkArrowPoint = (arrowId: string, pointIndex: number, x: number, y: number) => {
        onUpdateScene({ ...scene, continuityData: { ...continuityData, walkArrows: (continuityData.walkArrows || []).map(a => a.id === arrowId ? { ...a, points: a.points.map((p, i) => i === pointIndex ? { x, y } : p) } : a) } });
    };

    // --- Layer Handlers ---
    const handleToggleLayerVisibility = (layerId: string) => {
        onUpdateScene({ ...scene, continuityData: { ...continuityData, layers: (continuityData.layers || []).map(l => l.id === layerId ? { ...l, visible: !l.visible } : l) } });
    };

    const handleToggleLayerLock = (layerId: string) => {
        onUpdateScene({ ...scene, continuityData: { ...continuityData, layers: (continuityData.layers || []).map(l => l.id === layerId ? { ...l, locked: !l.locked } : l) } });
    };

    const handleAddLayer = (name: string) => {
        const newLayer: CanvasLayer = { id: crypto.randomUUID(), name, visible: true, locked: false, color: '#ffffff' };
        onUpdateScene({ ...scene, continuityData: { ...continuityData, layers: [...(continuityData.layers || []), newLayer] } });
    };

    const handleDeleteLayer = (layerId: string) => {
        onUpdateScene({ ...scene, continuityData: { ...continuityData, layers: (continuityData.layers || []).filter(l => l.id !== layerId) } });
    };

    const handleRenameLayer = (layerId: string, name: string) => {
        onUpdateScene({ ...scene, continuityData: { ...continuityData, layers: (continuityData.layers || []).map(l => l.id === layerId ? { ...l, name } : l) } });
    };

    // --- Snapshot Handlers ---
    const handleSaveSnapshot = (name: string) => {
        const snapshot: SceneSnapshot = {
            id: crypto.randomUUID(),
            name,
            timestamp: Date.now(),
            data: JSON.parse(JSON.stringify(continuityData)),
            shotPositions: shots.reduce((acc, s) => ({ ...acc, [s.id]: s.positions }), {} as Record<string, ShotPositionData | undefined>),
        };
        onUpdateScene({ ...scene, continuitySnapshots: [...(scene.continuitySnapshots || []), snapshot] });
    };

    const handleRestoreSnapshot = (snapshotId: string) => {
        const snapshot = (scene.continuitySnapshots || []).find(s => s.id === snapshotId);
        if (!snapshot) return;
        pushUndo();
        onUpdateScene({ ...scene, continuityData: JSON.parse(JSON.stringify(snapshot.data)) });
        onUpdateShots(shots.map(shot => ({ ...shot, positions: snapshot.shotPositions[shot.id] || shot.positions })));
    };

    const handleDeleteSnapshot = (snapshotId: string) => {
        onUpdateScene({ ...scene, continuitySnapshots: (scene.continuitySnapshots || []).filter(s => s.id !== snapshotId) });
    };

    const handleRenameSnapshot = (snapshotId: string, name: string) => {
        onUpdateScene({ ...scene, continuitySnapshots: (scene.continuitySnapshots || []).map(s => s.id === snapshotId ? { ...s, name } : s) });
    };

    // --- Drag Handlers ---
    const handleMarkerMouseDown = (e: React.MouseEvent, target: DragTarget) => {
        e.stopPropagation();
        e.preventDefault();
        setDragTarget(target);
        isDragging.current = false;
    };

    const handleDragStart = (e: React.MouseEvent, target: DragTarget) => {
        pushUndo();
        handleMarkerMouseDown(e, target);
    };

    const handleCharDragStart = (e: React.MouseEvent, id: string) => handleDragStart(e, { type: 'character', id });
    const handleCameraDragStart = (e: React.MouseEvent, id: string) => handleDragStart(e, { type: 'camera', id });
    const handleLightDragStart = (e: React.MouseEvent, id: string) => handleDragStart(e, { type: 'light', id });
    const handleSetElemDragStart = (e: React.MouseEvent, id: string) => handleDragStart(e, { type: 'set_element', id });

    const handleCharRotateStart = (e: React.MouseEvent, id: string) => handleDragStart(e, { type: 'character_rotate', id });
    const handleLightRotateStart = (e: React.MouseEvent, id: string) => handleDragStart(e, { type: 'light_rotate', id });
    const handleLightIconRotateStart = (e: React.MouseEvent, id: string) => handleDragStart(e, { type: 'light_icon_rotate', id });
    const handleSetElemRotateStart = (e: React.MouseEvent, id: string) => handleDragStart(e, { type: 'set_element_rotate', id });
    const handleCameraRotateStart = (e: React.MouseEvent, id: string) => handleDragStart(e, { type: 'camera_rotate', id });

    const handleGridMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isPanning) { handlePanMove(e); return; }
        const coords = getGridCoords(e);
        setHoverPos(coords);

        if (dragTarget) {
            isDragging.current = true;
            if (dragTarget.type === 'character') {
                const updatedChars = continuityData.characters.map(c => c.id === dragTarget.id ? { ...c, x: coords.x, y: coords.y } : c);
                onUpdateScene({ ...scene, continuityData: { ...continuityData, characters: updatedChars } });
            } else if (dragTarget.type === 'camera') {
                onUpdateShots(shots.map(shot =>
                    shot.id === dragTarget.id && shot.positions?.camera
                        ? { ...shot, positions: { ...shot.positions, camera: { ...shot.positions.camera, x: coords.x, y: coords.y } } }
                        : shot
                ));
            } else if (dragTarget.type === 'character_rotate') {
                const char = continuityData.characters.find(c => c.id === dragTarget.id);
                if (char) {
                    const cx = char.x + 0.5, cy = char.y + 0.5;
                    const angle = Math.round(Math.atan2(coords.y - cy, coords.x - cx) * 180 / Math.PI);
                    onUpdateScene({ ...scene, continuityData: { ...continuityData, characters: continuityData.characters.map(c => c.id === dragTarget.id ? { ...c, angle: ((angle % 360) + 360) % 360 } : c) } });
                }
            } else if (dragTarget.type === 'camera_rotate') {
                const shot = shots.find(s => s.id === dragTarget.id);
                if (shot?.positions?.camera) {
                    const cam = shot.positions.camera;
                    const cx = cam.x + 0.5, cy = cam.y + 0.5;
                    const angle = Math.round(Math.atan2(coords.y - cy, coords.x - cx) * 180 / Math.PI);
                    const normalizedAngle = ((angle % 360) + 360) % 360;
                    setCameraAngle(normalizedAngle);
                    onUpdateShots(shots.map(s =>
                        s.id === dragTarget.id && s.positions?.camera
                            ? { ...s, positions: { ...s.positions, camera: { ...s.positions.camera, angle: normalizedAngle } } }
                            : s
                    ));
                }
            } else if (dragTarget.type === 'light') {
                onUpdateScene({ ...scene, continuityData: { ...continuityData, lightPositions: (continuityData.lightPositions || []).map(lp => lp.id === dragTarget.id ? { ...lp, x: coords.x, y: coords.y } : lp) } });
            } else if (dragTarget.type === 'set_element') {
                onUpdateScene({ ...scene, continuityData: { ...continuityData, setElements: (continuityData.setElements || []).map(elem => elem.id === dragTarget.id ? { ...elem, x: coords.x, y: coords.y } : elem) } });
            } else if (dragTarget.type === 'light_rotate') {
                const lp = (continuityData.lightPositions || []).find(l => l.id === dragTarget.id);
                if (lp) {
                    const cx = lp.x + 0.5, cy = lp.y + 0.5;
                    const rawAngle = Math.round(Math.atan2(coords.y - cy, coords.x - cx) * 180 / Math.PI);
                    const angle = ((rawAngle - 90) % 360 + 360) % 360;
                    onUpdateScene({ ...scene, continuityData: { ...continuityData, lightPositions: (continuityData.lightPositions || []).map(l => l.id === dragTarget.id ? { ...l, angle } : l) } });
                }
            } else if (dragTarget.type === 'light_icon_rotate') {
                const lp = (continuityData.lightPositions || []).find(l => l.id === dragTarget.id);
                if (lp) {
                    const cx = lp.x + 0.5, cy = lp.y + 0.5;
                    const rawAngle = Math.round(Math.atan2(coords.y - cy, coords.x - cx) * 180 / Math.PI);
                    const iconAngle = ((rawAngle - 90) % 360 + 360) % 360;
                    onUpdateScene({ ...scene, continuityData: { ...continuityData, lightPositions: (continuityData.lightPositions || []).map(l => l.id === dragTarget.id ? { ...l, iconAngle } : l) } });
                }
            } else if (dragTarget.type === 'set_element_rotate') {
                const elem = (continuityData.setElements || []).find(e => e.id === dragTarget.id);
                if (elem) {
                    const ecx = elem.x + elem.width / 2;
                    const ecy = elem.y + elem.height / 2;
                    const angle = Math.round(Math.atan2(coords.y - ecy, coords.x - ecx) * 180 / Math.PI);
                    onUpdateScene({ ...scene, continuityData: { ...continuityData, setElements: (continuityData.setElements || []).map(e => e.id === dragTarget.id ? { ...e, angle: ((angle % 360) + 360) % 360 } : e) } });
                }
            } else if (dragTarget.type === 'caption') {
                onUpdateScene({ ...scene, continuityData: { ...continuityData, captions: (continuityData.captions || []).map(c => c.id === dragTarget.id ? { ...c, x: coords.x, y: coords.y } : c) } });
            }
        }
    };

    const handleGridMouseUp = () => {
        if (isPanning) { handlePanEnd(); return; }
        setDragTarget(null);
        isDragging.current = false;
    };

    const handleGridContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isDragging.current || isPanning) return;
        const coords = getGridCoords(e);
        handleGridClick(coords.x, coords.y);
    };

    const handleGridDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (mode === 'draw_wall' && wallPoints.length >= 2) { e.stopPropagation(); handleFinishWall(); }
        else if (mode === 'draw_track' && trackPoints.length >= 2) { e.stopPropagation(); handleFinishTrack(); }
        else if (mode === 'draw_walk_arrow' && walkArrowPoints.length >= 2) { e.stopPropagation(); handleFinishWalkArrow(); }
    };

    // Unified selection handler for marker components
    const handleSelect = useCallback((obj: SelectedObject | null) => setSelectedObject(obj), []);
    const handleCameraSelect = useCallback((obj: SelectedObject | null, shotId: string) => {
        setSelectedObject(obj);
        setActiveShotId(shotId);
        const shot = shots.find(s => s.id === shotId);
        if (shot?.positions?.camera) setCameraAngle(shot.positions.camera.angle || 0);
    }, [shots, setActiveShotId]);

    // --- Render ---
    return (
        <div className="w-full h-screen flex bg-[#080a0c] overflow-hidden fixed inset-0 z-50">
            <ToolPalette
                mode={mode} setMode={setMode} modeLabel={modeLabel}
                activeShotId={activeShotId} activeShot={activeShot}
                wallPoints={wallPoints} onFinishWall={handleFinishWall} setWallPoints={setWallPoints}
                onUndo={handleUndo} onRedo={handleRedo}
                undoDisabled={undoStack.length === 0} redoDisabled={redoStack.length === 0}
                snapToGrid={snapToGrid} setSnapToGrid={setSnapToGrid}
                trackPoints={trackPoints} onFinishTrack={handleFinishTrack}
                walkArrowPoints={walkArrowPoints} onFinishWalkArrow={handleFinishWalkArrow}
            />

            {/* CANVAS AREA */}
            <div className="flex-grow relative min-w-0" ref={canvasContainerRef}>
                <div
                    role="button"
                    tabIndex={0}
                    aria-label="Continuity Grid Canvas"
                    data-testid="continuity-grid-canvas"
                    className="absolute inset-0 overflow-hidden select-none"
                    style={{
                        cursor: isPanning ? 'grabbing' : mode !== 'none' ? 'crosshair' : (dragTarget ? 'grabbing' : 'default'),
                        background: 'radial-gradient(ellipse at center, #12161a 0%, #0a0c0e 60%, #060708 100%)',
                    }}
                    onMouseMove={handleGridMouseMove}
                    onMouseUp={handleGridMouseUp}
                    onMouseDown={handlePanStart}
                    onMouseLeave={() => { setHoverPos(null); setDragTarget(null); isDragging.current = false; handlePanEnd(); }}
                    onClick={handleGridContainerClick}
                    onDoubleClick={handleGridDoubleClick}
                >
                    <div className="absolute inset-0">
                        <div className="relative w-full h-full">
                            {/* SVG Layer */}
                            <svg
                                className="absolute inset-0 w-full h-full"
                                viewBox={`${vbX - 0.5} ${vbY - 0.5} ${GRID_SIZE} ${GRID_SIZE}`}
                                preserveAspectRatio="xMidYMid meet"
                                style={{ pointerEvents: 'none' }}
                            >
                                <defs>
                                    <radialGradient id="canvasGlow" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="rgba(255,77,0,0.03)" />
                                        <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                                    </radialGradient>
                                </defs>

                                <rect x={-0.5} y={-0.5} width={BASE_GRID} height={BASE_GRID} fill="url(#canvasGlow)" />

                                {/* Grid Lines */}
                                {Array.from({ length: GRID_SIZE + 2 }).map((_, i) => {
                                    const coord = Math.floor(vbX) + i;
                                    const isOriginalEdge = coord === 0 || coord === BASE_GRID;
                                    const isMajor = coord % 4 === 0;
                                    const opacity = isOriginalEdge ? 0.18 : isMajor ? 0.10 : 0.04;
                                    const w = isOriginalEdge ? 0.07 : isMajor ? 0.05 : 0.025;
                                    return (
                                        <React.Fragment key={`grid-${i}`}>
                                            <line x1={coord - 0.5} y1={vbY - 0.5} x2={coord - 0.5} y2={vbY + GRID_SIZE + 0.5} stroke={`rgba(255,255,255,${opacity})`} strokeWidth={w} />
                                            <line x1={vbX - 0.5} y1={coord - 0.5} x2={vbX + GRID_SIZE + 0.5} y2={coord - 0.5} stroke={`rgba(255,255,255,${opacity})`} strokeWidth={w} />
                                        </React.Fragment>
                                    );
                                })}

                                <line x1={BASE_GRID / 2 - 0.5} y1={vbY - 0.5} x2={BASE_GRID / 2 - 0.5} y2={vbY + GRID_SIZE + 0.5} stroke="rgba(255,255,255,0.06)" strokeWidth={0.05} strokeDasharray="0.3 0.2" />
                                <line x1={vbX - 0.5} y1={BASE_GRID / 2 - 0.5} x2={vbX + GRID_SIZE + 0.5} y2={BASE_GRID / 2 - 0.5} stroke="rgba(255,255,255,0.06)" strokeWidth={0.05} strokeDasharray="0.3 0.2" />
                                <rect x={-0.5} y={-0.5} width={BASE_GRID} height={BASE_GRID} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={0.06} />

                                {safeZonePoints && (
                                    <polygon points={safeZonePoints} fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.2)" strokeWidth={0.06} strokeDasharray="0.2 0.15" />
                                )}


                                {/* Wall Segments */}
                                {(continuityData.walls || []).map(wall => (
                                    <g key={wall.id}>
                                        <polyline
                                            points={wall.points.map(p => `${p.x + 0.5},${p.y + 0.5}`).join(' ') + (wall.closedLoop && wall.points.length > 2 ? ` ${wall.points[0].x + 0.5},${wall.points[0].y + 0.5}` : '')}
                                            fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={0.12} strokeLinecap="round" strokeLinejoin="round"
                                        />
                                        {wall.points.map((p, i) => (
                                            <circle key={i} cx={p.x + 0.5} cy={p.y + 0.5} r={0.15} fill="rgba(255,255,255,0.4)" />
                                        ))}
                                    </g>
                                ))}

                                {/* Wall drawing preview */}
                                {mode === 'draw_wall' && wallPoints.length > 0 && (
                                    <g>
                                        <polyline points={wallPoints.map(p => `${p.x + 0.5},${p.y + 0.5}`).join(' ')} fill="none" stroke="#FF6B35" strokeWidth={0.1} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
                                        {wallPoints.map((p, i) => (<circle key={i} cx={p.x + 0.5} cy={p.y + 0.5} r={0.15} fill="#FF6B35" opacity={0.6} />))}
                                        {hoverPos && (
                                            <line x1={wallPoints[wallPoints.length - 1].x + 0.5} y1={wallPoints[wallPoints.length - 1].y + 0.5} x2={hoverPos.x + 0.5} y2={hoverPos.y + 0.5} stroke="#FF6B35" strokeWidth={0.08} strokeDasharray="0.15 0.1" opacity={0.4} />
                                        )}
                                    </g>
                                )}

                                {/* In-progress track preview */}
                                {mode === 'draw_track' && trackPoints.length > 0 && (
                                    <g>
                                        <polyline points={trackPoints.map(p => `${p.x + 0.5},${p.y + 0.5}`).join(' ')} fill="none" stroke="rgba(255,107,53,0.5)" strokeWidth={0.1} strokeDasharray="0.3 0.15" strokeLinecap="round" strokeLinejoin="round" />
                                        {trackPoints.map((p, i) => (<circle key={i} cx={p.x + 0.5} cy={p.y + 0.5} r={0.2} fill="#FF6B35" opacity={0.7} />))}
                                        {hoverPos && (
                                            <line x1={trackPoints[trackPoints.length - 1].x + 0.5} y1={trackPoints[trackPoints.length - 1].y + 0.5} x2={hoverPos.x + 0.5} y2={hoverPos.y + 0.5} stroke="#FF6B35" strokeWidth={0.06} strokeDasharray="0.15 0.1" opacity={0.4} />
                                        )}
                                    </g>
                                )}

                                {/* In-progress walk arrow preview */}
                                {mode === 'draw_walk_arrow' && walkArrowPoints.length > 0 && (
                                    <g>
                                        <polyline points={walkArrowPoints.map(p => `${p.x + 0.5},${p.y + 0.5}`).join(' ')} fill="none" stroke="rgba(59,130,246,0.5)" strokeWidth={0.1} strokeLinecap="round" strokeLinejoin="round" />
                                        {walkArrowPoints.map((p, i) => (<circle key={i} cx={p.x + 0.5} cy={p.y + 0.5} r={0.15} fill="#3b82f6" opacity={0.7} />))}
                                        {hoverPos && (
                                            <line x1={walkArrowPoints[walkArrowPoints.length - 1].x + 0.5} y1={walkArrowPoints[walkArrowPoints.length - 1].y + 0.5} x2={hoverPos.x + 0.5} y2={hoverPos.y + 0.5} stroke="#3b82f6" strokeWidth={0.06} strokeDasharray="0.15 0.1" opacity={0.4} />
                                        )}
                                    </g>
                                )}


                                {/* FOV Cones */}
                                {showFOV && shots.filter(s => s.positions?.camera).map((shot, idx) => {
                                    const fl = shot.parameters.focalLength || 35;
                                    return (
                                        <polygon key={`fov-${shot.id}`} points={computeFOVConePoints(shot.positions!.camera, fl, sensorWidth, FOV_CONE_LENGTH)} fill={SHOT_COLORS[idx % SHOT_COLORS.length]} stroke={SHOT_STROKE_COLORS[idx % SHOT_STROKE_COLORS.length]} strokeWidth={0.05} />
                                    );
                                })}

                                {/* Light Beam Cones */}
                                {showLightBeam && (continuityData.lightPositions || []).map(lp => {
                                    if (lp.showBeam === false) return null;
                                    const lightAngle = lp.angle || 0;
                                    const rad = ((lightAngle + 90) * Math.PI) / 180;
                                    const cx = lp.x + 0.5;
                                    const cy = lp.y + 0.5;
                                    const coneLen = 5;
                                    const halfSpread = 30 * Math.PI / 180;
                                    const lx = cx + Math.cos(rad - halfSpread) * coneLen;
                                    const ly = cy + Math.sin(rad - halfSpread) * coneLen;
                                    const rx = cx + Math.cos(rad + halfSpread) * coneLen;
                                    const ry = cy + Math.sin(rad + halfSpread) * coneLen;
                                    return <polygon key={`light-beam-${lp.id}`} points={`${cx},${cy} ${lx},${ly} ${rx},${ry}`} fill="rgba(250,204,21,0.08)" stroke="rgba(250,204,21,0.25)" strokeWidth={0.04} />;
                                })}

                                {/* Shot Sequence Path */}
                                {showSequencePath && (() => {
                                    const shotsWithCameras = shots.filter(s => s.positions?.camera).sort((a, b) => a.shotNumber - b.shotNumber);
                                    if (shotsWithCameras.length < 2) return null;
                                    return (
                                        <g>
                                            {shotsWithCameras.slice(0, -1).map((shot, i) => {
                                                const next = shotsWithCameras[i + 1];
                                                const x1 = shot.positions!.camera.x + 0.5;
                                                const y1 = shot.positions!.camera.y + 0.5;
                                                const x2 = next.positions!.camera.x + 0.5;
                                                const y2 = next.positions!.camera.y + 0.5;
                                                const mx = (x1 + x2) / 2;
                                                const my = (y1 + y2) / 2;
                                                const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
                                                return (
                                                    <g key={`path-${shot.id}-${next.id}`}>
                                                        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.2)" strokeWidth={0.07} strokeDasharray="0.25 0.12" />
                                                        <polygon points="-0.25,-0.15 0.18,0 -0.25,0.15" fill="rgba(255,255,255,0.4)" transform={`translate(${mx},${my}) rotate(${angle})`} />
                                                    </g>
                                                );
                                            })}
                                        </g>
                                    );
                                })()}

                                {/* 180-Degree Line */}
                                {continuityData.oneEightyLine && (() => {
                                    const { p1, p2 } = continuityData.oneEightyLine;
                                    const cx = (p1.x + p2.x) / 2 + 0.5;
                                    const cy = (p1.y + p2.y) / 2 + 0.5;
                                    const isLineSelected = selectedObject?.type === 'oneEightyLine';
                                    return (
                                        <g>
                                            {/* Wide invisible hit area for clicking */}
                                            <line
                                                x1={p1.x + 0.5} y1={p1.y + 0.5} x2={p2.x + 0.5} y2={p2.y + 0.5}
                                                stroke="transparent" strokeWidth={0.6}
                                                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                                                onClick={(e) => { e.stopPropagation(); setSelectedObject(isLineSelected ? null : { type: 'oneEightyLine', id: '180' }); }}
                                            />
                                            <line x1={p1.x + 0.5} y1={p1.y + 0.5} x2={p2.x + 0.5} y2={p2.y + 0.5} stroke={isLineSelected ? '#ff8c5a' : '#FF6B35'} strokeWidth={isLineSelected ? 0.14 : 0.1} strokeDasharray="0.25 0.12" opacity={isLineSelected ? 1 : 0.8} style={{ pointerEvents: 'none' }} />
                                            <circle cx={p1.x + 0.5} cy={p1.y + 0.5} r={0.2} fill="#FF6B35" opacity={0.6} />
                                            <circle cx={p2.x + 0.5} cy={p2.y + 0.5} r={0.2} fill="#FF6B35" opacity={0.6} />
                                            <g transform={`translate(${cx},${cy}) rotate(${lineAngleDeg})`}>
                                                <rect x={-1.2} y={-0.35} width={2.4} height={0.7} rx={0.15} fill="rgba(0,0,0,0.7)" />
                                                <text x={0} y={0.05} textAnchor="middle" dominantBaseline="middle" fill="#FF6B35" fontSize={0.38} fontFamily="Roboto, sans-serif" fontWeight="600">180° LINE</text>
                                            </g>
                                        </g>
                                    );
                                })()}

                                {tempLineStart && (
                                    <g>
                                        <circle cx={tempLineStart.x + 0.5} cy={tempLineStart.y + 0.5} r={0.3} fill="none" stroke="#FF6B35" strokeWidth={0.08} opacity={0.8} />
                                        <circle cx={tempLineStart.x + 0.5} cy={tempLineStart.y + 0.5} r={0.15} fill="#FF6B35" opacity={0.9} />
                                    </g>
                                )}

                                {hoverPos && mode !== 'none' && !dragTarget && (
                                    <rect x={hoverPos.x} y={hoverPos.y} width={1} height={1} fill="rgba(255,77,0,0.1)" stroke="rgba(255,77,0,0.3)" strokeWidth={0.05} rx={0.08} />
                                )}
                            </svg>

                            {/* HTML Markers Overlay */}
                            <div className="absolute pointer-events-none" style={{
                                left: `${svgContentArea.left}px`, top: `${svgContentArea.top}px`,
                                width: `${svgContentArea.width}px`, height: `${svgContentArea.height}px`,
                            }}>
                                {continuityData.characters.map(char => (
                                    <CharacterMarker
                                        key={char.id}
                                        char={char}
                                        isSelected={selectedObject?.type === 'character' && selectedObject.id === char.id}
                                        mode={mode}
                                        gridToPercent={gridToPercent}
                                        onSelect={handleSelect}
                                        onDragStart={handleCharDragStart}
                                        onRotateStart={handleCharRotateStart}
                                        onDelete={handleDeleteCharacter}
                                        isDragging={isDragging}
                                    />
                                ))}

                                {(continuityData.setElements || []).map(elem => (
                                    <SetElementMarker
                                        key={`set-${elem.id}`}
                                        elem={elem}
                                        isSelected={selectedObject?.type === 'set_element' && selectedObject.id === elem.id}
                                        mode={mode}
                                        vbX={vbX}
                                        vbY={vbY}
                                        GRID_SIZE={GRID_SIZE}
                                        onSelect={handleSelect}
                                        onDragStart={handleSetElemDragStart}
                                        onRotateStart={handleSetElemRotateStart}
                                        onDelete={handleDeleteSetElement}
                                        isDragging={isDragging}
                                    />
                                ))}

                                {/* Wall delete buttons */}
                                {(continuityData.walls || []).map(wall => {
                                    if (wall.points.length < 2) return null;
                                    const midIdx = Math.floor(wall.points.length / 2);
                                    const mid = wall.points[midIdx];
                                    return (
                                        <div key={`del-wall-${wall.id}`} className="absolute pointer-events-auto group" style={{
                                            left: `${((mid.x + 1 - vbX) / GRID_SIZE) * 100}%`,
                                            top: `${((mid.y + 1 - vbY) / GRID_SIZE) * 100}%`,
                                            transform: 'translate(-50%, -50%)',
                                        }}>
                                            <button
                                                className="w-5 h-5 flex items-center justify-center bg-red-500/90 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow-md"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteWall(wall.id); }}
                                                title="Remove wall" aria-label="Remove wall"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                            </button>
                                        </div>
                                    );
                                })}

                                {(continuityData.lightPositions || []).map(lp => {
                                    const resolvedLabel = lp.label || (lp.setupId ? (scene.lighting || []).find(ls => ls.id === lp.setupId)?.name : undefined) || '';
                                    return (
                                        <LightMarker
                                            key={`light-marker-${lp.id}`}
                                            lp={lp}
                                            resolvedLabel={resolvedLabel}
                                            isSelected={selectedObject?.type === 'light' && selectedObject.id === lp.id}
                                            mode={mode}
                                            GRID_SIZE={GRID_SIZE}
                                            vbX={vbX}
                                            vbY={vbY}
                                            onSelect={handleSelect}
                                            onDragStart={handleLightDragStart}
                                            onRotateStart={handleLightRotateStart}
                                            onIconRotateStart={handleLightIconRotateStart}
                                            onDelete={handleDeleteLight}
                                            onToggleBeam={handleToggleLightBeam}
                                            isDragging={isDragging}
                                        />
                                    );
                                })}

                                {shots.filter(shot => shot.positions?.camera).map((shot, idx) => (
                                    <CameraMarker
                                        key={shot.id}
                                        shot={shot}
                                        idx={idx}
                                        isActive={shot.id === activeShotId}
                                        mode={mode}
                                        gridToPercent={gridToPercent}
                                        computedWarnings={computedWarnings}
                                        onSelect={handleCameraSelect}
                                        onDragStart={handleCameraDragStart}
                                        onRotateStart={handleCameraRotateStart}
                                        onDelete={(id) => {
                                            pushUndo();
                                            onUpdateShots(shots.map(s => s.id === id ? { ...s, positions: undefined } : s));
                                            if (selectedObject?.id === id) setSelectedObject(null);
                                        }}
                                        isDragging={isDragging}
                                    />
                                ))}

                                {/* Camera Tracks */}
                                {(continuityData.cameraTracks || []).map(track => (
                                    <CameraTrackMarker
                                        key={`track-${track.id}`}
                                        track={track}
                                        isSelected={selectedObject?.type === 'camera_track' && selectedObject.id === track.id}
                                        vbX={vbX}
                                        vbY={vbY}
                                        GRID_SIZE={GRID_SIZE}
                                        onSelect={(id) => setSelectedObject({ type: 'camera_track', id })}
                                        onUpdatePoint={handleUpdateTrackPoint}
                                        onDelete={handleDeleteTrack}
                                    />
                                ))}

                                {/* Walk Arrows */}
                                {(continuityData.walkArrows || []).map(arrow => {
                                    const linkedChar = continuityData.characters.find(c => c.id === arrow.characterId);
                                    return (
                                        <WalkArrowMarker
                                            key={`walk-${arrow.id}`}
                                            arrow={arrow}
                                            characterColor={linkedChar ? (linkedChar.color || getCharacterColor(linkedChar.name)) : '#ffffff'}
                                            isSelected={selectedObject?.type === 'walk_arrow' && selectedObject.id === arrow.id}
                                            vbX={vbX}
                                            vbY={vbY}
                                            GRID_SIZE={GRID_SIZE}
                                            onSelect={(id) => setSelectedObject({ type: 'walk_arrow', id })}
                                            onUpdatePoint={handleUpdateWalkArrowPoint}
                                            onDelete={handleDeleteWalkArrow}
                                        />
                                    );
                                })}

                                {/* Captions */}
                                {(continuityData.captions || []).map(caption => (
                                    <CaptionMarker
                                        key={`caption-${caption.id}`}
                                        caption={caption}
                                        isSelected={selectedObject?.type === 'caption' && selectedObject.id === caption.id}
                                        isEditing={selectedObject?.type === 'caption' && selectedObject.id === caption.id}
                                        mode={mode}
                                        vbX={vbX}
                                        vbY={vbY}
                                        GRID_SIZE={GRID_SIZE}
                                        onSelect={(id) => setSelectedObject({ type: 'caption', id })}
                                        onDragStart={(e, id) => handleDragStart(e, { type: 'caption', id })}
                                        onUpdate={handleUpdateCaption}
                                        onDelete={handleDeleteCaption}
                                        isDragging={isDragging}
                                    />
                                ))}

                                {/* 180-Line Controls (HTML overlay) */}
                                {selectedObject?.type === 'oneEightyLine' && continuityData.oneEightyLine && (() => {
                                    const { p1, p2 } = continuityData.oneEightyLine;
                                    const midPctX = gridToPercent((p1.x + p2.x) / 2);
                                    const midPctY = gridToPercent((p1.y + p2.y) / 2);
                                    return (
                                        <div
                                            className="absolute z-40 pointer-events-auto flex gap-1"
                                            style={{ left: midPctX, top: midPctY, transform: 'translate(-50%, -220%)' }}
                                        >
                                            <button
                                                className="w-6 h-6 flex items-center justify-center bg-red-500/90 rounded-full text-white hover:bg-red-500 shadow-md"
                                                onClick={(e) => { e.stopPropagation(); handleClearLine(); setSelectedObject(null); }}
                                                title="Delete 180° line"
                                            >
                                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                            </button>
                                            <button
                                                className="w-6 h-6 flex items-center justify-center bg-orange-500/90 rounded-full text-white hover:bg-orange-500 shadow-md"
                                                onClick={(e) => { e.stopPropagation(); handleFlipLine(); }}
                                                title="Flip safe zone side"
                                            >
                                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
                                            </button>
                                        </div>
                                    );
                                })()}

                                {/* Ghost markers */}
                                {mode === 'place_camera' && hoverPos && !dragTarget && (
                                    <div className="absolute transform -translate-x-1/2 -translate-y-1/2 opacity-40 pointer-events-none" style={{ left: gridToPercent(hoverPos.x), top: gridToPercent(hoverPos.y) }}>
                                        <svg width="48" height="36" viewBox="-24 -18 48 36" style={{ transform: `rotate(${cameraAngle}deg)` }}>
                                            <rect x="10" y="-5" width="10" height="10" rx="2" fill="#FF6B35" opacity="0.4" />
                                            <rect x="-14" y="-10" width="24" height="20" rx="3" fill="none" stroke="#FF6B35" strokeWidth="2" strokeDasharray="4 3" />
                                        </svg>
                                    </div>
                                )}
                                {mode === 'place_character' && hoverPos && !charInput && !dragTarget && (
                                    <div className="absolute transform -translate-x-1/2 -translate-y-1/2 opacity-40 pointer-events-none" style={{ left: gridToPercent(hoverPos.x), top: gridToPercent(hoverPos.y) }}>
                                        <div className="w-9 h-9 rounded-full border-2 border-dashed border-blue-400 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                                        </div>
                                    </div>
                                )}
                                {mode === 'place_set_element' && hoverPos && !setElementInput && !dragTarget && (
                                    <div className="absolute transform -translate-x-1/2 -translate-y-1/2 opacity-40 pointer-events-none" style={{ left: gridToPercent(hoverPos.x), top: gridToPercent(hoverPos.y) }}>
                                        <div className="w-8 h-8 border-2 border-dashed border-white/30 rounded flex items-center justify-center">
                                            <SquareIcon className="w-4 h-4 text-white/30" />
                                        </div>
                                    </div>
                                )}
                                {mode === 'place_light' && hoverPos && !lightInput && !dragTarget && (
                                    <div className="absolute transform -translate-x-1/2 -translate-y-1/2 opacity-40 pointer-events-none" style={{ left: gridToPercent(hoverPos.x), top: gridToPercent(hoverPos.y) }}>
                                        <div className="w-8 h-8 rounded-full border-2 border-dashed border-yellow-400/50 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-yellow-400/50" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z"/></svg>
                                        </div>
                                    </div>
                                )}
                                {/* Caption ghost */}
                                {mode === 'place_caption' && hoverPos && !dragTarget && (
                                    <div className="absolute transform -translate-x-1/2 -translate-y-1/2 opacity-40 pointer-events-none" style={{ left: gridToPercent(hoverPos.x), top: gridToPercent(hoverPos.y) }}>
                                        <span className="text-white/40 text-sm font-medium border border-dashed border-white/20 px-2 py-0.5 rounded">Text</span>
                                    </div>
                                )}
                                {/* Freehand ghost dot */}
                                {mode === 'draw_freehand' && hoverPos && !dragTarget && (
                                    <div className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: gridToPercent(hoverPos.x), top: gridToPercent(hoverPos.y) }}>
                                        <div className="rounded-full" style={{ width: drawingWidth * 3 + 4, height: drawingWidth * 3 + 4, backgroundColor: drawingColor, opacity: 0.5 }} />
                                    </div>
                                )}
                                {/* Walk arrow ghost - click near a character to start */}
                                {mode === 'draw_walk_arrow' && !walkArrowCharId && hoverPos && !dragTarget && (
                                    <div className="absolute transform -translate-x-1/2 -translate-y-1/2 opacity-50 pointer-events-none" style={{ left: gridToPercent(hoverPos.x), top: gridToPercent(hoverPos.y) }}>
                                        <span className="text-white/50 text-[10px] px-1.5 py-0.5 bg-black/50 rounded whitespace-nowrap">Click near a character</span>
                                    </div>
                                )}
                            </div>

                            {/* Freehand Drawing Layer */}
                            <DrawingLayer
                                strokes={continuityData.drawings || []}
                                isActive={mode === 'draw_freehand'}
                                vbX={vbX}
                                vbY={vbY}
                                GRID_SIZE={GRID_SIZE}
                                strokeColor={drawingColor}
                                strokeWidth={drawingWidth}
                                selectedId={selectedObject?.type === 'drawing' ? selectedObject.id : null}
                                onAddStroke={handleAddStroke}
                                onSelect={(id) => setSelectedObject(id ? { type: 'drawing', id } : null)}
                                onDelete={handleDeleteDrawing}
                            />

                            {/* Drawing controls toolbar */}
                            {mode === 'draw_freehand' && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 bg-black/70 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl pointer-events-auto">
                                    <label className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-white/50 font-medium">Color</span>
                                        <input
                                            type="color" value={drawingColor}
                                            onChange={(e) => setDrawingColor(e.target.value)}
                                            className="w-6 h-6 rounded cursor-pointer border border-white/10 bg-transparent"
                                        />
                                    </label>
                                    <label className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-white/50 font-medium">Size</span>
                                        <input
                                            type="range" min={1} max={8} value={drawingWidth}
                                            onChange={(e) => setDrawingWidth(Number(e.target.value))}
                                            className="w-20 accent-accent"
                                        />
                                        <span className="text-[10px] text-white/60 w-3">{drawingWidth}</span>
                                    </label>
                                    {(continuityData.drawings || []).length > 0 && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    const drawings = continuityData.drawings || [];
                                                    if (drawings.length === 0) return;
                                                    pushUndo();
                                                    onUpdateScene({ ...scene, continuityData: { ...continuityData, drawings: drawings.slice(0, -1) } });
                                                    if (selectedObject?.type === 'drawing' && selectedObject.id === drawings[drawings.length - 1]?.id) setSelectedObject(null);
                                                }}
                                                className="text-[10px] text-white/50 hover:text-white/70 font-medium px-2 py-0.5 rounded hover:bg-white/5"
                                            >
                                                Undo Last
                                            </button>
                                            <button
                                                onClick={() => { pushUndo(); onUpdateScene({ ...scene, continuityData: { ...continuityData, drawings: [] } }); setSelectedObject(null); }}
                                                className="text-[10px] text-red-400 hover:text-red-300 font-medium px-2 py-0.5 rounded hover:bg-red-500/10"
                                            >
                                                Clear All
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Inline Inputs — aligned to SVG content area */}
                            <div className="absolute pointer-events-none" style={{
                                left: `${svgContentArea.left}px`, top: `${svgContentArea.top}px`,
                                width: `${svgContentArea.width}px`, height: `${svgContentArea.height}px`,
                            }}>
                                <PlacementPopups
                                    charInput={charInput}
                                    setElementInput={setElementInput}
                                    lightInput={lightInput}
                                    sceneActors={scene.actors || []}
                                    lightingSetups={scene.lighting || []}
                                    gridToPercent={gridToPercent}
                                    onConfirmCharacter={handleConfirmCharacter}
                                    onCancelCharacter={() => setCharInput(null)}
                                    onConfirmSetElement={handleConfirmSetElement}
                                    onCancelSetElement={() => setSetElementInput(null)}
                                    onConfirmLightSetup={handleConfirmLightSetup}
                                    onConfirmLightCustom={handleConfirmLightCustom}
                                    onCancelLight={() => setLightInput(null)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <FloatingControls
                    scene={scene} mode={mode} hint={hint} zoom={zoom} continuityData={continuityData}
                    showFOV={showFOV} setShowFOV={setShowFOV}
                    showLightBeam={showLightBeam} setShowLightBeam={setShowLightBeam}
                    showSequencePath={showSequencePath} setShowSequencePath={setShowSequencePath}
                    showShotPanel={showShotPanel} setShowShotPanel={setShowShotPanel}
                    onClearLine={handleClearLine} onClearAll={handleClearAll} onBackToBuilder={onBackToBuilder}
                    onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onZoomReset={handleZoomReset}
                />

                <ObjectPropertiesPanel
                    selectedObject={selectedObject}
                    continuityData={continuityData}
                    shots={shots}
                    activeShotId={activeShotId}
                    cameraAngle={cameraAngle}
                    onRemoveCamera={handleRemoveCamera}
                    onChangeCharacterColor={handleChangeCharacterColor}
                />

                {/* Layer Panel — bottom right */}
                <div className="absolute bottom-4 right-4 z-30 w-52">
                    <LayerPanel
                        layers={continuityData.layers || []}
                        onToggleVisibility={handleToggleLayerVisibility}
                        onToggleLock={handleToggleLayerLock}
                        onAddLayer={handleAddLayer}
                        onDeleteLayer={handleDeleteLayer}
                        onRenameLayer={handleRenameLayer}
                    />
                </div>

                {/* Snapshot Panel — top right */}
                <div className="absolute top-14 right-3 z-30">
                    <SnapshotPanel
                        snapshots={scene.continuitySnapshots || []}
                        onSave={handleSaveSnapshot}
                        onRestore={handleRestoreSnapshot}
                        onDelete={handleDeleteSnapshot}
                        onRename={handleRenameSnapshot}
                    />
                </div>
            </div>

            {showShotPanel && (
                <ShotPanel
                    shots={shots}
                    activeShotId={activeShotId}
                    setActiveShotId={setActiveShotId}
                    onSelectShot={onSelectShot}
                    computedWarnings={computedWarnings}
                    onDeleteShot={handleDeleteShot}
                />
            )}
        </div>
    );
};

export default ContinuityView;
