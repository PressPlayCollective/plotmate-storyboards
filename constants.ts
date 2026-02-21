

export const PROJECT_TYPES = ['Feature', 'Short', 'Commercial', 'Music Video', 'Episodic', 'Vertical Drama'];
export const ASPECT_RATIOS = ['2.39:1', '1.85:1', '16:9', '9:16', '1:1'];
export const CAMERA_BODIES = ['ARRI', 'RED', 'Sony', 'Blackmagic'];
export const SENSOR_MODES = ['Full frame', 'S35', 'Open Gate', 'High-speed crop'];
export const FRAME_RATES = [23.976, 24, 25, 30, 50, 60, 100, 120];
export const LENS_FOCAL_LENGTHS = [18, 24, 25, 28, 35, 40, 50, 65, 75, 85, 100, 135];
export const LENS_TYPES = ['Spherical', 'Anamorphic (1.3x)', 'Anamorphic (1.5x)', 'Anamorphic (2x)', 'Vintage', 'Macro', 'Specialty'];
export const SUPPORT_GEAR = ['Tripod', 'Slider', 'Dolly', 'Gimbal', 'Handheld', 'Crane', 'Drone', 'Car rig'];

export const SHOT_SIZES = ['Extreme Wide (EWS)', 'Wide (WS)', 'Full (FS)', 'Medium (MS)', 'Medium Close-Up (MCU)', 'Close-Up (CU)', 'Extreme Close-Up (ECU)', 'Insert / Detail'];
export const COMPOSITIONS = ['Single centered', 'Single rule-of-thirds', 'Two-shot', 'Over-the-Shoulder (OTS)', 'Profile', 'Dirty frame', 'POV', 'Silhouette', 'Mirror / reflection', 'Group / crowd'];
export const CAMERA_ANGLES = ['Eye-level', 'Low', 'High', 'Bird’s-eye / Top-down', 'Worm’s-eye', 'Dutch / tilted'];
export const CAMERA_MOVEMENTS = ['Static', 'Pan', 'Tilt', 'Push-in', 'Pull-out', 'Track left / right', 'Arc around subject', 'POV move', 'Whip pan', 'Follow shot', 'Reveal'];
export const LIGHTING_STYLES = ['High-key', 'Low-key', 'Soft beauty', 'Hard noir / chiaroscuro', 'Backlit glow', 'Silhouette', 'Neon / mixed color', 'Practical-driven'];
export const KEY_DIRECTIONS = ['Front', '3/4 front', 'Side', '3/4 back', 'Back', 'Top light soft', 'Top light hard', 'Underlight'];
export const KEY_SOURCE_TYPES = ['LED panel', 'COB + softbox', 'Fresnel', 'HMI', 'Tube Light', 'Practical only', 'Bounce only'];

// Light source types matching Shot Designer's vocabulary, with SVG shape hints.
// The 'shape' key drives the distinct SVG icon rendered on the canvas.
export type LightShape = 'sun' | 'fresnel_sm' | 'fresnel_md' | 'fresnel_lg' | 'flo_4' | 'flo_2'
    | 'flo_1' | 'panel' | 'led' | 'led_1x1' | 'open_face' | 'ellipsoidal' | 'par' | 'scoop'
    | 'cyc' | 'softbox' | 'practical' | 'stick' | 'balloon' | 'china_ball' | 'bounce_board'
    | 'silk' | 'speed_rail' | 'custom';

