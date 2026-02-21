import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractLibraryImages } from '../utils/imageExtractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const LIBRARY_FILE = path.join(DATA_DIR, 'library.json');

const router = Router();

function readLibrary(): any {
  try {
    return JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf-8'));
  } catch {
    return { assets: [], folders: [{ id: 'root', name: 'All Assets' }] };
  }
}

function writeLibrary(data: any): void {
  fs.writeFileSync(LIBRARY_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/library - get all library data
router.get('/', (_req, res) => {
  try {
    const library = readLibrary();
    res.json(library);
  } catch (err) {
    console.error('Error reading library:', err);
    res.status(500).json({ error: 'Failed to read library' });
  }
});

// PUT /api/library - save library data
router.put('/', (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      res.status(400).json({ error: 'Library data must be a JSON object' });
      return;
    }
    const libraryData = req.body;

    // Extract base64 images to disk
    const processed = extractLibraryImages(libraryData);

    writeLibrary(processed);
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving library:', err);
    res.status(500).json({ error: 'Failed to save library' });
  }
});

export default router;
