

import React, { useState, useContext, useRef, useEffect, Suspense, lazy } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import ProjectSetupWizard from './components/ProjectSetupWizard';
import { ProjectProvider, ProjectContext } from './context/ProjectContext';
import { analyzeScriptAndExtractScenes, generateTechnicalData } from './services/geminiService';
import type { Scene, LightingSetup, ProjectSettings, Shot, Project } from './types';
import * as C from './constants';
import { PlusIcon, TrashIcon, PencilIcon, Bars3Icon, SparklesIcon, XIcon } from './components/icons';
import ProjectSummaryModal from './components/ProjectSummaryModal';
import ProjectAssetsManager from './components/CastManager';
import Header from './components/Header';
import OnboardingOverlay from './components/OnboardingOverlay';
import FeatureHint from './components/FeatureHint';
import { useFeatureDiscovery } from './utils/useFeatureDiscovery';
import { fileToBase64 } from './utils/fileUtils';
import { detectTimeOfDay } from './utils/detectTimeOfDay';

// Code-split heavy components — loaded on demand when user navigates to them
const ShotBuilder = lazy(() => import('./components/ShotBuilder'));
const ShotGallery = lazy(() => import('./components/ShotGallery'));
const Profile = lazy(() => import('./components/Profile'));

// Loading fallback that matches app's dark theme
const ViewLoader = () => (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-white/40 font-medium">Loading...</span>
        </div>
    </div>
);

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.5.136/build/pdf.worker.mjs';

