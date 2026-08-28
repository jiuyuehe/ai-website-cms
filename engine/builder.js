import fs from 'node:fs/promises';
import path from 'node:path';
import { ENGINE_VERSION, loadProjectConfig, normalizeBasePath } from './config.js';
import { copyDirectory, exists, hashFiles, loadJson, changedFiles } from './loader.js';
import { validateProject, sourceFilesForProject } from './validator.js';
import { detailRoute, moduleNames, pagePaths, relativeRoute, routes } from './routes.js';
import { pageSeo, siteUrl } from './seo.js';
import { renderTheme } from './theme.js';
import { writeReport } from './report.js';
import { auditOutput } from './audit.js';

function published(items) {
  return items.map((entry) => entry.data).filter((item) => item.status === 'published').sort((a, b) => {
    // 新闻等带 publishedAt 的内容按发布时间倒序（最新在前）
    const dateA = a.publishedAt || '';
    const dateB = b.publishedAt || '';
    if (dateA || dateB) return String(dateB).localeCompare(String(dateA));
    return (a.order || 0) - (b.order || 0) || String(a.title).localeCompare(String(b.title));
  });
}

function collection(project, name) {
  return published(project.collections[name] || []);
}

function latestDate(items) {
  return items.map((item) => item.updatedAt || item.publishedAt).filter(Boolean).sort().at(-1);
}

function xmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function sitemapEntries(project) {
  const products = collection(project, 'products');
  const cases = collection(project, 'cases');
  const news = collection(project, 'news');
  const downloads = collection(project, 'downloads');
  const faqs = collection(project, 'faqs');
  const allContent = [...products, ...cases, ...news, ...downloads, ...faqs];
  const entries = [
    { route: routes.home, lastmod: latestDate(allContent) },
    { route: routes.pricingIndex, lastmod: latestDate(allContent) },
    { route: routes.productsIndex, lastmod: latestDate(products) },
    { route: routes.casesIndex, lastmod: latestDate(cases) },
    { route: routes.newsIndex, lastmod: latestDate(news) },
    { route: routes.downloadsIndex, lastmod: latestDate(downloads) },
    { route: routes.faqIndex, lastmod: latestDate(faqs) }
  ];
  for (const [module, items] of [['products', products], ['cases', cases], ['news', news]]) {
    for (const item of items) entries.push({ route: detailRoute(module, item.id), lastmod: item.updatedAt || item.publishedAt });
  }
  return entries;
}

function relativeAssetPath(route, source) {
  return relativeRoute(route, `assets/content/${String(source).replace(/^\/+/, '')}`);
}

function buildLinks(route) {
  return {
    home: relativeRoute(route, routes.home), pricing: relativeRoute(route, routes.pricingIndex), products: relativeRoute(route, routes.productsIndex), cases: relativeRoute(route, routes.casesIndex), news: relativeRoute(route, routes.newsIndex), downloads: relativeRoute(route, routes.downloadsIndex), faq: relativeRoute(route, routes.faqIndex), contact: `${relativeRoute(route, routes.home)}#contact`
  };
}

function targetHref(route, target) {
  const value = String(target || '');
  if (!value) return '';
  if (value.startsWith('#') || value.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(value)) return value;
  return relativeRoute(route, value);
}

function actionView(route, action) {
  return action ? { ...action, href: targetHref(route, action.route) } : undefined;
}

function isRouteActive(route, target) {
  if (!target) return false;
  const prefix = target.endsWith('index.html') ? target.slice(0, -'index.html'.length) : target;
  return route === target || Boolean(prefix && route.startsWith(prefix));
}

function navigationViews(items, route) {
  return (items || []).map((item) => ({
    ...item,
    href: targetHref(route, item.route),
    active: isRouteActive(route, item.route),
    children: navigationViews(item.children, route)
  }));
}

