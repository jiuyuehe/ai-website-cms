import fs from 'node:fs/promises';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { loadProjectConfig } from './config.js';
import { exists, listFiles, loadJson, readJsonDirectory } from './loader.js';
import { loadTheme } from './theme.js';
import { ValidationError } from './errors.js';
import { detailRoute, routes as pageRoutes } from './routes.js';

const schemaNames = ['project', 'site', 'home', 'pricing', 'product', 'case', 'news', 'download', 'faq'];

function formatAjvError(filePath, error) {
  const location = error.instancePath || '/';
  return `${filePath}${location}: ${error.message}`;
}

function addDetail(details, message) {
  details.push(message);
}

async function createAjv(root) {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  for (const name of schemaNames) {
    const schema = await loadJson(path.join(root, 'schemas', `${name}.schema.json`));
    ajv.addSchema(schema, name);
  }
  return ajv;
}

async function validateJson(ajv, schemaName, filePath, details) {
  const data = await loadJson(filePath);
  const valid = ajv.getSchema(schemaName)(data);
  if (!valid) for (const error of ajv.getSchema(schemaName).errors || []) addDetail(details, formatAjvError(filePath, error));
  return data;
}

function collectAssetPaths(site, home, pricing, collections) {
  const assets = [];
  const add = (value, source) => { if (value) assets.push({ value, source }); };
  const addMedia = (media, source) => {
    if (!media || typeof media !== 'object') return;
    add(media.src, `${source}.src`);
    add(media.mobileSrc, `${source}.mobileSrc`);
    add(media.video, `${source}.video`);
    add(media.poster, `${source}.poster`);
  };
  add(site.logo?.src, 'site.logo.src');
  add(site.favicon, 'site.favicon');
  add(site.seo?.image, 'site.seo.image');
  add(home.hero?.image, 'home.hero.image');
  addMedia(home.hero?.media, 'home.hero.media');
  add(pricing?.seo?.image, 'pricing.seo.image');
  for (const [index, slide] of (home.hero?.slides || []).entries()) addMedia(slide.media, `home.hero.slides[${index}].media`);
  for (const item of collections.products) {
    add(item.data.cover?.src, `${item.filePath}:cover.src`);
    add(item.data.mobileCover?.src, `${item.filePath}:mobileCover.src`);
    for (const [index, image] of (item.data.gallery || []).entries()) add(image.src, `${item.filePath}:gallery[${index}].src`);
    add(item.data.seo?.image, `${item.filePath}:seo.image`);
  }
  for (const item of collections.cases) { add(item.data.cover?.src, `${item.filePath}:cover.src`); add(item.data.seo?.image, `${item.filePath}:seo.image`); }
  for (const item of collections.news) {
    add(item.data.cover?.src, `${item.filePath}:cover.src`); add(item.data.seo?.image, `${item.filePath}:seo.image`);
    for (const block of item.data.blocks || []) if (block.type === 'image') add(block.src, `${item.filePath}:blocks.image`);
  }
  for (const item of collections.downloads) add(item.data.file, `${item.filePath}:file`);
  return assets;
}

