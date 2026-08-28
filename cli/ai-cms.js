#!/usr/bin/env node
import { build } from '../engine/builder.js';
import { loadProjectConfig } from '../engine/config.js';
import { report } from '../engine/report.js';
import { preview } from '../engine/preview.js';
import { validateProject, validateTheme } from '../engine/validator.js';
import { listThemes } from '../engine/theme.js';

function help() {
  console.log(`ai-cms build [all|products|cases|news|downloads|faq] [--changed] [--theme <id>]
ai-cms validate [--theme <id>]
ai-cms report [--json]
ai-cms preview [--port <port>]
ai-cms theme list
ai-cms theme validate <id|--all>`);
}

function parseArgs(tokens) {
  const positional = [];
  const flags = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === '--changed') flags.changed = true;
    else if (token === '--json') flags.json = true;
    else if (token === '--all') flags.all = true;
    else if (token === '--theme') flags.theme = tokens[++index];
    else if (token.startsWith('--theme=')) flags.theme = token.slice('--theme='.length);
    else if (token === '--port') flags.port = Number(tokens[++index]);
    else if (token.startsWith('--port=')) flags.port = Number(token.slice('--port='.length));
    else if (token.startsWith('--')) throw new Error(`Unknown option: ${token}`);
    else positional.push(token);
  }
  return { positional, flags };
}

async function main() {
  const [command, ...tokens] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') { help(); return; }
  const { positional, flags } = parseArgs(tokens);
  if (command === 'build') {
    const module = positional[0] || 'all';
    if (!['all', 'products', 'cases', 'news', 'downloads', 'faq'].includes(module)) throw new Error(`Unknown build module: ${module}`);
    await build({ module, changed: Boolean(flags.changed), theme: flags.theme });
    return;
  }
  if (command === 'validate') {
    const project = await validateProject({ themeOverride: flags.theme });
    console.log(`Validation passed for theme ${project.theme.id}.`);
    for (const warning of project.warnings) console.warn(`Warning: ${warning}`);
    return;
  }
  if (command === 'report') { await report(); return; }
  if (command === 'preview') { await preview({ port: flags.port || 4173 }); return; }
  if (command === 'theme') {
    const action = positional[0];
    const config = await loadProjectConfig();
    if (action === 'list') { for (const id of await listThemes(config)) console.log(id); return; }
    if (action === 'validate') {
      const ids = flags.all ? await listThemes(config) : [positional[1]];
      if (!ids[0]) throw new Error('Theme id is required.');
      for (const id of ids) { await validateTheme(config, id); console.log(`Theme ${id} is compatible.`); }
      return;
    }
  }
  throw new Error(`Unknown command: ${command}`);
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  if (error.details) for (const detail of error.details) console.error(`  ${detail}`);
  process.exitCode = error.name === 'ValidationError' ? 1 : 2;
}
