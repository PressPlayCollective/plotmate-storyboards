
import React, { useState, useRef } from 'react';
import { zip } from 'fflate';
import { FilmIcon, Squares2x2Icon, ListBulletIcon, PresentationChartBarIcon, ArrowDownTrayIcon, ShareIcon, CloudArrowUpIcon } from './icons';
import type { Shot, Scene, ProjectSettings } from '../types';
import PrintableStoryboard, { StoryboardTemplate } from './PrintableStoryboard';
import { exportBackup, importBackup } from '../services/syncService';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    shots: Shot[];
    scene: Scene;
    projectSettings: ProjectSettings;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, shots, scene, projectSettings }) => {
    const [activeTab, setActiveTab] = useState<'pdf' | 'images' | 'share' | 'backup'>('pdf');
    const [pdfTemplate, setPdfTemplate] = useState<StoryboardTemplate>('client_grid');
    const [imageFormat, setImageFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
    const [isExporting, setIsExporting] = useState(false);
    const [backupStatus, setBackupStatus] = useState('');
    const backupImportRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFullBackupExport = async () => {
        setIsExporting(true);
        setBackupStatus('Creating backup...');
        try {
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
                setBackupStatus('Backup exported successfully!');
            } else {
                setBackupStatus('Export failed. Is the backend server running?');
            }
        } catch {
            setBackupStatus('Export failed.');
        }
        setIsExporting(false);
        setTimeout(() => setBackupStatus(''), 3000);
    };

    const handleFullBackupImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsExporting(true);
        setBackupStatus('Importing backup...');
        try {
            const data = await importBackup(file);
            if (data) {
                setBackupStatus('Import successful! Reload the page to see all changes.');
            } else {
                setBackupStatus('Import failed. Is the backend server running?');
            }
        } catch {
            setBackupStatus('Import failed.');
        }
        setIsExporting(false);
        if (backupImportRef.current) backupImportRef.current.value = '';
        setTimeout(() => setBackupStatus(''), 5000);
    };

    const handlePdfExport = () => {
        setIsExporting(true);
        setTimeout(() => {
            const printableContent = PrintableStoryboard({
                shots,
                scene,
                projectSettings,
                template: pdfTemplate
            });
            const newWindow = window.open();
            if (newWindow) {
                newWindow.document.write(printableContent);
                newWindow.document.close();
                const images = newWindow.document.querySelectorAll('img');
                const imagePromises = Array.from(images).map(img =>
                    img.complete ? Promise.resolve() : new Promise<void>(resolve => {
                        img.onload = () => resolve();
                        img.onerror = () => resolve();
                    })
                );
                Promise.all(imagePromises).then(() => {
                    setTimeout(() => {
                        newWindow.print();
                        setIsExporting(false);
                    }, 200);
                }).catch(() => {
                    setIsExporting(false);
                });
            } else {
                alert("Popup blocked. Please allow popups for this site.");
                setIsExporting(false);
            }
        }, 100);
    };

    // Convert a base64 data URI to the chosen image format via Canvas
    const convertImage = (dataUrl: string, format: 'jpeg' | 'png' | 'webp', quality: number = 0.92): Promise<Uint8Array> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas not supported'));
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(
                    (blob) => {
                        if (!blob) return reject(new Error('Conversion failed'));
                        blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
                    },
                    `image/${format}`,
                    quality
                );
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
    };

    const handleZipExport = async () => {
        setIsExporting(true);
        const filesToZip: Record<string, Uint8Array> = {};
        const ext = imageFormat === 'jpeg' ? 'jpg' : imageFormat;

        try {
            for (const shot of shots) {
                if (shot.generatedImage) {
                    // Pad numbers with leading zeros (e.g., Shot_01)
                    const paddedNum = shot.shotNumber.toString().padStart(2, '0');
                    const fileName = `${scene.slugline.replace(/[^a-z0-9]/gi, '_')}_Shot_${paddedNum}.${ext}`;
                    filesToZip[fileName] = await convertImage(shot.generatedImage, imageFormat);
                }
            }

            if (Object.keys(filesToZip).length === 0) {
                alert("No generated images found to export.");
                setIsExporting(false);
                return;
            }

            zip(filesToZip, (err, data) => {
                if (err) {
                    console.error(err);
                    alert("Failed to create zip file.");
                } else {
                    const blob = new Blob([data], { type: 'application/zip' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${projectSettings.name}_${scene.slugline}_${ext.toUpperCase()}_Assets.zip`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
                setIsExporting(false);
            });
        } catch (e) {
            console.error(e);
            alert("An error occurred during export.");
            setIsExporting(false);
        }
    };

    // Escape HTML entities to prevent XSS in exported HTML files
    const escapeHtml = (str: string): string => {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const handlePortableExport = () => {
        setIsExporting(true);
        // Create a minimal HTML viewer embedded with data
        const safeName = escapeHtml(projectSettings.name);
        const safeSlugline = escapeHtml(scene.slugline);
        const viewerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Viewer: ${safeName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body { background-color: #0E0E0E; color: white; font-family: sans-serif; }</style>
</head>
<body>
    <div class="max-w-6xl mx-auto p-6">
        <header class="mb-8 border-b border-white/20 pb-4">
            <h1 class="text-3xl font-bold text-accent">${safeName}</h1>
            <p class="text-xl text-white/70">${scene.sceneNumber}. ${safeSlugline}</p>
        </header>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${shots.map(shot => {
                const safeDesc = escapeHtml(shot.description || '');
                const safeLens = escapeHtml(shot.technicalData?.lens || 'N/A');
                return `
                <div class="bg-surface rounded-lg overflow-hidden border border-white/10">
                    <div class="relative aspect-video bg-black">
                         ${shot.generatedImage ? `<img src="${shot.generatedImage}" class="w-full h-full object-contain" />` : '<div class="w-full h-full flex items-center justify-center text-white/30">No Image</div>'}
                    </div>
                    <div class="p-4">
                        <div class="flex justify-between items-baseline mb-2">
                             <h2 class="font-bold text-lg">Shot ${shot.shotNumber}</h2>
                             <span class="text-xs font-mono bg-[#333] px-2 py-1 rounded">${safeLens}</span>
                        </div>
                        <p class="text-sm text-white/80">${safeDesc}</p>
                    </div>
                </div>
            `}).join('')}
        </div>
        <footer class="mt-12 text-center text-white/60 text-sm">
            <p>Generated by PLOTMATE STORYBOARDS</p>
        </footer>
    </div>
</body>
</html>
        `;

        const blob = new Blob([viewerHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectSettings.name}_Viewer.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExporting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl text-white overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-canvas">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <ArrowDownTrayIcon className="w-5 h-5 text-accent"/> Export & Share
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="flex border-b border-white/10 bg-canvas">
                    <button onClick={() => setActiveTab('pdf')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pdf' ? 'border-accent text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}>PDF Document</button>
                    <button onClick={() => setActiveTab('images')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'images' ? 'border-accent text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}>Image Assets</button>
                    <button onClick={() => setActiveTab('share')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'share' ? 'border-accent text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}>Share Project</button>
                    <button onClick={() => setActiveTab('backup')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'backup' ? 'border-accent text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}>Full Backup</button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {activeTab === 'pdf' && (
                        <div className="space-y-6">
                            <p className="text-sm text-white/60">Select a template for your PDF export. This will open the system print dialog.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button 
                                    onClick={() => setPdfTemplate('client_grid')}
                                    className={`p-4 rounded-lg border-2 text-left transition-all ${pdfTemplate === 'client_grid' ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-white/30 bg-[#222]'}`}
                                >
                                    <Squares2x2Icon className="w-8 h-8 mb-3 text-white/80" />
                                    <h3 className="font-bold text-sm">Client Storyboard</h3>
                                    <p className="text-xs text-white/50 mt-1">Grid layout. Large visuals, clean design, minimal technical data.</p>
                                </button>

                                <button 
                                    onClick={() => setPdfTemplate('production_list')}
                                    className={`p-4 rounded-lg border-2 text-left transition-all ${pdfTemplate === 'production_list' ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-white/30 bg-[#222]'}`}
                                >
                                    <ListBulletIcon className="w-8 h-8 mb-3 text-white/80" />
                                    <h3 className="font-bold text-sm">Production Shot List</h3>
                                    <p className="text-xs text-white/50 mt-1">Row layout. Detailed technical specs (lens, lighting) for crew.</p>
                                </button>

                                <button 
                                    onClick={() => setPdfTemplate('presentation_slides')}
                                    className={`p-4 rounded-lg border-2 text-left transition-all ${pdfTemplate === 'presentation_slides' ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-white/30 bg-[#222]'}`}
                                >
                                    <PresentationChartBarIcon className="w-8 h-8 mb-3 text-white/80" />
                                    <h3 className="font-bold text-sm">Presentation Deck</h3>
                                    <p className="text-xs text-white/50 mt-1">Landscape slides. One shot per page. High impact for pitches.</p>
                                </button>
                            </div>
                            
                            <button onClick={handlePdfExport} disabled={isExporting} className="w-full py-3 bg-accent hover:bg-accent/90 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                                {isExporting ? 'Generating...' : 'Print / Save as PDF'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'images' && (
                        <div className="space-y-6 py-4">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                                    <FilmIcon className="w-8 h-8 text-white/80" />
                                </div>
                                <div className="mt-4">
                                    <h3 className="text-lg font-bold">Export Image Sequence</h3>
                                    <p className="text-sm text-white/60 mt-2 max-w-sm mx-auto">Download a ZIP archive containing all generated frames. Choose your preferred image format below.</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-white/60 uppercase tracking-wider font-medium mb-3 text-center">Image Format</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setImageFormat('jpeg')}
                                        className={`p-3 rounded-lg border-2 text-left transition-all ${imageFormat === 'jpeg' ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-white/30 bg-[#222]'}`}
                                    >
                                        <h4 className="font-bold text-sm">JPEG</h4>
                                        <p className="text-xs text-white/50 mt-1">Smaller file size</p>
                                    </button>
                                    <button
                                        onClick={() => setImageFormat('png')}
                                        className={`p-3 rounded-lg border-2 text-left transition-all ${imageFormat === 'png' ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-white/30 bg-[#222]'}`}
                                    >
                                        <h4 className="font-bold text-sm">PNG</h4>
                                        <p className="text-xs text-white/50 mt-1">Lossless quality</p>
                                    </button>
                                    <button
                                        onClick={() => setImageFormat('webp')}
                                        className={`p-3 rounded-lg border-2 text-left transition-all ${imageFormat === 'webp' ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-white/30 bg-[#222]'}`}
                                    >
                                        <h4 className="font-bold text-sm">WebP</h4>
                                        <p className="text-xs text-white/50 mt-1">Modern, best balance</p>
                                    </button>
                                </div>
                            </div>

                            <button onClick={handleZipExport} disabled={isExporting} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors border border-white/10">
                                {isExporting ? 'Converting & Zipping...' : `Download .ZIP Archive (.${imageFormat === 'jpeg' ? 'jpg' : imageFormat})`}
                            </button>
                        </div>
                    )}

                    {activeTab === 'share' && (
                        <div className="space-y-6">
                             <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg flex gap-3 items-start">
                                <ShareIcon className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-blue-100 text-sm">Offline Sharing</h4>
                                    <p className="text-xs text-blue-200/70 mt-1">Since PLOTMATE is a local-first privacy app, we don't host your data on servers. To share this storyboard, we generate a <strong>Portable Viewer File</strong>.</p>
                                </div>
                            </div>

                            <div className="bg-[#222] p-4 rounded-lg border border-white/10">
                                <h3 className="font-bold text-sm mb-2">How it works:</h3>
                                <ol className="list-decimal list-inside text-sm text-white/60 space-y-2">
                                    <li>Click "Export Portable Viewer" below.</li>
                                    <li>You will download a single <code>.html</code> file.</li>
                                    <li>Email or send this file to your client or crew.</li>
                                    <li>They can open it in any browser to view the storyboard (no account needed).</li>
                                </ol>
                            </div>
                            
                            <button onClick={handlePortableExport} disabled={isExporting} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors border border-white/10">
                                {isExporting ? 'Packaging...' : 'Export Portable Viewer (.html)'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'backup' && (
                        <div className="space-y-6">
                            <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg flex gap-3 items-start">
                                <ArrowDownTrayIcon className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-green-100 text-sm">Full Workspace Backup</h4>
                                    <p className="text-xs text-green-200/70 mt-1">Export or import your entire workspace including <strong>all projects</strong>, <strong>media library</strong>, and <strong>settings</strong>. Images are embedded for portability. Use this to transfer your work to another machine or restore from a backup.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-[#222] p-4 rounded-lg border border-white/10 space-y-3">
                                    <h3 className="font-bold text-sm">Export Backup</h3>
                                    <p className="text-xs text-white/60">Downloads a <code>.plotmate.json</code> file with all your data. API keys are excluded for security.</p>
                                    <button 
                                        onClick={handleFullBackupExport} 
                                        disabled={isExporting} 
                                        className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                                    >
                                        <ArrowDownTrayIcon className="w-4 h-4" />
                                        {isExporting ? 'Exporting...' : 'Export Full Backup'}
                                    </button>
                                </div>

                                <div className="bg-[#222] p-4 rounded-lg border border-white/10 space-y-3">
                                    <h3 className="font-bold text-sm">Import Backup</h3>
                                    <p className="text-xs text-white/60">Restore from a <code>.plotmate.json</code> backup file. Existing API keys are preserved.</p>
                                    <input type="file" ref={backupImportRef} onChange={handleFullBackupImport} className="hidden" accept=".json,.plotmate.json" />
                                    <button 
                                        onClick={() => backupImportRef.current?.click()} 
                                        disabled={isExporting} 
                                        className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors border border-white/10 flex items-center justify-center gap-2 text-sm"
                                    >
                                        <CloudArrowUpIcon className="w-4 h-4" />
                                        {isExporting ? 'Importing...' : 'Import Backup File'}
                                    </button>
                                </div>
                            </div>

                            {backupStatus && (
                                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-md text-sm text-blue-300 text-center animate-pulse">
                                    {backupStatus}
                                </div>
                            )}

                            <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg text-xs text-yellow-200/70">
                                <strong>Note:</strong> The backend server must be running for backup operations. Start it with <code>npm run server</code> or use <code>npm run dev:all</code> to run both frontend and backend together.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
