import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Project, ProjectSettings, Actor, Prop, Location, Scene, Shot } from '../types';
import { initSync } from '../services/syncService';
import { saveProject as saveProjectToBackend } from '../services/apiService';
import { storageGet, storageSet } from '../utils/storage';

export type SaveStatus = 'UNSAVED' | 'SAVING' | 'SAVED';

interface ProjectContextType {
  projectSettings: ProjectSettings | null;
  setProjectSettings: (settings: ProjectSettings) => void;
  scenes: Scene[];
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  shots: Record<string, Shot[]>;
  setShots: React.Dispatch<React.SetStateAction<Record<string, Shot[]>>>;
  saveStatus: SaveStatus | null;

  startNewProject: (settings: Omit<ProjectSettings, 'id'>) => void;
  loadProject: (project: Project) => void;
  unloadProject: () => void;
  forceImmediateSave: () => void;

  // Actor Management
  addActor: (actor: Actor) => void;
  updateActor: (actor: Actor) => void;
  removeActor: (actorId: string) => void;
  updateActorDescription: (actorId: string, description: string) => void;
  // Prop Management
  addProp: (prop: Prop) => void;
  updateProp: (prop: Prop) => void;
  removeProp: (propId: string) => void;
  updatePropDescription: (propId: string, description: string) => void;
  // Location Management
  addLocation: (location: Location) => void;
  updateLocation: (location: Location) => void;
  removeLocation: (locationId: string) => void;
  updateLocationDescription: (locationId: string, description: string) => void;
}

