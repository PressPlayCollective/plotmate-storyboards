
import React, { useState, useCallback, useMemo, useContext, useRef, useEffect } from 'react';
import type { Scene, Shot, ShotParameters, Actor, Prop, Project, LibraryAsset } from '../types';
import * as C from '../constants';
import CollapsibleSection from './CollapsibleSection';
import { SparklesIcon, PencilIcon, PlusIcon, MapPinIcon, ExclamationTriangleIcon, Squares2x2Icon, XIcon, TrashIcon, ArrowDownTrayIcon, PolyhedronIcon } from './icons';
import { generateShotImage, hasGeminiKey } from '../services/imageProviderService';
import { computeVisibleObjects } from '../utils/continuityTranslator';
import { generateShotDescription, generateTechnicalData, editImageWithNanoBanana, analyzeLocationByAddress, describeActorImage, generateShotSequence, interpretNaturalLanguageShot } from '../services/geminiService';
import { ProjectContext } from '../context/ProjectContext';
import ContinuityView from './ContinuityView';
import ExportModal from './ExportModal';
import SaveStatusIndicator from './SaveStatusIndicator';
import FeatureHint from './FeatureHint';
import HintButton from './HintButton';
import { useFeatureDiscovery } from '../utils/useFeatureDiscovery';
import { storageGet, storageSet } from '../utils/storage';
import { syncLibrary } from '../services/syncService';


interface ShotBuilderProps {
  scene: Scene;
  shots: Shot[];
  setShots: React.Dispatch<React.SetStateAction<Shot[]>>;
  activeShotId: string | null;
  setActiveShotId: (id: string | null) => void;
  currentView: 'builder' | 'continuity';
  onViewChange: (view: 'builder' | 'continuity') => void;
  onBack: () => void;
  onSceneUpdate: (scene: Scene) => void;
  onShowGallery: () => void;
}

