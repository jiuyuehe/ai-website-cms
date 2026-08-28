import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function loadJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

export async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listFiles(directory, extension) {
  if (!(await exists(directory))) return [];
  const results = [];
  async function visit(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(fullPath);
      else if (!extension || entry.name.endsWith(extension)) results.push(fullPath);
    }
  }
  await visit(directory);
  return results.sort((a, b) => a.localeCompare(b));
}

export async function readJsonDirectory(directory) {
  const files = await listFiles(directory, '.json');
  return Promise.all(files.map(async (filePath) => ({ filePath, data: await loadJson(filePath) })));
}

export async function copyDirectory(source, destination) {
  if (!(await exists(source))) return;
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) await copyDirectory(from, to);
    else await fs.copyFile(from, to);
  }
}

export async function hashFile(filePath) {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function hashFiles(files, root) {
  const entries = {};
  for (const filePath of files.sort()) {
    entries[path.relative(root, filePath).replaceAll(path.sep, '/')] = await hashFile(filePath);
  }
  return entries;
}

export function changedFiles(previous = {}, current = {}) {
  const all = new Set([...Object.keys(previous), ...Object.keys(current)]);
  return [...all].filter((file) => previous[file] !== current[file]).sort();
}
