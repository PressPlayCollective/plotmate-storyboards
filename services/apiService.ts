/**
 * API Service - Frontend HTTP client for the PLOTMATE backend.
 * 
 * All methods fail gracefully: if the backend is unreachable,
 * they log a warning and return null/undefined so the app can
 * continue working from localStorage alone.
 */

const API_BASE = '/api';

let _backendAvailable: boolean | null = null;

/**
 * Check if the backend server is reachable.
 * Caches the result for the session and retries periodically.
 */
async function isBackendAvailable(): Promise<boolean> {
  if (_backendAvailable !== null) return _backendAvailable;
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    _backendAvailable = res.ok;
  } catch {
    _backendAvailable = false;
  }
  // Re-check every 30 seconds in case server starts later
  setTimeout(() => { _backendAvailable = null; }, 30000);
  return _backendAvailable;
}

async function safeFetch(url: string, options?: RequestInit): Promise<Response | null> {
  const available = await isBackendAvailable();
  if (!available) {
    return null;
  }
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      console.warn(`[apiService] ${options?.method || 'GET'} ${url} returned ${res.status}`);
    }
    return res;
  } catch (err) {
    console.warn(`[apiService] Network error for ${url}:`, err);
    _backendAvailable = null; // Reset so next call re-checks
    return null;
  }
}

// ---- Sync ----

export interface SyncData {
  projects: any[];
  library: any;
  settings: Record<string, any>;
}

/**
 * Fetch all data from the backend for initial hydration.
 */
export async function fetchSyncData(): Promise<SyncData | null> {
  const res = await safeFetch(`${API_BASE}/sync`);
  if (!res) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ---- Projects ----

export async function getProjects(): Promise<any[] | null> {
  const res = await safeFetch(`${API_BASE}/projects`);
  if (!res) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveProject(project: any): Promise<boolean> {
  const res = await safeFetch(`${API_BASE}/projects/${project.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  return res?.ok ?? false;
}

export async function saveAllProjects(projects: any[]): Promise<boolean> {
  const res = await safeFetch(`${API_BASE}/projects`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projects),
  });
  return res?.ok ?? false;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const res = await safeFetch(`${API_BASE}/projects/${projectId}`, {
    method: 'DELETE',
  });
  return res?.ok ?? false;
}

// ---- Library ----

export async function getLibrary(): Promise<any | null> {
  const res = await safeFetch(`${API_BASE}/library`);
  if (!res) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveLibrary(libraryData: any): Promise<boolean> {
  const res = await safeFetch(`${API_BASE}/library`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(libraryData),
  });
  return res?.ok ?? false;
}

// ---- Settings ----

export async function getSettings(): Promise<Record<string, any> | null> {
  const res = await safeFetch(`${API_BASE}/settings`);
  if (!res) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveSettings(settings: Record<string, any>): Promise<boolean> {
  const res = await safeFetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return res?.ok ?? false;
}

export async function patchSettings(partial: Record<string, any>): Promise<boolean> {
  const res = await safeFetch(`${API_BASE}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial),
  });
  return res?.ok ?? false;
}

// ---- Backup ----

export async function exportBackup(): Promise<Blob | null> {
  const res = await safeFetch(`${API_BASE}/backup/export`);
  if (!res) return null;
  try {
    return await res.blob();
  } catch {
    return null;
  }
}

export async function importBackup(file: File): Promise<SyncData | null> {
  const formData = new FormData();
  formData.append('backup', file);

  const available = await isBackendAvailable();
  if (!available) return null;

  try {
    const res = await fetch(`${API_BASE}/backup/import`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) return null;
    const result = await res.json();
    return result.data || null;
  } catch (err) {
    console.warn('[apiService] Import error:', err);
    return null;
  }
}

export async function importBackupJson(jsonData: any): Promise<SyncData | null> {
  const res = await safeFetch(`${API_BASE}/backup/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jsonData),
  });
  if (!res) return null;
  try {
    const result = await res.json();
    return result.data || null;
  } catch {
    return null;
  }
}
