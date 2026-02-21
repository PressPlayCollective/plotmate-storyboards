import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import projectsRouter from './routes/projects.js';
import libraryRouter from './routes/library.js';
import settingsRouter from './routes/settings.js';
import backupRouter from './routes/backup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.SERVER_PORT || 3001;
const DATA_DIR = path.resolve(__dirname, '..', 'data');

// Ensure data directories exist
const dirs = [
  DATA_DIR,
  path.join(DATA_DIR, 'images'),
  path.join(DATA_DIR, 'images', 'projects'),
  path.join(DATA_DIR, 'images', 'library'),
];
for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Initialize empty JSON files if they don't exist
const initFiles: Record<string, string> = {
  'projects.json': '[]',
  'library.json': '{"assets":[],"folders":[{"id":"root","name":"All Assets"}]}',
  'settings.json': '{}',
};
for (const [filename, defaultContent] of Object.entries(initFiles)) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, defaultContent, 'utf-8');
  }
}

// CORS middleware (manual implementation for Express 5 compatibility)
const ALLOWED_ORIGINS = [
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'http://localhost:6969', 'http://127.0.0.1:6969',
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json({ limit: '200mb' }));

// Serve images statically
app.use('/api/images', express.static(path.join(DATA_DIR, 'images')));

// Mount routes
app.use('/api/projects', projectsRouter);
app.use('/api/library', libraryRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/backup', backupRouter);

// Sync endpoint: returns all data at once for frontend hydration
app.get('/api/sync', (_req, res) => {
  try {
    const projects = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'projects.json'), 'utf-8'));
    const library = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'library.json'), 'utf-8'));
    const settings = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'settings.json'), 'utf-8'));
    res.json({ projects, library, settings });
  } catch (err) {
    console.error('Sync read error:', err);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(Number(PORT), '127.0.0.1', () => {
  console.log(`[PLOTMATE Server] Running on http://localhost:${PORT}`);
  console.log(`[PLOTMATE Server] Data directory: ${DATA_DIR}`);
});
