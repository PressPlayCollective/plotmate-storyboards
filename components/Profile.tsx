
import React, { useState, useEffect, useRef } from 'react';
import { PlusIcon, UserIcon, TrashIcon, DuplicateIcon, FilmIcon, SparklesIcon, CloudArrowUpIcon, ArrowDownTrayIcon } from './icons'; 
import type { User, Project, Shot, ImageProvider } from '../types';
import MediaLibrary from './MediaLibrary';
import { syncSettings, importBackup, exportBackup } from '../services/syncService';
import { getProjects as getProjectsFromBackend, saveProject as saveProjectToBackend, deleteProject as deleteProjectFromBackend } from '../services/apiService';
import FeatureHint from './FeatureHint';
import HintButton from './HintButton';
import { useFeatureDiscovery } from '../utils/useFeatureDiscovery';
import type { FeatureId } from '../utils/useFeatureDiscovery';
import { storageGet, storageSet } from '../utils/storage';

const TAB_TO_FEATURE: Record<string, FeatureId> = {
    library: 'project_library',
    media_library: 'media_library',
    settings: 'api_settings',
};

interface ProfileProps {
    onNewProject: () => void;
    onOpenProject: (project: Project) => void;
}

const Profile: React.FC<ProfileProps> = ({ onNewProject, onOpenProject }) => {
    const [activeTab, setActiveTab] = useState('library');
    const [projects, setProjects] = useState<Project[]>([]);
    const { isNew, markSeen, resetAll } = useFeatureDiscovery();
    const [showHint, setShowHint] = useState(false);

    // Current feature for this tab
    const currentFeature = TAB_TO_FEATURE[activeTab] || 'project_library';

    // Auto-show hint on first visit to each tab
    useEffect(() => {
        if (isNew(currentFeature)) {
            setShowHint(true);
        }
    }, [currentFeature, isNew]);

    const handleDismissHint = () => {
        setShowHint(false);
        markSeen(currentFeature);
    };

    const handleTabChange = (tabName: string) => {
        setShowHint(false); // hide current hint before switching
        setActiveTab(tabName);
    };

    useEffect(() => {
        if (activeTab === 'library') {
            (async () => {
                // PRIMARY: Try loading from backend (disk files)
                const backendProjects = await getProjectsFromBackend();
                if (backendProjects) {
                    setProjects(backendProjects);
                    // Update IndexedDB cache with backend data
                    await storageSet('shotdeck_projects', backendProjects);
                    return;
                }
                // FALLBACK: Load from IndexedDB cache
                const cached = await storageGet<Project[]>('shotdeck_projects');
                setProjects(cached || []);
            })();
        }
    }, [activeTab]);
    
    const SidebarButton: React.FC<{tabName: string; label: string;}> = ({ tabName, label }) => (
        <button
            onClick={() => handleTabChange(tabName)}
            className={`w-full text-left px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tabName
                    ? 'bg-accent text-white'
                    : 'text-white/80 hover:bg-white/10'
            }`}
        >
            {label}
        </button>
    );
    
    const renderContent = () => {
        switch(activeTab) {
            case 'settings':
                return <ProfileSettings onResetDiscovery={resetAll} />;
            case 'media_library':
                 return <MediaLibrary />;
            case 'library':
            default:
                return (
                     <ProjectLibrary 
                        projects={projects}
                        setProjects={setProjects}
                        onNewProject={onNewProject}
                        onOpenProject={onOpenProject}
                     />
                );
        }
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-canvas text-white font-sans">
            <div className="flex-grow flex p-6 gap-6">
                {/* Sidebar */}
                <aside className="w-64 flex-shrink-0 bg-surface border border-white/10 rounded-lg p-4 flex flex-col" role="complementary" aria-label="Dashboard navigation">
                    <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-surface">
                            <img src="/logo.png" alt="PLOTMATE" className="w-12 h-12 object-cover" />
                        </div>
                        <div>
                            <p className="font-bold text-white truncate">PLOTMATE</p>
                            <p className="text-sm text-white/60 truncate">STORYBOARDS</p>
                        </div>
                    </div>
                    <nav aria-label="Dashboard sections" className="space-y-2">
                        <SidebarButton tabName="library" label="Project Library" />
                        <SidebarButton tabName="media_library" label="Media Library" />
                        <SidebarButton tabName="settings" label="API & Settings" />
                    </nav>
                    <div className="mt-auto pt-4 border-t border-white/10 flex justify-center">
                        <HintButton onClick={() => setShowHint(true)} />
                    </div>
                </aside>
                
                {/* Main Content */}
                <main id="main-content" className="flex-grow">
                    {renderContent()}
                </main>
            </div>
            <FeatureHint
                featureId={currentFeature}
                visible={showHint}
                onDismiss={handleDismissHint}
            />
        </div>
    );
};

