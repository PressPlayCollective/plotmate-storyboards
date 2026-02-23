import React, { useRef, useState, useEffect } from 'react';
import type { Shot } from '../types';
import { PlusIcon, XIcon, TrashIcon } from './icons';
import FeatureHint from './FeatureHint';
import HintButton from './HintButton';
import { useFeatureDiscovery } from '../utils/useFeatureDiscovery';

interface ShotGalleryProps {
  shots: Shot[];
  onReorder: (newShots: Shot[]) => void;
  onBack: () => void;
  onAddShot: () => void;
  onUpdateShot: (shot: Shot) => void;
  onDeleteShot: (shotId: string) => void;
  onUpload: (file: File) => void;
}

const FrameCard: React.FC<{
    shot: Shot;
    onUpdate: (shot: Shot) => void;
    onDeleteImage: () => void;
    onDeleteShot: () => void;
}> = ({ shot, onUpdate, onDeleteImage, onDeleteShot }) => {
    
    const handleTextChange = (field: 'description' | 'notes' | 'audioDescription', value: string) => {
        onUpdate({ ...shot, [field]: value });
    };
    
    const TextAreaField: React.FC<{label: string, value: string, onClear: () => void, onChange: (val: string) => void}> = ({ label, value, onClear, onChange }) => (
        <div className="relative">
            <label className="text-xs text-white/60">{label}</label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={3}
                className="w-full bg-canvas border border-white/10 rounded-md p-2 mt-1 text-sm resize-none focus:ring-1 focus:ring-accent"
            />
            {value && (
                <button onClick={onClear} className="absolute top-6 right-1 p-1 text-white/60 hover:text-white">
                    <XIcon className="w-4 h-4" />
                </button>
            )}
        </div>
    );

    return (
        <div className="bg-surface border border-white/10 rounded-lg flex flex-col group transition-all">
            <div className="flex items-center justify-between p-3 border-b border-white/10">
                <h3 className="font-semibold text-sm">Frame: {shot.shotNumber}</h3>
                <button onClick={onDeleteShot} className="p-1 text-white/60 hover:text-red-500" title="Delete Frame" aria-label="Delete Frame"><TrashIcon className="w-5 h-5" /></button>
            </div>
            <div className="relative aspect-video bg-canvas">
                {shot.generatedImage ? (
                    <>
                        <img src={shot.generatedImage} alt={`Shot ${shot.shotNumber}`} className="w-full h-full object-cover" />
                        <button onClick={onDeleteImage} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white/80 hover:text-white hover:bg-black/70" title="Delete Image" aria-label="Delete Image">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/60 p-4 text-center">
                        <PlusIcon className="w-8 h-8 mb-2" />
                        <p className="text-sm">Upload Image</p>
                    </div>
                )}
            </div>
            {/* Shot description summary */}
            {(shot.description || shot.parameters?.shotSize) && (
                <div className="px-3 py-2 border-b border-white/5 bg-canvas/50">
                    {shot.description && (
                        <p className="text-sm text-white/60 line-clamp-2 leading-relaxed">{shot.description}</p>
                    )}
                    {shot.parameters?.shotSize && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
                            <span>{shot.parameters.shotSize}</span>
                            {shot.parameters.focalLength && <><span className="text-white/50">|</span><span>{shot.parameters.focalLength}mm</span></>}
                            {shot.parameters.composition && <><span className="text-white/50">|</span><span>{shot.parameters.composition}</span></>}
                        </div>
                    )}
                </div>
            )}
            <div className="p-3 space-y-3">
                <TextAreaField
                    label="Action description"
                    value={shot.description || ''}
                    onChange={(val) => handleTextChange('description', val)}
                    onClear={() => handleTextChange('description', '')}
                />
                <TextAreaField
                    label="Notes"
                    value={shot.notes || ''} 
                    onChange={(val) => handleTextChange('notes', val)}
                    onClear={() => handleTextChange('notes', '')}
                />
                 <TextAreaField
                    label="Audio Description"
                    value={shot.audioDescription || ''}
                    onChange={(val) => handleTextChange('audioDescription', val)}
                    onClear={() => handleTextChange('audioDescription', '')}
                />
            </div>
        </div>
    );
};

