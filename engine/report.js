import fs from 'node:fs/promises';
import path from 'node:path';
import { loadProjectConfig } from './config.js';

export async function writeReport(config, report) {
  const directory = path.join(config.cachePath, 'reports');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'latest.json'), JSON.stringify(report, null, 2), 'utf8');
}

export async function report() {
  const config = await loadProjectConfig();
  const file = path.join(config.cachePath, 'reports', 'latest.json');
  const data = JSON.parse(await fs.readFile(file, 'utf8'));
  console.log(JSON.stringify(data, null, 2));
  return data;
}
