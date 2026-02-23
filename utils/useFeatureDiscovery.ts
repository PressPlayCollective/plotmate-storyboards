import { useState, useCallback, useEffect } from 'react';
import { syncSettingsPatch } from '../services/syncService';

const LS_KEY = 'plotmate_discovered_features';

export type FeatureId =
  | 'project_library'
  | 'media_library'
  | 'api_settings'
  | 'scene_management'
  | 'lighting_setup'
  | 'shot_builder'
  | 'continuity_view'
  | 'shot_gallery'
  | 'export';

type DiscoveredMap = Record<string, boolean>;

function readDiscovered(): DiscoveredMap {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeDiscovered(map: DiscoveredMap): void {
  localStorage.setItem(LS_KEY, JSON.stringify(map));
}

/**
 * Hook to track which features a user has discovered.
 * Returns helpers to check if a feature is new and to mark it as seen.
 */
export function useFeatureDiscovery() {
  const [discovered, setDiscovered] = useState<DiscoveredMap>(readDiscovered);

  // Re-read from localStorage whenever the component using this hook mounts
  // (handles cross-tab or sync-hydration changes)
  useEffect(() => {
    setDiscovered(readDiscovered());
  }, []);

  /** Returns true if the feature has NOT been seen yet */
  const isNew = useCallback(
    (featureId: FeatureId): boolean => {
      return !discovered[featureId];
    },
    [discovered]
  );

  /** Mark a feature as seen (persists to localStorage + backend) */
  const markSeen = useCallback(
    (featureId: FeatureId): void => {
      setDiscovered((prev) => {
        if (prev[featureId]) return prev; // already seen
        const next = { ...prev, [featureId]: true };
        writeDiscovered(next);
        // fire-and-forget sync to backend
        syncSettingsPatch({ discovered_features: next });
        return next;
      });
    },
    []
  );

  /** Reset all discovered features (for "Show Onboarding Again") */
  const resetAll = useCallback(() => {
    const empty: DiscoveredMap = {};
    writeDiscovered(empty);
    setDiscovered(empty);
    syncSettingsPatch({ discovered_features: empty });
  }, []);

  return { isNew, markSeen, resetAll };
}
