import React, { useState, useRef, useEffect } from 'react';
import type { SceneSnapshot } from '../../types';

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  return new Date(timestamp).toLocaleDateString();
}

export interface SnapshotPanelProps {
  snapshots: SceneSnapshot[];
  onSave: (name: string) => void;
  onRestore: (snapshotId: string) => void;
  onDelete: (snapshotId: string) => void;
  onRename: (snapshotId: string, name: string) => void;
}

const SnapshotPanel: React.FC<SnapshotPanelProps> = ({
  snapshots,
  onSave,
  onRestore,
  onDelete,
  onRename,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSaving && inputRef.current) inputRef.current.focus();
  }, [isSaving]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleSaveClick = () => {
    setIsSaving(true);
    setNewName('');
  };

  const handleSaveSubmit = () => {
    const name = newName.trim();
    if (name) {
      onSave(name);
      setNewName('');
      setIsSaving(false);
    }
  };

  const handleSaveKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveSubmit();
    if (e.key === 'Escape') {
      setIsSaving(false);
      setNewName('');
    }
  };

  const startRename = (snapshot: SceneSnapshot) => {
    setEditingId(snapshot.id);
    setEditingName(snapshot.name);
  };

  const commitRename = () => {
    if (editingId != null) {
      const name = editingName.trim();
      if (name) onRename(editingId, name);
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') {
      setEditingId(null);
      setEditingName('');
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all group relative"
        title="Snapshots"
        aria-label="Snapshots"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0Z" />
        </svg>
        <span className="absolute left-full ml-2 px-2 py-1 text-[10px] font-medium bg-[#1E1E1E] text-white/80 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg border border-white/10">Snapshots</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-black/80 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Snapshots</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-2 space-y-1">
            {isSaving ? (
              <div className="flex items-center gap-2 px-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={handleSaveKeyDown}
                  onBlur={handleSaveSubmit}
                  placeholder="Snapshot name"
                  className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-white/[0.08] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-accent/50"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSaveClick}
                className="w-full px-3 py-1.5 text-xs text-accent hover:bg-accent/10 rounded-lg text-left font-medium"
              >
                Save Current
              </button>
            )}

            <div className="max-h-48 overflow-y-auto">
              {snapshots.length === 0 ? (
                <p className="px-3 py-4 text-[10px] text-white/40 text-center">No snapshots saved</p>
              ) : (
                snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className="px-3 py-1.5 flex items-center gap-2 hover:bg-white/[0.06] group"
                  >
                    {editingId === snapshot.id ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={handleRenameKeyDown}
                        onBlur={commitRename}
                        className="flex-grow min-w-0 px-1.5 py-0.5 text-xs bg-white/[0.08] border border-white/10 rounded text-white focus:outline-none focus:ring-1 focus:ring-accent/50"
                      />
                    ) : (
                      <>
                        <span
                          className="text-xs text-white/80 flex-grow truncate"
                          onDoubleClick={() => startRename(snapshot)}
                          title="Double-click to rename"
                        >
                          {snapshot.name}
                        </span>
                        <span className="text-[10px] text-white/30 shrink-0">
                          {formatRelativeTime(snapshot.timestamp)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRestore(snapshot.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-white/60 hover:text-accent"
                          title="Restore"
                          aria-label="Restore"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(snapshot.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-white/50 hover:text-red-400"
                          title="Delete"
                          aria-label="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SnapshotPanel;