function normalizeHero(project, route) {
  const { site, home } = project;
  const hero = home.hero;
  const legacySlide = {
    id: 'legacy-hero',
    eyebrow: `${site.shortName} / FEATURED`,
    title: site.name,
    summary: hero.summary,
    media: { src: hero.image, alt: `${site.name}精选内容` },
    actions: [hero.primaryAction, hero.secondaryAction].filter(Boolean),
    tone: 'dark'
  };
  const sourceSlides = Array.isArray(hero.slides) && hero.slides.length ? hero.slides : [legacySlide];
  const slides = sourceSlides.map((slide, index) => ({
    ...slide,
    id: slide.id || `slide-${index + 1}`,
    media: { ...slide.media, alt: slide.media?.alt || slide.title || site.name },
    actions: (slide.actions || []).map((action) => actionView(route, action)),
    tone: slide.tone || 'auto'
  }));
  const first = slides[0];
  return {
    ...hero,
    image: first.media.src,
    summary: first.summary,
    primaryAction: first.actions[0],
    secondaryAction: first.actions[1],
    slides
  };
}

function itemView(route, item, module) {
  const view = { ...item, href: relativeRoute(route, detailRoute(module, item.id)) };
  if (module === 'products') {
    view.purchaseAction = actionView(route, item.purchaseAction);
    view.secondaryAction = actionView(route, item.secondaryAction);
  }
  return view;
}

function buildSearchIndex(project, route) {
  const entries = [];
  const add = (typeLabel, item, href, summary) => {
    entries.push({ typeLabel, title: item.title || item.question, summary: summary || item.summary || item.description || item.answer || '', href });
  };
  for (const item of collection(project, 'products')) add('产品', item, relativeRoute(route, detailRoute('products', item.id)));
  for (const item of collection(project, 'cases')) add('案例', item, relativeRoute(route, detailRoute('cases', item.id)));
  for (const item of collection(project, 'news')) add('文章', item, relativeRoute(route, detailRoute('news', item.id)));
  for (const item of collection(project, 'downloads')) add('下载', item, relativeAssetPath(route, item.file), item.description);
  for (const item of collection(project, 'faqs')) add('FAQ', item, `${relativeRoute(route, routes.faqIndex)}#${item.id}`, item.answer);
  return entries;
}

function buildViewModel(project, route, page, kind = 'page') {
  const { site, theme } = project;
  const themeFiles = theme.manifest.assets;
  const paths = pagePaths(route, theme.id, themeFiles.styles, themeFiles.scripts);
  const lightTokens = theme.tokens?.light || theme.tokens || {};
  const darkTokens = theme.tokens?.dark || lightTokens;
  const navLinks = navigationViews(site.navigation, route);
  const utilityNavLinks = navigationViews(site.utilityNavigation?.length ? site.utilityNavigation : site.navigation, route);
  const headerActions = (site.headerActions?.length ? site.headerActions : [{ label: '联系我们', route: `mailto:${site.contact.email}` }]).map((action) => actionView(route, action));
  const footerGroups = (site.footerGroups || []).map((group) => ({ ...group, items: navigationViews(group.items, route) }));
  const links = buildLinks(route);
  return {
    site: { ...site, year: site.copyrightYear, navLinks, utilityNavLinks, headerActions, footerGroups, contact: { ...site.contact, phoneHref: site.contact.phone.replace(/[^+\d]/g, '') } },
    theme: { id: theme.id, styles: paths.themeStyles, scripts: paths.themeScripts, tokens: theme.tokens, metaThemeColors: { light: lightTokens.surface || '#ffffff', dark: darkTokens.surface || lightTokens.surface || '#111111' } },
    paths,
    links,
    searchIndex: buildSearchIndex(project, route),
    page: { ...page, kind }
  };
}

function pageForItem(project, route, item, module, kind) {
  return {
    item: itemView(route, item, module),
    seo: pageSeo(project.site, item.seo, route, kind, item),
    canonical: siteUrl(project.site, route)
  };
}

function indexItems(project, route, items, module, kind) {
  return items.map((item) => itemView(route, item, module));
}