const ButtonGroup = <T extends string | number,>({ title, options, selected, onSelect, multiSelect = false }: { title: string, options: readonly T[], selected: T | T[], onSelect: (value: T) => void, multiSelect?: boolean }) => {
    const isSelected = (option: T) => multiSelect ? (selected as T[]).includes(option) : selected === option;

    return (
        <div className="flex flex-wrap gap-2">
            {options.map(option => (
                <button
                    key={option}
                    onClick={() => onSelect(option)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${isSelected(option) ? 'bg-accent border-accent text-white' : 'bg-canvas border-white/10 text-white/60 hover:border-accent'}`}
                >
                    {option}
                </button>
            ))}
        </div>
    );
};

const ShotBuilder: React.FC<ShotBuilderProps> = ({ scene, shots, setShots, activeShotId, setActiveShotId, currentView, onViewChange, onBack, onSceneUpdate, onShowGallery }) => {
    const { projectSettings, setProjectSettings, updateActorDescription, forceImmediateSave } = useContext(ProjectContext);
    const [shotParams, setShotParams] = useState<ShotParameters>({ flags: [], actorsInShot: [], objectsInShot: '' });
    const shotParamsRef = useRef(shotParams);
    shotParamsRef.current = shotParams;
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editPrompt, setEditPrompt] = useState('');
    const [address, setAddress] = useState(scene.address || '');
    const [locationAnalysis, setLocationAnalysis] = useState<string | null>(null);
    const [isScouting, setIsScouting] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [sceneAction, setSceneAction] = useState('');
    const [isSuggestingLoading, setIsSuggestingLoading] = useState(false);
    const [naturalLanguagePrompt, setNaturalLanguagePrompt] = useState('');
    const [isInterpreting, setIsInterpreting] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    // Feature discovery hints
    const discovery = useFeatureDiscovery();
    const [showBuilderHint, setShowBuilderHint] = useState(false);
    const [showContinuityHint, setShowContinuityHint] = useState(false);
    const [showExportHint, setShowExportHint] = useState(false);

    // Show builder hint on first mount
    useEffect(() => {
        if (discovery.isNew('shot_builder')) {
            setShowBuilderHint(true);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Show continuity hint when switching to continuity view
    useEffect(() => {
        if (currentView === 'continuity' && discovery.isNew('continuity_view')) {
            setShowContinuityHint(true);
        }
    }, [currentView]); // eslint-disable-line react-hooks/exhaustive-deps

    // Show export hint when export modal opens
    useEffect(() => {
        if (showExportModal && discovery.isNew('export')) {
            setShowExportHint(true);
        }
    }, [showExportModal]); // eslint-disable-line react-hooks/exhaustive-deps

    const activeShot = useMemo(() => shots.find(s => s.id === activeShotId), [shots, activeShotId]);
    const isExterior = useMemo(() => scene.slugline.toUpperCase().startsWith('EXT'), [scene.slugline]);

    const saveImageToLibrary = useCallback(async (image: string, shotNumber: number, label: string) => {
        try {
            const ASSET_KEY = 'shotdeck_asset_library';
            const stored = await storageGet<{ assets: LibraryAsset[]; folders: any[] }>(ASSET_KEY);
            const libraryData = stored || { assets: [], folders: [{ id: 'root', name: 'All Assets' }] };
            const newAsset: LibraryAsset = {
                id: crypto.randomUUID(),
                type: 'shot' as const,
                name: `${scene.slugline} - Shot ${shotNumber} (${label}) #${Date.now().toString(36).slice(-4)}`,
                image,
                description: `Auto-saved generated image for Scene ${scene.sceneNumber}, Shot ${shotNumber}.`,
                tags: ['generated', `scene-${scene.sceneNumber}`, `shot-${shotNumber}`],
                folderId: 'root',
                createdAt: Date.now(),
            };
            libraryData.assets.push(newAsset);
            await syncLibrary(libraryData);
            await storageSet(ASSET_KEY, libraryData);
        } catch (e) {
            console.warn('Failed to auto-save generated image to library:', e);
        }
    }, [scene.slugline, scene.sceneNumber]);

    const handleDescriptionChange = useCallback((shotId: string, newDescription: string) => {
        if (!shotId) return;
        setShots(prev =>
            prev.map(s =>
                s.id === shotId ? { ...s, description: newDescription } : s
            )
        );
    }, [setShots]);

    const handleNotesChange = useCallback((shotId: string, newNotes: string) => {
        if (!shotId) return;
        setShots(prev =>
            prev.map(s =>
                s.id === shotId ? { ...s, notes: newNotes } : s
            )
        );
    }, [setShots]);

    const updateShotParams = useCallback(<K extends keyof ShotParameters>(key: K, value: ShotParameters[K]) => {
        // Update local param state
        setShotParams(prevParams => ({ ...prevParams, [key]: value }));
        // Sync to shots separately to avoid "Cannot update a component while rendering"
        if (activeShotId) {
            setShots(prev =>
                prev.map(s =>
                    s.id === activeShotId
                        ? { ...s, parameters: { ...s.parameters, [key]: value } }
                        : s
                )
            );
        }
    }, [activeShotId, setShots]);

    const computeMultiSelectValues = useCallback((currentValues: string[], key: 'flags' | 'actorsInShot', value: string): string[] => {
        if (key === 'flags') {
            if (value === 'None') {
                return currentValues.includes('None') ? [] : ['None'];
            }
            const isTogglingOff = currentValues.includes(value);
            if (isTogglingOff) {
                const newValues = currentValues.filter(v => v !== value);
                return newValues.length === 0 ? ['None'] : newValues;
            }
            return [...currentValues.filter(v => v !== 'None'), value];
        }
        return currentValues.includes(value)
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value];
    }, []);

    const handleMultiSelect = useCallback((key: 'flags' | 'actorsInShot', value: string) => {
        // Update local param state
        setShotParams(prevParams => {
            const newValues = computeMultiSelectValues(prevParams[key] || [], key, value);
            return { ...prevParams, [key]: newValues };
        });
        // Sync to shots separately to avoid "Cannot update a component while rendering"
        if (activeShotId) {
            setShots(prev =>
                prev.map(s => {
                    if (s.id !== activeShotId) return s;
                    const newValues = computeMultiSelectValues(s.parameters[key] || [], key, value);
                    return { ...s, parameters: { ...s.parameters, [key]: newValues } };
                })
            );
        }
    }, [activeShotId, setShots, computeMultiSelectValues]);
    
    const addNewShot = async (image: string | null = null) => {
        const newShotId = crypto.randomUUID();
        
        const baseParams: ShotParameters = {
            flags: ['None'],
            actorsInShot: scene.actors || [],
            objectsInShot: '',
            lensType: projectSettings?.lensType,
            focalLength: projectSettings?.lensKit?.[0],
            support: projectSettings?.support?.[0]
        };
        
        // Generate technical data immediately for better UX
        const techData = projectSettings ? generateTechnicalData(baseParams, scene.id, newShotId, projectSettings, scene.lighting) : null;

        setShots(prev => {
            const newShotNum = prev.length + 1;
            const newShot: Shot = {
                id: newShotId,
                shotNumber: newShotNum,
                parameters: baseParams,
                generatedImage: image,
                description: '',
                technicalData: techData,
                notes: '',
                audioDescription: '',
            };
            return [...prev, newShot];
        });
        setActiveShotId(newShotId);
        setShotParams(baseParams);
    };

    const deleteShot = (shotId: string) => {
        if (window.confirm("Are you sure you want to delete this shot?")) {
            const newShots = shots.filter(s => s.id !== shotId);
            const renumberedShots = newShots.map((shot, index) => ({...shot, shotNumber: index + 1}));
            setShots(renumberedShots);
            
            if (activeShotId === shotId) {
                const newActiveShot = renumberedShots.length > 0 ? renumberedShots[0] : null;
                setActiveShotId(newActiveShot ? newActiveShot.id : null);
                if (newActiveShot) {
                    setShotParams(newActiveShot.parameters);
                } else {
                    setShotParams({ flags: [], actorsInShot: [], objectsInShot: '' });
                }
            }
        }
    };

    const selectShot = (shot: Shot) => {
        setActiveShotId(shot.id);
        setShotParams(shot.parameters);
    };
    
    const handleScoutLocation = async () => {
        if (!address) return;
        setIsScouting(true);
        try {
            const analysis = await analyzeLocationByAddress(address);
            setLocationAnalysis(analysis);
            onSceneUpdate({...scene, address});
        } catch (error: any) {
            console.error("Error scouting location:", error);
            const errorMessage = (error.message || '').toLowerCase();
            if (errorMessage.includes('overloaded') || errorMessage.includes('503')) {
                alert("The location analysis service is currently busy. Please try again in a few moments.");
            } else {
                alert("Failed to analyze address. Please try a different address or check the console.");
            }
            setLocationAnalysis(null);
        }
        setIsScouting(false);
    };

    const handleGenerateShot = async () => {
        if (!activeShotId || !projectSettings) return;
        
        setIsLoading(true);

        try {
            // Read the latest params from the ref to avoid stale closure issues.
            const currentParams = shotParamsRef.current;

            // --- CONTINUITY VIEW AUTHORITY ---
            // When continuity data is populated, it is the absolute context for generation.
            // Characters, lights, and set elements placed on the continuity grid override
            // script-derived shot parameters for their respective domains.
            const sensorWidth = C.SENSOR_WIDTHS[projectSettings.sensorMode] || 36;
            const hasContinuityCamera = !!(scene.continuityData && activeShot?.positions?.camera);
            const continuityCharacters = scene.continuityData?.characters || [];
            const continuitySetElements = scene.continuityData?.setElements || [];
            const continuityLights = scene.continuityData?.lightPositions || [];

            let effectiveActorsInShot = currentParams.actorsInShot || [];
            if (hasContinuityCamera && continuityCharacters.length > 0) {
                const visible = computeVisibleObjects(
                    activeShot!.positions!.camera,
                    continuityCharacters,
                    continuitySetElements,
                    currentParams.focalLength || 35,
                    sensorWidth,
                );
                effectiveActorsInShot = visible
                    .filter(v => v.facingDescription !== undefined)
                    .map(v => v.name);
            }

            const effectiveParams: ShotParameters = { ...currentParams, actorsInShot: effectiveActorsInShot };

            // When continuity has light positions, suppress separate scene.lighting in prompt
            // (continuity translator already describes them spatially; scene.lighting is still
            // passed through for setupId lookup inside the translator).
            const effectiveLighting = (hasContinuityCamera && continuityLights.length > 0)
                ? undefined
                : scene.lighting;


            // Step 1: Get full Actor objects for the effective actors list.
            const canDescribeActors = hasGeminiKey();
            const actorsInShotData: Actor[] = await Promise.all(
                effectiveActorsInShot
                .map(actorName => projectSettings.actors.find(a => a.name === actorName))
                .filter((actor): actor is Actor => !!actor)
                .map(async (actor) => {
                    if (actor.description) return actor;
                    if (!actor.photo) return actor;
                    if (!canDescribeActors) {
                        return { ...actor, description: `a person named ${actor.name}` };
                    }
                    const newDescription = await describeActorImage(actor.photo);
                    updateActorDescription(actor.id, newDescription);
                    return { ...actor, description: newDescription };
                })
            );

            // Step 2: Get props — when continuity has set elements, they define what's
            // visible (handled by continuity translator), so skip separate script props.
            const propsInShotData: Prop[] = (hasContinuityCamera && continuitySetElements.length > 0)
                ? []
                : (scene.props || [])
                    .map(propName => projectSettings.props.find(p => p.name === propName))
                    .filter((prop): prop is Prop => !!prop);

            const projectStyle = {
                projectType: projectSettings.projectType,
                cameraBody: projectSettings.cameraBody,
                sensorMode: projectSettings.sensorMode,
            };

            // Step 3: Find the location reference image for the current scene.
            let locationReferenceImage: string | undefined = undefined;
            if (projectSettings?.locations && scene.slugline) {
                const sluglineUpper = scene.slugline.toUpperCase();
                const matchedLocation = projectSettings.locations.find(loc => 
                    sluglineUpper.includes(loc.name.toUpperCase())
                );
                if (matchedLocation && matchedLocation.referenceImage) {
                    locationReferenceImage = matchedLocation.referenceImage;
                }
            }

            // Step 4: Generate Shot Content
            const aspectRatio = projectSettings.primaryAspectRatio || '16:9';

            const techData = generateTechnicalData(effectiveParams, scene.id, activeShotId, projectSettings, effectiveLighting);

            const image = await generateShotImage(effectiveParams, scene.slugline, scene.timeOfDay || 'Day', scene.mood, scene.colorPalette, aspectRatio, projectStyle, locationAnalysis || undefined, actorsInShotData, propsInShotData, effectiveLighting, locationReferenceImage, scene.continuityData, activeShot?.positions, scene.description);

            let description = '';
            try {
                description = await generateShotDescription(effectiveParams, scene.mood, scene.colorPalette, effectiveLighting);
            } catch (descError: any) {
                console.warn('Description generation failed (image was saved):', descError.message);
            }

            setShots(prev => prev.map(s =>
                s.id === activeShotId ? { ...s, parameters: currentParams, generatedImage: image, description, technicalData: techData } : s
            ));

            // Trigger immediate save to persist generated image
            setTimeout(() => forceImmediateSave(), 100);

            // Auto-save to media library
            const shotNum = activeShot?.shotNumber ?? shots.length;
            saveImageToLibrary(image, shotNum, 'generated');

        } catch (error: any) {
            console.error("Error generating shot:", error);
            const errorMessage = (error.message || '').toLowerCase();
            if (errorMessage.includes('overloaded') || errorMessage.includes('503')) {
                alert("The AI model is currently busy. The app tried a few times automatically. Please try again in a few moments.");
            } else {
                alert(`Failed to generate shot. Check console for details. Error: ${error.message}`);
            }
        }
        setIsLoading(false);
    };

    const handleEditImage = async () => {
        if (!activeShot?.generatedImage || !editPrompt) return;
        setIsLoading(true);
        try {
            const editedImage = await editImageWithNanoBanana(activeShot.generatedImage, editPrompt);
            setShots(prev => prev.map(s =>
                s.id === activeShotId ? { ...s, generatedImage: editedImage } : s
            ));
            setIsEditing(false);
            setEditPrompt('');
            // Trigger immediate save to persist edited image
            setTimeout(() => forceImmediateSave(), 100);

            // Auto-save edited image to media library
            const shotNum = activeShot?.shotNumber ?? shots.length;
            saveImageToLibrary(editedImage, shotNum, 'edited');
        } catch (error: any) {
            console.error("Error editing image:", error);
            const errorMessage = (error.message || '').toLowerCase();
            if (errorMessage.includes('overloaded') || errorMessage.includes('503')) {
                alert("The AI model is currently busy. The app tried a few times automatically. Please try again in a few moments.");
            } else {
                alert(`Failed to edit image. Check console for details. Error: ${error.message}`);
            }
        }
        setIsLoading(false);
    };

    const handleGenerateSequence = async () => {
        if (!sceneAction || !projectSettings) return;
        setIsSuggestingLoading(true);
        try {
            const suggestedParamsList = await generateShotSequence(sceneAction, projectSettings.lensKit, projectSettings.support);
            
            let firstNewShot: Shot | null = null;
            setShots(prev => {
                const newShots: Shot[] = suggestedParamsList.map((params, index) => {
                    const newShotNum = prev.length + index + 1;
                    const newShotId = crypto.randomUUID();
                    const defaultParams: Partial<ShotParameters> = {
                        flags: ['None'],
                        actorsInShot: [],
                        objectsInShot: '',
                        lensType: projectSettings?.lensType,
                        focalLength: projectSettings?.lensKit?.[0],
                        support: projectSettings?.support?.[0],
                    };

                    const mergedParams = { 
                        ...defaultParams,
                        ...params, 
                    } as ShotParameters;

                    const techData = projectSettings ? generateTechnicalData(mergedParams, scene.id, newShotId, projectSettings, scene.lighting) : null;

                    return {
                        id: newShotId,
                        shotNumber: newShotNum,
                        parameters: mergedParams,
                        generatedImage: null,
                        description: '',
                        technicalData: techData,
                        notes: '',
                        audioDescription: '',
                    };
                });
                if (newShots.length > 0) firstNewShot = newShots[0];
                return [...prev, ...newShots];
            });
            if (firstNewShot) {
                setActiveShotId((firstNewShot as Shot).id);
                setShotParams((firstNewShot as Shot).parameters);
            }
            setIsSuggesting(false);
            setSceneAction('');
        } catch (error) {
            console.error("Error generating shot sequence:", error);
            alert(`Failed to generate sequence. ${(error as Error).message}`);
        } finally {
            setIsSuggestingLoading(false);
        }
    };

    const handleInterpretShot = async () => {
        if (!naturalLanguagePrompt || !projectSettings || !activeShotId) {
            alert("Please describe a shot and ensure a shot is selected.");
            return;
        }
        setIsInterpreting(true);
        try {
            const interpretedParams = await interpretNaturalLanguageShot(naturalLanguagePrompt, scene, projectSettings);
            setShotParams(prev => ({ ...prev, ...interpretedParams }));
            setShots(prev => prev.map(s =>
                s.id === activeShotId
                    ? { ...s, parameters: { ...s.parameters, ...interpretedParams } }
                    : s
            ));
        } catch (error) {
            console.error("Error interpreting shot:", error);
            alert(`Could not interpret shot description: ${(error as Error).message}`);
        } finally {
            setIsInterpreting(false);
        }
    };

    const handleDragEnd = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        const copyShots = [...shots];
        const dragItemContent = copyShots[dragItem.current];
        copyShots.splice(dragItem.current, 1);
        copyShots.splice(dragOverItem.current, 0, dragItemContent);
        
        // Re-number shots, but keep original IDs
        const renumberedShots = copyShots.map((shot, index) => ({
            ...shot,
            shotNumber: index + 1,
        }));

        dragItem.current = null;
        dragOverItem.current = null;
        setShots(renumberedShots);
    };

    if (currentView === 'continuity') {
        return (
            <>
                <ContinuityView scene={scene} shots={shots} activeShotId={activeShotId} setActiveShotId={setActiveShotId} onUpdateScene={onSceneUpdate} onUpdateShots={setShots} onBackToBuilder={() => onViewChange('builder')} onSelectShot={(shotId) => { setActiveShotId(shotId); const shot = shots.find(s => s.id === shotId); if (shot) { setShotParams(shot.parameters); } onViewChange('builder'); }} />
                <FeatureHint featureId="continuity_view" visible={showContinuityHint} onDismiss={() => { setShowContinuityHint(false); discovery.markSeen('continuity_view'); }} />
            </>
        );
    }

    return (
        <div className="h-full w-full flex flex-col bg-canvas">
             {isSuggesting && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-surface border border-white/10 rounded-lg shadow-2xl w-full max-w-lg text-white">
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white">Generate Shot Sequence</h2>
                            <p className="text-white/60">Describe the action or key moments in this scene.</p>
                        </div>
                        <div className="p-6">
                            <textarea
                                value={sceneAction}
                                onChange={(e) => setSceneAction(e.target.value)}
                                placeholder="e.g., 'A character enters the room, pours a drink, and looks out the window thoughtfully.'"
                                className="w-full h-32 bg-canvas border border-white/10 rounded-md p-2 text-sm focus:ring-accent focus:border-accent resize-none"
                                disabled={isSuggestingLoading}
                            />
                        </div>
                        <div className="p-4 flex justify-end gap-2 border-t border-white/10 bg-canvas rounded-b-lg">
                            <button onClick={() => setIsSuggesting(false)} disabled={isSuggestingLoading} className="px-6 py-2 bg-white/10 rounded-md hover:bg-white/20">Cancel</button>
                            <button onClick={handleGenerateSequence} disabled={isSuggestingLoading || !sceneAction} className="px-6 py-2 bg-accent text-white font-bold rounded-md hover:bg-accent/90 disabled:opacity-50 flex items-center gap-2">
                                {isSuggestingLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                {isSuggestingLoading ? 'Generating...' : 'Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Export Modal */}
            {projectSettings && (
                <ExportModal
                    isOpen={showExportModal}
                    onClose={() => setShowExportModal(false)}
                    shots={shots}
                    scene={scene}
                    projectSettings={projectSettings}
                />
            )}

            {/* Header */}
            <header className="flex-shrink-0 flex items-center justify-between p-3 border-b border-white/10 bg-canvas/95 backdrop-blur sticky top-0 z-10">
                <div className="min-w-0 flex-1">
                    <button onClick={onBack} className="text-sm text-white/60 hover:text-white">&larr; Back to Scenes</button>
                    <h1 className="text-xl font-bold truncate">{scene.slugline}</h1>
                    <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${scene.timeOfDay === 'Night' ? 'bg-blue-900/50 text-blue-300' : 'bg-yellow-700/50 text-yellow-300'}`}>{scene.timeOfDay}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                    <SaveStatusIndicator />
                    <button onClick={() => setIsSuggesting(true)} className="flex items-center gap-1.5 text-sm bg-accent/20 border border-accent/80 text-accent hover:bg-accent/30 px-2.5 py-1.5 rounded-md transition-colors font-semibold whitespace-nowrap" title="AI Suggest Shots">
                        <SparklesIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Suggest Shots</span>
                    </button>
                    <button onClick={() => setShowExportModal(true)} className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors border border-white/10 bg-white/5 px-2.5 py-1.5 rounded-md whitespace-nowrap">
                         <ArrowDownTrayIcon className="w-4 h-4" /> <span className="hidden sm:inline">Export / Share</span>
                    </button>
                    <button onClick={onShowGallery} className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors whitespace-nowrap" title="Open Gallery View">
                        <Squares2x2Icon className="w-5 h-5" />
                        <span className="hidden md:inline">Gallery View</span>
                    </button>
                    <button onClick={() => onViewChange('continuity')} className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors whitespace-nowrap" title="Open Continuity View"><MapPinIcon className="w-5 h-5" /><span className="hidden md:inline">Continuity View</span></button>
                    <HintButton onClick={() => setShowBuilderHint(true)} />
                </div>
            </header>

            {/* Shot Strip */}
            <div className="flex-shrink-0 p-3 border-b border-white/10 overflow-x-auto">
                <div className="flex items-center gap-3">
                    {shots.map((shot, index) => (
                        <div key={shot.id} draggable onDragStart={() => dragItem.current = index} onDragEnter={() => dragOverItem.current = index} onDragEnd={handleDragEnd} onDragOver={(e) => e.preventDefault()} className="cursor-grab relative group">
                            <button onClick={() => selectShot(shot)} className={`relative flex-shrink-0 w-28 h-20 rounded-md border-2 p-1 ${activeShotId === shot.id ? 'border-accent' : 'border-white/10'}`}>
                                {shot.continuityWarning && <div className="absolute top-1 right-1" title="Continuity Warning: This shot may have crossed the 180-degree line. Check the Continuity View."><ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" /></div>}
                                {shot.generatedImage ? ( <img src={shot.generatedImage} alt={`Shot ${shot.shotNumber}`} className="w-full h-full object-cover rounded-sm" /> ) : ( <div className="w-full h-full bg-surface rounded-sm flex items-center justify-center text-white/60">Shot {shot.shotNumber}</div> )}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); deleteShot(shot.id); }} className="absolute -top-2 -right-2 p-1 bg-gray-800 rounded-full text-white/60 hover:text-red-500 hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Shot" aria-label="Delete Shot">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <button onClick={() => addNewShot()} className="flex-shrink-0 w-28 h-20 rounded-md border-2 border-dashed border-white/20 hover:border-accent flex flex-col items-center justify-center text-white/60 hover:text-accent transition-colors">
                        <PlusIcon />
                        <span className="text-xs mt-1">New Shot</span>
                    </button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-grow flex overflow-hidden">
                {/* Left Panel: Controls */}
                <div className="w-1/3 min-w-[350px] max-w-[450px] flex-shrink-0 bg-surface overflow-y-auto">
                    <div className="h-full flex flex-col">
                        <div className="flex-grow">
                        <CollapsibleSection title="✨ AI Shot Assistant" defaultOpen>
                                <div className="space-y-2">
                                    <p className="text-xs text-white/60">Describe the shot you want, and the AI will set it up for you.</p>
                                    <textarea
                                        value={naturalLanguagePrompt}
                                        onChange={(e) => setNaturalLanguagePrompt(e.target.value)}
                                        placeholder="e.g., A tense, low-angle close-up on Sarah as she discovers the letter. The camera slowly pushes in."
                                        className="w-full h-24 bg-canvas border border-white/10 rounded-md p-2 text-sm focus:ring-accent focus:border-accent resize-none"
                                        disabled={isInterpreting || !activeShotId}
                                    />
                                    <button onClick={handleInterpretShot} disabled={isInterpreting || !naturalLanguagePrompt || !activeShotId} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/10 text-white font-bold rounded-md hover:bg-white/20 disabled:opacity-50">
                                         {isInterpreting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                         {isInterpreting ? 'Thinking...' : 'Interpret Shot'}
                                    </button>
                                </div>
                            </CollapsibleSection>
                        {isExterior && (
                            <CollapsibleSection title="Location">
                                <div className="space-y-3">
                                    <p className="text-xs text-white/60">Enter an address to guide generation for this scene.</p>
                                    <div className="flex gap-2">
                                        <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g., 1600 Amphitheatre Parkway, Mountain View, CA" className="flex-grow bg-canvas border border-white/10 rounded-md p-2 text-xs focus:ring-accent focus:border-accent" />
                                        <button onClick={handleScoutLocation} disabled={isScouting} className="px-3 py-1 bg-white/10 rounded-md text-xs hover:bg-white/20 disabled:opacity-50">{isScouting ? 'Scouting...' : 'Scout'}</button>
                                    </div>
                                    {locationAnalysis && <p className="text-xs text-white/80 bg-white/5 p-2 rounded-md border border-white/10"><strong>Scout Report:</strong> {locationAnalysis}</p>}
                                </div>
                            </CollapsibleSection>
                        )}
                        <CollapsibleSection title="Cast in Shot">
                             <ButtonGroup
                                title="Actors in this Shot"
                                options={scene.actors || []}
                                selected={shotParams.actorsInShot || []}
                                onSelect={(name) => handleMultiSelect('actorsInShot', name)}
                                multiSelect
                             />
                             {(scene.actors || []).length === 0 && <p className="text-xs text-white/60 mt-2">No actors assigned to this scene. You can assign them on the scene selection page.</p>}
                        </CollapsibleSection>
                        <CollapsibleSection title="Shot Size & Comp" defaultOpen>
                            <ButtonGroup title="Shot Size" options={C.SHOT_SIZES} selected={shotParams.shotSize || ''} onSelect={v => updateShotParams('shotSize', v)} />
                            <hr className="border-white/10 my-3" />
                            <ButtonGroup title="Composition" options={C.COMPOSITIONS} selected={shotParams.composition || ''} onSelect={v => updateShotParams('composition', v)} />
                        </CollapsibleSection>
                        <CollapsibleSection title="Camera">
                            <ButtonGroup title="Angle" options={C.CAMERA_ANGLES} selected={shotParams.cameraAngle || ''} onSelect={v => updateShotParams('cameraAngle', v)} />
                            <hr className="border-white/10 my-3" />
                            <ButtonGroup title="Movement" options={C.CAMERA_MOVEMENTS} selected={shotParams.cameraMovement || ''} onSelect={v => updateShotParams('cameraMovement', v)} />
                            <hr className="border-white/10 my-3" />
                            <ButtonGroup title="Support" options={projectSettings?.support || []} selected={shotParams.support || ''} onSelect={v => updateShotParams('support', v)} />
                        </CollapsibleSection>
                        <CollapsibleSection title="Lens">
                            <ButtonGroup title="Focal Length" options={projectSettings?.lensKit || C.LENS_FOCAL_LENGTHS} selected={shotParams.focalLength || 0} onSelect={v => updateShotParams('focalLength', v)} />
                        </CollapsibleSection>
                         <CollapsibleSection title="Focus">
                            <ButtonGroup title="Depth of Field" options={C.DOFS} selected={shotParams.dof || ''} onSelect={v => updateShotParams('dof', v)} />
                             <hr className="border-white/10 my-3" />
                            <ButtonGroup title="Focus Behavior" options={C.FOCUS_BEHAVIORS} selected={shotParams.focusBehavior || ''} onSelect={v => updateShotParams('focusBehavior', v)} />
                        </CollapsibleSection>
                        <CollapsibleSection title="Subject & Flags">
                             <ButtonGroup title="Subject Count" options={C.SUBJECT_COUNTS} selected={shotParams.subjectCount || ''} onSelect={v => updateShotParams('subjectCount', v)} />
                             <hr className="border-white/10 my-3" />
                             <ButtonGroup title="Subject Motion" options={C.SUBJECT_MOTIONS} selected={shotParams.subjectMotion || ''} onSelect={v => updateShotParams('subjectMotion', v)} />
                             <hr className="border-white/10 my-3" />
                             <ButtonGroup title="Camera–Subject Relationship" options={C.CAMERA_SUBJECT_RELATIONSHIPS} selected={shotParams.cameraSubjectRelationship || ''} onSelect={v => updateShotParams('cameraSubjectRelationship', v)} />
                             <hr className="border-white/10 my-3" />
                             <div>
                                <h4 className="text-xs text-white/60 mb-2">Key Objects in Shot:</h4>
                                <input
                                    type="text"
                                    value={shotParams.objectsInShot || ''}
                                    onChange={(e) => updateShotParams('objectsInShot', e.target.value)}
                                    placeholder="e.g., a glowing blue crystal, a vintage pocket watch"
                                    className="w-full bg-canvas border border-white/10 rounded-md p-2 text-xs focus:ring-accent focus:border-accent"
                                />
                             </div>
                             <hr className="border-white/10 my-3" />
                             <ButtonGroup title="Flags" options={C.FLAGS} selected={shotParams.flags || []} onSelect={v => handleMultiSelect('flags', v)} multiSelect />
                        </CollapsibleSection>
                        </div>
                        <div className="p-4 bg-canvas border-t border-white/10">
                            <button onClick={handleGenerateShot} disabled={isLoading || !activeShotId} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white font-bold rounded-md hover:bg-accent/90 disabled:bg-canvas/50 disabled:border-white/5 disabled:text-white/20 disabled:cursor-not-allowed transition-colors">
                                <img src="/generate-icon.png" alt="" className="w-7 h-7" draggable={false} /> {isLoading ? 'Generating...' : 'GENERATE SHOT'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Preview */}
                <div className="flex-grow p-4 overflow-y-auto flex items-center justify-center">
                    {!activeShotId || !activeShot ? ( <div className="text-center text-white/60"><p>Select a shot or create a new one to begin.</p></div> ) : (
                    <div className="w-full h-full flex flex-col gap-4">
                        {/* TOP ROW: PREVIEW + DESCRIPTION */}
                        <div className="flex-grow flex gap-4 overflow-hidden">
                            {/* PREVIEW */}
                            <div className="w-2/3 bg-canvas rounded-lg border border-white/10 flex items-center justify-center relative p-2">
                                {isLoading && <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white z-10"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>}
                                {activeShot.generatedImage ? ( <img src={activeShot.generatedImage} alt="Generated shot" className="max-w-full max-h-full rounded object-contain" /> ) : ( <p className="text-white/60">Preview will appear here</p> )}
                                {activeShot.generatedImage && !isEditing && (
                                    <div className="absolute bottom-2 right-2 flex gap-2">
                                        <button onClick={() => setIsEditing(true)} className="bg-accent text-white px-3 py-1.5 rounded-md text-xs flex items-center gap-1 hover:bg-accent/90"><PencilIcon className="w-4 h-4" /> Edit</button>
                                    </div>
                                )}
                                {isEditing && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 flex gap-2">
                                        <input type="text" value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="e.g., add a retro filter, remove the person..." className="flex-grow bg-canvas border border-white/10 rounded-md p-2 text-sm focus:ring-accent focus:border-accent" />
                                        <button onClick={handleEditImage} disabled={isLoading} className="px-4 py-2 bg-accent rounded-md text-sm font-semibold hover:bg-accent/90 disabled:bg-white/10">Apply</button>
                                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-white/10 rounded-md text-sm hover:bg-white/20">Cancel</button>
                                    </div>
                                )}
                            </div>
                            {/* DESCRIPTION */}
                            <div className="w-1/3 bg-surface p-4 rounded-lg border border-white/10 flex flex-col overflow-hidden">
                                <h4 className="font-semibold text-white/60 text-sm mb-2 flex-shrink-0">Description</h4>
                                <textarea
                                    className="w-full flex-grow bg-surface text-sm text-white/80 resize-none focus:outline-none focus:ring-1 focus:ring-accent rounded p-2 border border-white/10"
                                    value={activeShot.description || ''}
                                    onChange={(e) => handleDescriptionChange(activeShot.id, e.target.value)}
                                    placeholder="A description will be generated here, or you can write your own."
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* BOTTOM ROW: TECHNICAL + NOTES */}
                        <div className="flex-shrink-0 flex gap-4">
                           {/* TECHNICAL CARD */}
                            <div className="w-1/2 bg-surface p-4 rounded-lg border border-white/10">
                                <h4 className="font-semibold text-white/60 text-sm mb-2">Technical Card</h4>
                                {activeShot.technicalData ? (
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs">
                                        <div>
                                            <p className="text-xs uppercase text-white/60 tracking-wider">Shot</p>
                                            <p className="font-medium text-white/80">{activeShot.technicalData.shotType || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase text-white/60 tracking-wider">AR</p>
                                            <p className="font-medium text-white/80">{activeShot.technicalData.aspectRatio || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase text-white/60 tracking-wider">Lens</p>
                                            <p className="font-medium text-white/80">{activeShot.technicalData.lens}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase text-white/60 tracking-wider">Camera</p>
                                            <p className="font-medium text-white/80">{activeShot.technicalData.camera}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase text-white/60 tracking-wider">Support</p>
                                            <p className="font-medium text-white/80">{activeShot.technicalData.support}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase text-white/60 tracking-wider">Movement</p>
                                            <p className="font-medium text-white/80">{activeShot.technicalData.movement}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs uppercase text-white/60 tracking-wider">Lighting</p>
                                            <p className="font-medium text-white/80">{activeShot.technicalData.lighting}</p>
                                        </div>
                                        <div className="col-span-2">
                                             <p className="text-xs uppercase text-white/60 tracking-wider">Flags</p>
                                             <p className="font-medium text-white/80">{activeShot.technicalData.flags.join(', ')}</p>
                                        </div>
                                    </div>
                                ) : <p className="text-xs text-white/60">Not generated</p>}
                            </div>
                             {/* NOTES CARD */}
                            <div className="w-1/2 bg-surface p-4 rounded-lg border border-white/10 flex flex-col overflow-hidden">
                                <h4 className="font-semibold text-white/60 text-sm mb-2 flex-shrink-0">Notes</h4>
                                <textarea
                                    className="w-full flex-grow bg-surface text-sm text-white/80 resize-none focus:outline-none focus:ring-1 focus:ring-accent rounded p-2 border border-white/10"
                                    value={activeShot.notes || ''}
                                    onChange={(e) => handleNotesChange(activeShot.id, e.target.value)}
                                    placeholder="Add director's notes, performance cues, or VFX details here."
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>
                     )}
                </div>
            </div>
            <FeatureHint featureId="shot_builder" visible={showBuilderHint} onDismiss={() => { setShowBuilderHint(false); discovery.markSeen('shot_builder'); }} />
            <FeatureHint featureId="export" visible={showExportHint} onDismiss={() => { setShowExportHint(false); discovery.markSeen('export'); }} />
        </div>
    );
};

export default ShotBuilder;
