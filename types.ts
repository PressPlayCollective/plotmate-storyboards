

export type ImageProvider = 'gemini' | 'zimage';

export interface User {
  id: string;
  name: string;
  email: string;
  isPremium?: boolean;
}

export interface Actor {
  id: string;
  name: string;
  photo: string; // In Media Library: original base64. In Project: cropped base64.
  description?: string; // AI-generated description of appearance
  gender?: 'male' | 'female' | 'non-binary' | 'other'; // Explicit gender for consistent AI generation
  faceBoundingBox?: { // Coordinates as percentages (0.0 to 1.0) of original image dimensions
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Prop {
  id: string;
  name: string;
  referenceImage?: string; // base64 string
  description?: string; // AI-generated description of appearance
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  referenceImage?: string; // base64 string
  description?: string; // AI-generated description
}

export interface LightingSetup {
  id: string;
  name: string;
  sourceType: string;
  direction: string;
  modifiers: string[];
  color?: string;
}

export interface ProjectSettings {
  id: string; // Unique identifier for the project
  name: string;
  projectType: string;
  primaryAspectRatio: string;
  secondaryAspectRatios: string[];
  cameraBody: string;
  sensorMode: string;
  frameRates: number[];
  lensKit: number[];
  lensType: string;
  support: string[];
  actors: Actor[];
  props: Prop[];
  locations: Location[];
}

export interface Position {
  x: number;
  y: number;
  angle?: number;
}

export interface CharacterPosition extends Position {
  id:string;
  name: string;
  color?: string;
}

export interface ShotPositionData {
    camera: Position;
    cameraLabel?: string;
    cameraColor?: string;
}

export type SetElementType =
  // Furniture
  | 'table' | 'round_table' | 'oval_table' | 'chair' | 'sofa' | 'bed' | 'desk'
  | 'monitor' | 'laptop' | 'keyboard' | 'bottle' | 'cell_phone' | 'paper' | 'plate'
  // Doors & Windows
  | 'door_open' | 'door_closed' | 'double_door_open' | 'double_door_closed'
  | 'window' | 'medium_opening' | 'big_opening' | 'small_opening' | 'prison_bars'
  // Set Pieces
  | 'wall_segment' | 'stairs' | 'tree' | 'bush'
  // Vehicles
  | 'car' | 'minibus' | 'motorcycle' | 'semi_truck' | 'truck_trailer'
  | 'tank' | 'commercial_jet' | 'fighter_jet' | 'small_plane'
  // Equipment
  | 'crane' | 'boom_microphone' | 'equipment' | 'monitor_village'
  // Weapons
  | 'gun' | 'rifle'
  // Other
  | 'dog' | 'horse' | 'straight_arrow' | 'curved_arrow'
  | 'custom';

export interface SetElement {
  id: string;
  label: string;
  type: SetElementType;
  x: number;
  y: number;
  width: number;  // grid units
  height: number; // grid units
  angle?: number; // rotation in degrees
}

export interface LightingPosition {
  id: string;
  setupId?: string;          // Link to a script-defined LightingSetup (optional)
  label?: string;            // User-facing name, e.g. "Key Light" or "Kino Flo"
  sourceType?: string;       // e.g. "fresnel_sm", "led_1x1", "par"
  shape?: string;            // SVG shape key used for canvas rendering (matches LightShape)
  direction?: string;        // e.g. "Front", "Side", "Back"
  x: number;
  y: number;
  angle: number;             // beam/arrow direction in degrees
  iconAngle?: number;        // icon orientation in degrees (independent from beam)
  showBeam?: boolean;        // default true; when false, beam cone + direction arrow hidden
}

export interface WallSegment {
  id: string;
  points: { x: number; y: number }[];
  closedLoop: boolean;
}

export interface CameraTrack {
  id: string;
  points: { x: number; y: number }[];
  isBezier: boolean;
  dollyMarks?: { position: number; label: string }[];
}

export interface WalkArrow {
  id: string;
  characterId: string;
  points: { x: number; y: number }[];
  isBezier: boolean;
}

export interface Caption {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  color: string;
}

export interface CanvasLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
}

export interface DrawingStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export interface SceneSnapshot {
  id: string;
  name: string;
  timestamp: number;
  data: SceneContinuityData;
  shotPositions: Record<string, ShotPositionData | undefined>;
}

export interface SceneContinuityData {
    oneEightyLine?: { p1: { x: number; y: number }; p2: { x: number; y: number } };
    characters: CharacterPosition[];
    setElements?: SetElement[];
    lightPositions?: LightingPosition[];
    walls?: WallSegment[];
    cameraTracks?: CameraTrack[];
    walkArrows?: WalkArrow[];
    captions?: Caption[];
    layers?: CanvasLayer[];
    drawings?: DrawingStroke[];
}

export interface Scene {
  id: string;
  sceneNumber: number;
  slugline: string;
  description?: string;
  pageCount: number;
  estimatedScreenTime: string;
  tags: string[];
  address?: string;
  locationReferenceImage?: string;
  continuityData?: SceneContinuityData;
  continuitySnapshots?: SceneSnapshot[];
  actors: string[]; // Names of actors in the scene
  props: string[]; // Names of props in the scene
  lighting?: LightingSetup[];
  timeOfDay?: 'Day' | 'Night' | 'Other';
  mood?: string;
  colorPalette?: string;
}

export interface ShotParameters {
  shotSize?: string;
  composition?: string;
  cameraAngle?: string;
  cameraMovement?: string;
  support?: string;
  focalLength?: number;
  lensType?: string;
  dof?: string;
  focusBehavior?: string;
  subjectCount?: string;
  subjectMotion?: string;
  actorsInShot?: string[]; // Array of actor names
  cameraSubjectRelationship?: string;
  flags: string[];
  objectsInShot?: string;
}

export interface Shot {
  id: string;
  shotNumber: number;
  parameters: ShotParameters;
  generatedImage: string | null;
  description: string;
  technicalData: TechnicalData | null;
  notes?: string;
  audioDescription?: string;
  positions?: ShotPositionData;
  continuityWarning?: boolean;
}

export interface TechnicalData {
  sceneId: string;
  shotId: string;
  camera: string;
  lens: string;
  support: string;
  movement: string;
  lighting: string;
  dof: string;
  flags: string[];
  aspectRatio?: string;
  shotType?: string;
}

export interface Project {
  id: string;
  settings: ProjectSettings;
  scenes: Scene[];
  shots: Record<string, Shot[]>;
  createdAt: number;
  lastModified: number;
}

// --- Media Library Types ---

export type AssetType = 'actor' | 'prop' | 'location' | 'shot';

export interface LibraryFolder {
  id: string;
  name: string;
  parentId?: string; // For nested folders
}

export interface LibraryAsset {
  id: string;
  type: AssetType;
  name: string;
  image: string; // base64
  description?: string;
  tags: string[];
  folderId: string; // 'root' or folder UUID
  createdAt: number;
  metadata?: {
    faceBoundingBox?: { x: number, y: number, width: number, height: number }; // For actors
    address?: string; // For locations
  };
}