export const LIGHT_SOURCE_CATEGORIES: { category: string; sources: { value: string; label: string; shape: LightShape }[] }[] = [
    {
        category: 'Fresnels & Hard',
        sources: [
            { value: 'sun', label: 'Sun', shape: 'sun' },
            { value: 'fresnel_sm', label: 'Small Fresnel', shape: 'fresnel_sm' },
            { value: 'fresnel_md', label: 'Medium Fresnel', shape: 'fresnel_md' },
            { value: 'fresnel_lg', label: 'Large Fresnel', shape: 'fresnel_lg' },
            { value: 'open_face', label: 'Open Face', shape: 'open_face' },
            { value: 'ellipsoidal', label: 'Ellipsoidal', shape: 'ellipsoidal' },
            { value: 'par', label: 'PAR Light', shape: 'par' },
            { value: 'scoop', label: 'Scoop', shape: 'scoop' },
            { value: 'cyc', label: 'Cyc Light', shape: 'cyc' },
        ],
    },
    {
        category: 'Tubes & Panels',
        sources: [
            { value: 'flo_4', label: 'FLO 4 Tubes', shape: 'flo_4' },
            { value: 'flo_2', label: 'FLO 2 Tubes', shape: 'flo_2' },
            { value: 'flo_1', label: 'Single FLO Tube', shape: 'flo_1' },
            { value: 'panel', label: 'Light Panel', shape: 'panel' },
            { value: 'led', label: 'LED', shape: 'led' },
            { value: 'led_1x1', label: 'LED 1×1 Panel', shape: 'led_1x1' },
            { value: 'softbox', label: 'Soft Box', shape: 'softbox' },
        ],
    },
    {
        category: 'Practicals & Soft',
        sources: [
            { value: 'practical', label: 'Practical Light', shape: 'practical' },
            { value: 'stick', label: 'Light On A Stick', shape: 'stick' },
            { value: 'balloon', label: 'Balloon Light', shape: 'balloon' },
            { value: 'china_ball', label: 'China Ball', shape: 'china_ball' },
            { value: 'bounce_board', label: 'Bounce Board', shape: 'bounce_board' },
            { value: 'silk', label: 'Silk', shape: 'silk' },
            { value: 'speed_rail', label: 'Virtual Speed Rail', shape: 'speed_rail' },
        ],
    },
    {
        category: 'Natural & Other',
        sources: [
            { value: 'window_light', label: 'Window Light', shape: 'panel' },
            { value: 'moonlight', label: 'Moonlight', shape: 'sun' },
            { value: 'golden_hour', label: 'Golden Hour', shape: 'sun' },
            { value: 'ambient', label: 'Ambient / Fill', shape: 'softbox' },
            { value: 'custom', label: 'Custom Light', shape: 'custom' },
        ],
    },
];
export const MODIFIERS = ['Softbox', 'Umbrella', 'Diffusion frame', 'Bounce', 'Grid', 'Flag / negative fill', 'Gobo', 'Haze/Fog'];
export const LIGHT_COLORS = ['White', 'Blue', 'Red', 'Purple', 'Green', 'Teal', 'Orange', 'Cyan'];
export const MOODS = [
    { name: 'Calm', emoji: '😌' },
    { name: 'Tense', emoji: '😰' },
    { name: 'Threatening', emoji: '😠' },
    { name: 'Romantic', emoji: '❤️' },
    { name: 'Melancholic', emoji: '😢' },
    { name: 'Lonely', emoji: '👤' },
    { name: 'Hopeful', emoji: '✨' },
    { name: 'Energetic', emoji: '⚡️' },
    { name: 'Surreal', emoji: '😵‍💫' },
    { name: 'Documentary / neutral', emoji: '😐' },
];
export const COLOR_PALETTES = ['Warm', 'Cool', 'Teal and orange', 'Desaturated', 'High saturation', 'Neon mix', 'Earthy / muted', 'Monochrome feel'];
export const DOFS = ['Deep', 'Medium', 'Shallow', 'Ultra shallow'];
export const FOCUS_BEHAVIORS = ['Static on subject', 'Follow subject', 'Rack focus foreground → subject', 'Rack focus subject → background', 'Start soft → snap to focus'];
export const SUBJECT_COUNTS = ['None', 'Single', 'Two', 'Three+', 'Crowd'];
export const SUBJECT_MOTIONS = ['None', 'Static', 'Subtle', 'Walk into frame', 'Walk out of frame', 'Cross frame', 'Run', 'Sit / stand / rise'];
export const CAMERA_SUBJECT_RELATIONSHIPS = ['Observational', 'Inside the circle', 'POV'];
export const FLAGS = ['None', 'VFX screen replacement', 'Clean plate required', 'Greenscreen / bluescreen', 'SFX rain', 'SFX fire / smoke', 'Stunts', 'Vehicle involvement', 'SFX makeup / blood'];

// Valid aspect ratios supported by the Imagen API
export const VALID_IMAGEN_ASPECT_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"];

// Sensor widths in mm for FOV calculation (horizontal dimension)
export const SENSOR_WIDTHS: Record<string, number> = {
    'Full frame': 36,
    'S35': 24.89,
    'Open Gate': 28.25,
    'High-speed crop': 18,
};

