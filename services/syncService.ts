/**
 * Sync Service - Orchestrates data synchronization between localStorage and the backend.
 * 
 * On init: pulls from backend -> hydrates localStorage
 * On save: localStorage is always written first (by existing code), then backend is updated
 * 
 * All operations are fire-and-forget to avoid blocking the UI.
 */

import * as api from './apiService';
import type { SyncData } from './apiService';
import { storageSet } from '../utils/storage';

// localStorage key constants for small settings (these stay in localStorage)
const LS_GEMINI_KEY = 'gemini_api_key';
const LS_OPENAI_KEY = 'openai_api_key';
const LS_MIDJOURNEY_KEY = 'midjourney_api_key';
const LS_USE_PRO_MODEL = 'use_pro_model';
const LS_LOCALE = 'shotdeck_locale';
const LS_ONBOARDING = 'shotdeck_onboarding_completed';
const LS_DISCOVERED = 'plotmate_discovered_features';
const LS_IMAGE_PROVIDER = 'image_provider';
const LS_HF_TOKEN = 'hf_token';

/**
 * Hydrate storage from backend data.
 * Backend is the source of truth; only overwrite storage if backend has data.
 * Large data (projects, library) goes to IndexedDB; small settings stay in localStorage.
 */
async function hydrateStorage(data: SyncData): Promise<void> {
  // Projects -> IndexedDB (large data with base64 images)
  if (data.projects && data.projects.length > 0) {
    await storageSet('shotdeck_projects', data.projects);
  }

  // Library -> IndexedDB (large data with base64 images)
  if (data.library && data.library.assets) {
    await storageSet('shotdeck_asset_library', data.library);
  }

  // Small settings -> localStorage (tiny strings, no size concern)
  if (data.settings) {
    const s = data.settings;
    if (s.gemini_api_key) localStorage.setItem(LS_GEMINI_KEY, s.gemini_api_key);
    if (s.openai_api_key) localStorage.setItem(LS_OPENAI_KEY, s.openai_api_key);
    if (s.midjourney_api_key) localStorage.setItem(LS_MIDJOURNEY_KEY, s.midjourney_api_key);
    if (s.use_pro_model !== undefined) localStorage.setItem(LS_USE_PRO_MODEL, String(s.use_pro_model));
    if (s.locale) localStorage.setItem(LS_LOCALE, s.locale);
    if (s.onboarding_completed !== undefined) localStorage.setItem(LS_ONBOARDING, String(s.onboarding_completed));
    if (s.discovered_features !== undefined) localStorage.setItem(LS_DISCOVERED, JSON.stringify(s.discovered_features));
    if (s.image_provider) localStorage.setItem(LS_IMAGE_PROVIDER, s.image_provider);
    if (s.hf_token) localStorage.setItem(LS_HF_TOKEN, s.hf_token);
  }
}

/**
 * Collect all settings from localStorage into an object for backend sync.
 */
function collectSettings(): Record<string, any> {
  const settings: Record<string, any> = {};
  
  const geminiKey = localStorage.getItem(LS_GEMINI_KEY);
  if (geminiKey) settings.gemini_api_key = geminiKey;
  
  const openaiKey = localStorage.getItem(LS_OPENAI_KEY);
  if (openaiKey) settings.openai_api_key = openaiKey;
  
  const midjourneyKey = localStorage.getItem(LS_MIDJOURNEY_KEY);
  if (midjourneyKey) settings.midjourney_api_key = midjourneyKey;
  
  const proModel = localStorage.getItem(LS_USE_PRO_MODEL);
  if (proModel !== null) settings.use_pro_model = proModel;
  
  const locale = localStorage.getItem(LS_LOCALE);
  if (locale) settings.locale = locale;
  
  const onboarding = localStorage.getItem(LS_ONBOARDING);
  if (onboarding !== null) settings.onboarding_completed = onboarding;

  const discovered = localStorage.getItem(LS_DISCOVERED);
  if (discovered) {
    try { settings.discovered_features = JSON.parse(discovered); } catch { /* ignore */ }
  }

  const imgProvider = localStorage.getItem(LS_IMAGE_PROVIDER);
  if (imgProvider) settings.image_provider = imgProvider;

  const hfTok = localStorage.getItem(LS_HF_TOKEN);
  if (hfTok) settings.hf_token = hfTok;

  return settings;
}

/**
 * Initialize sync on app startup.
 * Fetches data from backend and hydrates localStorage.
 * If backend is unavailable, the app continues using existing localStorage data.
 * 
 * @returns true if sync was successful, false if backend was unreachable
 */
export async function initSync(): Promise<boolean> {
  try {
    const data = await api.fetchSyncData();
    if (!data) {
      console.info('[syncService] Backend not available. Using local storage only.');
      return false;
    }

    await hydrateStorage(data);
    console.info('[syncService] Hydrated storage from backend.');
    return true;
  } catch (err) {
    console.warn('[syncService] Init sync failed:', err);
    return false;
  }
}

/**
 * Sync a single project to the backend.
 * Called after ProjectContext saves to localStorage.
 */
export async function syncProject(project: any): Promise<void> {
  try {
    await api.saveProject(project);
  } catch (err) {
    console.warn('[syncService] Failed to sync project:', err);
  }
}

/**
 * Sync all projects to the backend (bulk).
 */
export async function syncAllProjects(projects: any[]): Promise<void> {
  try {
    await api.saveAllProjects(projects);
  } catch (err) {
    console.warn('[syncService] Failed to sync all projects:', err);
  }
}

/**
 * Delete a project from the backend.
 */
export async function syncDeleteProject(projectId: string): Promise<void> {
  try {
    await api.deleteProject(projectId);
  } catch (err) {
    console.warn('[syncService] Failed to delete project:', err);
  }
}

/**
 * Sync media library to the backend.
 */
export async function syncLibrary(libraryData: any): Promise<void> {
  try {
    await api.saveLibrary(libraryData);
  } catch (err) {
    console.warn('[syncService] Failed to sync library:', err);
  }
}

/**
 * Sync all settings to the backend.
 */
export async function syncSettings(): Promise<void> {
  try {
    const settings = collectSettings();
    await api.saveSettings(settings);
  } catch (err) {
    console.warn('[syncService] Failed to sync settings:', err);
  }
}

/**
 * Sync a partial settings update to the backend.
 */
export async function syncSettingsPatch(partial: Record<string, any>): Promise<void> {
  try {
    await api.patchSettings(partial);
  } catch (err) {
    console.warn('[syncService] Failed to patch settings:', err);
  }
}

/**
 * Export full workspace backup via backend.
 * Returns a Blob for download, or null if backend is unavailable.
 */
export async function exportBackup(): Promise<Blob | null> {
  return api.exportBackup();
}

/**
 * Import a workspace backup via backend.
 * Returns the new data for re-hydration, or null on failure.
 */
export async function importBackup(file: File): Promise<SyncData | null> {
  const data = await api.importBackup(file);
  if (data) {
    await hydrateStorage(data);
  }
  return data;
}
