import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(import.meta.dirname || __dirname, '..', '..', 'data');

/**
 * Resolve a path under a base directory and verify it doesn't escape.
 * Prevents path traversal attacks from user-controlled segments (e.g. project IDs, filenames).
 */
function safePath(base: string, ...segments: string[]): string {
  const resolvedBase = path.resolve(base);
  const resolved = path.resolve(base, ...segments);
  if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

/**
 * Checks if a string is a base64 data URI (data:image/...)
 */
function isBase64Image(str: string): boolean {
  return typeof str === 'string' && str.startsWith('data:image/');
}

/**
 * Checks if a string is a server-managed image URL (/api/images/...)
 */
function isServerImageUrl(str: string): boolean {
  return typeof str === 'string' && str.startsWith('/api/images/');
}

/**
 * Get file extension from a base64 data URI
 */
function getExtFromDataUri(dataUri: string): string {
  const match = dataUri.match(/^data:image\/(\w+)/);
  if (!match) return 'jpg';
  const mime = match[1].toLowerCase();
  if (mime === 'jpeg') return 'jpg';
  return mime;
}

/**
 * Save a base64 data URI to disk and return the server URL path.
 * @param base64 The data URI string
 * @param category Subdirectory under images/ (e.g., "projects/<id>/shots")
 * @param filename The filename (without extension)
 * @returns The URL path like /api/images/projects/<id>/shots/<filename>.jpg
 */
export function saveBase64ToDisk(base64: string, category: string, filename: string): string {
  const ext = getExtFromDataUri(base64);
  // Validate that the resolved directory stays inside DATA_DIR/images
  const absDir = safePath(DATA_DIR, 'images', category);

  if (!fs.existsSync(absDir)) {
    fs.mkdirSync(absDir, { recursive: true });
  }

  // Strip data URI prefix to get raw base64
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  // Validate that the file path stays inside the target directory
  const filePath = safePath(absDir, `${filename}.${ext}`);
  fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

  return `/api/images/${category}/${filename}.${ext}`;
}

/**
 * Read a server image URL from disk and return as base64 data URI.
 * @param serverUrl The URL path like /api/images/projects/<id>/shots/<filename>.jpg
 * @returns The base64 data URI, or the original URL if the file doesn't exist
 */
export function readImageAsBase64(serverUrl: string): string {
  if (!isServerImageUrl(serverUrl)) return serverUrl;

  // /api/images/xxx -> data/images/xxx
  const relativePath = serverUrl.replace('/api/images/', '');
  const absPath = safePath(DATA_DIR, 'images', relativePath);

  if (!fs.existsSync(absPath)) return serverUrl;

  const buffer = fs.readFileSync(absPath);
  const ext = path.extname(absPath).slice(1).toLowerCase();
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  return `data:image/${mime};base64,${buffer.toString('base64')}`;
}

/**
 * Delete an image file referenced by a server URL.
 */
export function deleteImage(serverUrl: string): void {
  if (!isServerImageUrl(serverUrl)) return;
  const relativePath = serverUrl.replace('/api/images/', '');
  const absPath = safePath(DATA_DIR, 'images', relativePath);
  if (fs.existsSync(absPath)) {
    fs.unlinkSync(absPath);
  }
}

/**
 * Delete a directory of images for a project.
 */
export function deleteProjectImages(projectId: string): void {
  const dir = safePath(DATA_DIR, 'images', 'projects', projectId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---- Generic deep extraction/re-embedding ----

interface ImageField {
  path: string[]; // JSON path to the field
  value: string;  // base64 or URL
}

/**
 * Find all string fields in an object that contain base64 image data.
 */
function findBase64Fields(obj: any, currentPath: string[] = []): ImageField[] {
  const results: ImageField[] = [];
  if (obj === null || obj === undefined) return results;

  if (typeof obj === 'string') {
    if (isBase64Image(obj)) {
      results.push({ path: currentPath, value: obj });
    }
    return results;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      results.push(...findBase64Fields(obj[i], [...currentPath, String(i)]));
    }
    return results;
  }

  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      results.push(...findBase64Fields(obj[key], [...currentPath, key]));
    }
  }

  return results;
}

/**
 * Find all string fields that contain server image URLs.
 */
function findServerUrlFields(obj: any, currentPath: string[] = []): ImageField[] {
  const results: ImageField[] = [];
  if (obj === null || obj === undefined) return results;

  if (typeof obj === 'string') {
    if (isServerImageUrl(obj)) {
      results.push({ path: currentPath, value: obj });
    }
    return results;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      results.push(...findServerUrlFields(obj[i], [...currentPath, String(i)]));
    }
    return results;
  }

  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      results.push(...findServerUrlFields(obj[key], [...currentPath, key]));
    }
  }

  return results;
}

/**
 * Set a value at a given path in an object.
 */
function setAtPath(obj: any, pathArr: string[], value: any): void {
  let current = obj;
  for (let i = 0; i < pathArr.length - 1; i++) {
    current = current[pathArr[i]];
  }
  current[pathArr[pathArr.length - 1]] = value;
}

/**
 * Extract all base64 images from a project object, save them to disk,
 * and replace inline data with server URL paths.
 * @param project The project object (mutated in place)
 * @param projectId The project ID for directory naming
 * @returns The mutated project with URLs instead of base64
 */
export function extractProjectImages(project: any, projectId: string): any {
  const fields = findBase64Fields(project);

  for (const field of fields) {
    // Build a meaningful filename from the JSON path
    // e.g. ["settings","actors","0","photo"] -> "settings_actors_0_photo"
    const filename = field.path.join('_');
    const category = `projects/${projectId}`;
    const url = saveBase64ToDisk(field.value, category, filename);
    setAtPath(project, field.path, url);
  }

  return project;
}

/**
 * Re-embed all server image URLs in a project with their base64 data.
 * Used for export. Does NOT mutate the original - returns a deep copy.
 */
export function reEmbedProjectImages(project: any): any {
  const copy = JSON.parse(JSON.stringify(project));
  const fields = findServerUrlFields(copy);

  for (const field of fields) {
    const base64 = readImageAsBase64(field.value);
    setAtPath(copy, field.path, base64);
  }

  return copy;
}

/**
 * Extract all base64 images from library data, save them to disk,
 * and replace inline data with server URL paths.
 */
export function extractLibraryImages(libraryData: any): any {
  const fields = findBase64Fields(libraryData);

  for (const field of fields) {
    const filename = field.path.join('_');
    const category = 'library';
    const url = saveBase64ToDisk(field.value, category, filename);
    setAtPath(libraryData, field.path, url);
  }

  return libraryData;
}

/**
 * Re-embed all server image URLs in library data with base64.
 */
export function reEmbedLibraryImages(libraryData: any): any {
  const copy = JSON.parse(JSON.stringify(libraryData));
  const fields = findServerUrlFields(copy);

  for (const field of fields) {
    const base64 = readImageAsBase64(field.value);
    setAtPath(copy, field.path, base64);
  }

  return copy;
}
