import fs from 'node:fs/promises';
import path from 'node:path';

export const ENGINE_VERSION = '5.0.0';

export function projectRoot(cwd = process.cwd()) {
  return path.resolve(cwd);
}

export function resolveProjectPath(root, relativePath, label = 'path') {
  const absolute = path.resolve(root, relativePath);
  const relative = path.relative(root, absolute);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside the project: ${relativePath}`);
  }
  return absolute;
}

export async function loadProjectConfig(root = projectRoot(), themeOverride) {
  const configPath = path.join(root, 'ai-cms.config.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  const resolved = {
    ...config,
    theme: themeOverride || config.theme,
    root,
    configPath,
    contentPath: resolveProjectPath(root, config.contentDir, 'contentDir'),
    themesPath: resolveProjectPath(root, config.themesDir, 'themesDir'),
    publicPath: resolveProjectPath(root, config.publicDir, 'publicDir'),
    outputPath: resolveProjectPath(root, config.outputDir, 'outputDir'),
    cachePath: resolveProjectPath(root, config.cacheDir, 'cacheDir')
  };
  return resolved;
}

export function normalizeBasePath(value) {
  const normalized = value || '/';
  if (!normalized.startsWith('/')) return `/${normalized}`;
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}
