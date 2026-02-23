import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const router = Router();

function readSettings(): Record<string, any> {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeSettings(data: Record<string, any>): void {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/settings - get all settings
router.get('/', (_req, res) => {
  try {
    const settings = readSettings();
    res.json(settings);
  } catch (err) {
    console.error('Error reading settings:', err);
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// PUT /api/settings - save all settings (full replace, but preserves API keys)
router.put('/', (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      res.status(400).json({ error: 'Settings must be a JSON object' });
      return;
    }
    const current = readSettings();
    const incoming = req.body;
    // Preserve API keys if not explicitly provided in the incoming payload
    const API_KEYS = ['gemini_api_key', 'openai_api_key', 'midjourney_api_key'];
    for (const key of API_KEYS) {
      if (current[key] && !(key in incoming)) {
        incoming[key] = current[key];
      }
    }
    writeSettings(incoming);
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// PATCH /api/settings - merge partial settings
router.patch('/', (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      res.status(400).json({ error: 'Settings updates must be a JSON object' });
      return;
    }
    const current = readSettings();
    const updates = req.body;
    const merged = { ...current, ...updates };
    writeSettings(merged);
    res.json({ success: true, settings: merged });
  } catch (err) {
    console.error('Error patching settings:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
