
import React, { useState } from 'react';
import type { ProjectSettings } from '../types';
import * as C from '../constants';

interface ProjectSetupWizardProps {
  onProjectCreate: (settings: Omit<ProjectSettings, 'id'>, action?: 'upload') => void;
  onCancel: () => void;
}

const ProjectSetupWizard: React.FC<ProjectSetupWizardProps> = ({ onProjectCreate, onCancel }) => {
  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState<Omit<ProjectSettings, 'id'>>({
    name: '',
    projectType: C.PROJECT_TYPES[0],
    primaryAspectRatio: C.ASPECT_RATIOS[0],
    secondaryAspectRatios: [],
    cameraBody: C.CAMERA_BODIES[0],
    sensorMode: C.SENSOR_MODES[0],
    frameRates: [24],
    lensKit: [...C.LENS_FOCAL_LENGTHS],
    lensType: C.LENS_TYPES[0],
    support: [],
    actors: [],
    props: [],
    locations: [],
  });
  
  const handleMultiSelect = <T,>(field: keyof Omit<ProjectSettings, 'id'>, value: T) => {
    const currentValues = settings[field] as T[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    setSettings({ ...settings, [field]: newValues });
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1 settings={settings} setSettings={setSettings} />;
      case 2:
        return <Step2 settings={settings} setSettings={setSettings} handleMultiSelect={handleMultiSelect} />;
      case 3:
        return <Step3 settings={settings} onProjectCreate={onProjectCreate} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas/50 p-4">
      <div className="bg-canvas border border-white/10 rounded-lg shadow-2xl w-full max-w-2xl text-white">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-bold text-white">New Project Setup</h1>
          <p className="text-white/60">Step {step} of 3</p>
        </div>
        <div className="p-6">{renderStep()}</div>
        <div className="p-6 flex justify-between border-t border-white/10 bg-surface rounded-b-lg">
          <button
            onClick={() => {
                if (step > 1) {
                    setStep(s => s - 1);
                } else {
                    onCancel();
                }
            }}
            className="px-6 py-2 bg-white/10 rounded-md hover:bg-white/20 transition-colors"
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !settings.name.trim()}
              className="px-6 py-2 bg-white/10 rounded-md hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              Next
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// Sub-components for each step to keep the main component clean

const Step1 = ({ settings, setSettings }: { settings: Omit<ProjectSettings, 'id'>, setSettings: React.Dispatch<React.SetStateAction<Omit<ProjectSettings, 'id'>>> }) => (
  <div className="space-y-6">
    <InputField label="Project Name" type="text" value={settings.name} onChange={(v) => setSettings({ ...settings, name: v })} />
    <SelectField label="Project Type" options={C.PROJECT_TYPES} value={settings.projectType} onChange={(v) => setSettings({ ...settings, projectType: v })} />
    <SelectField label="Primary Aspect Ratio" options={C.ASPECT_RATIOS} value={settings.primaryAspectRatio} onChange={(v) => setSettings({ ...settings, primaryAspectRatio: v })} />
  </div>
);

const Step2 = ({ settings, setSettings, handleMultiSelect }: { settings: Omit<ProjectSettings, 'id'>, setSettings: React.Dispatch<React.SetStateAction<Omit<ProjectSettings, 'id'>>>, handleMultiSelect: (field: keyof Omit<ProjectSettings, 'id'>, value: any) => void }) => {
    const allSupportSelected = settings.support.length === C.SUPPORT_GEAR.length;
    const handleToggleAllSupport = () => {
        setSettings({ ...settings, support: allSupportSelected ? [] : [...C.SUPPORT_GEAR] });
    };

    return (
        <div className="space-y-6">
            <SelectField label="Camera Body" options={C.CAMERA_BODIES} value={settings.cameraBody} onChange={(v) => setSettings({ ...settings, cameraBody: v })} />
            <SelectField label="Sensor Mode" options={C.SENSOR_MODES} value={settings.sensorMode} onChange={(v) => setSettings({ ...settings, sensorMode: v })} />
            <SelectField label="Lens Type" options={C.LENS_TYPES} value={settings.lensType} onChange={(v) => setSettings({ ...settings, lensType: v })} />
            <MultiSelectGrid 
                label="Available Support" 
                options={C.SUPPORT_GEAR} 
                selected={settings.support} 
                onSelect={(v) => handleMultiSelect('support', v)}
                onSelectAll={handleToggleAllSupport}
                allSelected={allSupportSelected}
            />
        </div>
    );
};

const Step3 = ({ settings, onProjectCreate }: { settings: Omit<ProjectSettings, 'id'>, onProjectCreate: (settings: Omit<ProjectSettings, 'id'>, action?: 'upload') => void }) => (
    <div className="space-y-4 text-center">
        <h2 className="text-xl font-bold">How would you like to start?</h2>
        <p className="text-white/60">You can either upload a script for automatic scene breakdown, or start creating scenes manually.</p>
        <div className="flex gap-4 pt-4">
            <button
                onClick={() => onProjectCreate(settings, 'upload')}
                className="flex-1 p-6 bg-white/5 border border-white/10 rounded-lg hover:border-accent hover:bg-accent/10 transition-colors"
            >
                <h3 className="font-bold">Upload Script</h3>
                <p className="text-sm text-white/60">AI-powered scene extraction.</p>
            </button>
            <button
                onClick={() => onProjectCreate(settings)}
                className="flex-1 p-6 bg-white/5 border border-white/10 rounded-lg hover:border-accent hover:bg-accent/10 transition-colors"
            >
                <h3 className="font-bold">Create Scenes Manually</h3>
                <p className="text-sm text-white/60">Build your project from scratch.</p>
            </button>
        </div>
    </div>
);


// Helper UI components for the wizard form
const InputField = ({ label, type, value, onChange }: { label: string, type: string, value: any, onChange: (value: any) => void }) => (
  <div>
    <label className="block text-sm font-medium text-white/80 mb-1">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-canvas border border-white/10 rounded-md p-2 focus:ring-accent focus:border-accent" />
  </div>
);

const SelectField = ({ label, options, value, onChange }: { label: string, options: readonly string[], value: string, onChange: (value: string) => void }) => (
  <div>
    <label className="block text-sm font-medium text-white/80 mb-1">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-canvas border border-white/10 rounded-md p-2 focus:ring-accent focus:border-accent">
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const MultiSelectGrid = ({ label, options, selected, onSelect, onSelectAll, allSelected }: { label: string, options: readonly (string|number)[], selected: (string|number)[], onSelect: (value: any) => void, onSelectAll?: () => void, allSelected?: boolean }) => (
  <div>
    <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-white/80">{label}</label>
        {onSelectAll && (
            <button type="button" onClick={onSelectAll} className="text-xs font-semibold text-accent hover:underline">
                {allSelected ? 'Deselect All' : 'Select All'}
            </button>
        )}
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {options.map(opt => (
        <button type="button" key={opt} onClick={() => onSelect(opt)} className={`p-2 rounded-md text-sm border transition-colors ${selected.includes(opt) ? 'bg-accent border-accent text-white' : 'bg-canvas border-white/10 text-white/60 hover:border-white/30'}`}>
          {opt}
        </button>
      ))}
    </div>
  </div>
);

export default ProjectSetupWizard;