// Detailed camera sensor database (width x height in mm)
export const CAMERA_SENSORS: Record<string, { width: number; height: number }> = {
    'ARRI Alexa': { width: 23.76, height: 13.37 },
    'ARRI Alexa Mini': { width: 23.76, height: 13.37 },
    'ARRI Alexa Mini LF': { width: 36.70, height: 25.54 },
    'ARRI Alexa 65': { width: 54.12, height: 25.59 },
    'Canon 5D Mark II/III': { width: 36, height: 24 },
    'Canon C300 Mark III': { width: 26.2, height: 13.8 },
    'Canon C500 Mark II': { width: 38.1, height: 20.1 },
    'RED Epic / Scarlet': { width: 27.7, height: 14.6 },
    'RED Monstro 8K VV': { width: 40.96, height: 21.60 },
    'RED Komodo': { width: 27.03, height: 14.26 },
    'RED V-Raptor': { width: 40.96, height: 21.60 },
    'Sony Venice': { width: 36, height: 24 },
    'Sony Venice 2': { width: 36, height: 24 },
    'Sony FX6': { width: 35.6, height: 23.8 },
    'Sony FX3': { width: 35.6, height: 23.8 },
    'Sony A7S III': { width: 35.6, height: 23.8 },
    'Sony F5/F55/F65': { width: 23.5, height: 18.66 },
    'Blackmagic Pocket 4K': { width: 18.96, height: 10 },
    'Blackmagic Pocket 6K': { width: 23.10, height: 12.99 },
    'Blackmagic URSA Mini Pro 12K': { width: 27.03, height: 14.26 },
    'Blackmagic Cinema Camera 6K': { width: 23.10, height: 12.99 },
    'Panasonic Varicam LT': { width: 24.58, height: 12.84 },
    'Panasonic S1H': { width: 35.6, height: 23.8 },
    'Film Super35': { width: 23.5, height: 18.66 },
    'Film 35mm Academy': { width: 21.95, height: 16 },
    'Film 65mm (5-perf)': { width: 52.63, height: 23.01 },
    'IMAX 15-perf': { width: 70.41, height: 52.63 },
    'iPhone 15 Pro Max (Main)': { width: 9.8, height: 7.3 },
};

// Set element type definitions
import type { SetElementType } from './types';

// Set element types — architectural first (like Shot Designer), then furniture
export const SET_ELEMENT_TYPES: { value: SetElementType; label: string; icon: string }[] = [
    // Furniture
    { value: 'table', label: 'Table', icon: 'table' },
    { value: 'round_table', label: 'Round Table', icon: 'round_table' },
    { value: 'oval_table', label: 'Oval Table', icon: 'oval_table' },
    { value: 'chair', label: 'Chair', icon: 'chair' },
    { value: 'sofa', label: 'Sofa', icon: 'sofa' },
    { value: 'bed', label: 'Bed', icon: 'bed' },
    { value: 'desk', label: 'Desk', icon: 'desk' },
    { value: 'monitor', label: 'Monitor', icon: 'monitor' },
    { value: 'laptop', label: 'Laptop', icon: 'laptop' },
    { value: 'keyboard', label: 'Keyboard', icon: 'keyboard' },
    { value: 'bottle', label: 'Bottle', icon: 'bottle' },
    { value: 'cell_phone', label: 'Cell Phone', icon: 'cell_phone' },
    { value: 'paper', label: 'Paper', icon: 'paper' },
    { value: 'plate', label: 'Plate', icon: 'plate' },
    // Doors & Windows
    { value: 'door_open', label: 'Open Door', icon: 'door_open' },
    { value: 'door_closed', label: 'Closed Door', icon: 'door_closed' },
    { value: 'double_door_open', label: 'Double Open Door', icon: 'double_door_open' },
    { value: 'double_door_closed', label: 'Double Closed Door', icon: 'double_door_closed' },
    { value: 'window', label: 'Window', icon: 'window' },
    { value: 'medium_opening', label: 'Medium Opening', icon: 'medium_opening' },
    { value: 'big_opening', label: 'Big Opening', icon: 'big_opening' },
    { value: 'small_opening', label: 'Small Opening', icon: 'small_opening' },
    { value: 'prison_bars', label: 'Prison Bars', icon: 'prison_bars' },
    // Set Pieces
    { value: 'wall_segment', label: 'Wall Segment', icon: 'wall_segment' },
    { value: 'stairs', label: 'Stairs', icon: 'stairs' },
    { value: 'tree', label: 'Tree', icon: 'tree' },
    { value: 'bush', label: 'Bush', icon: 'bush' },
    // Vehicles
    { value: 'car', label: 'Car', icon: 'car' },
    { value: 'minibus', label: 'Minibus', icon: 'minibus' },
    { value: 'motorcycle', label: 'Motorcycle', icon: 'motorcycle' },
    { value: 'semi_truck', label: 'Semi Truck', icon: 'semi_truck' },
    { value: 'truck_trailer', label: 'Truck Trailer', icon: 'truck_trailer' },
    { value: 'tank', label: 'Tank', icon: 'tank' },
    { value: 'commercial_jet', label: 'Commercial Jet', icon: 'commercial_jet' },
    { value: 'fighter_jet', label: 'Fighter Jet', icon: 'fighter_jet' },
    { value: 'small_plane', label: 'Small Plane', icon: 'small_plane' },
    // Equipment
    { value: 'crane', label: 'Crane', icon: 'crane' },
    { value: 'boom_microphone', label: 'Boom Microphone', icon: 'boom_microphone' },
    { value: 'equipment', label: 'Equipment', icon: 'equipment' },
    { value: 'monitor_village', label: 'Monitor Village', icon: 'monitor_village' },
    // Weapons
    { value: 'gun', label: 'Gun', icon: 'gun' },
    { value: 'rifle', label: 'Rifle', icon: 'rifle' },
    // Other
    { value: 'dog', label: 'Dog', icon: 'dog' },
    { value: 'horse', label: 'Horse', icon: 'horse' },
    { value: 'straight_arrow', label: 'Straight Arrow', icon: 'straight_arrow' },
    { value: 'curved_arrow', label: 'Curved Arrow', icon: 'curved_arrow' },
    { value: 'custom', label: 'Custom', icon: 'custom' },
];