function homePage(project, route) {
  const products = collection(project, 'products');
  const cases = collection(project, 'cases');
  const news = collection(project, 'news');
  const featuredProducts = (project.home.featuredProductIds || []).map((id) => products.find((item) => item.id === id)).filter(Boolean);
  const featuredCases = (project.home.featuredCaseIds || []).map((id) => cases.find((item) => item.id === id)).filter(Boolean);
  return {
    hero: normalizeHero(project, route),
    intro: project.home.intro,
    capabilities: project.home.capabilities,
    features: project.home.features || [],
    valueBand: project.home.valueBand,
    pricing: project.home.pricing,
    roadmap: project.home.roadmap,
    private: project.home.private,
    sectionHeadings: project.home.sectionHeadings || {},
    products: indexItems(project, route, featuredProducts.length ? featuredProducts : products.slice(0, 2), 'products', 'product'),
    cases: indexItems(project, route, featuredCases.length ? featuredCases : cases.slice(0, 1), 'cases', 'case'),
    news: news.slice(0, 4).map((item) => ({ ...item, href: relativeRoute(route, detailRoute('news', item.id)) })),
    seo: pageSeo(project.site, project.site.seo, route, 'home', project.site)
  };
}

function collectionPage(project, route, module, templateKey, title) {
  const items = collection(project, module === 'faq' ? 'faqs' : module);
  const itemViews = module === 'faq' ? items : indexItems(project, route, items, module, module === 'news' ? 'news' : module === 'cases' ? 'case' : module === 'products' ? 'product' : 'download');
  if (module === 'downloads') for (const item of itemViews) item.href = relativeAssetPath(route, item.file);
  const seoSource = module === 'faq'
    ? { title: `常见问题 | ${project.site.name}`, description: `${project.site.name}企业智能服务解决方案常见问题。`, keywords: ['企业AI', '常见问题'] }
    : { title: `${title} | ${project.site.name}`, description: `浏览${project.site.name}的${title}与企业智能服务解决方案。`, keywords: [title, '企业AI'] };
  return { templateKey, view: { items: itemViews, seo: pageSeo(project.site, seoSource, route, module === 'faq' ? 'faq' : 'page', module === 'faq' ? itemViews : project.site) } };
}

async function writePage(stage, project, route, templateKey, page, kind) {
  const view = buildViewModel(project, route, page, kind);
  const html = `<!-- Generated by ai-cms. Edit content or themes, not dist. -->\n${renderTheme(project.theme, templateKey, view)}`;
  const output = path.join(stage, route);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, html, 'utf8');
}

async function removeModuleOutput(stage, module) {
  const directory = path.join(stage, module);
  await fs.rm(directory, { recursive: true, force: true });
}

async function generateModule(stage, project, module) {
  const moduleConfig = {
    products: { index: routes.productsIndex, key: 'productsIndex', title: '产品' },
    cases: { index: routes.casesIndex, key: 'casesIndex', title: '案例' },
    news: { index: routes.newsIndex, key: 'newsIndex', title: '新闻' },
    downloads: { index: routes.downloadsIndex, key: 'downloadsIndex', title: '资料下载' },
    faq: { index: routes.faqIndex, key: 'faqIndex', title: '常见问题' }
  }[module];
  await removeModuleOutput(stage, module);
  const result = collectionPage(project, moduleConfig.index, module, moduleConfig.key, moduleConfig.title);
  await writePage(stage, project, moduleConfig.index, moduleConfig.key, result.view, 'page');
  if (module === 'faq' || module === 'downloads') return;
  const items = collection(project, module);
  const kind = module === 'products' ? 'product' : module === 'cases' ? 'case' : 'news';
  const key = module === 'products' ? 'productDetail' : module === 'cases' ? 'caseDetail' : 'newsDetail';
  for (const item of items) {
    const route = detailRoute(module, item.id);
    const detail = pageForItem(project, route, item, module, kind);
    await writePage(stage, project, route, key, detail, kind);
  }
}