const MoodButtonGroup = ({ selected, onSelect }: { selected?: string, onSelect: (value: string) => void }) => (
    <div className="flex flex-wrap gap-2">
        {C.MOODS.map(mood => (
            <button
                key={mood.name}
                onClick={() => onSelect(mood.name)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors flex items-center gap-1.5 ${selected === mood.name ? 'bg-accent border-accent text-white' : 'bg-canvas border-white/10 text-white/60 hover:border-accent'}`}
            >
                <span>{mood.emoji}</span>
                <span>{mood.name}</span>
            </button>
        ))}
    </div>
);


// The SceneSelector is now an internal component to App, as it's part of the main flow.
const SceneSelector: React.FC<{ 
    onSelectScene: (scene: Scene) => void;
    onShowSummary: () => void;
    startWithUpload: boolean;
    onUploadHandled: () => void;
    onBackToProfile: () => void;
}> = ({ onSelectScene, onShowSummary, startWithUpload, onUploadHandled, onBackToProfile }) => {
    const { projectSettings, setProjectSettings, scenes, setScenes, setShots } = React.useContext(ProjectContext);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [analysisStage, setAnalysisStage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // Form state for new scene
    const [newSlugline, setNewSlugline] = useState('');
    const [newSceneDescription, setNewSceneDescription] = useState('');
    const [newTimeOfDay, setNewTimeOfDay] = useState<'Day' | 'Night' | 'Other'>('Day');
    const [newSceneActors, setNewSceneActors] = useState<string[]>([]);
    const [newSceneProps, setNewSceneProps] = useState<string[]>([]);
    const [newSceneLighting, setNewSceneLighting] = useState<LightingSetup[]>([]);
    const [newSceneMood, setNewSceneMood] = useState<string | undefined>(undefined);
    const [newSceneColorPalette, setNewSceneColorPalette] = useState<string | undefined>(undefined);

    // State for editing existing scenes
    const [editingScene, setEditingScene] = useState<Scene | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const scriptUploadRef = useRef<HTMLInputElement>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    // Lighting setup feature hint
    const lightingDiscovery = useFeatureDiscovery();
    const [showLightingHint, setShowLightingHint] = useState(false);
    const isFormVisible = isCreating || editingScene !== null;
    useEffect(() => {
        if (isFormVisible && lightingDiscovery.isNew('lighting_setup')) {
            setShowLightingHint(true);
        }
    }, [isFormVisible]); // eslint-disable-line react-hooks/exhaustive-deps

    // Pro-tip banner above Lighting Setup (dismissible)
    const [lightingTipDismissed, setLightingTipDismissed] = useState(() => {
        return localStorage.getItem('plotmate_lighting_tip_dismissed') === 'true';
    });
    const dismissLightingTip = () => {
        localStorage.setItem('plotmate_lighting_tip_dismissed', 'true');
        setLightingTipDismissed(true);
    };
    
    useEffect(() => {
        if (startWithUpload) {
            const timer = setTimeout(() => {
                setIsUploadModalOpen(true);
                onUploadHandled();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [startWithUpload, onUploadHandled]);

    const handleDroppedFile = (file: File) => {
        const validTypes = ['.txt', '.pdf', '.fountain'];
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!validTypes.includes(ext)) {
            setError(`Unsupported file type "${ext}". Please use .txt, .pdf, or .fountain files.`);
            return;
        }
        setIsUploadModalOpen(false);
        const dt = new DataTransfer();
        dt.items.add(file);
        if (scriptUploadRef.current) {
            scriptUploadRef.current.files = dt.files;
            scriptUploadRef.current.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };
    
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploadModalOpen(false);
        setIsLoading(true);
        setAnalysisProgress(0);
        setAnalysisStage('Reading file...');
        setError(null);
        try {
            let content = '';
            setAnalysisProgress(10);
            if (file.type === 'application/pdf') {
                setAnalysisStage('Extracting text from PDF...');
                const loadingTask = pdfjsLib.getDocument(await file.arrayBuffer());
                const pdf = await loadingTask.promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    content += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ') + '\n';
                    setAnalysisProgress(10 + Math.round((i / pdf.numPages) * 20));
                }
            } else {
                content = await file.text();
                setAnalysisProgress(30);
            }

            setAnalysisProgress(30);
            setAnalysisStage('Analyzing script with AI...');

            const { scenes: extractedScenes, uniqueCharacters, uniqueProps, uniqueLocations } = await analyzeScriptAndExtractScenes(content, (phase, completed, total) => {
                if (phase === 'cached') {
                    setAnalysisProgress(80);
                    setAnalysisStage('Loaded from cache!');
                } else {
                    const ratio = total > 0 ? Math.min(completed / total, 1) : 0;
                    const pct = 30 + Math.round(ratio * 50);
                    setAnalysisProgress(pct);
                    setAnalysisStage(`Analyzing script... ${completed} scenes found`);
                }
            });

            setAnalysisProgress(80);
            setAnalysisStage('Building scenes...');

            if (scenes.length > 0) {
                const confirmed = window.confirm(`This will replace your ${scenes.length} existing scene(s) and their associated data. Continue?`);
                if (!confirmed) {
                    setIsLoading(false);
                    setAnalysisProgress(0);
                    return;
                }
            }
            setScenes(extractedScenes);

            setAnalysisProgress(90);
            setAnalysisStage('Updating project assets...');

            // Populate project settings with discovered actors and props
            if (projectSettings && setProjectSettings) {
                const newActors = uniqueCharacters
                    .filter(name => !projectSettings.actors.some(a => a.name.toLowerCase() === name.toLowerCase()))
                    .map(name => ({ id: crypto.randomUUID(), name, photo: '' }));

                const newProps = uniqueProps
                    .filter(name => !projectSettings.props.some(p => p.name.toLowerCase() === name.toLowerCase()))
                    .map(name => ({ id: crypto.randomUUID(), name }));
                
                const newLocations = uniqueLocations
                    .filter(name => !projectSettings.locations.some(l => l.name.toLowerCase() === name.toLowerCase()))
                    .map(name => ({ id: crypto.randomUUID(), name }));

                setProjectSettings({
                    ...projectSettings,
                    actors: [...projectSettings.actors, ...newActors],
                    props: [...projectSettings.props, ...newProps],
                    locations: [...projectSettings.locations, ...newLocations],
                });
            }

            setAnalysisProgress(100);
            setAnalysisStage('Done!');

        } catch (err: any) {
            const errorMessage = (err.message || '').toLowerCase();
            if (errorMessage.includes('overloaded') || errorMessage.includes('503')) {
                setError("The script analysis service is currently busy. Please try again in a few moments.");
            } else {
                setError((err as Error).message);
            }
            console.error(err);
        } finally {
            setIsLoading(false);
            setAnalysisProgress(0);
            // Reset file input so re-uploading the same file triggers onChange
            if (scriptUploadRef.current) scriptUploadRef.current.value = '';
        }
    };
    
    const handleToggleSceneActor = (actorName: string, isEditing: boolean) => {
        if (isEditing && editingScene) {
            const currentActors = editingScene.actors || [];
            const newActors = currentActors.includes(actorName) ? currentActors.filter(name => name !== actorName) : [...currentActors, actorName];
            setEditingScene({ ...editingScene, actors: newActors });
        } else {
            setNewSceneActors(prev => prev.includes(actorName) ? prev.filter(name => name !== actorName) : [...prev, actorName]);
        }
    };

    const handleToggleSceneProp = (propName: string, isEditing: boolean) => {
        if (isEditing && editingScene) {
            const currentProps = editingScene.props || [];
            const newProps = currentProps.includes(propName) ? currentProps.filter(name => name !== propName) : [...currentProps, propName];
            setEditingScene({ ...editingScene, props: newProps });
        } else {
            setNewSceneProps(prev => prev.includes(propName) ? prev.filter(name => name !== propName) : [...prev, propName]);
        }
    };
    
    const resetCreationForm = () => {
        setNewSlugline('');
        setNewSceneDescription('');
        setNewTimeOfDay('Day');
        setNewSceneActors([]);
        setNewSceneProps([]);
        setNewSceneLighting([]);
        setNewSceneMood(undefined);
        setNewSceneColorPalette(undefined);
        setIsCreating(false);
    }

    const handleAddNewScene = () => {
        if (newSlugline.trim() !== '') {
            const newScene: Scene = {
                id: crypto.randomUUID(),
                sceneNumber: Math.max(0, ...scenes.map(s => s.sceneNumber)) + 1,
                slugline: newSlugline.trim().toUpperCase(),
                description: newSceneDescription.trim(),
                timeOfDay: newTimeOfDay,
                pageCount: 0,
                estimatedScreenTime: 'N/A',
                tags: [],
                actors: newSceneActors,
                props: newSceneProps,
                lighting: newSceneLighting,
                mood: newSceneMood,
                colorPalette: newSceneColorPalette,
            };
            setScenes([...scenes, newScene]);
            resetCreationForm();
        }
    };
    
    const handleStartEdit = (scene: Scene) => {
        setIsCreating(false);
        setEditingScene({ ...scene });
    };
    const handleCancelEdit = () => setEditingScene(null);

    const handleSaveScene = () => {
        if (!editingScene) return;
        const finalScene = {
            ...editingScene,
            slugline: editingScene.slugline.trim().toUpperCase(),
            description: editingScene.description?.trim(),
        }
        setScenes(scenes.map(s => s.id === finalScene.id ? finalScene : s ));
        handleCancelEdit();
    };
    
    const handleSluglineChange = (val: string, isEditing: boolean) => {
        const newTime = detectTimeOfDay(val);

        if (isEditing && editingScene) {
            setEditingScene({
                ...editingScene,
                slugline: val,
                timeOfDay: newTime || editingScene.timeOfDay || 'Day',
            });
        } else {
            setNewSlugline(val);
            if (newTime) {
                setNewTimeOfDay(newTime);
            }
        }
    };
    
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (projectSettings && setProjectSettings) {
            setProjectSettings({ ...projectSettings, name: e.target.value });
        }
    };

    const handleDragSort = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        const newScenes = [...scenes];
        const dragItemContent = newScenes.splice(dragItem.current, 1)[0];
        newScenes.splice(dragOverItem.current, 0, dragItemContent);
        
        const renumberedScenes = newScenes.map((scene, index) => ({
            ...scene,
            sceneNumber: index + 1,
        }));
        
        dragItem.current = null;
        dragOverItem.current = null;
        setScenes(renumberedScenes);
    };
    
    const handleDeleteScene = (sceneId: string) => {
        if (window.confirm("Are you sure you want to delete this scene and all its shots? This action cannot be undone.")) {
            const newScenes = scenes
                .filter(s => s.id !== sceneId)
                .map((scene, index) => ({ ...scene, sceneNumber: index + 1 }));
            setScenes(newScenes);

            setShots(prevShots => {
                const newShots = { ...prevShots };
                delete newShots[sceneId];
                return newShots;
            });
        }
    };

    const renderSceneForm = (isEditing: boolean) => {
        const sceneData = isEditing ? editingScene : null;
        const slugline = isEditing ? sceneData?.slugline || '' : newSlugline;
        const description = isEditing ? sceneData?.description || '' : newSceneDescription;
        const timeOfDay = isEditing ? sceneData?.timeOfDay || 'Day' : newTimeOfDay;
        const actors = isEditing ? sceneData?.actors : newSceneActors;
        const props = isEditing ? sceneData?.props : newSceneProps;
        const lighting = isEditing ? sceneData?.lighting || [] : newSceneLighting;
        const mood = isEditing ? sceneData?.mood : newSceneMood;
        const colorPalette = isEditing ? sceneData?.colorPalette : newSceneColorPalette;

        const handleDescriptionChange = (val: string) => {
            if (isEditing && editingScene) {
                setEditingScene({ ...editingScene, description: val });
            } else {
                setNewSceneDescription(val);
            }
        };

        const setTimeOfDay = (val: 'Day' | 'Night' | 'Other') => isEditing && editingScene ? setEditingScene({ ...editingScene, timeOfDay: val }) : setNewTimeOfDay(val);
        
        const setLighting = (newLighting: LightingSetup[]) => {
            if (isEditing && editingScene) {
                setEditingScene({ ...editingScene, lighting: newLighting });
            } else {
                setNewSceneLighting(newLighting);
            }
        };

        const handleAddLight = () => {
            const newLight: LightingSetup = {
                id: crypto.randomUUID(),
                name: `Light ${lighting.length + 1}`,
                sourceType: C.KEY_SOURCE_TYPES[0],
                direction: C.KEY_DIRECTIONS[0],
                modifiers: [],
                color: 'White',
            };
            setLighting([...lighting, newLight]);
        };
        
        const handleLightChange = (index: number, field: keyof Omit<LightingSetup, 'id'|'modifiers'>, value: string) => {
            const newLighting = [...lighting];
            newLighting[index] = { ...newLighting[index], [field]: value };
            setLighting(newLighting);
        };
        
        const handleLightModifierChange = (index: number, modifier: string) => {
            const newLighting = [...lighting];
            const currentModifiers = newLighting[index].modifiers || [];
            const newModifiers = currentModifiers.includes(modifier)
                ? currentModifiers.filter(m => m !== modifier)
                : [...currentModifiers, modifier];
            newLighting[index].modifiers = newModifiers;
            setLighting(newLighting);
        };
        
        const handleRemoveLight = (index: number) => {
            const newLighting = lighting.filter((_, i) => i !== index);
            setLighting(newLighting);
        };

        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" value={slugline} onChange={(e) => handleSluglineChange(e.target.value, isEditing)} placeholder="e.g., INT. COFFEE SHOP - DAY" className="w-full bg-canvas border border-white/10 rounded-md p-2 focus:ring-accent focus:border-accent font-bold md:col-span-2" autoFocus />
                     <div className="flex flex-wrap gap-2 items-center bg-canvas border border-white/10 rounded-md p-2">
                        {(['Day', 'Night', 'Other'] as const).map(option => (
                            <button key={option} onClick={() => setTimeOfDay(option)} className={`flex-grow px-3 py-1.5 text-xs rounded-md border transition-colors ${timeOfDay === option ? 'bg-accent border-accent text-white' : 'bg-transparent border-transparent text-white/60 hover:bg-white/10'}`}>
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold text-white/80 mb-2">Scene Description</h3>
                    <textarea 
                        value={description}
                        onChange={(e) => handleDescriptionChange(e.target.value)}
                        placeholder="A brief summary of the action in this scene."
                        className="w-full bg-canvas border border-white/10 rounded-md p-2 focus:ring-accent focus:border-accent text-sm resize-none"
                        rows={3}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold text-white/80 mb-2">Assign Cast</h3>
                         <div className="space-y-2 max-h-32 overflow-y-auto p-2 border border-white/10 rounded-md bg-canvas">
                            {(projectSettings?.actors || []).length > 0 ? (projectSettings?.actors || []).map(actor => (
                                <label key={actor.id} className="flex items-center gap-3 p-1.5 rounded-md hover:bg-white/5 cursor-pointer text-sm">
                                    <input type="checkbox" checked={actors?.includes(actor.name)} onChange={() => handleToggleSceneActor(actor.name, isEditing)} className="w-4 h-4 rounded bg-surface border-white/10 text-accent focus:ring-accent" />
                                    {actor.photo && <img src={actor.photo} alt={actor.name} className="w-8 h-8 rounded-full object-cover" />}
                                    <span>{actor.name}</span>
                                </label>
                            )) : <p className="text-xs text-white/60 text-center py-4">No actors in project. Add them in the Project Assets section.</p>}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-white/80 mb-2">Assign Props</h3>
                        <div className="space-y-2 max-h-32 overflow-y-auto p-2 border border-white/10 rounded-md bg-canvas">
                            {(projectSettings?.props || []).length > 0 ? (projectSettings?.props || []).map(prop => (
                                <label key={prop.id} className="flex items-center gap-3 p-1.5 rounded-md hover:bg-white/5 cursor-pointer text-sm">
                                    <input type="checkbox" checked={props?.includes(prop.name)} onChange={() => handleToggleSceneProp(prop.name, isEditing)} className="w-4 h-4 rounded bg-surface border-white/10 text-accent focus:ring-accent" />
                                    {prop.referenceImage && <img src={prop.referenceImage} alt={prop.name} className="w-8 h-8 rounded-sm object-cover" />}
                                    <span>{prop.name}</span>
                                </label>
                            )) : <p className="text-xs text-white/60 text-center py-4">No props in project. Add them in the Project Assets section.</p>}
                        </div>
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold text-white/80 mb-2">Mood & Color Palette</h3>
                    <div className="p-3 border border-white/10 rounded-md bg-canvas space-y-3">
                        <div>
                            <h4 className="text-xs text-white/60 mb-1.5">Mood</h4>
                            <MoodButtonGroup selected={mood} onSelect={(val) => {
                                if (isEditing && editingScene) {
                                    setEditingScene({ ...editingScene, mood: val });
                                } else {
                                    setNewSceneMood(val);
                                }
                            }} />
                        </div>
                        <div>
                            <h4 className="text-xs text-white/60 mb-1.5">Color Palette</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {C.COLOR_PALETTES.map(palette => (
                                    <button type="button" key={palette} onClick={() => {
                                        if (isEditing && editingScene) {
                                            setEditingScene({ ...editingScene, colorPalette: palette });
                                        } else {
                                            setNewSceneColorPalette(palette);
                                        }
                                    }} className={`px-2 py-1 rounded-full text-xs border transition-colors ${colorPalette === palette ? 'bg-accent border-accent text-white' : 'bg-canvas border-white/10 text-white/60 hover:border-white/30'}`}>
                                        {palette}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    {lighting.length === 0 && !lightingTipDismissed && (
                        <div className="mb-3 flex items-start gap-3 p-3 rounded-lg border border-accent/30 bg-accent/5" data-testid="lighting-pro-tip">
                            <SparklesIcon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                            <div className="flex-grow">
                                <p className="text-sm text-white/70">
                                    <strong className="text-accent">Pro Tip:</strong> Adding lights here directly shapes how AI generates your storyboard images. Try adding a key light!
                                </p>
                            </div>
                            <button onClick={dismissLightingTip} className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0" title="Dismiss" aria-label="Dismiss" data-testid="lighting-pro-tip-dismiss">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <h3 className="font-semibold text-white/80 mb-2">Lighting Setup</h3>
                    <div className="space-y-3 p-3 border border-white/10 rounded-md bg-canvas">
                        {lighting.map((light, index) => (
                            <div key={light.id} className="p-3 bg-surface rounded-md border border-white/10 relative space-y-3">
                                <button onClick={() => handleRemoveLight(index)} className="absolute top-2 right-2 p-1 text-white/60 hover:text-red-500" title="Remove Light" aria-label="Remove Light"><TrashIcon className="w-4 h-4" /></button>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                    <input type="text" value={light.name} onChange={(e) => handleLightChange(index, 'name', e.target.value)} placeholder="Light Name" className="w-full bg-canvas border border-white/10 rounded-md p-1.5 text-xs focus:ring-accent focus:border-accent" />
                                    <select value={light.sourceType} onChange={(e) => handleLightChange(index, 'sourceType', e.target.value)} className="w-full bg-canvas border border-white/10 rounded-md p-1.5 text-xs focus:ring-accent focus:border-accent">
                                        {C.KEY_SOURCE_TYPES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <select value={light.direction} onChange={(e) => handleLightChange(index, 'direction', e.target.value)} className="w-full bg-canvas border border-white/10 rounded-md p-1.5 text-xs focus:ring-accent focus:border-accent">
                                        {C.KEY_DIRECTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                     <select value={light.color || 'White'} onChange={(e) => handleLightChange(index, 'color', e.target.value)} className="w-full bg-canvas border border-white/10 rounded-md p-1.5 text-xs focus:ring-accent focus:border-accent">
                                        {C.LIGHT_COLORS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <h4 className="text-xs text-white/60 mb-1.5">Modifiers</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {C.MODIFIERS.map(mod => (
                                            <button type="button" key={mod} onClick={() => handleLightModifierChange(index, mod)} className={`px-2 py-1 rounded-full text-xs border transition-colors ${light.modifiers.includes(mod) ? 'bg-accent border-accent text-white' : 'bg-canvas border-white/10 text-white/60 hover:border-white/30'}`}>
                                                {mod}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddLight} className="w-full flex items-center justify-center gap-2 text-xs p-2 bg-white/5 border border-white/10 rounded-md hover:bg-white/10">
                            <PlusIcon className="w-4 h-4" /> Add Light Source
                        </button>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={isEditing ? handleCancelEdit : resetCreationForm} className="px-6 py-2 bg-white/10 rounded-md hover:bg-white/20">Cancel</button>
                    <button type="button" onClick={isEditing ? handleSaveScene : handleAddNewScene} className="px-6 py-2 bg-accent text-white font-bold rounded-md hover:bg-accent/90">
                        {isEditing ? 'Save Changes' : 'Add Scene'}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-canvas text-white">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <button onClick={onBackToProfile} className="text-sm text-white/60 hover:text-white mb-1">&larr; Back to Project Library</button>
                        {isEditingName ? (
                            <input
                                type="text"
                                value={projectSettings?.name || ''}
                                onChange={handleNameChange}
                                onBlur={() => setIsEditingName(false)}
                                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                                className="text-3xl font-bold bg-transparent border-b-2 border-accent focus:outline-none"
                                autoFocus
                            />
                        ) : (
                            <div className="flex items-center gap-2 group">
                                <h1 className="text-3xl font-bold">{projectSettings?.name || 'Untitled Project'}</h1>
                                <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 transition-opacity"><PencilIcon /></button>
                            </div>
                        )}
                        <p className="text-white/60">{projectSettings?.projectType}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onShowSummary} className="px-4 py-2 text-sm bg-white/10 rounded-md hover:bg-white/20">Project Summary</button>
                        <input type="file" ref={scriptUploadRef} onChange={handleFileUpload} className="hidden" accept=".txt,.pdf,.fountain" />
                        <button onClick={() => setIsUploadModalOpen(true)} disabled={isLoading} className="px-4 py-2 text-sm bg-white/10 rounded-md hover:bg-white/20 disabled:opacity-50">
                            {isLoading ? 'Analyzing Script...' : 'Upload Script'}
                        </button>
                    </div>
                </div>
                
                {isUploadModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsUploadModalOpen(false)}>
                        <div className="bg-surface border border-white/10 rounded-xl shadow-2xl w-full max-w-lg text-white" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b border-white/10">
                                <h2 className="text-lg font-bold">Upload Script</h2>
                                <button onClick={() => setIsUploadModalOpen(false)} className="p-1 text-white/60 hover:text-white"><XIcon className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6">
                                <div
                                    className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${isDragOver ? 'border-accent bg-accent/10' : 'border-white/20 hover:border-white/40'}`}
                                    onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onDrop={e => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleDroppedFile(f); }}
                                    onClick={() => scriptUploadRef.current?.click()}
                                >
                                    <svg className="w-12 h-12 mx-auto mb-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" /></svg>
                                    <p className="text-white/70 font-medium mb-1">Drag & drop your script file here</p>
                                    <p className="text-white/60 text-sm mb-4">or click to browse</p>
                                    <button
                                        onClick={e => { e.stopPropagation(); scriptUploadRef.current?.click(); }}
                                        className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-md hover:bg-accent/90 transition-colors"
                                    >
                                        Browse Files
                                    </button>
                                </div>
                                <div className="mt-4 flex items-center justify-center gap-3 text-xs text-white/60">
                                    <span className="px-2 py-1 bg-white/5 rounded">.txt</span>
                                    <span className="px-2 py-1 bg-white/5 rounded">.pdf</span>
                                    <span className="px-2 py-1 bg-white/5 rounded">.fountain</span>
                                    <span>Supported formats</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {error && <div className="bg-red-900/50 border border-red-500 text-red-300 p-3 rounded-md mb-4">{error}</div>}

                <ProjectAssetsManager scenes={scenes} setScenes={setScenes} />
                
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                         <h2 className="text-xl font-bold">Scenes</h2>
                         {!isCreating && <button onClick={() => setIsCreating(true)} className="flex items-center gap-1 text-sm bg-accent/20 border border-accent/80 text-accent hover:bg-accent/30 px-3 py-1.5 rounded-md transition-colors font-semibold"><PlusIcon className="w-4 h-4"/> Add Scene Manually</button>}
                    </div>

                    {isCreating && (
                        <div className="bg-surface p-4 rounded-lg border border-white/10 mb-4">
                            {renderSceneForm(false)}
                        </div>
                    )}

                    <div className="space-y-3">
                        {scenes.length === 0 && !isLoading && <p className="text-white/60 text-center py-8">No scenes yet. Upload a script or add one manually.</p>}
                        {isLoading && (
                            <div className="py-8 px-4">
                                <div className="max-w-md mx-auto space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-white/80 font-medium">{analysisStage}</span>
                                    </div>
                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500 ease-out"
                                            style={{
                                                width: `${analysisProgress}%`,
                                                background: 'linear-gradient(90deg, #FF6B35, #FF8C42, #FF6B35)',
                                                backgroundSize: '200% 100%',
                                                animation: 'shimmer 1.5s ease-in-out infinite',
                                            }}
                                        />
                                    </div>
                                    <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
                                </div>
                            </div>
                        )}
                        {scenes.map((scene, index) => (
                             editingScene?.id === scene.id ? (
                                <div key={scene.id} className="bg-surface p-4 rounded-lg border border-accent">
                                    {renderSceneForm(true)}
                                </div>
                            ) : (
                            <div 
                                key={scene.id} 
                                className="bg-surface p-4 rounded-lg border border-white/10 flex items-center justify-between group"
                                draggable
                                onDragStart={() => dragItem.current = index}
                                onDragEnter={() => dragOverItem.current = index}
                                onDragEnd={handleDragSort}
                                onDragOver={(e) => e.preventDefault()}
                            >
                                <div className="flex-grow cursor-pointer flex items-center gap-4 min-w-0 overflow-hidden" onClick={() => onSelectScene(scene)}>
                                    <div className="cursor-grab text-white/60 group-hover:text-white flex-shrink-0" title="Drag to reorder" aria-label="Drag to reorder">
                                        <Bars3Icon />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-white truncate">{scene.sceneNumber}. {scene.slugline}</h3>
                                        <p className="text-sm text-white/60 truncate">{scene.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" draggable={false}>
                                   <button onClick={() => onSelectScene(scene)} className="px-4 py-1.5 text-xs bg-white/10 rounded-md hover:bg-white/20 font-semibold">Open</button>
                                   <button onMouseDown={(e) => e.stopPropagation()} onClick={() => handleStartEdit(scene)} className="p-2 text-white/60 hover:text-white" title="Edit Scene" aria-label="Edit Scene"><PencilIcon/></button>
                                   <button onMouseDown={(e) => e.stopPropagation()} onClick={() => handleDeleteScene(scene.id)} className="p-2 text-white/60 hover:text-red-500" title="Delete Scene" aria-label="Delete Scene"><TrashIcon/></button>
                                </div>
                            </div>
                            )
                        ))}
                    </div>
                </div>
            </div>
            <FeatureHint
                featureId="lighting_setup"
                visible={showLightingHint}
                onDismiss={() => { setShowLightingHint(false); lightingDiscovery.markSeen('lighting_setup'); }}
            />
        </div>
    );
};


const App: React.FC = () => {
    return (
        <ProjectProvider>
            <AppContent />
        </ProjectProvider>
    );
};

const AppContent: React.FC = () => {
    const { projectSettings, startNewProject, loadProject, unloadProject, scenes, setScenes, shots, setShots } = useContext(ProjectContext);
    const [view, setView] = useState<'profile' | 'setup' | 'scenes' | 'builder' | 'gallery'>('profile');
    const [activeScene, setActiveScene] = useState<Scene | null>(null);
    const [activeShotIds, setActiveShotIds] = useState<Record<string, string | null>>({});
    const [sceneViews, setSceneViews] = useState<Record<string, 'builder' | 'continuity'>>({});
    const activeSceneShotId = activeScene ? (activeShotIds[activeScene.id] ?? null) : null;
    const setActiveSceneShotId = (id: string | null) => {
        if (activeScene) {
            setActiveShotIds(prev => ({ ...prev, [activeScene.id]: id }));
        }
    };
    const [isSummaryVisible, setIsSummaryVisible] = useState(false);
    const [startWithUpload, setStartWithUpload] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(() => {
        return localStorage.getItem('shotdeck_onboarding_completed') !== 'true';
    });

    // Scroll to top whenever the view changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }, [view]);

    // Feature discovery for scene hint (managed at App level since SceneSelector is inline)
    const discovery = useFeatureDiscovery();
    const [showSceneHint, setShowSceneHint] = useState(false);

    useEffect(() => {
        if (view === 'scenes' && discovery.isNew('scene_management')) {
            setShowSceneHint(true);
        }
    }, [view, discovery]);

    useEffect(() => {
        if (activeScene && !scenes.find(s => s.id === activeScene.id)) {
            const deletedId = activeScene.id;
            setActiveScene(null);
            setActiveShotIds(prev => { const next = { ...prev }; delete next[deletedId]; return next; });
            setSceneViews(prev => { const next = { ...prev }; delete next[deletedId]; return next; });
            if (view === 'builder' || view === 'gallery') {
                setView('scenes');
            }
        }
    }, [scenes, activeScene, view]);

    const handleOnboardingComplete = () => {
        localStorage.setItem('shotdeck_onboarding_completed', 'true');
        setShowOnboarding(false);
    };

    const handleCreateProject = (settings: Omit<ProjectSettings, 'id'>, action?: 'upload') => {
        startNewProject(settings);
        setView('scenes');
        if (action === 'upload') {
            setStartWithUpload(true);
        }
    };
    
    const handleNewProject = () => {
        setView('setup');
    };
    
    const handleOpenProject = (project: Project) => {
        loadProject(project);
        setView('scenes');
    };

    const handleSelectScene = (scene: Scene) => {
        setActiveScene(scene);
        if (!shots[scene.id]) {
            setShots(prev => ({ ...prev, [scene.id]: [] }));
        }
        setView('builder');
    };

    const handleUpdateScene = (updatedScene: Scene) => {
        setScenes(scenes.map(s => s.id === updatedScene.id ? updatedScene : s));
        setActiveScene(updatedScene);
    };

    const handleBackToScenes = () => {
        setActiveScene(null);
        setView('scenes');
    };

    const handleBackToProfile = () => {
        unloadProject();
        setView('profile');
    };
    
    const handleUploadForGallery = async (file: File) => {
        if (!activeScene) return;
        const base64 = await fileToBase64(file);
        
        setShots(prev => {
            const currentShots = prev[activeScene.id] || [];
            const newShotNum = currentShots.length + 1;
            const newShotId = crypto.randomUUID();
            const baseParams: Shot['parameters'] = {
                flags: ['None'],
                actorsInShot: [],
                objectsInShot: '',
                lensType: projectSettings?.lensType,
                focalLength: projectSettings?.lensKit?.[0],
                support: projectSettings?.support?.[0],
            };
            const techData = projectSettings ? generateTechnicalData(baseParams, activeScene.id, newShotId, projectSettings, activeScene.lighting) : null;
            const newShot: Shot = {
                id: newShotId,
                shotNumber: newShotNum,
                parameters: baseParams,
                generatedImage: base64,
                description: 'Uploaded image',
                technicalData: techData,
                notes: '',
                audioDescription: '',
            };
            return { ...prev, [activeScene.id]: [...currentShots, newShot] };
        });
    };

    const renderView = () => {
        switch (view) {
            case 'profile':
                return <Profile onNewProject={handleNewProject} onOpenProject={handleOpenProject} />;
            case 'setup':
                return <ProjectSetupWizard onProjectCreate={handleCreateProject} onCancel={handleBackToProfile} />;
            case 'scenes':
                return (
                    <>
                        <Header onNavigateToLibrary={handleBackToProfile} onShowProfile={handleBackToProfile} onShowHint={() => setShowSceneHint(true)} />
                        <SceneSelector
                            onSelectScene={handleSelectScene}
                            onShowSummary={() => setIsSummaryVisible(true)}
                            startWithUpload={startWithUpload}
                            onUploadHandled={() => setStartWithUpload(false)}
                            onBackToProfile={handleBackToProfile}
                        />
                        <FeatureHint
                            featureId="scene_management"
                            visible={showSceneHint}
                            onDismiss={() => { setShowSceneHint(false); discovery.markSeen('scene_management'); }}
                        />
                    </>
                );
            case 'builder':
                if (!activeScene) return <p>Error: No active scene. Please go back.</p>;
                return <ShotBuilder
                    key={activeScene.id}
                    scene={activeScene}
                    shots={shots[activeScene.id] || []}
                    setShots={(newShotsOrUpdater) => {
                        setShots(prev => {
                            const currentShots = prev[activeScene.id] || [];
                            const nextShots = typeof newShotsOrUpdater === 'function' 
                                ? (newShotsOrUpdater as (prev: Shot[]) => Shot[])(currentShots)
                                : newShotsOrUpdater;
                            return { ...prev, [activeScene.id]: nextShots };
                        });
                    }}
                    activeShotId={activeSceneShotId}
                    setActiveShotId={setActiveSceneShotId}
                    currentView={sceneViews[activeScene.id] || 'builder'}
                    onViewChange={(v) => setSceneViews(prev => ({ ...prev, [activeScene.id]: v }))}
                    onBack={handleBackToScenes}
                    onSceneUpdate={handleUpdateScene}
                    onShowGallery={() => setView('gallery')}
                />;
            case 'gallery':
                if (!activeScene) return <p>Error: No active scene. Please go back.</p>;
                return <ShotGallery 
                    shots={shots[activeScene.id] || []}
                    onReorder={(newShots) => setShots(prev => ({ ...prev, [activeScene.id]: newShots }))}
                    onBack={() => setView('builder')}
                    onAddShot={() => {
                        setShots(prev => {
                            const currentShots = prev[activeScene.id] || [];
                            const newShotNum = currentShots.length + 1;
                            const newShotId = crypto.randomUUID();
                            const baseParams: Shot['parameters'] = {
                                flags: ['None'],
                                actorsInShot: [],
                                objectsInShot: '',
                                lensType: projectSettings?.lensType,
                                focalLength: projectSettings?.lensKit?.[0],
                                support: projectSettings?.support?.[0],
                            };
                            const techData = projectSettings ? generateTechnicalData(baseParams, activeScene.id, newShotId, projectSettings, activeScene.lighting) : null;
                            const newShot: Shot = {
                                id: newShotId,
                                shotNumber: newShotNum,
                                parameters: baseParams,
                                generatedImage: null,
                                description: '',
                                technicalData: techData,
                                notes: '',
                                audioDescription: '',
                            };
                            return { ...prev, [activeScene.id]: [...currentShots, newShot] };
                        });
                    }}
                    onUpdateShot={(updatedShot) => {
                        setShots(prev => {
                            const currentShots = prev[activeScene.id] || [];
                            return { ...prev, [activeScene.id]: currentShots.map(s => s.id === updatedShot.id ? updatedShot : s) };
                        });
                    }}
                    onDeleteShot={(shotId) => {
                        setShots(prev => {
                            const currentShots = prev[activeScene.id] || [];
                            const newShots = currentShots.filter(s => s.id !== shotId).map((s, i) => ({ ...s, shotNumber: i + 1 }));
                            // Reset active shot ID if the deleted shot was active
                            if (shotId === activeSceneShotId) {
                                setActiveSceneShotId(newShots.length > 0 ? newShots[0].id : null);
                            }
                            return { ...prev, [activeScene.id]: newShots };
                        });
                    }}
                    onUpload={handleUploadForGallery}
                />;
            default:
                return <Profile onNewProject={handleNewProject} onOpenProject={handleOpenProject} />;
        }
    };

    return (
        <>
            {showOnboarding && <OnboardingOverlay onComplete={handleOnboardingComplete} />}
            <div className="min-h-screen flex flex-col" id="main-content">
                <div className="flex-1">
                    <Suspense fallback={<ViewLoader />}>
                        {renderView()}
                    </Suspense>
                </div>
                <footer className="w-full py-2 text-center pointer-events-none select-none">
                    <p className="text-[11px] text-accent/50 tracking-wide">
                        <a
                            href="https://pressplaycollective.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pointer-events-auto hover:text-accent/80 transition-colors"
                        >
                            pressplaycollective.com
                        </a>
                        <span className="mx-1.5">&mdash;</span>
                        made by filmmakers for filmmakers
                    </p>
                </footer>
            </div>
            {isSummaryVisible && projectSettings && (
                <ProjectSummaryModal
                    settings={projectSettings}
                    scenes={scenes}
                    onClose={() => setIsSummaryVisible(false)}
                />
            )}
        </>
    );
};

export default App;