function validateReferences(site, home, collections, details) {
  const ids = (items) => new Set(items.map((item) => item.data.id));
  const productIds = ids(collections.products);
  const caseIds = ids(collections.cases);
  const downloadIds = ids(collections.downloads);
  const faqIds = ids(collections.faqs);
  const check = (value, set, source) => { if (!set.has(value)) addDetail(details, `${source}: referenced id does not exist: ${value}`); };
  for (const id of home.featuredProductIds || []) check(id, productIds, 'content/pages/home.json:featuredProductIds');
  for (const id of home.featuredCaseIds || []) check(id, caseIds, 'content/pages/home.json:featuredCaseIds');
  for (const item of collections.cases) for (const id of item.data.productIds) check(id, productIds, `${item.filePath}:productIds`);
  for (const item of collections.downloads) for (const id of item.data.productIds) check(id, productIds, `${item.filePath}:productIds`);
  for (const item of collections.products) for (const id of item.data.content.downloads) check(id, downloadIds, `${item.filePath}:content.downloads`);
  for (const item of collections.faqs) for (const id of item.data.productIds) check(id, productIds, `${item.filePath}:productIds`);
  const internalRoutes = new Set(Object.values(pageRoutes));
  if (pageRoutes.pricingIndex) internalRoutes.add(pageRoutes.pricingIndex);
  for (const [module, items] of [['products', collections.products], ['cases', collections.cases], ['news', collections.news]]) {
    for (const item of items) internalRoutes.add(detailRoute(module, item.data.id));
  }
  const isAllowedActionRoute = (route) => (
    typeof route === 'string'
    && (route.startsWith('#') || /^(?:mailto|tel):/i.test(route) || /^https?:\/\//i.test(route) || internalRoutes.has(route))
  );
  const checkAction = (action, source) => {
    if (action?.route && !isAllowedActionRoute(action.route)) addDetail(details, `${source}: unsupported internal route ${action.route}`);
  };
  const checkNavigation = (items, source) => {
    for (const [index, item] of (items || []).entries()) {
      if (item.route && !internalRoutes.has(item.route)) addDetail(details, `${source}[${index}]: unsupported internal route ${item.route}`);
      checkNavigation(item.children, `${source}[${index}].children`);
    }
  };
  checkNavigation(site.navigation, 'content/site.json:/navigation');
  checkNavigation(site.utilityNavigation, 'content/site.json:/utilityNavigation');
  for (const [index, group] of (site.footerGroups || []).entries()) checkNavigation(group.items, `content/site.json:/footerGroups[${index}].items`);
  for (const [index, action] of (site.headerActions || []).entries()) checkAction(action, `content/site.json:/headerActions[${index}]`);
  checkAction(home.hero?.primaryAction, 'content/pages/home.json:/hero/primaryAction');
  checkAction(home.hero?.secondaryAction, 'content/pages/home.json:/hero/secondaryAction');
  for (const [slideIndex, slide] of (home.hero?.slides || []).entries()) {
    for (const [actionIndex, action] of (slide.actions || []).entries()) checkAction(action, `content/pages/home.json:/hero/slides[${slideIndex}]/actions[${actionIndex}]`);
  }
  for (const item of collections.products) {
    checkAction(item.data.purchaseAction, `${item.filePath}:purchaseAction`);
    checkAction(item.data.secondaryAction, `${item.filePath}:secondaryAction`);
  }
  const warnings = [];
  if (site.origin.includes('.example')) warnings.push('site.origin uses a reserved .example domain; replace it before deployment.');
  return warnings;
}

async function validateAssets(config, site, home, pricing, collections, details) {
  for (const { value, source } of collectAssetPaths(site, home, pricing, collections)) {
    if (/^https?:\/\//i.test(value)) {
      addDetail(details, `${source}: external assets are not allowed, use public/${value}`);
      continue;
    }
    const absolute = path.resolve(config.publicPath, value.replace(/^\/+/, ''));
    const relative = path.relative(config.publicPath, absolute);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) addDetail(details, `${source}: asset leaves public directory: ${value}`);
    else if (!(await exists(absolute))) addDetail(details, `${source}: asset does not exist: public/${value}`);
  }
}

export async function validateProject({ root = process.cwd(), themeOverride } = {}) {
  const config = await loadProjectConfig(root, themeOverride);
  const details = [];
  const warnings = [];
  const ajv = await createAjv(root);
  const configValid = ajv.getSchema('project')(await loadJson(config.configPath));
  if (!configValid) for (const error of ajv.getSchema('project').errors || []) addDetail(details, formatAjvError(config.configPath, error));

  const sitePath = path.join(config.contentPath, 'site.json');
  const homePath = path.join(config.contentPath, 'pages', 'home.json');
  const pricingPath = path.join(config.contentPath, 'pages', 'pricing.json');
  const site = await validateJson(ajv, 'site', sitePath, details);
  const home = await validateJson(ajv, 'home', homePath, details);
  const pricing = (await exists(pricingPath)) ? await validateJson(ajv, 'pricing', pricingPath, details) : null;
  const specs = [
    ['products', 'product'], ['cases', 'case'], ['news', 'news'], ['downloads', 'download'], ['faqs', 'faq']
  ];
  const collections = {};
  for (const [directory, schema] of specs) {
    collections[directory] = [];
    for (const item of await readJsonDirectory(path.join(config.contentPath, directory))) {
      const data = await validateJson(ajv, schema, item.filePath, details);
      collections[directory].push({ ...item, data });
    }
  }
  const duplicateIds = new Set();
  for (const [directory, items] of Object.entries(collections)) {
    const seen = new Set();
    for (const item of items) {
      if (seen.has(item.data.id)) addDetail(details, `${directory}: duplicate id ${item.data.id}`);
      if (duplicateIds.has(item.data.id)) addDetail(details, `${item.filePath}: duplicate id across content collections ${item.data.id}`);
      seen.add(item.data.id); duplicateIds.add(item.data.id);
    }
  }
  warnings.push(...validateReferences(site, home, collections, details));
  await validateAssets(config, site, home, pricing, collections, details);
  let theme;
  try { theme = await loadTheme(config, themeOverride); } catch (error) { addDetail(details, error.message); }
  if (details.length) throw new ValidationError(details);
  return { config, site, home, pricing, collections, theme, warnings };
}

export async function validateTheme(config, themeId) {
  return loadTheme(config, themeId);
}

export async function sourceFilesForProject(project) {
  const { config } = project;
  const files = [config.configPath, path.join(config.contentPath, 'site.json'), path.join(config.contentPath, 'pages', 'home.json'), path.join(config.contentPath, 'pages', 'pricing.json')];
  for (const directory of ['products', 'cases', 'news', 'downloads', 'faqs']) files.push(...await listFiles(path.join(config.contentPath, directory), '.json'));
  files.push(...await listFiles(config.publicPath));
  files.push(...await listFiles(project.theme.root));
  files.push(...await listFiles(path.join(config.root, 'schemas'), '.json'));
  return [...new Set(files)];
}
