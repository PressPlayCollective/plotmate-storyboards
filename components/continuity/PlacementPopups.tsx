import React, { useState, useRef, useEffect, useContext } from 'react';
import type { SetElementType, LightingSetup } from '../../types';
import type { LightShape } from '../../constants';
import { SET_ELEMENT_TYPES, SET_ELEMENT_CATEGORIES } from '../../constants';
import { LIGHT_SOURCE_CATEGORIES } from '../../constants';
import { ProjectContext } from '../../context/ProjectContext';
import { BASE_GRID } from './shared';
import type { CharacterInputState, SetElementInputState, LightInputState } from './shared';
import LightShapeSVG from './LightShapeSVG';
import SetElementTypeIcon from './SetElementTypeIcon';

interface PlacementPopupsProps {
    charInput: CharacterInputState | null;
    setElementInput: SetElementInputState | null;
    lightInput: LightInputState | null;
    sceneActors: string[];
    lightingSetups: LightingSetup[];
    gridToPercent: (coord: number) => string;
    onConfirmCharacter: (name: string) => void;
    onCancelCharacter: () => void;
    onConfirmSetElement: (label: string, type: SetElementType) => void;
    onCancelSetElement: () => void;
    onConfirmLightSetup: (setupId: string) => void;
    onConfirmLightCustom: (label: string, sourceType: string, shape: LightShape) => void;
    onCancelLight: () => void;
}

const PlacementPopups: React.FC<PlacementPopupsProps> = ({
    charInput, setElementInput, lightInput, sceneActors, lightingSetups,
    gridToPercent,
    onConfirmCharacter, onCancelCharacter,
    onConfirmSetElement, onCancelSetElement,
    onConfirmLightSetup, onConfirmLightCustom, onCancelLight,
}) => {
    return (
        <div className="absolute pointer-events-none" style={{ inset: 0 }}>
            {charInput && (
                <InlineCharacterInput
                    state={charInput}
                    sceneActors={sceneActors}
                    onConfirm={onConfirmCharacter}
                    onCancel={onCancelCharacter}
                    gridToPercent={gridToPercent}
                />
            )}
            {setElementInput && (
                <InlineSetElementInput
                    state={setElementInput}
                    onConfirm={onConfirmSetElement}
                    onCancel={onCancelSetElement}
                    gridToPercent={gridToPercent}
                />
            )}
            {lightInput && (
                <InlineLightInput
                    state={lightInput}
                    lightingSetups={lightingSetups}
                    onConfirmSetup={onConfirmLightSetup}
                    onConfirmCustom={onConfirmLightCustom}
                    onCancel={onCancelLight}
                    gridToPercent={gridToPercent}
                />
            )}
        </div>
    );
};

