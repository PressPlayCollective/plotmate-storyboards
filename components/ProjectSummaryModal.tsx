import React from 'react';
import type { ProjectSettings, Scene } from '../types';

interface ProjectSummaryModalProps {
  settings: ProjectSettings;
  scenes: Scene[];
  onClose: () => void;
}

const SummaryItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="text-sm text-white/60">{label}</p>
    <p className="text-md text-white font-semibold">{value}</p>
  </div>
);

const ProjectSummaryModal: React.FC<ProjectSummaryModalProps> = ({ settings, scenes, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface border border-white/10 rounded-lg shadow-2xl w-full max-w-2xl text-white" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">Project Summary</h2>
          <p className="text-white/60">{settings.projectType}</p>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto">
          <SummaryItem label="Aspect Ratio" value={settings.primaryAspectRatio} />
          <SummaryItem label="Camera Body" value={settings.cameraBody} />
          <SummaryItem label="Sensor Mode" value={settings.sensorMode} />
          <SummaryItem label="Lens Type" value={settings.lensType} />
          <SummaryItem label="Lens Kit (mm)" value={settings.lensKit.join(', ')} />
          <SummaryItem label="Total Scenes" value={scenes.length} />
          <SummaryItem label="Actors" value={settings.actors.length > 0 ? settings.actors.map(a => a.name).join(', ') : 'None'} />
           <SummaryItem label="Props" value={settings.props.length > 0 ? settings.props.map(p => p.name).join(', ') : 'None'} />
        </div>
        <div className="p-4 flex justify-end border-t border-white/10 bg-canvas rounded-b-lg">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-accent text-white font-bold rounded-md hover:bg-accent/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectSummaryModal;
