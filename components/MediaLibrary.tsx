
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { analyzeActorImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import type { LibraryAsset, LibraryFolder, AssetType, Actor } from '../types';
import { 
    PencilIcon, TrashIcon, FolderIcon, FolderPlusIcon, TagIcon, 
    SearchIcon, CloudArrowUpIcon, CheckCircleIcon, FilterIcon, 
    UserIcon, FilmIcon, PlusIcon, XIcon, ArrowPathIcon,
    ArrowDownTrayIcon
} from './icons';
import { syncLibrary } from '../services/syncService';
import { getLibrary as getLibraryFromBackend } from '../services/apiService';
import { storageGet, storageSet } from '../utils/storage';

const ASSET_STORAGE_KEY = 'shotdeck_asset_library';
const LEGACY_STORAGE_KEY = 'shotdeck_media_library';

interface MediaLibraryData {
    assets: LibraryAsset[];
    folders: LibraryFolder[];
}

const initialData: MediaLibraryData = {
    assets: [],
    folders: [
        { id: 'root', name: 'All Assets' },
    ]
};

const getIconForType = (type: AssetType) => {
    switch (type) {
        case 'actor': return <UserIcon className="w-4 h-4" />;
        case 'shot': return <FilmIcon className="w-4 h-4" />;
        default: return <FilmIcon className="w-4 h-4" />;
    }
};

const MediaLibrary: React.FC = () => {
    // --- State ---
    const [data, setData] = useState<MediaLibraryData>(initialData);
    const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<AssetType | 'all'>('all');
    
    // UI State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<LibraryAsset | null>(null);
    const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
    
    // Folder creation state
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const newFolderInputRef = useRef<HTMLInputElement>(null);

    // Upload State
    const [uploadQueue, setUploadQueue] = useState<File[]>([]);
    const [uploadType, setUploadType] = useState<AssetType>('actor');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Init / Migration ---
    useEffect(() => {
        (async () => {
            // PRIMARY: Try loading from backend (disk files)
            const backendLibrary = await getLibraryFromBackend();
            if (backendLibrary) {
                const loaded: MediaLibraryData = {
                    assets: backendLibrary.assets || [],
                    folders: backendLibrary.folders || initialData.folders,
                };
                setData(loaded);
                await storageSet(ASSET_STORAGE_KEY, loaded);
                return;
            }

            // FALLBACK: Load from IndexedDB cache (backend unavailable)
            const storedData = await storageGet<MediaLibraryData>(ASSET_STORAGE_KEY);
            if (storedData) {
                setData(storedData);
            } else {
                // Migrate legacy data from old localStorage key
                const legacyActorsStr = localStorage.getItem(LEGACY_STORAGE_KEY);
                if (legacyActorsStr) {
                    try {
                        const legacyActors: Actor[] = JSON.parse(legacyActorsStr);
                        const migratedAssets: LibraryAsset[] = legacyActors.map(actor => ({
                            id: actor.id,
                            type: 'actor',
                            name: actor.name,
                            image: actor.photo,
                            description: actor.description,
                            tags: [],
                            folderId: 'root',
                            createdAt: Date.now(),
                            metadata: {
                                faceBoundingBox: actor.faceBoundingBox
                            }
                        }));
                        
                        const newData = { assets: migratedAssets, folders: initialData.folders };
                        setData(newData);
                        await storageSet(ASSET_STORAGE_KEY, newData);
                        localStorage.removeItem(LEGACY_STORAGE_KEY);
                    } catch (e) {
                        console.error("Migration failed", e);
                    }
                }
            }
        })();
    }, []);

    // --- Persistence ---
    const saveData = async (newData: MediaLibraryData) => {
        setData(newData);
        // PRIMARY: Save to backend (disk files)
        await syncLibrary(newData);
        // CACHE: Also update IndexedDB
        await storageSet(ASSET_STORAGE_KEY, newData);
    };

    const isInitialLoad = useRef(true);
    const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (isInitialLoad.current) {
            isInitialLoad.current = false;
            return;
        }
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(async () => {
            try {
                await syncLibrary(data);
                await storageSet(ASSET_STORAGE_KEY, data);
            } catch (e) {
                console.error('Media library auto-save failed', e);
            }
        }, 2000);
        return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    }, [data]);

    // --- Handlers ---

    const handleCreateFolder = () => {
        setIsCreatingFolder(true);
        setNewFolderName('');
        setTimeout(() => newFolderInputRef.current?.focus(), 50);
    };

    const confirmCreateFolder = () => {
        const trimmed = newFolderName.trim();
        if (trimmed) {
            const newFolder: LibraryFolder = { id: crypto.randomUUID(), name: trimmed };
            saveData({ ...data, folders: [...data.folders, newFolder] });
        }
        setIsCreatingFolder(false);
        setNewFolderName('');
    };

    const handleDeleteFolder = (folderId: string) => {
        if (folderId === 'root') return;
        if (confirm("Delete this folder? Assets inside will be moved to root.")) {
            const newAssets = data.assets.map(a => a.folderId === folderId ? { ...a, folderId: 'root' } : a);
            const newFolders = data.folders.filter(f => f.id !== folderId);
            saveData({ assets: newAssets, folders: newFolders });
            if (selectedFolderId === folderId) setSelectedFolderId('root');
        }
    };

    const handleBulkDelete = () => {
        if (confirm(`Delete ${selectedAssets.length} assets?`)) {
            const newAssets = data.assets.filter(a => !selectedAssets.includes(a.id));
            saveData({ ...data, assets: newAssets });
            setSelectedAssets([]);
        }
    };

    const handleBulkMove = (targetFolderId: string) => {
        const newAssets = data.assets.map(a => selectedAssets.includes(a.id) ? { ...a, folderId: targetFolderId } : a);
        saveData({ ...data, assets: newAssets });
        setSelectedAssets([]);
    };

    const handleAssetSelect = (id: string, multi: boolean) => {
        if (multi) {
            setSelectedAssets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        } else {
            setSelectedAssets([id]);
        }
    };

    const handleProcessUploadQueue = async () => {
        setIsAnalyzing(true);
        const newAssets: LibraryAsset[] = [];
        const failedFiles: string[] = [];
        let completed = 0;

        for (const file of uploadQueue) {
            try {
                const base64 = await fileToBase64(file);
                let description = 'Uploaded asset.';
                let meta = {};

                if (uploadType === 'actor') {
                    const analysis = await analyzeActorImage(base64);
                    description = analysis.description;
                    if (analysis.boundingBox && analysis.boundingBox.width > 0) {
                        const img = new Image();
                        await new Promise((resolve) => { img.onload = resolve; img.src = base64; });

                        meta = {
                            faceBoundingBox: {
                                x: analysis.boundingBox.x / img.width,
                                y: analysis.boundingBox.y / img.height,
                                width: analysis.boundingBox.width / img.width,
                                height: analysis.boundingBox.height / img.height,
                            }
                        };
                    }
                } else if (uploadType === 'shot') {
                    description = 'Uploaded reference image.';
                }

                newAssets.push({
                    id: crypto.randomUUID(),
                    type: uploadType,
                    name: file.name.split('.')[0].replace(/[-_]/g, ' '),
                    image: base64,
                    description,
                    tags: [],
                    folderId: selectedFolderId === 'root' ? 'root' : selectedFolderId,
                    createdAt: Date.now(),
                    metadata: meta
                });
            } catch (e) {
                console.error(`Failed to process ${file.name}`, e);
                failedFiles.push(file.name);
            }
            completed++;
            setUploadProgress((completed / uploadQueue.length) * 100);
        }

        saveData({ ...data, assets: [...data.assets, ...newAssets] });
        setIsAnalyzing(false);
        setUploadQueue([]);
        setUploadProgress(0);
        setIsUploadModalOpen(false);

        // Surface failures to user instead of silently swallowing them
        if (failedFiles.length > 0) {
            const successCount = uploadQueue.length - failedFiles.length;
            alert(
                `${successCount} file${successCount !== 1 ? 's' : ''} uploaded successfully.\n\n` +
                `${failedFiles.length} file${failedFiles.length !== 1 ? 's' : ''} failed to process:\n` +
                failedFiles.map(f => `  • ${f}`).join('\n') +
                '\n\nThe AI service may have been temporarily unavailable. You can try uploading the failed files again.'
            );
        }
    };

    const handleUpdateAsset = (updated: LibraryAsset) => {
        const newAssets = data.assets.map(a => a.id === updated.id ? updated : a);
        saveData({ ...data, assets: newAssets });
        setIsEditModalOpen(false);
        setEditingAsset(null);
    };

    const handleDownloadAsset = async (asset: LibraryAsset) => {
        try {
            const res = await fetch(asset.image);
            const blob = await res.blob();
            const ext = blob.type.split('/')[1] || 'png';
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${asset.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed:', err);
        }
    };

    // --- Derived State ---
    const filteredAssets = useMemo(() => {
        let result = data.assets;

        if (selectedFolderId !== 'all') {
            result = result.filter(a => a.folderId === selectedFolderId);
        }

        if (filterType !== 'all') {
            result = result.filter(a => a.type === filterType);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(a => 
                a.name.toLowerCase().includes(q) || 
                a.description?.toLowerCase().includes(q) ||
                a.tags.some(t => t.toLowerCase().includes(q))
            );
        }

        return result.sort((a, b) => b.createdAt - a.createdAt);
    }, [data.assets, selectedFolderId, filterType, searchQuery]);

    const folderList = useMemo(() => {
        // We want a virtual "All Assets" folder for UI, but data.folders stores actual containers
        return data.folders.filter(f => f.id !== 'root'); // Handle root specially in UI
    }, [data.folders]);

    return (
        <div className="flex h-full bg-canvas text-white">
            {/* --- Left Sidebar: Folders --- */}
            <aside className="w-64 flex-shrink-0 bg-surface border-r border-white/10 flex flex-col" role="complementary" aria-label="Library folders">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="font-bold text-lg">Library</h2>
                    <button onClick={handleCreateFolder} className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white" title="New Folder" aria-label="New Folder">
                        <FolderPlusIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto p-2 space-y-1">
                    <button 
                        onClick={() => setSelectedFolderId('all')} 
                        className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 text-sm ${selectedFolderId === 'all' ? 'bg-accent text-white' : 'text-white/70 hover:bg-white/5'}`}
                    >
                        <FolderIcon className="w-4 h-4" /> All Assets
                    </button>
                    <button 
                        onClick={() => setSelectedFolderId('root')} 
                        className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 text-sm ${selectedFolderId === 'root' ? 'bg-accent text-white' : 'text-white/70 hover:bg-white/5'}`}
                    >
                        <FolderIcon className="w-4 h-4" /> Unsorted
                    </button>
                    <div className="pt-2 pb-1 px-3 text-xs font-bold text-white/60 uppercase tracking-wider">Folders</div>
                    {isCreatingFolder && (
                        <div className="px-2 py-1">
                            <div className="flex items-center gap-1 bg-white/10 rounded px-2 py-1">
                                <FolderIcon className="w-4 h-4 text-accent flex-shrink-0" />
                                <input
                                    ref={newFolderInputRef}
                                    type="text"
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') confirmCreateFolder();
                                        if (e.key === 'Escape') { setIsCreatingFolder(false); setNewFolderName(''); }
                                    }}
                                    onBlur={confirmCreateFolder}
                                    placeholder="Folder name..."
                                    className="flex-1 bg-transparent text-sm text-white outline-none placeholder-white/40"
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}
                    {folderList.map(folder => (
                        <div key={folder.id} className="group relative">
                            <button 
                                onClick={() => setSelectedFolderId(folder.id)} 
                                className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 text-sm ${selectedFolderId === folder.id ? 'bg-accent text-white' : 'text-white/70 hover:bg-white/5'}`}
                            >
                                <FolderIcon className="w-4 h-4" /> {folder.name}
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                                className="absolute right-2 top-2 text-white/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <XIcon className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </aside>

            {/* --- Main Content --- */}
            <main className="flex-grow flex flex-col h-full overflow-hidden" role="main">
                {/* Header / Toolbar */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4 bg-canvas">
                    <div className="flex items-center gap-4 flex-grow max-w-2xl">
                        <div className="relative flex-grow">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                            <input 
                                type="text" 
                                placeholder="Search library..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-surface border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:ring-accent focus:border-accent"
                            />
                        </div>
                        <div className="flex items-center bg-surface rounded-md border border-white/10 p-1">
                            {(['all', 'actor', 'shot'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={`px-3 py-1 text-xs rounded transition-colors capitalize ${filterType === type ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedAssets.length > 0 && (
                            <>
                                <span className="text-sm text-white/60 mr-2">{selectedAssets.length} selected</span>
                                <button onClick={handleBulkDelete} className="p-2 text-white/60 hover:text-red-500 bg-surface rounded border border-white/10" title="Delete Selected" aria-label="Delete Selected">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                                {/* Move Dropdown could go here */}
                            </>
                        )}
                        <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-accent text-white font-bold rounded-md hover:bg-accent/90 transition-colors text-sm">
                            <CloudArrowUpIcon className="w-4 h-4" /> Upload
                        </button>
                    </div>
                </div>

                {/* Grid View */}
                <div className="flex-grow overflow-y-auto p-6">
                    {filteredAssets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/60">
                            <img src="/generate-icon.png" alt="" className="w-[240px] h-[220px] mb-4 opacity-20" draggable={false} />
                            <p>No assets found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {filteredAssets.map(asset => (
                                <div 
                                    key={asset.id} 
                                    className={`relative group bg-surface rounded-lg border overflow-hidden cursor-pointer transition-all hover:-translate-y-1 ${selectedAssets.includes(asset.id) ? 'border-accent ring-1 ring-accent' : 'border-white/10 hover:border-white/30'}`}
                                    onClick={(e) => handleAssetSelect(asset.id, e.ctrlKey || e.metaKey)}
                                    onDoubleClick={() => { setEditingAsset(asset); setIsEditModalOpen(true); }}
                                >
                                    <div className="aspect-square bg-black relative">
                                        <img src={asset.image} alt={asset.name} className="w-full h-full object-cover" />
                                        <div className="absolute top-2 left-2 bg-black/60 p-1 rounded backdrop-blur-sm">
                                            {getIconForType(asset.type)}
                                        </div>
                                        {selectedAssets.includes(asset.id) && (
                                            <div className="absolute top-2 right-2 text-accent bg-white rounded-full">
                                                <CheckCircleIcon className="w-5 h-5" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <h3 className="font-semibold text-sm truncate" title={asset.name}>{asset.name}</h3>
                                        <p className="text-xs text-white/50 truncate mt-0.5">{asset.type} • {new Date(asset.createdAt).toLocaleDateString()}</p>
                                        <div className="flex gap-1 mt-2 overflow-hidden h-4">
                                            {(asset.tags || []).slice(0, 3).map(tag => (
                                                <span key={tag} className="text-xs bg-white/10 px-1.5 rounded text-white/70 whitespace-nowrap">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Quick Actions Hover */}
                                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingAsset(asset); setIsEditModalOpen(true); }} className="p-1.5 bg-black/70 hover:bg-accent rounded text-white" title="Edit" aria-label="Edit asset"><PencilIcon className="w-3 h-3" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDownloadAsset(asset); }} className="p-1.5 bg-black/70 hover:bg-accent rounded text-white" title="Download" aria-label="Download asset"><ArrowDownTrayIcon className="w-3 h-3" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* --- Upload Modal --- */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-surface border border-white/10 rounded-lg shadow-2xl w-full max-w-2xl text-white flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Upload Assets</h2>
                            <button onClick={() => { setIsUploadModalOpen(false); setUploadQueue([]); }}><XIcon className="w-6 h-6" /></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">Asset Type</label>
                                <div className="flex gap-4">
                                    {(['actor', 'shot'] as const).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setUploadType(type)}
                                            className={`flex-1 py-3 px-4 rounded-lg border text-sm font-semibold flex flex-col items-center gap-2 transition-all ${uploadType === type ? 'bg-accent/10 border-accent text-accent' : 'bg-canvas border-white/10 text-white/60 hover:bg-white/5'}`}
                                        >
                                            {getIconForType(type)}
                                            <span className="capitalize">{type}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dropzone: invisible file input overlays the entire area */}
                            <div className="relative border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-accent hover:bg-white/5 transition-colors cursor-pointer">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/png,image/jpeg,image/webp,image/*"
                                    ref={fileInputRef}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    style={{ zIndex: 10 }}
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            setUploadQueue(Array.from(e.target.files));
                                        }
                                        e.target.value = '';
                                    }}
                                />
                                <CloudArrowUpIcon className="w-12 h-12 mx-auto text-white/60 mb-3" />
                                <p className="text-lg font-medium">Click to select files</p>
                                <p className="text-sm text-white/60 mt-1">Supports JPG, PNG, WEBP</p>
                            </div>

                            {/* Queue Preview */}
                            {uploadQueue.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">{uploadQueue.length} files selected</h4>
                                    <div className="max-h-40 overflow-y-auto space-y-2 bg-canvas p-2 rounded border border-white/10">
                                        {uploadQueue.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm p-2 bg-white/5 rounded">
                                                <span className="truncate">{file.name}</span>
                                                <span className="text-white/60 text-xs">{(file.size / 1024).toFixed(0)} KB</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isAnalyzing && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-white/60">
                                        <span>Analyzing and processing...</span>
                                        <span>{uploadProgress.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-white/10 bg-canvas flex justify-end gap-3">
                            <button onClick={() => { setIsUploadModalOpen(false); setUploadQueue([]); }} className="px-4 py-2 bg-white/10 rounded-md hover:bg-white/20">Cancel</button>
                            <button 
                                onClick={handleProcessUploadQueue} 
                                disabled={uploadQueue.length === 0 || isAnalyzing} 
                                className="px-6 py-2 bg-accent text-white font-bold rounded-md hover:bg-accent/90 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isAnalyzing ? <ArrowPathIcon className="animate-spin w-4 h-4" /> : null}
                                {isAnalyzing ? 'Processing...' : 'Upload & Analyze'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Edit Asset Modal --- */}
            {isEditModalOpen && editingAsset && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-surface border border-white/10 rounded-lg shadow-2xl w-full max-w-lg text-white flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-lg font-bold">Edit Asset</h2>
                            <button onClick={() => setIsEditModalOpen(false)}><XIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="flex justify-center mb-4">
                                <img src={editingAsset.image} alt="Preview" className="h-40 w-auto rounded border border-white/20" />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-white/60 mb-1">Name</label>
                                <input 
                                    type="text" 
                                    value={editingAsset.name} 
                                    onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                                    className="w-full bg-canvas border border-white/10 rounded p-2 text-sm focus:ring-accent focus:border-accent" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-white/60 mb-1">Description (AI Generated)</label>
                                <textarea 
                                    value={editingAsset.description} 
                                    onChange={(e) => setEditingAsset({ ...editingAsset, description: e.target.value })}
                                    rows={4}
                                    className="w-full bg-canvas border border-white/10 rounded p-2 text-sm focus:ring-accent focus:border-accent" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-white/60 mb-1">Tags (Comma separated)</label>
                                <input 
                                    type="text" 
                                    value={editingAsset.tags.join(', ')} 
                                    onChange={(e) => setEditingAsset({ ...editingAsset, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                                    className="w-full bg-canvas border border-white/10 rounded p-2 text-sm focus:ring-accent focus:border-accent" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-white/60 mb-1">Folder</label>
                                <select 
                                    value={editingAsset.folderId}
                                    onChange={(e) => setEditingAsset({ ...editingAsset, folderId: e.target.value })}
                                    className="w-full bg-canvas border border-white/10 rounded p-2 text-sm focus:ring-accent focus:border-accent"
                                >
                                    <option value="root">Unsorted</option>
                                    {data.folders.map(f => f.id !== 'root' && <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="p-4 border-t border-white/10 bg-canvas flex justify-end gap-2">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-white/10 rounded hover:bg-white/20">Cancel</button>
                            <button onClick={() => handleUpdateAsset(editingAsset)} className="px-6 py-2 bg-accent text-white font-bold rounded hover:bg-accent/90">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaLibrary;
