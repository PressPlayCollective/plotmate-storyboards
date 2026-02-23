import React from 'react';
import type { SceneContinuityData, Shot } from '../../types';
import { TrashIcon } from '../icons';
import { CHARACTER_COLORS, getCharacterColor, SHOT_SOLID_COLORS, type SelectedObject } from './shared';

interface ObjectPropertiesPanelProps {
    selectedObject: SelectedObject | null;
    continuityData: SceneContinuityData;
    shots: Shot[];
    activeShotId: string | null;
    cameraAngle: number;
    onRemoveCamera: () => void;
    onChangeCharacterColor?: (id: string, color: string) => void;
}

const InfoBadge: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
    <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/[0.08]">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs text-white/50 font-medium">{label}</span>
        <span className="text-sm text-white/80 font-mono font-bold">{value}</span>
    </div>
);

const ObjectPropertiesPanel: React.FC<ObjectPropertiesPanelProps> = ({
    selectedObject, continuityData, shots, activeShotId, cameraAngle, onRemoveCamera, onChangeCharacterColor,
}) => {
    if (selectedObject?.type === 'character') {
        const char = continuityData.characters.find(c => c.id === selectedObject.id);
        if (!char) return null;
        const activeColor = char.color || getCharacterColor(char.name);
        return (
            <div className="absolute bottom-16 left-4 z-20 flex flex-col gap-2 items-start">
                <InfoBadge label={char.name} value={`${char.angle || 0}°`} color={activeColor} />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/[0.08]">
                    {CHARACTER_COLORS.map(c => (
                        <button
                            key={c}
                            className="w-5 h-5 rounded-full border-2 transition-all hover:scale-110 flex-shrink-0"
                            style={{
                                backgroundColor: c,
                                borderColor: c === activeColor ? 'white' : 'transparent',
                                boxShadow: c === activeColor ? '0 0 0 1px rgba(255,255,255,0.4)' : 'none',
                            }}
                            onClick={() => onChangeCharacterColor?.(char.id, c)}
                            title={c}
                            aria-label={`Set color to ${c}`}
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (selectedObject?.type === 'light') {
        const light = (continuityData.lightPositions || []).find(l => l.id === selectedObject.id);
        if (!light) return null;
        const beamOn = light.showBeam !== false;
        return (
            <div className="absolute bottom-16 left-4 z-20">
                <InfoBadge label={light.label || 'Light'} value={beamOn ? `beam ${light.angle || 0}° · icon ${light.iconAngle || 0}°` : `beam off · icon ${light.iconAngle || 0}°`} color="#facc15" />
            </div>
        );
    }

    if (selectedObject?.type === 'set_element') {
        const elem = (continuityData.setElements || []).find(e => e.id === selectedObject.id);
        if (!elem) return null;
        return (
            <div className="absolute bottom-16 left-4 z-20">
                <InfoBadge label={elem.label || elem.type} value={`${elem.angle || 0}°`} color="rgba(255,255,255,0.8)" />
            </div>
        );
    }

    if (selectedObject?.type === 'camera' || (activeShotId && shots.find(s => s.id === activeShotId)?.positions?.camera)) {
        const activeShot = shots.find(s => s.id === activeShotId);
        if (!activeShot?.positions?.camera) return null;
        const idx = shots.indexOf(activeShot);
        const shotColor = SHOT_SOLID_COLORS[idx % SHOT_SOLID_COLORS.length];
        return (
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
                <InfoBadge label={`Shot ${activeShot.shotNumber}`} value={`${cameraAngle}°`} color={shotColor} />
                <button
                    className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/[0.08] text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    onClick={onRemoveCamera}
                    title="Remove camera"
                    aria-label="Remove camera"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return null;
};

export default ObjectPropertiesPanel;
