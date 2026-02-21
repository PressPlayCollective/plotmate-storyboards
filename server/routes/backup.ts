import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { reEmbedProjectImages, reEmbedLibraryImages, extractProjectImages, extractLibraryImages } from '../utils/imageExtractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (_req, file, cb) => {
    // Only accept JSON files (.json or .plotmate.json)
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON backup files are accepted'));
    }
  },
});

// GET /api/backup/export - export everything as JSON bundle
// (Frontend will wrap this in a .plotmate zip using fflate on the client side,
//  or we provide the raw JSON with images re-embedded)
router.get('/export', (_req, res) => {
  try {
    // Read all data
    const projects: any[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'projects.json'), 'utf-8'));
    const library: any = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'library.json'), 'utf-8'));
    const settings: any = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'settings.json'), 'utf-8'));

    // Re-embed images as base64 for portability
    const embeddedProjects = projects.map(p => reEmbedProjectImages(p));
    const embeddedLibrary = reEmbedLibraryImages(library);

    // Strip sensitive API keys from exported settings
    const safeSettings = { ...settings };
    delete safeSettings.gemini_api_key;
    delete safeSettings.openai_api_key;
    delete safeSettings.midjourney_api_key;

    const backup = {
      manifest: {
        version: 1,
        exportDate: new Date().toISOString(),
        app: 'PLOTMATE STORYBOARDS',
      },
      projects: embeddedProjects,
      library: embeddedLibrary,
      settings: safeSettings,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="plotmate_backup_${Date.now()}.plotmate.json"`);
    res.json(backup);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Shared validation and processing for backup import
function handleImport(backupData: any, res: any) {
  // Validate backup structure
  if (!backupData.manifest || typeof backupData.manifest !== 'object') {
    res.status(400).json({ error: 'Invalid backup format: missing manifest' });
    return;
  }
  if (typeof backupData.manifest.version !== 'number') {
    res.status(400).json({ error: 'Invalid backup format: manifest.version must be a number' });
    return;
  }
  if (!Array.isArray(backupData.projects)) {
    res.status(400).json({ error: 'Invalid backup format: projects must be an array' });
    return;
  }

  // Validate every project has a safe ID (prevents path traversal via project.id)
  const SAFE_ID = /^[a-zA-Z0-9_-]+$/;
  for (const project of backupData.projects) {
    if (!project || typeof project !== 'object' ||
        typeof project.id !== 'string' ||
        project.id.length === 0 || project.id.length > 127 ||
        !SAFE_ID.test(project.id)) {
      res.status(400).json({ error: 'Invalid backup: each project must have a valid alphanumeric ID' });
      return;
    }
  }

  // Process projects - extract base64 images to disk
  const processedProjects = backupData.projects.map((project: any) => {
    return extractProjectImages(project, project.id);
  });
  fs.writeFileSync(path.join(DATA_DIR, 'projects.json'), JSON.stringify(processedProjects, null, 2), 'utf-8');

  // Process library
  if (backupData.library) {
    const processedLibrary = extractLibraryImages(backupData.library);
    fs.writeFileSync(path.join(DATA_DIR, 'library.json'), JSON.stringify(processedLibrary, null, 2), 'utf-8');
  }

  // Process settings (merge, don't overwrite API keys)
  if (backupData.settings) {
    const currentSettings = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'settings.json'), 'utf-8'));
    const merged = { ...currentSettings, ...backupData.settings };
    // Preserve existing API keys if not in import
    const API_KEYS = ['gemini_api_key', 'openai_api_key', 'midjourney_api_key'];
    for (const key of API_KEYS) {
      if (currentSettings[key] && !backupData.settings[key]) {
        merged[key] = currentSettings[key];
      }
    }
    fs.writeFileSync(path.join(DATA_DIR, 'settings.json'), JSON.stringify(merged, null, 2), 'utf-8');
  }

  // Return the new state for frontend hydration
  const projects = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'projects.json'), 'utf-8'));
  const library = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'library.json'), 'utf-8'));
  const settings = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'settings.json'), 'utf-8'));

  res.json({
    success: true,
    data: { projects, library, settings },
  });
}

// POST /api/backup/import - import a .plotmate.json backup
// Split multer handling: only apply for multipart uploads to avoid Express 5 body interference
router.post('/import', (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    upload.single('backup')(req, res, next);
  } else {
    next();
  }
}, (req, res) => {
  try {
    let backupData: any;

    if (req.file) {
      // File upload via multipart
      const content = req.file.buffer.toString('utf-8');
      backupData = JSON.parse(content);
    } else if (req.body && req.body.manifest) {
      // Direct JSON body
      backupData = req.body;
    } else {
      res.status(400).json({ error: 'No backup data provided' });
      return;
    }

    handleImport(backupData, res);
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Failed to import backup' });
  }
});

export default router;