const AddFrameCard: React.FC<{ onAdd: () => void; onUpload: (file: File) => void }> = ({ onAdd, onUpload }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onUpload(file);
        }
    };
    
    return (
        <div
            className="bg-surface border border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center p-6 text-center text-white/60 cursor-pointer hover:border-accent hover:text-accent transition-colors min-h-[450px]">
            <button onClick={onAdd} className="w-full h-full flex flex-col items-center justify-center">
                <PlusIcon className="w-12 h-12" />
                <p className="mt-4 text-lg font-semibold">Add Frame</p>
            </button>
            <div className="flex items-center gap-2 my-2 w-full">
                <div className="flex-grow h-px bg-white/10"></div>
                <span className="text-xs">or</span>
                <div className="flex-grow h-px bg-white/10"></div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="text-sm underline">upload image</button>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />
        </div>
    );
};


const ShotGallery: React.FC<ShotGalleryProps> = ({ shots, onReorder, onBack, onAddShot, onUpdateShot, onDeleteShot, onUpload }) => {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const discovery = useFeatureDiscovery();
  const [showGalleryHint, setShowGalleryHint] = useState(false);

  useEffect(() => {
    if (discovery.isNew('shot_gallery')) {
      setShowGalleryHint(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
        dragItem.current = null;
        dragOverItem.current = null;
        return;
    }
    
    const reorderedShots = [...shots];
    const dragItemContent = reorderedShots.splice(dragItem.current, 1)[0];
    reorderedShots.splice(dragOverItem.current, 0, dragItemContent);
    
    const renumberedShots = reorderedShots.map((shot, index) => ({
        ...shot,
        shotNumber: index + 1,
    }));

    dragItem.current = null;
    dragOverItem.current = null;
    onReorder(renumberedShots);
  };
  
  const handleDeleteImage = (shotId: string) => {
      const shot = shots.find(s => s.id === shotId);
      if (shot) {
          onUpdateShot({ ...shot, generatedImage: null });
      }
  };

  return (
    <div className="h-full w-full flex flex-col p-4 font-sans text-white">
        <div className="sticky top-0 z-10 bg-canvas flex justify-between items-center pb-4 border-b border-white/10 mb-4">
             <h2 className="text-xl font-bold">Shot Gallery</h2>
             <div className="flex items-center gap-3">
               <HintButton onClick={() => setShowGalleryHint(true)} />
               <button onClick={onBack} className="text-sm text-white/60 hover:text-white">&larr; Back to Shot Builder</button>
             </div>
        </div>
       <div className="flex-grow overflow-y-auto">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {shots.map((shot, index) => (
                <div
                  key={shot.id}
                  draggable
                  onDragStart={() => (dragItem.current = index)}
                  onDragEnter={() => (dragOverItem.current = index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="cursor-grab"
                >
                  <FrameCard
                    shot={shot}
                    onUpdate={onUpdateShot}
                    onDeleteImage={() => handleDeleteImage(shot.id)}
                    onDeleteShot={() => onDeleteShot(shot.id)}
                  />
                </div>
              ))}
              <AddFrameCard onAdd={onAddShot} onUpload={onUpload} />
         </div>
      </div>
      <footer className="flex-shrink-0 text-center text-xs text-white/60 pt-4 space-y-1">
          <p>To pick up a draggable item, press the space bar.</p>
          <p>Use arrow keys to move the item.</p>
          <p>Press space again to drop.</p>
          <p>Press escape to cancel.</p>
      </footer>
      <FeatureHint featureId="shot_gallery" visible={showGalleryHint} onDismiss={() => { setShowGalleryHint(false); discovery.markSeen('shot_gallery'); }} />
    </div>
  );
};

export default ShotGallery;