async function generateShared(stage, project) {
  await writePage(stage, project, routes.home, 'home', homePage(project, routes.home), 'home');
  if (project.pricing && project.theme.templates.pricingIndex) {
    const pricing = project.pricing;
    await writePage(stage, project, routes.pricingIndex, 'pricingIndex', {
      intro: pricing.intro,
      plans: pricing.plans || [],
      products: pricing.products || [],
      custom: pricing.custom || [],
      promotions: pricing.promotions || [],
      note: pricing.note || '',
      seo: pageSeo(project.site, pricing.seo || { title: `价格方案 | ${project.site.name}`, description: `${project.site.name}价格方案。`, keywords: ['价格'] }, routes.pricingIndex, 'pricing', project.site)
    }, 'pricing');
  }
  await writePage(stage, project, routes.notFound, 'notFound', { seo: pageSeo(project.site, { title: `页面未找到 | ${project.site.name}`, description: '请求的页面不存在。', keywords: ['页面未找到'] }, routes.notFound, 'notFound', project.site) }, 'notFound');
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapEntries(project).map(({ route, lastmod }) => `  <url><loc>${xmlEscape(siteUrl(project.site, route))}</loc>${lastmod ? `<lastmod>${xmlEscape(lastmod)}</lastmod>` : ''}</url>`),
    '</urlset>',
    ''
  ].join('\n');
  await fs.writeFile(path.join(stage, 'sitemap.xml'), sitemap, 'utf8');
  const basePath = normalizeBasePath(project.site.basePath);
  const crawlPath = basePath === '/' ? '/' : `${basePath}/`;
  await fs.writeFile(path.join(stage, 'robots.txt'), `User-agent: *\nAllow: ${crawlPath}\nSitemap: ${siteUrl(project.site, 'sitemap.xml')}\n`, 'utf8');
}

async function prepareStage(project, full) {
  const stage = path.join(project.config.root, 'dist.__next__');
  await fs.rm(stage, { recursive: true, force: true });
  if (!full && await exists(project.config.outputPath)) await copyDirectory(project.config.outputPath, stage);
  else await fs.mkdir(stage, { recursive: true });
  if (full) {
    await copyDirectory(project.config.publicPath, path.join(stage, 'assets', 'content'));
    await copyDirectory(path.join(project.theme.root, 'assets'), path.join(stage, 'assets', 'themes', project.theme.id));
  }
  return stage;
}

async function swapOutput(project, stage) {
  const output = project.config.outputPath;
  const previous = `${output}.__previous__`;
  await fs.rm(previous, { recursive: true, force: true });
  const hadOutput = await exists(output);
  if (hadOutput) await fs.rename(output, previous);
  try {
    await fs.rename(stage, output);
  } catch (error) {
    if (hadOutput) await fs.rename(previous, output);
    throw error;
  }
  await fs.rm(previous, { recursive: true, force: true });
}

function classifyChanged(files) {
  const modules = new Set();
  let full = false;
  for (const file of files) {
    if (file.startsWith('content/products/')) modules.add('products');
    else if (file.startsWith('content/cases/')) modules.add('cases');
    else if (file.startsWith('content/news/')) modules.add('news');
    else if (file.startsWith('content/downloads/')) modules.add('downloads');
    else if (file.startsWith('content/faqs/')) modules.add('faq');
    else full = true;
  }
  return { full, modules: [...modules] };
}

async function readManifest(cachePath) {
  try { return await loadJson(path.join(cachePath, 'manifest.json')); } catch { return null; }
}

