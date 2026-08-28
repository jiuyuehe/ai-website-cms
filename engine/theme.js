import fs from 'node:fs/promises';
import path from 'node:path';
import semver from 'semver';
import Handlebars from 'handlebars';
import menu from 'lucide-static/dist/esm/icons/menu.js';
import arrowLeft from 'lucide-static/dist/esm/icons/arrow-left.js';
import arrowRight from 'lucide-static/dist/esm/icons/arrow-right.js';
import arrowUpRight from 'lucide-static/dist/esm/icons/arrow-up-right.js';
import archive from 'lucide-static/dist/esm/icons/archive.js';
import bookOpen from 'lucide-static/dist/esm/icons/book-open.js';
import building from 'lucide-static/dist/esm/icons/building.js';
import chart from 'lucide-static/dist/esm/icons/chart-no-axes-combined.js';
import check from 'lucide-static/dist/esm/icons/check.js';
import chevronDown from 'lucide-static/dist/esm/icons/chevron-down.js';
import chevronLeft from 'lucide-static/dist/esm/icons/chevron-left.js';
import chevronRight from 'lucide-static/dist/esm/icons/chevron-right.js';
import clock from 'lucide-static/dist/esm/icons/clock.js';
import database from 'lucide-static/dist/esm/icons/database.js';
import download from 'lucide-static/dist/esm/icons/download.js';
import eye from 'lucide-static/dist/esm/icons/eye.js';
import fileClock from 'lucide-static/dist/esm/icons/file-clock.js';
import folder from 'lucide-static/dist/esm/icons/folder.js';
import gauge from 'lucide-static/dist/esm/icons/gauge.js';
import globe from 'lucide-static/dist/esm/icons/globe.js';
import layers from 'lucide-static/dist/esm/icons/layers.js';
import link from 'lucide-static/dist/esm/icons/link.js';
import lock from 'lucide-static/dist/esm/icons/lock.js';
import mail from 'lucide-static/dist/esm/icons/mail.js';
import mapPin from 'lucide-static/dist/esm/icons/map-pin.js';
import messageCircle from 'lucide-static/dist/esm/icons/message-circle.js';
import pause from 'lucide-static/dist/esm/icons/pause.js';
import phone from 'lucide-static/dist/esm/icons/phone.js';
import play from 'lucide-static/dist/esm/icons/play.js';
import plus from 'lucide-static/dist/esm/icons/plus.js';
import rotateCcw from 'lucide-static/dist/esm/icons/rotate-ccw.js';
import route from 'lucide-static/dist/esm/icons/route.js';
import search from 'lucide-static/dist/esm/icons/search.js';
import server from 'lucide-static/dist/esm/icons/server.js';
import settings from 'lucide-static/dist/esm/icons/settings.js';
import shieldCheck from 'lucide-static/dist/esm/icons/shield-check.js';
import shoppingBag from 'lucide-static/dist/esm/icons/shopping-bag.js';
import sparkles from 'lucide-static/dist/esm/icons/sparkles.js';
import userRound from 'lucide-static/dist/esm/icons/user-round.js';
import users from 'lucide-static/dist/esm/icons/users.js';
import workflow from 'lucide-static/dist/esm/icons/workflow.js';
import x from 'lucide-static/dist/esm/icons/x.js';
import { ENGINE_VERSION, resolveProjectPath } from './config.js';
import { exists, listFiles, loadJson } from './loader.js';
import { renderBlocks, renderJsonLd, renderSeoHead } from './renderer.js';

const iconSet = {
  menu,
  'arrow-left': arrowLeft,
  'arrow-right': arrowRight,
  'arrow-up-right': arrowUpRight,
  archive,
  'book-open': bookOpen,
  building,
  'chart-no-axes-combined': chart,
  check,
  'chevron-down': chevronDown,
  'chevron-left': chevronLeft,
  'chevron-right': chevronRight,
  clock,
  database,
  download,
  eye,
  'file-clock': fileClock,
  folder,
  gauge,
  globe,
  layers,
  link,
  lock,
  mail,
  'map-pin': mapPin,
  'message-circle': messageCircle,
  pause,
  phone,
  play,
  plus,
  'rotate-ccw': rotateCcw,
  route,
  search,
  server,
  settings,
  'shield-check': shieldCheck,
  'shopping-bag': shoppingBag,
  sparkles,
  'user-round': userRound,
  users,
  workflow,
  x
};
const requiredTemplateKeys = ['home', 'productsIndex', 'productDetail', 'casesIndex', 'caseDetail', 'newsIndex', 'newsDetail', 'downloadsIndex', 'faqIndex', 'notFound'];
const supportedHelpers = new Set(['addOne', 'assetUrl', 'date', 'icon', 'jsonLd', 'renderBlocks', 'seoHead']);

function decorativeIcon(name) {
  const source = iconSet[String(name)] || iconSet.layers;
  return source.replace('<svg', '<svg aria-hidden="true" focusable="false"');
}