const InlineCharacterInput: React.FC<{
    state: CharacterInputState;
    sceneActors: string[];
    onConfirm: (name: string) => void;
    onCancel: () => void;
    gridToPercent: (coord: number) => string;
}> = ({ state, sceneActors, onConfirm, onCancel, gridToPercent }) => {
    const { projectSettings } = useContext(ProjectContext);
    const inputRef = useRef<HTMLInputElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const [name, setName] = useState(state.name);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    useEffect(() => {
        const el = popupRef.current;
        if (!el) return;
        const stop = (e: WheelEvent) => { e.stopPropagation(); };
        el.addEventListener('wheel', stop, { passive: false });
        return () => el.removeEventListener('wheel', stop);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && name.trim()) {
            onConfirm(name.trim());
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    const allActorNames = [
        ...new Set([
            ...sceneActors,
            ...(projectSettings?.actors?.map(a => a.name) || []),
        ]),
    ];

    const hasScriptActors = allActorNames.length > 0;
    const [tab, setTab] = useState<'script' | 'custom'>(hasScriptActors ? 'script' : 'custom');

    const filteredActors = allActorNames.filter(a => a.toLowerCase().includes(name.toLowerCase()) || name === '');

    const pctY = (state.y / BASE_GRID) * 100;
    const openBelow = pctY < 35;

    return (
        <div
            ref={popupRef}
            className="absolute z-50 pointer-events-auto bg-[#1E1E1E] border border-white/20 rounded-lg p-2.5 shadow-2xl"
            style={{
                left: gridToPercent(state.x),
                top: gridToPercent(state.y),
                transform: openBelow ? 'translate(-50%, 20%)' : 'translate(-50%, -105%)',
                minWidth: '220px',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {hasScriptActors && (
                <div className="flex gap-1 mb-2 border-b border-white/[0.08] pb-2">
                    <button
                        type="button"
                        className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${tab === 'script' ? 'bg-accent text-white' : 'bg-white/[0.06] text-white/50 hover:text-white/70'}`}
                        onClick={() => setTab('script')}
                    >
                        From Script
                    </button>
                    <button
                        type="button"
                        className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${tab === 'custom' ? 'bg-accent text-white' : 'bg-white/[0.06] text-white/50 hover:text-white/70'}`}
                        onClick={() => { setTab('custom'); setTimeout(() => inputRef.current?.focus(), 0); }}
                    >
                        Custom Name
                    </button>
                </div>
            )}
            {tab === 'script' && hasScriptActors ? (
                <>
                    <p className="text-xs text-white/60 mb-1.5 font-medium">Select Character</p>
                    <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                        {allActorNames.map(actor => (
                            <button
                                key={actor}
                                type="button"
                                className="text-left text-xs px-2 py-1.5 text-white/80 hover:bg-accent/20 hover:text-white rounded-md transition-colors bg-white/5 truncate"
                                onClick={() => onConfirm(actor)}
                                title={actor}
                            >
                                {actor}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-1.5 mt-2.5">
                        <button
                            className="flex-1 px-2.5 py-1.5 text-xs bg-white/10 text-white/60 rounded-md hover:bg-white/20 transition-colors"
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <p className="text-xs text-white/60 mb-1.5 font-medium">Character Name</p>
                    <input
                        ref={inputRef}
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setShowSuggestions(true); }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setShowSuggestions(true)}
                        className="w-full bg-canvas border border-white/15 rounded-md px-2.5 py-1.5 text-sm text-white focus:ring-1 focus:ring-accent focus:border-accent focus:outline-none"
                        placeholder="Enter name..."
                    />
                    {showSuggestions && filteredActors.length > 0 && (
                        <div className="mt-1.5 max-h-24 overflow-y-auto">
                            {filteredActors.map(actor => (
                                <button
                                    key={actor}
                                    className="w-full text-left text-xs px-2.5 py-1.5 text-white/70 hover:bg-accent/20 hover:text-white rounded-md transition-colors"
                                    onClick={() => onConfirm(actor)}
                                >
                                    {actor}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-1.5 mt-2.5">
                        <button
                            className="flex-1 px-2.5 py-1.5 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent/80 disabled:opacity-40 transition-colors"
                            onClick={() => name.trim() && onConfirm(name.trim())}
                            disabled={!name.trim()}
                        >
                            Add
                        </button>
                        <button
                            className="flex-1 px-2.5 py-1.5 text-xs bg-white/10 text-white/60 rounded-md hover:bg-white/20 transition-colors"
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

const InlineSetElementInput: React.FC<{
    state: SetElementInputState;
    onConfirm: (label: string, type: SetElementType) => void;
    onCancel: () => void;
    gridToPercent: (coord: number) => string;
}> = ({ state, onConfirm, onCancel, gridToPercent }) => {
    const categoryKeys = Object.keys(SET_ELEMENT_CATEGORIES);
    const inputRef = useRef<HTMLInputElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const [label, setLabel] = useState(state.label);
    const [selectedType, setSelectedType] = useState<SetElementType>(state.type);
    const [activeCategory, setActiveCategory] = useState<string>(() => categoryKeys[0]);

    useEffect(() => {
        const el = popupRef.current;
        if (!el) return;
        const stop = (e: WheelEvent) => { e.stopPropagation(); };
        el.addEventListener('wheel', stop, { passive: false });
        return () => el.removeEventListener('wheel', stop);
    }, []);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    useEffect(() => {
        const match = SET_ELEMENT_TYPES.find(t => t.value === selectedType);
        if (match && match.value !== 'custom') {
            setLabel(match.label);
        }
    }, [selectedType]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && label.trim()) {
            onConfirm(label.trim(), selectedType);
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    const pctY = (state.y / BASE_GRID) * 100;
    const openBelow = pctY < 35;

    return (
        <div
            ref={popupRef}
            className="absolute z-50 pointer-events-auto bg-[#1E1E1E] border border-white/20 rounded-lg p-2.5 shadow-2xl"
            style={{
                left: gridToPercent(state.x),
                top: gridToPercent(state.y),
                transform: openBelow ? 'translate(-50%, 20%)' : 'translate(-50%, -105%)',
                minWidth: '240px',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <p className="text-xs text-white/60 mb-1.5 font-medium">Element Type</p>
            <div className="flex gap-1 overflow-x-auto py-1 px-1 border-b border-white/[0.08] mb-2">
                {categoryKeys.map(catKey => {
                    const cat = SET_ELEMENT_CATEGORIES[catKey];
                    const isActive = activeCategory === catKey;
                    return (
                        <button
                            key={catKey}
                            type="button"
                            className={`shrink-0 text-[10px] px-2 py-0.5 rounded-md transition-colors ${isActive ? 'bg-accent text-white' : 'bg-white/[0.06] text-white/50 hover:text-white/70'}`}
                            onClick={() => setActiveCategory(catKey)}
                        >
                            {cat.label}
                        </button>
                    );
                })}
            </div>
            <div className="grid grid-cols-5 gap-1 mb-2">
                {(SET_ELEMENT_CATEGORIES[activeCategory]?.types ?? []).map(type => {
                    const meta = SET_ELEMENT_TYPES.find(t => t.value === type);
                    return (
                        <button
                            key={type}
                            type="button"
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${selectedType === type ? 'bg-accent/20 border-accent/40 text-white' : 'bg-white/5 hover:bg-white/10 border-transparent text-white/50'}`}
                            onClick={() => setSelectedType(type)}
                            title={meta?.label ?? type}
                        >
                            <SetElementTypeIcon type={type} className="w-4 h-4" />
                        </button>
                    );
                })}
            </div>
            <p className="text-xs text-white/60 mb-1.5 font-medium">Label</p>
            <input
                ref={inputRef}
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-canvas border border-white/15 rounded-md px-2.5 py-1.5 text-sm text-white focus:ring-1 focus:ring-accent focus:border-accent focus:outline-none"
                placeholder="e.g., Kitchen Table..."
            />
            <div className="flex gap-1.5 mt-2.5">
                <button
                    className="flex-1 px-2.5 py-1.5 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent/80 disabled:opacity-40 transition-colors"
                    onClick={() => label.trim() && onConfirm(label.trim(), selectedType)}
                    disabled={!label.trim()}
                >
                    Add
                </button>
                <button
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white/10 text-white/60 rounded-md hover:bg-white/20 transition-colors"
                    onClick={onCancel}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

const InlineLightInput: React.FC<{
    state: LightInputState;
    lightingSetups: LightingSetup[];
    onConfirmSetup: (setupId: string) => void;
    onConfirmCustom: (label: string, sourceType: string, shape: LightShape) => void;
    onCancel: () => void;
    gridToPercent: (coord: number) => string;
}> = ({ state, lightingSetups, onConfirmSetup, onConfirmCustom, onCancel, gridToPercent }) => {
    const [customLabel, setCustomLabel] = useState('');
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = popupRef.current;
        if (!el) return;
        const stop = (e: WheelEvent) => { e.stopPropagation(); };
        el.addEventListener('wheel', stop, { passive: false });
        return () => el.removeEventListener('wheel', stop);
    }, []);

    const pctY = (state.y / BASE_GRID) * 100;
    const openBelow = pctY < 35;

    return (
        <div
            ref={popupRef}
            className="absolute z-50 pointer-events-auto bg-[#1E1E1E] border border-white/20 rounded-lg p-3 shadow-2xl"
            style={{
                left: gridToPercent(state.x),
                top: gridToPercent(state.y),
                transform: openBelow ? 'translate(-50%, 20%)' : 'translate(-50%, -105%)',
                minWidth: '260px',
                maxWidth: '320px',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {lightingSetups.length > 0 && (
                <>
                    <p className="text-[10px] uppercase tracking-wider text-accent/70 font-semibold mb-1.5">From Script</p>
                    <div className="space-y-0.5 mb-2.5">
                        {lightingSetups.map(ls => (
                            <button
                                key={ls.id}
                                className="w-full text-left text-xs px-2.5 py-1.5 text-white/80 hover:bg-accent/20 hover:text-white rounded-md transition-colors flex items-center gap-2"
                                onClick={() => onConfirmSetup(ls.id)}
                            >
                                <span className="text-accent">★</span>
                                <span>{ls.name}</span>
                                <span className="text-white/30 ml-auto text-[10px]">{ls.sourceType}</span>
                            </button>
                        ))}
                    </div>
                    <div className="border-t border-white/10 mb-2.5" />
                </>
            )}

            <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold mb-1.5">All Light Sources</p>
            <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                {LIGHT_SOURCE_CATEGORIES.map(cat => (
                    <div key={cat.category}>
                        <button
                            className="w-full text-left text-[11px] px-2 py-1.5 text-white/50 hover:text-white/80 hover:bg-white/[0.04] rounded-md transition-colors flex items-center gap-1.5 font-medium"
                            onClick={() => setExpandedCategory(expandedCategory === cat.category ? null : cat.category)}
                        >
                            <svg className={`w-3 h-3 transition-transform ${expandedCategory === cat.category ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                            {cat.category}
                            <span className="text-white/50 ml-auto text-[9px]">{cat.sources.length}</span>
                        </button>
                        {expandedCategory === cat.category && (
                            <div className="ml-2 space-y-0.5 mt-0.5 mb-1">
                                {cat.sources.map(src => (
                                    <button
                                        key={src.value}
                                        className="w-full text-left text-xs px-2.5 py-2 text-white/70 hover:bg-accent/20 hover:text-white rounded-md transition-colors flex items-center gap-2.5"
                                        onClick={() => onConfirmCustom(src.label, src.value, src.shape)}
                                    >
                                        <svg width="36" height="36" viewBox="0 0 36 36" className="flex-shrink-0">
                                            <LightShapeSVG shape={src.shape} cx={18} cy={18} r={14} />
                                        </svg>
                                        <span>{src.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="border-t border-white/10 mt-2.5 pt-2.5">
                <p className="text-[10px] text-white/60 mb-1">Custom Label</p>
                <div className="flex gap-1.5">
                    <input
                        type="text"
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                        placeholder="e.g., Kino on boom arm"
                        className="flex-1 bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white placeholder-white/25 outline-none focus:border-accent/50"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && customLabel.trim()) {
                                onConfirmCustom(customLabel.trim(), 'custom', 'custom');
                            }
                        }}
                        autoFocus={lightingSetups.length === 0}
                    />
                    <button
                        className="px-2.5 py-1.5 text-xs bg-accent text-white rounded-md hover:bg-accent/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={!customLabel.trim()}
                        onClick={() => customLabel.trim() && onConfirmCustom(customLabel.trim(), 'custom', 'custom')}
                    >
                        Add
                    </button>
                </div>
            </div>

            <div className="flex gap-1.5 mt-2.5">
                <button
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white/10 text-white/60 rounded-md hover:bg-white/20 transition-colors"
                    onClick={onCancel}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default PlacementPopups;
