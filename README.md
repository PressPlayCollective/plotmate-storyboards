# PlotMate Storyboards

**AI-powered storyboarding and pre-visualization for film, TV, and video production.**

PlotMate is a local-first web application that lets directors, DPs, and filmmakers plan their shots visually. Build scenes, lay out your set on an overhead continuity grid, position cameras and lights, and generate AI storyboard frames — all from one interface.

All data stays on your machine. No cloud accounts required. API keys are stored in your browser's local storage and sent only to the AI provider you choose.

---

## Features

### Project Management

Create projects for any format — Feature, Short, Commercial, Music Video, Episodic, or Vertical Drama. Each project carries its own technical profile: camera body (ARRI, RED, Sony, Blackmagic), sensor mode, lens kit (18mm–135mm, spherical and anamorphic), aspect ratios, frame rates, and support gear.

### Script Import and Analysis

Import scripts from `.txt`, `.pdf`, or `.fountain` files. With a Gemini API key, the app uses AI to automatically extract scenes, characters, props, locations, and technical data from your script.

### Scene Building

Each scene tracks a slugline, time of day, mood, color palette, cast, props, locations, lighting setups, page count, and estimated screen time.

### Continuity View (Overhead Set Diagram)

A top-down grid where you lay out the physical space of each scene:

- **Characters** — drag actors onto the grid, set their facing direction
- **Set elements** — furniture, doors, windows, walls, vehicles, equipment, and more (50+ element types)
- **Lighting instruments** — place fresnels, LED panels, practicals, softboxes, and other fixtures with beam direction and shape
- **Camera** — position and aim the camera; the field-of-view cone shows exactly what will be in frame
- **Walls and architecture** — draw wall segments and openings to define the space
- **Camera tracks and dolly marks** — plan camera movement paths
- **Walk arrows** — chart character blocking and movement
- **Captions and freehand drawing** — annotate the diagram
- **Layers** — organize elements across lockable, toggleable layers
- **180-degree line** — visualize and maintain screen direction
- **Snapshots** — save and compare different staging setups for the same scene

### Shot Builder

Configure every parameter of a shot: shot size, composition, camera angle, camera movement, lens, depth of field, focus behavior, subject count and motion, and production flags (VFX, greenscreen, SFX, stunts, etc.). Each shot gets notes, audio descriptions, and an auto-generated technical data card.

You can also describe a shot in natural language (e.g. "a tense close-up") and the AI will map it to specific technical camera settings.

### AI Image Generation

Press **Generate** and the app builds a detailed prompt from your scene data and continuity layout, then sends it to AI:

- **Gemini** (requires API key) — sends reference photos of actors and locations so generated characters resemble your cast. Supports standard (fast) and pro (high quality) models, plus Imagen for scenes without reference photos.
- **Z-Image** (free, no API key needed) — text-only generation via Hugging Face, no reference photo support.

The continuity view is the single source of truth — if you placed elements on the grid, only those elements appear in the generated image.

### Media Library

A centralized asset library with folder organization. Store reference images for actors (with face detection for AI accuracy), props, and locations. The library persists across all projects.

### Shot Gallery and Printable Storyboard

Browse all generated shots in a visual grid. Export a formatted, printable storyboard for your crew. Download project data as `.plotmate.json` or as a zip archive.

### Sync, Backup, and Offline Support

Projects sync to a local backend server. The app also works offline using browser storage. Export your entire workspace as a single backup file and import it on any machine.

---

## Technical Architecture

- **Framework:** React 19 (Hooks, Context API)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Build Tool:** Vite
- **Backend:** Express (local server for data persistence)
- **PDF Processing:** pdfjs-dist
- **AI SDK:** @google/genai

### Data Flow

1. User uploads a script or defines scene/shot parameters.
2. Data is held in `ProjectContext`, the single source of truth for the active session.
3. `useEffect` hooks listen for state changes and write debounced updates to local storage.
4. AI calls retrieve API keys from local storage at the moment of the request (never stored in code).
5. Generated images and metadata are stored back into the project state.

### Privacy Model

- **Local-first:** All projects, scenes, and generated assets are stored in your browser's localStorage and IndexedDB, plus the local backend server's filesystem.
- **Bring Your Own Key:** You provide your own API keys. They are stored in your browser and sent only to the AI provider endpoints (Google Gemini, Hugging Face).
- **No telemetry, no tracking, no cloud accounts.**

---

## Installation

### Prerequisites

- **Node.js** version 18 or later
- **npm** (comes with Node.js)
- A **Google Gemini API key** (optional — needed only for AI features; the app works without it)

### 1. Clone or download the repository

```bash
git clone <repository-url>
cd "PlotMate Storyboards"
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the app

```bash
npm run dev
```

This starts the frontend and backend together. Open **http://plotmate.localhost:9107** in your browser.

### 4. (Optional) Configure AI

1. Open the app in your browser
2. Go to **Account Settings** (profile icon)
3. Enter your **Gemini API key**

Without an API key, all non-AI features work normally. You can still use Z-Image for free image generation (no key required).

---

## Run Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start frontend + backend (full app) |
| `npm run dev:frontend` | Start frontend only (offline mode, no backend sync) |
| `npm run server` | Start backend only |
| `npm run build` | Production build (outputs to `dist/`) |
| `npm run preview` | Preview the production build locally |

---

## Troubleshooting

**Port already in use** — Kill the process on the port, or change the backend port with `SERVER_PORT=4000 npm run server`.

**AI generation not working** — Make sure your Gemini API key is entered in Account Settings. Z-Image works without any key.

**Images not loading** — The backend must be running for images to persist. In frontend-only mode, images live in browser storage and may be lost if cleared.

---

## License

MIT
