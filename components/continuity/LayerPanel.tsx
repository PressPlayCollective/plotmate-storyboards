'use client';

import { useState } from 'react';
import type { CanvasLayer } from '../../types';

export interface LayerPanelProps {
  layers: CanvasLayer[];
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onAddLayer: (name: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onRenameLayer: (layerId: string, name: string) => void;
}

const EyeOpenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
    <line x1="4" y1="4" x2="20" y2="20" />
  </svg>
);

const LockOpenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0" />
  </svg>
);

const LockClosedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export default function LayerPanel({
  layers,
  onToggleVisibility,
  onToggleLock,
  onAddLayer,
  onDeleteLayer,
  onRenameLayer,
}: LayerPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleAddLayer = () => {
    const name = window.prompt('Layer name', 'New Layer')?.trim() || 'New Layer';
    onAddLayer(name);
  };

  return (
    <div className="bg-black/60 backdrop-blur-md border border-white/[0.08] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsCollapsed((c) => !c)}
        className="w-full px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/[0.04]"
      >
        <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
          Layers
        </span>
        <span
          className={`text-white/50 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
          aria-hidden
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {!isCollapsed && (
        <>
          <div className="max-h-64 overflow-y-auto">
            {layers.map((layer) => (
              <div
                key={layer.id}
                className={`group/layer h-7 px-3 py-1 flex items-center gap-2 text-xs text-white/80 hover:bg-white/[0.06] ${
                  layer.locked ? 'opacity-90' : ''
                } ${!layer.visible ? 'opacity-40' : ''}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: layer.color }}
                />
                <span className="flex-1 min-w-0 truncate">{layer.name}</span>
                <button
                  type="button"
                  onClick={() => onToggleVisibility(layer.id)}
                  className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white/70 shrink-0"
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                >
                  {layer.visible ? <EyeOpenIcon /> : <EyeClosedIcon />}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleLock(layer.id)}
                  className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white/70 shrink-0"
                  title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                >
                  {layer.locked ? <LockClosedIcon /> : <LockOpenIcon />}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteLayer(layer.id)}
                  className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-red-400 shrink-0 opacity-0 group-hover/layer:opacity-100 transition-opacity"
                  title="Delete layer"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.08] px-3 py-2">
            <button
              type="button"
              onClick={handleAddLayer}
              className="w-full py-1.5 text-xs text-white/60 hover:text-white/80 hover:bg-white/[0.04] rounded transition-colors"
            >
              Add Layer
            </button>
          </div>
        </>
      )}
    </div>
  );
}