export async function build(options = {}) {
  const started = Date.now();
  const root = options.root || process.cwd();
  const requestedModule = options.module && options.module !== 'all' ? options.module : null;
  let project;
  try {
    project = await validateProject({ root, themeOverride: options.theme });
  } catch (error) {
    try {
      const config = await loadProjectConfig(root, options.theme);
      const details = error.details?.length ? error.details : [error.message];
      await writeReport(config, { status: 'failed', mode: 'validation', theme: config.theme, themeVersion: null, requestedModule, scopeExpanded: false, scopeReason: null, changed: [], generated: [], durationMs: Date.now() - started, errors: [error.message], details, warnings: [] });
    } catch {
      // Preserve the original validation error when the project config is also unreadable.
    }
    throw error;
  }
  const sourceFiles = await sourceFilesForProject(project);
  const hashes = await hashFiles(sourceFiles, project.config.root);
  const previous = await readManifest(project.config.cachePath);
  const changed = changedFiles(previous?.hashes, hashes);
  let full = !requestedModule;
  let modules = requestedModule ? [requestedModule] : moduleNames;
  let mode = 'full';
  let scopeExpanded = false;
  let scopeReason = null;
  const outputExists = await exists(project.config.outputPath);
  if (options.changed) {
    mode = 'changed';
    if (!previous || !outputExists) {
      full = true;
      if (requestedModule) {
        scopeExpanded = true;
        scopeReason = !previous ? 'No previous build manifest requires a full rebuild.' : 'Missing output requires a full rebuild.';
      }
    }
    else if (!changed.length) {
      const report = { status: 'success', mode, theme: project.theme.id, themeVersion: project.theme.manifest.version, requestedModule, scopeExpanded, scopeReason, changed: [], generated: [], modules: [], durationMs: Date.now() - started, warnings: project.warnings };
      await writeReport(project.config, report);
      console.log('No source changes detected.');
      return report;
    } else {
      const classification = classifyChanged(changed);
      full = classification.full;
      modules = classification.modules.length ? classification.modules : moduleNames;
      if (requestedModule && (full || modules.length !== 1 || modules[0] !== requestedModule)) {
        scopeExpanded = true;
        scopeReason = full
          ? 'Shared source changes require a full rebuild.'
          : `Requested module ${requestedModule} was rebuilt with changed modules: ${modules.join(', ')}.`;
        if (!full && !modules.includes(requestedModule)) modules = [requestedModule, ...modules];
      }
      if (!modules.length) modules = [requestedModule || 'products'];
    }
  }
  if (!previous && !full) full = true;
  if (!outputExists) full = true;
  if (requestedModule && full && !scopeExpanded) {
    scopeExpanded = true;
    scopeReason = 'A complete output is required for this build.';
  }
  if (full) modules = moduleNames;
  if (full) mode = options.changed ? 'changed-full' : 'full';
  const stage = path.join(project.config.root, 'dist.__next__');
  try {
    await prepareStage(project, full);
    for (const module of modules) await generateModule(stage, project, module);
    await generateShared(stage, project);
    const audit = await auditOutput(stage);
    await swapOutput(project, stage);
    const generated = await (async () => {
      const files = [];
      async function visit(directory) { for (const entry of await fs.readdir(directory, { withFileTypes: true })) { const file = path.join(directory, entry.name); if (entry.isDirectory()) await visit(file); else files.push(path.relative(project.config.outputPath, file).replaceAll(path.sep, '/')); } }
      await visit(project.config.outputPath); return files.sort();
    })();
    const report = { status: 'success', mode, theme: project.theme.id, themeVersion: project.theme.manifest.version, requestedModule, scopeExpanded, scopeReason, changed, generated, modules, audit, durationMs: Date.now() - started, warnings: project.warnings };
    await fs.mkdir(project.config.cachePath, { recursive: true });
    await fs.writeFile(path.join(project.config.cachePath, 'manifest.json'), JSON.stringify({ engine: ENGINE_VERSION, theme: project.theme.id, themeVersion: project.theme.manifest.version, hashes, generated }, null, 2), 'utf8');
    await writeReport(project.config, report);
    console.log(`Generated ${generated.length} files with theme ${project.theme.id}.`);
    return report;
  } catch (error) {
    await fs.rm(stage, { recursive: true, force: true });
    const details = error.details?.length ? error.details : [error.message];
    const report = { status: 'failed', mode, theme: project.theme.id, themeVersion: project.theme.manifest.version, requestedModule, scopeExpanded, scopeReason, changed, durationMs: Date.now() - started, errors: [error.message], details, warnings: project.warnings };
    await writeReport(project.config, report);
    throw error;
  }
}
