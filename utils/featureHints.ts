import type { FeatureId } from './useFeatureDiscovery';

export interface FeatureHintData {
  /** Icon name from the icons module */
  iconName: 'FolderIcon' | 'Squares2x2Icon' | 'SparklesIcon' | 'ListBulletIcon' | 'ViewfinderCircleIcon' | 'EyeIcon' | 'FilmIcon' | 'ArrowDownTrayIcon';
  title: string;
  description: string;
  highlights: string[];
}

export const FEATURE_HINTS: Record<FeatureId, FeatureHintData> = {
  project_library: {
    iconName: 'FolderIcon',
    title: 'Project Library',
    description: 'Your creative home base. All projects live here with search, sort, and quick preview.',
    highlights: [
      'Duplicate projects to reuse setups',
      'Full workspace backup and restore',
      'Import/export your entire library',
    ],
  },
  media_library: {
    iconName: 'Squares2x2Icon',
    title: 'Media Library',
    description: 'A global collection of actors, props, and locations you can reuse across all projects.',
    highlights: [
      'Folder organization with tags and search',
      'AI face detection and smart cropping',
      'Download individual assets directly',
    ],
  },
  api_settings: {
    iconName: 'SparklesIcon',
    title: 'API Setup',
    description: 'Configure your image generation provider. Start free with Z-Image Turbo or use a Google Gemini API key for higher fidelity. Your keys stay local.',
    highlights: [
      'Z-Image Turbo available as a free alternative (no key needed)',
      'Free Gemini API key from aistudio.google.com',
      'Switch providers anytime in Settings',
    ],
  },
  scene_management: {
    iconName: 'ListBulletIcon',
    title: 'Script to Scenes',
    description: 'Upload a script (PDF, TXT, or Fountain) and let AI automatically break it down into scenes with characters, props, and locations.',
    highlights: [
      'Drag-and-drop scene reordering',
      'Per-scene lighting, mood, and color palette',
      'Cast manager for actors (with photos), props, and locations',
    ],
  },
  lighting_setup: {
    iconName: 'SparklesIcon',
    title: 'Lighting Setup \u2014 Your Secret Weapon',
    description: 'Define per-scene lighting and the AI will render it faithfully. Source type, direction, color, modifiers \u2014 every detail shapes your generated frames.',
    highlights: [
      'Directly influences AI image generation quality',
      'Multiple lights per scene for complex setups',
      'Modifiers like softbox, grid, gobo, and haze',
    ],
  },
  shot_builder: {
    iconName: 'ViewfinderCircleIcon',
    title: 'Shot Builder & AI',
    description: 'Define precise camera parameters and generate photorealistic storyboard frames with AI.',
    highlights: [
      'Natural language shot interpretation',
      'AI shot sequence suggestions for entire scenes',
      'Camera-subject relationship and AI location scouting',
    ],
  },
  continuity_view: {
    iconName: 'EyeIcon',
    title: 'Continuity View',
    description: 'Plan camera placements on a top-down floor plan to maintain visual consistency.',
    highlights: [
      '180-degree line with automatic crossing warnings',
      'FOV cones, drawing layer, camera tracks, and walk arrows',
      'Layer panel, snapshots, and full undo/redo',
    ],
  },
  shot_gallery: {
    iconName: 'FilmIcon',
    title: 'Shot Gallery',
    description: 'Review all shots in a visual gallery grid. Drag and drop to reorder frames.',
    highlights: [
      'Drag-and-drop frame reordering',
      'Per-shot description, notes, and audio description',
      'Upload images directly into frames',
    ],
  },
  export: {
    iconName: 'ArrowDownTrayIcon',
    title: 'Export & Share',
    description: 'Export your storyboards in multiple formats for production use.',
    highlights: [
      'PDF: Storyboard, Shot List, Presentation Deck',
      'Image assets as ZIP (JPEG, PNG, WebP)',
      'Portable HTML viewer (self-contained, no server)',
    ],
  },
};