export const ProjectContext = createContext<ProjectContextType>({
  projectSettings: null,
  setProjectSettings: () => {},
  scenes: [],
  setScenes: () => {},
  shots: {},
  setShots: () => {},
  saveStatus: null,
  startNewProject: () => {},
  loadProject: () => {},
  unloadProject: () => {},
  forceImmediateSave: () => {},
  addActor: () => {},
  updateActor: () => {},
  removeActor: () => {},
  updateActorDescription: () => {},
  addProp: () => {},
  updateProp: () => {},
  removeProp: () => {},
  updatePropDescription: () => {},
  addLocation: () => {},
  updateLocation: () => {},
  removeLocation: () => {},
  updateLocationDescription: () => {},
});

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projectSettings, setProjectSettings] = useState<ProjectSettings | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [shots, setShots] = useState<Record<string, Shot[]>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);

  const saveTimeout = useRef<number | null>(null);
  const isInitialLoad = useRef(true);
  const syncInitialized = useRef(false);

  // Ref that always holds the latest project state so saves never use stale closures
  const latestRef = useRef({ projectSettings, scenes, shots });
  useEffect(() => {
    latestRef.current = { projectSettings, scenes, shots };
  }, [projectSettings, scenes, shots]);

  // Hydrate localStorage from backend on first mount
  useEffect(() => {
    if (!syncInitialized.current) {
      syncInitialized.current = true;
      initSync().then((synced) => {
        if (synced) {
          console.info('[ProjectProvider] Backend sync initialized.');
        }
      });
    }
  }, []);
  
  const saveCurrentProject = useCallback(async () => {
    const { projectSettings: settings, scenes: currentScenes, shots: currentShots } = latestRef.current;
    if (!settings?.id) return;
    setSaveStatus('SAVING');

    try {
      const cachedProjects: Project[] = (await storageGet<Project[]>('shotdeck_projects')) || [];
      const existingIndex = cachedProjects.findIndex(p => p.id === settings.id);
      let createdAt = Date.now();
      if (existingIndex > -1 && cachedProjects[existingIndex].createdAt) {
        createdAt = cachedProjects[existingIndex].createdAt;
      }

      const projectData: Project = {
        id: settings.id,
        settings,
        scenes: currentScenes,
        shots: currentShots,
        createdAt,
        lastModified: Date.now(),
      };

      // PRIMARY: Save to backend (disk files)
      const savedToBackend = await saveProjectToBackend(projectData);

      // CACHE: Also update IndexedDB for fast local access / offline fallback
      if (existingIndex > -1) {
        cachedProjects[existingIndex] = projectData;
      } else {
        cachedProjects.push(projectData);
      }
      await storageSet('shotdeck_projects', cachedProjects);

      if (savedToBackend) {
        setTimeout(() => setSaveStatus('SAVED'), 300);
      } else {
        console.warn('[ProjectProvider] Backend unavailable, saved to browser cache only.');
        setTimeout(() => setSaveStatus('SAVED'), 300);
      }
    } catch (error: any) {
      console.error("Failed to save project:", error);
      setSaveStatus('UNSAVED');
    }
  }, []);

  useEffect(() => {
    if (isInitialLoad.current || !projectSettings) {
      isInitialLoad.current = false;
      return;
    }

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }
    setSaveStatus('UNSAVED');
    saveTimeout.current = window.setTimeout(saveCurrentProject, 1500);

    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, [projectSettings, scenes, shots, saveCurrentProject]);
  
  const loadProject = (project: Project) => {
    isInitialLoad.current = true;
    const settings = {
      ...project.settings,
      actors: project.settings.actors || [],
      props: project.settings.props || [],
      locations: project.settings.locations || [],
    };
    setProjectSettings(settings);
    setScenes(project.scenes || []);
    setShots(project.shots || {});
    setSaveStatus('SAVED');
  };

  const startNewProject = (settings: Omit<ProjectSettings, 'id'>) => {
    isInitialLoad.current = true;
    const newProjectSettings: ProjectSettings = {
      ...settings,
      id: crypto.randomUUID()
    };
    setProjectSettings(newProjectSettings);
    setScenes([]);
    setShots({});
    setSaveStatus('SAVED');
  };

  const forceImmediateSave = useCallback(() => {
    if (!latestRef.current.projectSettings?.id) return;
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
    saveCurrentProject();
  }, [saveCurrentProject]);

  const unloadProject = () => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
    if (saveStatus === 'UNSAVED' || saveStatus === 'SAVING') {
       saveCurrentProject();
    }
    setProjectSettings(null);
    setScenes([]);
    setShots({});
    setSaveStatus(null);
  };

  const updateSettings = (updater: (prev: ProjectSettings) => ProjectSettings) => {
    setProjectSettings(prev => {
      if (!prev) return null;
      return updater(prev);
    });
  };

  const addActor = (actor: Actor) => updateSettings(prev => ({ ...prev, actors: [...(prev.actors || []), actor] }));
  const updateActor = (updatedActor: Actor) => updateSettings(prev => ({ ...prev, actors: (prev.actors || []).map(a => a.id === updatedActor.id ? updatedActor : a) }));
  const removeActor = (actorId: string) => updateSettings(prev => ({ ...prev, actors: (prev.actors || []).filter(a => a.id !== actorId) }));
  const updateActorDescription = (actorId: string, description: string) => updateSettings(prev => ({ ...prev, actors: (prev.actors || []).map(a => a.id === actorId ? { ...a, description } : a) }));
  const addProp = (prop: Prop) => updateSettings(prev => ({ ...prev, props: [...(prev.props || []), prop] }));
  const updateProp = (updatedProp: Prop) => updateSettings(prev => ({ ...prev, props: (prev.props || []).map(p => p.id === updatedProp.id ? updatedProp : p) }));
  const removeProp = (propId: string) => updateSettings(prev => ({ ...prev, props: (prev.props || []).filter(p => p.id !== propId) }));
  const updatePropDescription = (propId: string, description: string) => updateSettings(prev => ({ ...prev, props: (prev.props || []).map(p => p.id === propId ? { ...p, description } : p) }));
  const addLocation = (location: Location) => updateSettings(prev => ({ ...prev, locations: [...(prev.locations || []), location] }));
  const updateLocation = (updatedLocation: Location) => updateSettings(prev => ({ ...prev, locations: (prev.locations || []).map(l => l.id === updatedLocation.id ? updatedLocation : l) }));
  const removeLocation = (locationId: string) => updateSettings(prev => ({ ...prev, locations: (prev.locations || []).filter(l => l.id !== locationId) }));
  const updateLocationDescription = (locationId: string, description: string) => updateSettings(prev => ({ ...prev, locations: (prev.locations || []).map(l => l.id === locationId ? { ...l, description } : l) }));

  return (
    <ProjectContext.Provider value={{
      projectSettings,
      setProjectSettings: (s) => setProjectSettings(s ? { ...s, actors: s.actors || [], props: s.props || [], locations: s.locations || [] } : null),
      scenes,
      setScenes,
      shots,
      setShots,
      saveStatus,
      startNewProject,
      loadProject,
      unloadProject,
      forceImmediateSave,
      addActor, updateActor, removeActor, updateActorDescription,
      addProp, updateProp, removeProp, updatePropDescription,
      addLocation, updateLocation, removeLocation, updateLocationDescription
    }}>
      {children}
    </ProjectContext.Provider>
  );
};