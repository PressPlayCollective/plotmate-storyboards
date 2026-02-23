import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractProjectImages, deleteProjectImages } from '../utils/imageExtractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

const router = Router();

/** Validate that an ID is safe (alphanumeric, hyphens, underscores only). */
const SAFE_ID = /^[a-zA-Z0-9_-]+$/;
function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.length < 128 && SAFE_ID.test(id);
}

function readProjects(): any[] {
  try {
    return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeProjects(projects: any[]): void {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
}

// GET /api/projects - list all projects
router.get('/', (_req, res) => {
  try {
    const projects = readProjects();
    res.json(projects);
  } catch (err) {
    console.error('Error reading projects:', err);
    res.status(500).json({ error: 'Failed to read projects' });
  }
});

// GET /api/projects/:id - get single project
router.get('/:id', (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      res.status(400).json({ error: 'Invalid project ID' });
      return;
    }
    const projects = readProjects();
    const project = projects.find((p: any) => p.id === req.params.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (err) {
    console.error('Error reading project:', err);
    res.status(500).json({ error: 'Failed to read project' });
  }
});

// PUT /api/projects/:id - save/update a project
router.put('/:id', (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      res.status(400).json({ error: 'Invalid project ID' });
      return;
    }
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.isBuffer(body)) {
      res.status(400).json({ error: 'Invalid project data' });
      return;
    }
    if (!body.settings || typeof body.settings !== 'object') {
      res.status(400).json({ error: 'Project must include settings object' });
      return;
    }
    const projects = readProjects();
    const projectData = body;
    const projectId = req.params.id;

    // Ensure the id matches
    projectData.id = projectId;

    // Extract base64 images to disk files
    const processed = extractProjectImages(projectData, projectId);

    const existingIndex = projects.findIndex((p: any) => p.id === projectId);
    if (existingIndex > -1) {
      projects[existingIndex] = processed;
    } else {
      projects.push(processed);
    }

    writeProjects(projects);
    res.json({ success: true, project: processed });
  } catch (err) {
    console.error('Error saving project:', err);
    res.status(500).json({ error: 'Failed to save project' });
  }
});

// PUT /api/projects - bulk save all projects (used by sync)
router.put('/', (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      res.status(400).json({ error: 'Expected an array of projects' });
      return;
    }
    const projectsData: any[] = req.body;

    // Validate every project has a safe ID
    for (const project of projectsData) {
      if (!project || typeof project !== 'object' || !isValidId(project.id)) {
        res.status(400).json({ error: 'Each project must have a valid ID' });
        return;
      }
    }
    
    const processed = projectsData.map((project: any) => {
      return extractProjectImages(project, project.id);
    });

    writeProjects(processed);
    res.json({ success: true, count: processed.length });
  } catch (err) {
    console.error('Error bulk saving projects:', err);
    res.status(500).json({ error: 'Failed to save projects' });
  }
});

// DELETE /api/projects/:id - delete a project
router.delete('/:id', (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      res.status(400).json({ error: 'Invalid project ID' });
      return;
    }
    const projects = readProjects();
    const projectId = req.params.id;
    const filtered = projects.filter((p: any) => p.id !== projectId);

    if (filtered.length === projects.length) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Remove image files for this project
    deleteProjectImages(projectId);

    writeProjects(filtered);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