function validateManifest(manifest, id) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error(`Theme manifest is invalid: ${id}`);
  if (typeof manifest.version !== 'string' || !semver.valid(manifest.version)) throw new Error(`Theme ${id} must declare a valid semver version.`);
  if (typeof manifest.engine !== 'string' || !semver.validRange(manifest.engine)) throw new Error(`Theme ${id} must declare a valid engine range.`);
  if (!manifest.templates || typeof manifest.templates !== 'object' || Array.isArray(manifest.templates)) throw new Error(`Theme ${id} must declare templates.`);
  const missingTemplates = requiredTemplateKeys.filter((key) => typeof manifest.templates[key] !== 'string' || !manifest.templates[key]);
  if (missingTemplates.length) throw new Error(`Theme ${id} is missing templates: ${missingTemplates.join(', ')}.`);
  if (!manifest.assets || !Array.isArray(manifest.assets.styles) || !Array.isArray(manifest.assets.scripts)) throw new Error(`Theme ${id} must declare assets.styles and assets.scripts arrays.`);
  if (!Array.isArray(manifest.requiredHelpers)) throw new Error(`Theme ${id} must declare requiredHelpers as an array.`);
  const unknownHelpers = manifest.requiredHelpers.filter((helper) => !supportedHelpers.has(helper));
  if (unknownHelpers.length) throw new Error(`Theme ${id} requires unsupported helpers: ${unknownHelpers.join(', ')}.`);
}

function partialName(filePath, partialRoot) {
  return path.relative(partialRoot, filePath).replaceAll(path.sep, '/').replace(/\.hbs$/, '');
}

export async function listThemes(config) {
  if (!(await exists(config.themesPath))) return [];
  const entries = await fs.readdir(config.themesPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

export async function loadTheme(config, requestedId = config.theme) {
  const id = requestedId || config.theme;
  const themePath = resolveProjectPath(config.themesPath, id, 'theme');
  const manifestPath = path.join(themePath, 'theme.json');
  const tokensPath = path.join(themePath, 'tokens.json');
  if (!(await exists(manifestPath))) throw new Error(`Theme manifest not found: ${id}`);
  const manifest = await loadJson(manifestPath);
  const tokens = (await exists(tokensPath)) ? await loadJson(tokensPath) : {};
  validateManifest(manifest, id);
  if (manifest.id !== id) throw new Error(`Theme manifest id does not match directory: ${id}`);
  if (manifest.themeApiVersion !== 1) throw new Error(`Unsupported theme API version: ${manifest.themeApiVersion}`);
  if (!semver.satisfies(ENGINE_VERSION, manifest.engine)) throw new Error(`Theme ${id}@${manifest.version} does not support engine ${ENGINE_VERSION}`);

  const templateRoot = path.join(themePath, 'templates');
  const partialFiles = await listFiles(templateRoot, '.hbs');
  const handlebars = Handlebars.create();
  for (const filePath of partialFiles) {
    const name = partialName(filePath, templateRoot);
    if (name.startsWith('pages/')) continue;
    handlebars.registerPartial(name, await fs.readFile(filePath, 'utf8'));
  }

  handlebars.registerHelper('assetUrl', function assetUrl(source, options) {
    const value = String(source || '').replace(/^\/+/, '');
    return `${options.data.root.paths.assets}/${value}`;
  });
  handlebars.registerHelper('addOne', (value) => Number(value || 0) + 1);
  handlebars.registerHelper('icon', (name) => new handlebars.SafeString(decorativeIcon(name)));
  handlebars.registerHelper('date', (value) => {
    const source = String(value || '');
    if (!source) return '';
    const parsed = new Date(`${source}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return source;
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }).format(parsed).replaceAll('/', '.');
  });
  handlebars.registerHelper('jsonLd', (value) => renderJsonLd(value));
  handlebars.registerHelper('seoHead', (page, options) => renderSeoHead(page, options.data.root));
  handlebars.registerHelper('renderBlocks', (blocks, options) => renderBlocks(blocks, options.data.root));

  const templates = {};
  for (const [key, relativePath] of Object.entries(manifest.templates)) {
    const templatePath = resolveProjectPath(themePath, path.join('templates', relativePath), `theme template ${key}`);
    if (!(await exists(templatePath))) throw new Error(`Theme ${id} template not found: ${relativePath}`);
    templates[key] = handlebars.compile(await fs.readFile(templatePath, 'utf8'), { noEscape: false });
  }

  const styles = manifest.assets.styles.map((file) => resolveProjectPath(themePath, path.join('assets', file), `theme style ${file}`));
  const scripts = manifest.assets.scripts.map((file) => resolveProjectPath(themePath, path.join('assets', file), `theme script ${file}`));
  for (const file of [...styles, ...scripts]) if (!(await exists(file))) throw new Error(`Theme asset not found: ${file}`);

  return { id, root: themePath, manifest, tokens, templates, styles, scripts };
}

export function renderTheme(theme, key, viewModel) {
  if (!theme.templates[key]) throw new Error(`Theme ${theme.id} does not implement template: ${key}`);
  return theme.templates[key](viewModel);
}