const ProjectLibrary: React.FC<{
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    onNewProject: () => void;
    onOpenProject: (project: Project) => void;
}> = ({ projects, setProjects, onNewProject, onOpenProject }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'lastModified' | 'createdAt' | 'name'>('lastModified');

    const handleDuplicateProject = async (projectId: string) => {
        const projectToDuplicate = projects.find(p => p.id === projectId);
        if (!projectToDuplicate) return;

        // Deep copy the project
        const duplicatedProject = JSON.parse(JSON.stringify(projectToDuplicate));
        
        // Assign new metadata -- CRITICAL: both top-level id AND settings.id must match
        const newId = crypto.randomUUID();
        duplicatedProject.id = newId;
        duplicatedProject.settings.id = newId;
        duplicatedProject.settings.name = `Copy of ${duplicatedProject.settings.name}`;
        duplicatedProject.createdAt = Date.now();
        duplicatedProject.lastModified = Date.now();

        // PRIMARY: Save to backend (disk)
        await saveProjectToBackend(duplicatedProject);
        // CACHE: Also update IndexedDB
        const updatedProjects = [...projects, duplicatedProject];
        await storageSet('shotdeck_projects', updatedProjects);
        setProjects(updatedProjects);
    };

    const handleDeleteProject = async (projectId: string) => {
        if (window.confirm("Are you sure you want to permanently delete this project? This action cannot be undone.")) {
            // PRIMARY: Delete from backend (disk)
            await deleteProjectFromBackend(projectId);
            // CACHE: Also update IndexedDB
            const updatedProjects = projects.filter(p => p.id !== projectId);
            await storageSet('shotdeck_projects', updatedProjects);
            setProjects(updatedProjects);
        }
    };

    const importFileRef = useRef<HTMLInputElement>(null);
    const [importStatus, setImportStatus] = useState('');

    const handleImportWorkspace = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportStatus('Importing...');
        try {
            const data = await importBackup(file);
            if (data) {
                // PRIMARY: Re-read from backend (which now has the imported data on disk)
                const backendProjects = await getProjectsFromBackend();
                if (backendProjects) {
                    setProjects(backendProjects);
                    await storageSet('shotdeck_projects', backendProjects);
                } else {
                    // Fallback: read from IndexedDB cache
                    const refreshed = await storageGet<Project[]>('shotdeck_projects');
                    setProjects(refreshed || []);
                }
                setImportStatus('Import successful!');
            } else {
                setImportStatus('Import failed. Is the backend server running?');
            }
        } catch {
            setImportStatus('Import failed.');
        }
        setTimeout(() => setImportStatus(''), 3000);
        // Reset file input
        if (importFileRef.current) importFileRef.current.value = '';
    };

    const handleExportWorkspace = async () => {
        setImportStatus('Exporting...');
        const blob = await exportBackup();
        if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `plotmate_backup_${new Date().toISOString().slice(0,10)}.plotmate.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setImportStatus('Export complete!');
        } else {
            setImportStatus('Export failed. Is the backend server running?');
        }
        setTimeout(() => setImportStatus(''), 3000);
    };

    const getProjectPreview = (project: Project): string | null => {
        const sceneIds = project.scenes.map(s => s.id);
        for (const sceneId of sceneIds) {
            const shotsInScene = project.shots[sceneId] || [];
            for (const shot of shotsInScene) {
                if (shot.generatedImage) {
                    return shot.generatedImage;
                }
            }
        }
        return null;
    };

    const filteredAndSortedProjects = projects
        .filter(p => p.settings.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'name') {
                return a.settings.name.localeCompare(b.settings.name);
            }
            return b[sortBy] - a[sortBy]; // Sort by timestamp, newest first
        });

    return (
        <div>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Project Library</h2>
                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-48 bg-surface border border-white/10 rounded-md p-2 text-sm focus:ring-accent focus:border-accent"
                    />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        className="bg-surface border border-white/10 rounded-md p-2 text-sm focus:ring-accent focus:border-accent"
                    >
                        <option value="lastModified">Sort by Last Modified</option>
                        <option value="createdAt">Sort by Created</option>
                        <option value="name">Sort by Name</option>
                    </select>
                    <button
                        onClick={handleExportWorkspace}
                        className="flex items-center gap-2 px-3 py-2 bg-white/10 text-white text-sm rounded-md hover:bg-white/20 transition-colors border border-white/10"
                        title="Export full workspace backup"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Export
                    </button>
                    <div className="relative">
                        <input type="file" ref={importFileRef} onChange={handleImportWorkspace} className="hidden" accept=".json,.plotmate.json" />
                        <button
                            onClick={() => importFileRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-2 bg-white/10 text-white text-sm rounded-md hover:bg-white/20 transition-colors border border-white/10"
                            title="Import workspace backup"
                        >
                            <CloudArrowUpIcon className="w-4 h-4" />
                            Import
                        </button>
                    </div>
                    <button
                        onClick={onNewProject}
                        className="flex items-center gap-2 px-4 py-2 bg-accent text-white font-bold rounded-md hover:bg-accent/90 transition-colors"
                    >
                        <PlusIcon />
                        New Project
                    </button>
                </div>
            </div>
            {importStatus && (
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-md text-sm text-blue-300 animate-pulse">
                    {importStatus}
                </div>
            )}
            {filteredAndSortedProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAndSortedProjects.map(project => {
                        const shotCount = Object.values(project.shots).flat().length;
                        const previewImage = getProjectPreview(project);
                        return (
                            <div key={project.id} className="bg-surface border border-white/10 rounded-lg flex flex-col group overflow-hidden">
                                <div className="aspect-video bg-canvas relative">
                                    {previewImage ? (
                                        <img src={previewImage} alt={`${project.settings.name} preview`} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/20">
                                            <FilmIcon className="w-12 h-12" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex flex-col flex-grow">
                                    <h3 className="font-bold text-lg truncate">{project.settings.name}</h3>
                                    <p className="text-sm text-white/60">{project.settings.projectType}</p>
                                    <div className="text-sm text-white/60 mt-2 space-y-1">
                                        <p>Shots: {shotCount}</p>
                                        <p>Modified: {new Date(project.lastModified).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center justify-between mt-auto pt-4">
                                        <button onClick={() => onOpenProject(project)} className="px-4 py-1.5 text-sm bg-white/10 rounded-md hover:bg-white/20 font-semibold">Open</button>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleDuplicateProject(project.id)} className="p-2 text-white/60 hover:text-white" title="Duplicate Project" aria-label="Duplicate Project"><DuplicateIcon/></button>
                                            <button onClick={() => handleDeleteProject(project.id)} className="p-2 text-white/60 hover:text-red-500" title="Delete Project" aria-label="Delete Project"><TrashIcon/></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-lg bg-surface/50">
                    <p className="text-white/60">
                        {searchTerm ? 'No projects match your search.' : 'Your projects will appear here. Click "New Project" to get started.'}
                    </p>
                </div>
            )}
        </div>
    );
};


const ProfileSettings: React.FC<{ onResetDiscovery: () => void }> = ({ onResetDiscovery }) => {
    const [geminiKey, setGeminiKey] = useState('');
    const [openaiKey, setOpenaiKey] = useState('');
    const [midjourneyKey, setMidjourneyKey] = useState('');
    const [useProModel, setUseProModel] = useState(false);
    const [imageProvider, setImageProvider] = useState<ImageProvider>('gemini');
    const [hfToken, setHfToken] = useState('');
    const [saveStatus, setSaveStatus] = useState('');
    const [onboardingResetStatus, setOnboardingResetStatus] = useState('');

    useEffect(() => {
        setGeminiKey(localStorage.getItem('gemini_api_key') || '');
        setOpenaiKey(localStorage.getItem('openai_api_key') || '');
        setMidjourneyKey(localStorage.getItem('midjourney_api_key') || '');
        setUseProModel(localStorage.getItem('use_pro_model') === 'true');
        setImageProvider((localStorage.getItem('image_provider') as ImageProvider) || 'gemini');
        setHfToken(localStorage.getItem('hf_token') || '');
    }, []);

    const handleSaveKey = () => {
        localStorage.setItem('gemini_api_key', geminiKey.trim());
        localStorage.setItem('openai_api_key', openaiKey.trim());
        localStorage.setItem('midjourney_api_key', midjourneyKey.trim());
        localStorage.setItem('use_pro_model', String(useProModel));
        localStorage.setItem('image_provider', imageProvider);
        localStorage.setItem('hf_token', hfToken.trim());

        // Sync settings to backend
        syncSettings();

        setSaveStatus('Settings saved successfully!');
        setTimeout(() => setSaveStatus(''), 2000);
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">API & Settings</h2>
            <div className="bg-surface border border-white/10 rounded-lg p-6 max-w-2xl space-y-6">
                {/* Context-aware setup banner */}
                {!localStorage.getItem('gemini_api_key') && imageProvider === 'gemini' && (
                    <div className="bg-orange-500/10 border border-orange-500/30 text-orange-300 p-3 rounded-lg text-sm">
                        <p><strong>Setup Required:</strong> To use the AI generation features, please enter your Gemini API key below — or switch to Z-Image Turbo (Free) for image generation without an API key.</p>
                    </div>
                )}
                {!localStorage.getItem('gemini_api_key') && imageProvider === 'zimage' && (
                    <div className="bg-blue-500/10 border border-blue-500/30 text-blue-300 p-3 rounded-lg text-sm">
                        <p><strong>Z-Image Mode Active:</strong> A free Hugging Face token is required. Add a Gemini API key to also unlock script analysis, actor photo matching, and more.</p>
                    </div>
                )}

                {/* Image Generation Provider Toggle */}
                <div className="space-y-3 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🎨</span>
                        <h3 className="text-lg font-bold">Image Generation Provider</h3>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-start gap-3 p-3 rounded-md cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setImageProvider('gemini')}>
                            <input type="radio" name="imageProvider" checked={imageProvider === 'gemini'} onChange={() => setImageProvider('gemini')} className="mt-1 text-accent focus:ring-accent" />
                            <div>
                                <span className="text-sm font-semibold">Google Gemini <span className="text-accent">(Recommended)</span></span>
                                <p className="text-xs text-white/60 mt-0.5">Best quality. Supports actor photo matching and location image references. Requires a Gemini API key.</p>
                            </div>
                        </label>
                        <label className="flex items-start gap-3 p-3 rounded-md cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setImageProvider('zimage')}>
                            <input type="radio" name="imageProvider" checked={imageProvider === 'zimage'} onChange={() => setImageProvider('zimage')} className="mt-1 text-accent focus:ring-accent" />
                            <div>
                                <span className="text-sm font-semibold">Z-Image Turbo <span className="text-green-400">(Free)</span></span>
                                <p className="text-xs text-white/60 mt-0.5">Requires a free Hugging Face token. Generates images from text descriptions only.</p>
                            </div>
                        </label>
                    </div>

                    {imageProvider === 'zimage' && (
                        <div className="mt-3 space-y-3">
                            <div className="bg-white/5 border border-white/10 rounded-md p-4 text-sm space-y-2">
                                {!hfToken.trim() && (
                                    <p className="text-orange-400 font-medium">⚠️ A free Hugging Face token is required to use Z-Image.</p>
                                )}
                                {hfToken.trim() && (
                                    <p className="text-green-400 font-medium">✅ Hugging Face token set — ready to generate!</p>
                                )}
                                <div>
                                    <p className="text-white/80 font-medium mb-1">Limitations:</p>
                                    <ul className="text-white/60 text-xs space-y-1 list-disc pl-4">
                                        <li>~10–30 images per hour (free tier rate limit)</li>
                                        <li>First image may take 30–60s (model loads on demand)</li>
                                        <li>Text-only — no actor photo matching</li>
                                        <li>Characters may look different between shots</li>
                                    </ul>
                                </div>
                                <div className="pt-2 border-t border-white/10">
                                    <p className="text-white/80 font-medium mb-1">🔑 How to get a free token:</p>
                                    <ol className="text-white/60 text-xs mt-1 space-y-0.5 list-decimal pl-4">
                                        <li>Go to <a href="https://huggingface.co/join" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">huggingface.co</a> &rarr; Sign up (free)</li>
                                        <li>Go to Settings &rarr; Access Tokens</li>
                                        <li>Create a token &rarr; paste it below</li>
                                    </ol>
                                </div>
                                <p className="text-white/50 text-xs pt-1">For best results with actor likeness, use Google Gemini with NanoBanana Pro.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-1">Hugging Face Token <span className="text-orange-400">(required)</span></label>
                                <input
                                    type="password"
                                    value={hfToken}
                                    onChange={(e) => setHfToken(e.target.value)}
                                    className={`w-full bg-canvas border rounded-md p-2 focus:ring-accent focus:border-accent ${!hfToken.trim() ? 'border-orange-500/50' : 'border-white/10'}`}
                                    placeholder="hf_..."
                                />
                                <p className="text-xs text-white/50 mt-1">Free token from huggingface.co — required for Z-Image generation.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Gemini Section */}
                <div className="space-y-3 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <SparklesIcon className="w-5 h-5 text-accent" />
                        <h3 className="text-lg font-bold">Google Gemini</h3>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">API Key</label>
                        <input 
                            type="password" 
                            value={geminiKey} 
                            onChange={(e) => setGeminiKey(e.target.value)} 
                            className="w-full bg-canvas border border-white/10 rounded-md p-2 focus:ring-accent focus:border-accent"
                            placeholder="AIza..."
                        />
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-white/60">Required for script analysis, actor photo analysis, and Gemini image generation.</p>
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Get Key &rarr;</a>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4 bg-white/5 p-3 rounded-md">
                        <input
                            type="checkbox"
                            id="proModel"
                            checked={useProModel}
                            onChange={(e) => setUseProModel(e.target.checked)}
                            className="w-4 h-4 rounded bg-canvas border-white/10 text-accent focus:ring-accent"
                        />
                        <div>
                            <label htmlFor="proModel" className="text-sm font-semibold block">Enable NanoBanana Pro (High Quality)</label>
                            <p className="text-xs text-white/60">Uses <code>gemini-3-pro-image-preview</code> for superior image fidelity. May have higher latency.</p>
                        </div>
                    </div>
                    <p className="text-xs text-white/40 mt-2">Free tier note: Script analysis on the free Gemini tier may have rate limits. Results may vary — we optimize all requests to minimize impact.</p>
                </div>

                {/* Other Providers Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white/80">Other Providers (Optional)</h3>
                    
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">OpenAI API Key (ChatGPT)</label>
                        <input 
                            type="password" 
                            value={openaiKey} 
                            onChange={(e) => setOpenaiKey(e.target.value)} 
                            className="w-full bg-canvas border border-white/10 rounded-md p-2 focus:ring-accent focus:border-accent"
                            placeholder="sk-..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">Midjourney API Key</label>
                        <input 
                            type="password" 
                            value={midjourneyKey} 
                            onChange={(e) => setMidjourneyKey(e.target.value)} 
                            className="w-full bg-canvas border border-white/10 rounded-md p-2 focus:ring-accent focus:border-accent"
                            placeholder="Enter your key"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-4">
                    <button onClick={handleSaveKey} className="px-6 py-2 bg-accent text-white font-bold rounded-md hover:bg-accent/90 transition-colors">Save Settings</button>
                    {saveStatus && <p className="text-sm text-green-400 animate-pulse">{saveStatus}</p>}
                </div>

                {/* Onboarding Reset */}
                <div className="space-y-3 pt-6 border-t border-white/10">
                    <h3 className="text-lg font-bold text-white/80">Onboarding Tour</h3>
                    <p className="text-sm text-white/60">Re-watch the introductory tour that explains the key features of the app.</p>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                localStorage.removeItem('shotdeck_onboarding_completed');
                                onResetDiscovery();
                                setOnboardingResetStatus('Onboarding & all feature hints will reset on next page load. Refresh to see them now.');
                                setTimeout(() => setOnboardingResetStatus(''), 4000);
                            }}
                            className="px-4 py-2 text-sm bg-white/10 text-white rounded-md hover:bg-white/20 transition-colors"
                            data-testid="reset-onboarding-btn"
                        >
                            Show Onboarding Again
                        </button>
                        {onboardingResetStatus && <p className="text-sm text-green-400 animate-pulse">{onboardingResetStatus}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