export const SET_ELEMENT_DIMENSIONS: Record<SetElementType, { width: number; height: number }> = {
    // Furniture
    table: { width: 2, height: 2 },
    round_table: { width: 2, height: 2 },
    oval_table: { width: 3, height: 2 },
    chair: { width: 1, height: 1 },
    sofa: { width: 3, height: 1 },
    bed: { width: 2, height: 3 },
    desk: { width: 2, height: 1 },
    monitor: { width: 1, height: 1 },
    laptop: { width: 1, height: 1 },
    keyboard: { width: 2, height: 1 },
    bottle: { width: 1, height: 1 },
    cell_phone: { width: 1, height: 1 },
    paper: { width: 1, height: 1 },
    plate: { width: 1, height: 1 },
    // Doors & Windows
    door_open: { width: 1, height: 2 },
    door_closed: { width: 1, height: 2 },
    double_door_open: { width: 2, height: 2 },
    double_door_closed: { width: 2, height: 2 },
    window: { width: 2, height: 1 },
    medium_opening: { width: 2, height: 1 },
    big_opening: { width: 3, height: 1 },
    small_opening: { width: 1, height: 1 },
    prison_bars: { width: 2, height: 1 },
    // Set Pieces
    wall_segment: { width: 3, height: 1 },
    stairs: { width: 2, height: 3 },
    tree: { width: 1, height: 1 },
    bush: { width: 1, height: 1 },
    // Vehicles
    car: { width: 2, height: 4 },
    minibus: { width: 2, height: 5 },
    motorcycle: { width: 1, height: 2 },
    semi_truck: { width: 2, height: 6 },
    truck_trailer: { width: 2, height: 5 },
    tank: { width: 3, height: 4 },
    commercial_jet: { width: 4, height: 6 },
    fighter_jet: { width: 2, height: 3 },
    small_plane: { width: 2, height: 3 },
    // Equipment
    crane: { width: 2, height: 4 },
    boom_microphone: { width: 1, height: 3 },
    equipment: { width: 2, height: 2 },
    monitor_village: { width: 3, height: 2 },
    // Weapons
    gun: { width: 1, height: 1 },
    rifle: { width: 1, height: 2 },
    // Other
    dog: { width: 1, height: 2 },
    horse: { width: 2, height: 3 },
    straight_arrow: { width: 1, height: 3 },
    curved_arrow: { width: 2, height: 3 },
    custom: { width: 2, height: 2 },
};

export const SET_ELEMENT_CATEGORIES: Record<string, { label: string; types: SetElementType[] }> = {
    furniture: {
        label: 'Furniture',
        types: ['table', 'round_table', 'oval_table', 'chair', 'sofa', 'bed', 'desk', 'monitor', 'laptop', 'keyboard', 'bottle', 'cell_phone', 'paper', 'plate'],
    },
    doors_windows: {
        label: 'Doors & Windows',
        types: ['door_open', 'door_closed', 'double_door_open', 'double_door_closed', 'window', 'medium_opening', 'big_opening', 'small_opening', 'prison_bars'],
    },
    set_pieces: {
        label: 'Set Pieces',
        types: ['wall_segment', 'stairs', 'tree', 'bush'],
    },
    vehicles: {
        label: 'Vehicles',
        types: ['car', 'minibus', 'motorcycle', 'semi_truck', 'truck_trailer', 'tank', 'commercial_jet', 'fighter_jet', 'small_plane'],
    },
    equipment: {
        label: 'Equipment',
        types: ['crane', 'boom_microphone', 'equipment', 'monitor_village'],
    },
    weapons: {
        label: 'Weapons',
        types: ['gun', 'rifle'],
    },
    other: {
        label: 'Other',
        types: ['dog', 'horse', 'straight_arrow', 'curved_arrow', 'custom'],
    },
};
