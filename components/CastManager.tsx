
import React, { useState, useContext, useEffect } from 'react';
import { ProjectContext } from '../context/ProjectContext';
import { describePropImage, analyzeActorImage, describeLocationAsset } from '../services/geminiService';
import type { Scene, Shot, Prop, Actor, Location, LibraryAsset, AssetType } from '../types';
import { PencilIcon, TrashIcon, XIcon, ArrowPathIcon, CloudArrowUpIcon, SearchIcon, FilterIcon } from './icons';
import { fileToBase64, cropBase64ImageToAspectRatio, cropBase64ImageWithBoundingBox } from '../utils/fileUtils';
import { storageGet } from '../utils/storage';
import { getLibrary as getLibraryFromBackend } from '../services/apiService';

interface ProjectAssetsManagerProps {
    scenes: Scene[];
    setScenes: (scenes: Scene[]) => void;
}

const ASSET_STORAGE_KEY = 'shotdeck_asset_library';

const ProjectAssetsManager: React.FC<ProjectAssetsManagerProps> = ({ scenes, setScenes }) => {
    const { projectSettings, shots, setShots, addActor, updateActor, removeActor, addProp, updateProp, removeProp, updateActorDescription, addLocation, updateLocation, removeLocation, updateLocationDescription } = useContext(ProjectContext);
    
    const [assetTab, setAssetTab] = useState<'actors' | 'locations' | 'props'>('actors');
    
    // Actor state
    const [newActorName, setNewActorName] = useState('');
    const [newActorPhoto, setNewActorPhoto] = useState<File | null>(null);
    const [newActorPhotoKey, setNewActorPhotoKey] = useState(Date.now());
    const [editingActorId, setEditingActorId] = useState<string | null>(null);
    const [editedActorName, setEditedActorName] = useState('');
    const [editedActorPhoto, setEditedActorPhoto] = useState<File | null>(null);
    const [editedActorPhotoKey, setEditedActorPhotoKey] = useState(Date.now());
    
    // Import Modal State
    const [isImporting, setIsImporting] = useState(false);
    const [importSearch, setImportSearch] = useState('');
    const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);
    const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);
    
    // Prop state
    const [newPropName, setNewPropName] = useState('');
    const [newPropPhoto, setNewPropPhoto] = useState<File | null>(null);
    const [newPropPhotoKey, setNewPropPhotoKey] = useState(Date.now());
    const [propDescLoading, setPropDescLoading] = useState<string | null>(null);

    // Location state
    const [newLocationName, setNewLocationName] = useState('');
    const [newLocationAddress, setNewLocationAddress] = useState('');
    const [newLocationPhoto, setNewLocationPhoto] = useState<File | null>(null);
    const [newLocationPhotoKey, setNewLocationPhotoKey] = useState(Date.now());
    const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
    const [editedLocationName, setEditedLocationName] = useState('');
    const [editedLocationAddress, setEditedLocationAddress] = useState('');
    const [editedLocationPhoto, setEditedLocationPhoto] = useState<File | null>(null);
    const [editedLocationPhotoKey, setEditedLocationPhotoKey] = useState(Date.now());

    // --- Load Library Data for Import ---
    useEffect(() => {
        if (isImporting) {
            (async () => {
                // PRIMARY: Try loading from backend (disk files)
                const backendLibrary = await getLibraryFromBackend();
                if (backendLibrary && backendLibrary.assets) {
                    setLibraryAssets(backendLibrary.assets);
                    return;
                }
                // FALLBACK: Load from IndexedDB cache
                const parsed = await storageGet<{ assets: LibraryAsset[] }>(ASSET_STORAGE_KEY);
                if (parsed) {
                    setLibraryAssets(parsed.assets || []);
                }
            })();
        }
    }, [isImporting]);

    // --- Actor Functions ---

    const handleAddProjectActor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newActorName || !newActorPhoto || !addActor || !projectSettings) return;

        const newActorId = crypto.randomUUID();
        const placeholderActor: Actor = { id: newActorId, name: newActorName, photo: '', description: 'Processing image...' };
        addActor(placeholderActor);
        
        const originalPhotoBase64 = await fileToBase64(newActorPhoto);

        setNewActorName('');
        setNewActorPhoto(null);
        setNewActorPhotoKey(Date.now());

        try {
            const analysis = await analyzeActorImage(originalPhotoBase64);
            let croppedPhotoBase64: string;

            if (analysis.boundingBox) {
                croppedPhotoBase64 = await cropBase64ImageWithBoundingBox(originalPhotoBase64, analysis.boundingBox, projectSettings.primaryAspectRatio);
            } else {
                croppedPhotoBase64 = await cropBase64ImageToAspectRatio(originalPhotoBase64, projectSettings.primaryAspectRatio);
            }

            const finalActor: Actor = { ...placeholderActor, photo: croppedPhotoBase64, description: analysis.description, gender: analysis.gender };
            updateActor(finalActor);
        } catch (err) {
            console.error("Failed to process actor image:", err);
            updateActor({ ...placeholderActor, description: "Error processing image." });
        }
    };

    const handleRemoveActor = (actor: Actor) => {
        if (window.confirm(`Are you sure you want to delete ${actor.name}? This actor will also be removed from all scenes and shots.`)) {
            removeActor(actor.id);
            const updatedScenes = scenes.map(scene => ({
                ...scene,
                actors: scene.actors.filter(actorName => actorName !== actor.name)
            }));
            setScenes(updatedScenes);
            setShots(prev => {
                const updated: Record<string, Shot[]> = {};
                for (const [sceneId, sceneShots] of Object.entries(prev) as [string, Shot[]][]) {
                    updated[sceneId] = sceneShots.map(shot => ({
                        ...shot,
                        parameters: {
                            ...shot.parameters,
                            actorsInShot: (shot.parameters.actorsInShot || []).filter((name: string) => name !== actor.name),
                        }
                    }));
                }
                return updated;
            });
        }
    };

    const handleStartEditActor = (actor: Actor) => {
        setEditingActorId(actor.id);
        setEditedActorName(actor.name);
        setEditedActorPhoto(null);
        setEditedActorPhotoKey(Date.now());
    };

    const handleCancelEditActor = () => {
        setEditingActorId(null);
        setEditedActorName('');
        setEditedActorPhoto(null);
    };

    const handleSaveActor = async (actorId: string) => {
        const actorToUpdate = projectSettings?.actors.find(a => a.id === actorId);
        if (!actorToUpdate || !projectSettings) return;

        try {
            let needsAsyncDescription = false;
            let photoBase64 = actorToUpdate.photo;

            if (editedActorPhoto) {
                const originalBase64 = await fileToBase64(editedActorPhoto);
                const analysis = await analyzeActorImage(originalBase64);
                if(analysis.boundingBox) {
                    photoBase64 = await cropBase64ImageWithBoundingBox(originalBase64, analysis.boundingBox, projectSettings.primaryAspectRatio);
                } else {
                    photoBase64 = await cropBase64ImageToAspectRatio(originalBase64, projectSettings.primaryAspectRatio);
                }
                needsAsyncDescription = true;
            }

            if (actorToUpdate.name !== editedActorName) {
                const updatedScenes = scenes.map(scene => ({
                    ...scene,
                    actors: scene.actors.map(name => name === actorToUpdate.name ? editedActorName : name)
                }));
                setScenes(updatedScenes);
                setShots(prev => {
                    const updated: Record<string, Shot[]> = {};
                    for (const [sceneId, sceneShots] of Object.entries(prev) as [string, Shot[]][]) {
                        updated[sceneId] = sceneShots.map(shot => ({
                            ...shot,
                            parameters: {
                                ...shot.parameters,
                                actorsInShot: (shot.parameters.actorsInShot || []).map((name: string) => name === actorToUpdate.name ? editedActorName : name),
                            }
                        }));
                    }
                    return updated;
                });
            }

            const updatedActorData: Actor = {
                ...actorToUpdate,
                name: editedActorName,
                photo: photoBase64,
                description: needsAsyncDescription ? 'Generating...' : actorToUpdate.description,
            };

            updateActor(updatedActorData);
            handleCancelEditActor();

            if (needsAsyncDescription) {
                const analysis = await analyzeActorImage(photoBase64);
                updateActorDescription(actorId, analysis.description);
                updateActor({ ...updatedActorData, description: analysis.description, gender: analysis.gender });
            }
        } catch (err) {
            console.error("Failed to save actor:", err);
            alert("Failed to update actor. The AI service may be temporarily unavailable. Please try again.");
            handleCancelEditActor();
        }
    };

    // --- Prop Functions ---

    const handleAddProjectProp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPropName || !addProp) return;

        const newPropId = crypto.randomUUID();
        let photoBase64: string | undefined;
        let needsAsyncDescription = false;
        if (newPropPhoto) {
            photoBase64 = await fileToBase64(newPropPhoto);
            needsAsyncDescription = true;
        }

        const newProp: Prop = { 
            id: newPropId, 
            name: newPropName,
            referenceImage: photoBase64,
            description: needsAsyncDescription ? 'Generating...' : undefined,
        };
        addProp(newProp);
        
        setNewPropName('');
        setNewPropPhoto(null);
        setNewPropPhotoKey(Date.now());

        if (needsAsyncDescription && photoBase64) {
            setPropDescLoading(newPropId);
            describePropImage(photoBase64)
                .then(description => {
                    updateProp({ ...newProp, description });
                })
                .catch(err => {
                    console.error("Failed to describe prop image:", err);
                    updateProp({ ...newProp, description: "Could not generate description." });
                })
                .finally(() => {
                    setPropDescLoading(null);
                });
        }
    };

    // --- Location Functions ---

     const handleAddProjectLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLocationName || !addLocation) return;
        
        const newLocationId = crypto.randomUUID();
        let photoBase64: string | undefined;

        if (newLocationPhoto) {
            photoBase64 = await fileToBase64(newLocationPhoto);
        }
        
        const newLocation: Location = { 
            id: newLocationId, 
            name: newLocationName, 
            address: newLocationAddress,
            referenceImage: photoBase64,
            description: 'Generating...',
        };
        addLocation(newLocation);

        setNewLocationName('');
        setNewLocationAddress('');
        setNewLocationPhoto(null);
        setNewLocationPhotoKey(Date.now());

        describeLocationAsset(newLocationName, photoBase64, newLocationAddress)
            .then(description => {
                 updateLocationDescription(newLocationId, description);
            })
            .catch(err => {
                console.error("Failed to describe location:", err);
                updateLocationDescription(newLocationId, "Could not generate description.");
            });
    };

    const handleStartEditLocation = (location: Location) => {
        setEditingLocationId(location.id);
        setEditedLocationName(location.name);
        setEditedLocationAddress(location.address || '');
        setEditedLocationPhoto(null);
        setEditedLocationPhotoKey(Date.now());
    };

    const handleCancelEditLocation = () => {
        setEditingLocationId(null);
        setEditedLocationName('');
        setEditedLocationAddress('');
        setEditedLocationPhoto(null);
    };

    const handleSaveLocation = async (locationId: string) => {
        const locationToUpdate = projectSettings?.locations.find(l => l.id === locationId);
        if (!locationToUpdate) return;

        let photoBase64 = locationToUpdate.referenceImage;
        let needsAsyncDescription = false;

        const nameChanged = locationToUpdate.name !== editedLocationName;
        const addressChanged = locationToUpdate.address !== editedLocationAddress;

        if (editedLocationPhoto) {
            photoBase64 = await fileToBase64(editedLocationPhoto);
            needsAsyncDescription = true;
        }

        const updatedLocationData: Location = {
            ...locationToUpdate,
            name: editedLocationName,
            address: editedLocationAddress,
            referenceImage: photoBase64,
            description: (needsAsyncDescription || nameChanged || addressChanged) ? 'Updating description...' : locationToUpdate.description,
        }

        updateLocation(updatedLocationData);
        handleCancelEditLocation();
        
        if (needsAsyncDescription || nameChanged || addressChanged) {
            describeLocationAsset(editedLocationName, photoBase64, editedLocationAddress)
                .then(description => {
                    updateLocationDescription(locationId, description);
                })
                .catch(err => {
                    console.error("Failed to update location description:", err);
                    updateLocationDescription(locationId, "Could not generate description.");
                });
        }
    };

    const handleRemoveLocation = (location: Location) => {
        if (window.confirm(`Are you sure you want to delete ${location.name}?`)) {
            removeLocation(location.id);
        }
    };

    // --- Import Logic ---

    const getImportType = (): AssetType => {
        if (assetTab === 'actors') return 'actor';
        if (assetTab === 'props') return 'prop';
        return 'location';
    };

    const handleToggleImportSelection = (assetId: string) => {
        setSelectedImportIds(prev =>
            prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
        );
    };

    const handleConfirmImport = async () => {
        if (!projectSettings) return;
        
        const assetsToImport = libraryAssets.filter(a => selectedImportIds.includes(a.id));
        const type = getImportType();

        // Process based on type
        if (type === 'actor') {
            for (const asset of assetsToImport) {
                // Crop logic for actors
                let croppedPhoto: string = asset.image;
                try {
                    if (asset.metadata?.faceBoundingBox) {
                        const img = new Image();
                        await new Promise(res => { img.onload = res; img.src = asset.image; });
                        const pixelBox = {
                            x: asset.metadata.faceBoundingBox.x * img.width,
                            y: asset.metadata.faceBoundingBox.y * img.height,
                            width: asset.metadata.faceBoundingBox.width * img.width,
                            height: asset.metadata.faceBoundingBox.height * img.height,
                        };
                        croppedPhoto = await cropBase64ImageWithBoundingBox(asset.image, pixelBox, projectSettings.primaryAspectRatio);
                    } else {
                        croppedPhoto = await cropBase64ImageToAspectRatio(asset.image, projectSettings.primaryAspectRatio);
                    }
                } catch (e) {
                    console.error("Crop failed during import, using original", e);
                }

                addActor({
                    id: crypto.randomUUID(),
                    name: asset.name,
                    photo: croppedPhoto,
                    description: asset.description || 'Imported from library.'
                });
            }
        } else if (type === 'prop') {
            for (const asset of assetsToImport) {
                addProp({
                    id: crypto.randomUUID(),
                    name: asset.name,
                    referenceImage: asset.image,
                    description: asset.description
                });
            }
        } else if (type === 'location') {
            for (const asset of assetsToImport) {
                addLocation({
                    id: crypto.randomUUID(),
                    name: asset.name,
                    referenceImage: asset.image,
                    address: asset.metadata?.address,
                    description: asset.description
                });
            }
        }

        setIsImporting(false);
        setSelectedImportIds([]);
    };

    const importableAssets = libraryAssets.filter(asset => {
        const type = getImportType();
        if (asset.type !== type) return false;
        
        // Filter out assets already in project by name check (imperfect but simple)
        if (type === 'actor') {
            return !projectSettings?.actors.some(pa => pa.name.toLowerCase() === asset.name.toLowerCase());
        }
        if (type === 'prop') {
            return !projectSettings?.props.some(pp => pp.name.toLowerCase() === asset.name.toLowerCase());
        }
        if (type === 'location') {
            return !projectSettings?.locations.some(pl => pl.name.toLowerCase() === asset.name.toLowerCase());
        }
        return true;
    }).filter(asset => 
        asset.name.toLowerCase().includes(importSearch.toLowerCase()) || 
        (asset.tags || []).some(t => t.toLowerCase().includes(importSearch.toLowerCase()))
    );

    const isGenerating = (text?: string) => text === 'Generating...' || text === 'Updating description...' || text === 'Processing image...';

    return (
        <div className="w-full">
            {isImporting && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsImporting(false)}>
                    <div className="bg-surface border border-white/10 rounded-lg shadow-2xl w-full max-w-2xl text-white flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-canvas">
                            <h3 className="text-lg font-bold flex items-center gap-2"><CloudArrowUpIcon className="w-5 h-5 text-accent"/> Import {getImportType().charAt(0).toUpperCase() + getImportType().slice(1)}s</h3>
                            <button onClick={() => setIsImporting(false)}><XIcon/></button>
                        </div>
                        <div className="p-4 bg-canvas border-b border-white/10 relative">
                            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                            <input 
                                type="text" 
                                placeholder="Search library..." 
                                value={importSearch}
                                onChange={(e) => setImportSearch(e.target.value)}
                                className="w-full bg-surface border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:ring-accent focus:border-accent"
                            />
                        </div>
                        <div className="p-4 overflow-y-auto flex-grow grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {importableAssets.length > 0 ? importableAssets.map(asset => (
                                <label key={asset.id} className={`relative flex flex-col group cursor-pointer border rounded-lg overflow-hidden transition-all ${selectedImportIds.includes(asset.id) ? 'border-accent bg-accent/10' : 'border-white/10 bg-surface hover:border-white/30'}`}>
                                    <input type="checkbox" checked={selectedImportIds.includes(asset.id)} onChange={() => handleToggleImportSelection(asset.id)} className="absolute top-2 right-2 w-4 h-4 rounded bg-black/50 border-white/50 text-accent focus:ring-accent z-10" />
                                    <div className="aspect-square bg-black">
                                        <img src={asset.image} alt={asset.name} className="w-full h-full object-cover"/>
                                    </div>
                                    <div className="p-2">
                                        <p className="font-semibold text-sm truncate" title={asset.name}>{asset.name}</p>
                                        <div className="flex gap-1 mt-1 overflow-hidden h-4">
                                            {(asset.tags || []).slice(0, 2).map(t => <span key={t} className="text-[10px] bg-white/10 px-1 rounded text-white/60">{t}</span>)}
                                        </div>
                                    </div>
                                </label>
                            )) : (
                                <div className="col-span-full flex flex-col items-center justify-center py-12 text-white/60">
                                    <FilterIcon className="w-8 h-8 mb-2 opacity-50" />
                                    <p>No matching {getImportType()}s found in library.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 flex justify-end gap-2 border-t border-white/10 bg-canvas">
                            <button onClick={() => setIsImporting(false)} className="px-4 py-2 text-sm bg-white/10 rounded-md hover:bg-white/20">Cancel</button>
                            <button onClick={handleConfirmImport} disabled={selectedImportIds.length === 0} className="px-4 py-2 text-sm bg-accent rounded-md hover:bg-accent/90 disabled:opacity-50 font-bold">
                                Import Selected ({selectedImportIds.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6 border-b border-white/10">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Project Assets</h2>
                </div>
                <div className="flex mt-4 border border-white/10 rounded-md p-1 bg-canvas">
                    <button onClick={() => setAssetTab('actors')} className={`flex-1 py-1 text-sm rounded-md ${assetTab === 'actors' ? 'bg-accent text-white' : 'text-white/60 hover:bg-white/10'}`}>Cast</button>
                    <button onClick={() => setAssetTab('locations')} className={`flex-1 py-1 text-sm rounded-md ${assetTab === 'locations' ? 'bg-accent text-white' : 'text-white/60 hover:bg-white/10'}`}>Locations</button>
                    <button onClick={() => setAssetTab('props')} className={`flex-1 py-1 text-sm rounded-md ${assetTab === 'props' ? 'bg-accent text-white' : 'text-white/60 hover:bg-white/10'}`}>Props</button>
                </div>
            </div>
            
            {assetTab === 'actors' && (
                <div className="p-4 grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-1 space-y-4">
                        <form onSubmit={handleAddProjectActor} className="space-y-2 p-3 bg-canvas border border-white/10 rounded-md">
                            <h4 className="text-sm font-semibold text-white/80">Add New Actor to Project</h4>
                            <input type="text" value={newActorName} onChange={e => setNewActorName(e.target.value)} placeholder="Actor Name" className="w-full bg-surface border border-white/10 rounded-md p-2 text-xs focus:ring-accent focus:border-accent" />
                            <input key={newActorPhotoKey} type="file" accept="image/*" onChange={e => e.target.files && setNewActorPhoto(e.target.files[0])} className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-white/10 file:text-white/80 hover:file:bg-white/20 w-full" />
                            <div className="flex gap-2 text-xs">
                                <button type="submit" disabled={!newActorName || !newActorPhoto} className="w-full px-3 py-1.5 border border-white/10 text-white/80 rounded-md hover:bg-white/5 disabled:opacity-50">Add Manually</button>
                                <button type="button" onClick={() => setIsImporting(true)} className="w-full px-3 py-1.5 border border-white/10 text-white/80 rounded-md hover:bg-white/5 bg-white/5">From Library</button>
                            </div>
                        </form>
                    </div>
                     <div className="md:col-span-2 space-y-3 max-h-64 overflow-y-auto p-1">
                        {(projectSettings?.actors || []).map(actor => (
                            <div key={actor.id}>
                                {editingActorId === actor.id ? (
                                    <div className="p-3 bg-canvas border border-accent rounded-md space-y-3">
                                        <input 
                                            type="text" 
                                            value={editedActorName} 
                                            onChange={e => setEditedActorName(e.target.value)} 
                                            className="w-full bg-surface border border-white/10 rounded-md p-2 text-sm focus:ring-accent focus:border-accent" 
                                        />
                                        <input 
                                            key={editedActorPhotoKey} 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={e => e.target.files && setEditedActorPhoto(e.target.files[0])} 
                                            className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-white/10 file:text-white/80 hover:file:bg-white/20 w-full" 
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={() => handleSaveActor(actor.id)} className="flex-grow px-3 py-1.5 bg-green-600 text-white rounded-md text-xs hover:bg-green-500">Save</button>
                                            <button onClick={handleCancelEditActor} className="px-3 py-1.5 border border-white/10 text-white/80 rounded-md text-xs hover:bg-white/5">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-3 p-2 bg-canvas rounded-md group">
                                        {actor.photo ? <img src={actor.photo} alt={actor.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-full bg-surface flex-shrink-0"/>}
                                        <div className="flex-grow min-w-0">
                                            <span className="text-sm font-semibold">{actor.name}</span>
                                            <div className="flex items-center gap-1">
                                                {isGenerating(actor.description) && <ArrowPathIcon className="w-3 h-3 text-white/50 animate-spin" />}
                                                <p className="text-xs text-white/60 truncate" title={actor.description}>{actor.description || 'No description available.'}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleStartEditActor(actor)} className="p-1.5 text-white/60 hover:text-white" title={`Edit ${actor.name}`}><PencilIcon className="w-4 h-4" /></button>
                                            <button onClick={() => handleRemoveActor(actor)} className="p-1.5 text-white/60 hover:text-red-500" title={`Delete ${actor.name}`}><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {assetTab === 'locations' && (
                <div className="p-4 grid md:grid-cols-3 gap-4">
                     <div className="md:col-span-1 space-y-4">
                        <form onSubmit={handleAddProjectLocation} className="space-y-2 p-3 bg-canvas border border-white/10 rounded-md">
                            <h4 className="text-sm font-semibold text-white/80">Add New Location</h4>
                            <input type="text" value={newLocationName} onChange={e => setNewLocationName(e.target.value)} placeholder="Location Name" className="w-full bg-surface border border-white/10 rounded-md p-2 text-xs focus:ring-accent focus:border-accent" />
                            <input type="text" value={newLocationAddress} onChange={e => setNewLocationAddress(e.target.value)} placeholder="Address (optional)" className="w-full bg-surface border border-white/10 rounded-md p-2 text-xs focus:ring-accent focus:border-accent" />
                            <input key={newLocationPhotoKey} type="file" accept="image/*" onChange={e => e.target.files && setNewLocationPhoto(e.target.files[0])} className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-white/10 file:text-white/80 hover:file:bg-white/20 w-full" />
                            <div className="flex gap-2 text-xs">
                                <button type="submit" disabled={!newLocationName} className="w-full px-3 py-1.5 border border-white/10 text-white/80 rounded-md hover:bg-white/5 disabled:opacity-50">Add</button>
                            </div>
                        </form>
                    </div>
                    <div className="md:col-span-2 space-y-3 max-h-64 overflow-y-auto p-1">
                        {(projectSettings?.locations || []).map(location => (
                            <div key={location.id}>
                                {editingLocationId === location.id ? (
                                    <div className="p-3 bg-canvas border border-accent rounded-md space-y-3">
                                        <input type="text" value={editedLocationName} onChange={e => setEditedLocationName(e.target.value)} className="w-full bg-surface border border-white/10 rounded-md p-2 text-sm focus:ring-accent focus:border-accent" />
                                        <input type="text" value={editedLocationAddress} onChange={e => setEditedLocationAddress(e.target.value)} className="w-full bg-surface border border-white/10 rounded-md p-2 text-sm focus:ring-accent focus:border-accent" />
                                        <input key={editedLocationPhotoKey} type="file" accept="image/*" onChange={e => e.target.files && setEditedLocationPhoto(e.target.files[0])} className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-white/10 file:text-white/80 hover:file:bg-white/20 w-full" />
                                        <div className="flex gap-2">
                                            <button onClick={() => handleSaveLocation(location.id)} className="flex-grow px-3 py-1.5 bg-green-600 text-white rounded-md text-xs hover:bg-green-500">Save</button>
                                            <button onClick={handleCancelEditLocation} className="px-3 py-1.5 border border-white/10 text-white/80 rounded-md text-xs hover:bg-white/5">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-3 p-2 bg-canvas rounded-md group">
                                        {location.referenceImage && <img src={location.referenceImage} alt={location.name} className="w-16 h-10 rounded-sm object-cover flex-shrink-0" />}
                                        <div className="flex-grow min-w-0">
                                            <span className="text-sm font-semibold">{location.name}</span>
                                            <p className="text-xs text-white/60 truncate" title={location.address}>{location.address}</p>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleStartEditLocation(location)} className="p-1.5 text-white/60 hover:text-white" title={`Edit ${location.name}`}><PencilIcon className="w-4 h-4" /></button>
                                            <button onClick={() => handleRemoveLocation(location)} className="p-1.5 text-white/60 hover:text-red-500" title={`Delete ${location.name}`}><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
             {assetTab === 'props' && (
                <div className="p-4 grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-1 space-y-4">
                        <form onSubmit={handleAddProjectProp} className="space-y-2 p-3 bg-canvas border border-white/10 rounded-md">
                            <h4 className="text-sm font-semibold text-white/80">Add New Prop</h4>
                            <input type="text" value={newPropName} onChange={e => setNewPropName(e.target.value)} placeholder="Prop Name" className="w-full bg-surface border border-white/10 rounded-md p-2 text-xs focus:ring-accent focus:border-accent" />
                            <input key={newPropPhotoKey} type="file" accept="image/*" onChange={e => e.target.files && setNewPropPhoto(e.target.files[0])} className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-white/10 file:text-white/80 hover:file:bg-white/20 w-full" />
                            <div className="flex gap-2 text-xs">
                                <button type="submit" disabled={!newPropName} className="w-full px-3 py-1.5 border border-white/10 text-white/80 rounded-md hover:bg-white/5 disabled:opacity-50">Add</button>
                            </div>
                        </form>
                    </div>
                    <div className="md:col-span-2 space-y-3 max-h-64 overflow-y-auto p-1">
                        {(projectSettings?.props || []).map(prop => (
                            <div key={prop.id} className="flex items-start gap-3 p-2 bg-canvas rounded-md group">
                                {prop.referenceImage && <img src={prop.referenceImage} alt={prop.name} className="w-10 h-10 rounded-sm object-cover flex-shrink-0" />}
                                <div className="flex-grow min-w-0">
                                    <span className="text-sm font-semibold">{prop.name}</span>
                                    <div className="flex items-center gap-1">
                                        {(propDescLoading === prop.id || isGenerating(prop.description)) && <ArrowPathIcon className="w-3 h-3 text-white/50 animate-spin" />}
                                        <p className="text-xs text-white/60 truncate" title={prop.description}>{prop.description || 'No description available.'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { if (window.confirm(`Delete prop "${prop.name}"?`)) removeProp(prop.id); }} className="p-1.5 text-white/60 hover:text-red-500" title={`Delete ${prop.name}`}><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectAssetsManager;
