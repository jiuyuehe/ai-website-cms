import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { canonicalRoute, relativeRoute } from '../engine/routes.js';
import { renderBlocks } from '../engine/renderer.js';
import { pageSeo } from '../engine/seo.js';
import { loadProjectConfig } from '../engine/config.js';
import { listThemes, loadTheme } from '../engine/theme.js';
import { auditOutput } from '../engine/audit.js';
import { preview } from '../engine/preview.js';
import { build } from '../engine/builder.js';
import { validateProject } from '../engine/validator.js';

test('route helpers produce file and canonical URLs independently', () => {
  assert.equal(relativeRoute('products/ai.html', 'index.html'), '../index.html');
  assert.equal(relativeRoute('index.html', 'products/index.html'), './products/index.html');
  assert.equal(canonicalRoute('index.html'), '/');
  assert.equal(canonicalRoute('products/index.html'), '/products/');
});

test('SEO view models include social metadata and structured breadcrumbs', async () => {
  const site = JSON.parse(await fs.readFile(path.join(process.cwd(), 'content', 'site.json'), 'utf8'));
  const product = JSON.parse(await fs.readFile(path.join(process.cwd(), 'content', 'products', 'nocturne-a9.json'), 'utf8'));
  const homeSeo = pageSeo(site, site.seo, 'index.html', 'home', site);
  const productSeo = pageSeo(site, product.seo, 'products/nocturne-a9.html', 'product', product);
  assert.equal(homeSeo.robots, 'index,follow');
  assert.equal(homeSeo.imageAlt, '深思智能企业智能服务场景');
  assert.equal(productSeo.type, 'website');
  assert.equal(productSeo.publishedTime, undefined);
  assert.equal(productSeo.jsonLd['@graph'].some((node) => node['@type'] === 'Product'), true);
  assert.equal(productSeo.jsonLd['@graph'].some((node) => node['@type'] === 'BreadcrumbList'), true);
  assert.equal(productSeo.jsonLd['@graph'].find((node) => node['@type'] === 'Product').dateModified, product.updatedAt);
});

test('structured blocks escape untrusted content', () => {
  const root = { paths: { assets: '../assets/content' } };
  const html = renderBlocks([{ type: 'paragraph', text: '<script>alert(1)</script>' }, { type: 'list', items: ['<b>unsafe</b>'] }], root).toString();
  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('&lt;script&gt;'), true);
  assert.equal(html.includes('&lt;b&gt;unsafe&lt;/b&gt;'), true);
});

test('default theme satisfies its versioned package contract', async () => {
  const config = await loadProjectConfig();
  assert.deepEqual(await listThemes(config), ['enterprise-tech', 'vivo-consumer']);
  const theme = await loadTheme(config);
  assert.equal(theme.id, 'vivo-consumer');
  assert.equal(theme.manifest.themeApiVersion, 1);
  assert.equal(theme.manifest.templates.home, 'pages/home.hbs');
  assert.equal(theme.manifest.templates.notFound, 'pages/not-found.hbs');
  assert.equal(theme.manifest.assets.scripts.includes('js/theme.js'), true);
  assert.equal(theme.manifest.requiredHelpers.includes('addOne'), true);
});

test('new media and navigation structures remain compatible with legacy content', async () => {
  const temporaryProject = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-cms-vivo-schema-'));
  try {
    for (const directory of ['content', 'public', 'schemas', 'themes']) {
      await fs.cp(path.join(process.cwd(), directory), path.join(temporaryProject, directory), { recursive: true });
    }
    await fs.copyFile(path.join(process.cwd(), 'ai-cms.config.json'), path.join(temporaryProject, 'ai-cms.config.json'));

    const homePath = path.join(temporaryProject, 'content', 'pages', 'home.json');
    const home = JSON.parse(await fs.readFile(homePath, 'utf8'));
    delete home.hero.image;
    delete home.hero.primaryAction;
    delete home.hero.secondaryAction;
    home.hero.slides = [{
      id: 'launch',
      eyebrow: 'NEW EXPERIENCE',
      title: '以新的方式发现服务',
      summary: home.hero.summary,
      media: { src: 'media/hero.jpg', mobileSrc: 'media/hero.jpg', alt: '首页体验图' },
      actions: [
        { label: '联系团队', route: '#contact' },
        { label: '查看产品', route: 'products/index.html' }
      ],
      tone: 'dark',
      autoplayMs: 7000
    }];
    await fs.writeFile(homePath, JSON.stringify(home, null, 2), 'utf8');

    const sitePath = path.join(temporaryProject, 'content', 'site.json');
    const site = JSON.parse(await fs.readFile(sitePath, 'utf8'));
    site.navigation[0].children = [{
      label: '精选产品',
      route: 'products/index.html',
      children: [{ label: '全部产品', route: 'products/index.html' }]
    }];
    site.utilityNavigation = [{ label: '首页', route: 'index.html' }];
    site.headerActions = [{ label: '立即咨询', route: '#contact' }];
    site.footerGroups = [{ title: '导航', items: [{ label: '产品', route: 'products/index.html' }] }];
    await fs.writeFile(sitePath, JSON.stringify(site, null, 2), 'utf8');

    const productPath = path.join(temporaryProject, 'content', 'products', 'nocturne-a9.json');
    const product = JSON.parse(await fs.readFile(productPath, 'utf8'));
    product.mobileCover = { src: 'media/product-customer-service.jpg', alt: '移动端产品封面' };
    product.gallery = [product.cover];
    product.purchaseAction = { label: '开始使用', route: '#contact' };
    product.secondaryAction = { label: '查看产品', route: 'products/index.html' };
    product.specifications = [{ label: '部署方式', value: '按需配置' }];
    product.badges = ['精选产品'];
    await fs.writeFile(productPath, JSON.stringify(product, null, 2), 'utf8');

    await validateProject({ root: temporaryProject });
    await build({ root: temporaryProject });
    const homeHtml = await fs.readFile(path.join(temporaryProject, 'dist', 'index.html'), 'utf8');
    const productHtml = await fs.readFile(path.join(temporaryProject, 'dist', 'products', 'nocturne-a9.html'), 'utf8');
    assert.match(homeHtml, /data-carousel-slide[^>]*data-autoplay-ms="7000"/);
    assert.match(homeHtml, /vivo-nav-submenu/);
    assert.match(homeHtml, /data-search-item[^>]*>[\s\S]*FAQ/);
    assert.match(productHtml, /product-badges/);
    assert.match(productHtml, /vivo-product-gallery/);
    assert.match(productHtml, /vivo-spec-grid/);
  } finally {
    await fs.rm(temporaryProject, { recursive: true, force: true });
  }
});

test('vivo theme keeps interaction behavior local and reduced-motion aware', async () => {
  const root = path.join(process.cwd(), 'themes', 'vivo-consumer', 'assets');
  const css = await fs.readFile(path.join(root, 'css', 'site.css'), 'utf8');
  const script = await fs.readFile(path.join(root, 'js', 'theme.js'), 'utf8');
  assert.match(css, /--vivo-accent:\s*#415fff/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /prefers-reduced-motion/);
  assert.doesNotMatch(script, /window\.addEventListener\(['"]scroll/);
});

test('theme validation rejects an incomplete package before rendering', async () => {
  const temporaryThemes = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-cms-theme-'));
  try {
    const fixture = path.join(temporaryThemes, 'fixture');
    await fs.mkdir(fixture, { recursive: true });
    await fs.writeFile(path.join(fixture, 'theme.json'), JSON.stringify({
      id: 'fixture', version: '1.0.0', themeApiVersion: 1, engine: '>=5.0.0 <6.0.0',
      templates: {}, assets: { styles: [], scripts: [] }, requiredHelpers: []
    }), 'utf8');
    const config = await loadProjectConfig();
    await assert.rejects(() => loadTheme({ ...config, themesPath: temporaryThemes }, 'fixture'), /missing templates/);
  } finally {
    await fs.rm(temporaryThemes, { recursive: true, force: true });
  }
});

test('output audit requires both sitemap and robots files', async () => {
  const temporaryOutput = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-cms-output-'));
  try {
    await fs.writeFile(path.join(temporaryOutput, 'index.html'), '<!doctype html><title>Test</title><meta name="description" content="Test description"><link rel="canonical" href="https://example.com/">', 'utf8');
    await fs.writeFile(path.join(temporaryOutput, 'sitemap.xml'), '<urlset></urlset>', 'utf8');
    await assert.rejects(() => auditOutput(temporaryOutput), (error) => {
      assert.match(error.details.join('\n'), /robots/);
      return true;
    });
  } finally {
    await fs.rm(temporaryOutput, { recursive: true, force: true });
  }
});

test('preview keeps serving after a missing path falls back to 404', async () => {
  const temporaryProject = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-cms-preview-'));
  const output = path.join(temporaryProject, 'dist');
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'index.html'), 'home', 'utf8');
  await fs.writeFile(path.join(output, '404.html'), 'not found', 'utf8');
  const server = await preview({ root: temporaryProject, port: 0 });
  const port = server.address().port;
  try {
    const missing = await fetch(`http://127.0.0.1:${port}/missing`);
    assert.equal(missing.status, 404);
    const home = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(home.status, 200);
    assert.equal(await home.text(), 'home');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(temporaryProject, { recursive: true, force: true });
  }
});

test('changed builds expand to every changed content module', async () => {
  const temporaryProject = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-cms-build-'));
  try {
    for (const directory of ['content', 'public', 'schemas', 'themes']) {
      await fs.cp(path.join(process.cwd(), directory), path.join(temporaryProject, directory), { recursive: true });
    }
    await fs.copyFile(path.join(process.cwd(), 'ai-cms.config.json'), path.join(temporaryProject, 'ai-cms.config.json'));
    await build({ root: temporaryProject });
    const casePath = path.join(temporaryProject, 'content', 'cases', 'coastal-watch.json');
    const caseData = JSON.parse(await fs.readFile(casePath, 'utf8'));
    caseData.summary = `${caseData.summary} 持续优化。`;
    await fs.writeFile(casePath, JSON.stringify(caseData, null, 2), 'utf8');
    const report = await build({ root: temporaryProject, module: 'products', changed: true });
    assert.equal(report.scopeExpanded, true);
    assert.deepEqual(report.modules, ['products', 'cases']);
    assert.match(report.scopeReason, /cases/);
    const outputBeforeFailure = await fs.readFile(path.join(temporaryProject, 'dist', 'index.html'), 'utf8');
    await fs.writeFile(path.join(temporaryProject, 'content', 'pages', 'home.json'), '{ invalid', 'utf8');
    await assert.rejects(() => build({ root: temporaryProject, changed: true }), /Invalid JSON/);
    assert.equal(await fs.readFile(path.join(temporaryProject, 'dist', 'index.html'), 'utf8'), outputBeforeFailure);
    const failedReport = JSON.parse(await fs.readFile(path.join(temporaryProject, '.ai-cms', 'reports', 'latest.json'), 'utf8'));
    assert.equal(failedReport.status, 'failed');
    assert.equal(failedReport.mode, 'validation');
    assert.match(failedReport.details.join('\n'), /home\.json/);
  } finally {
    await fs.rm(temporaryProject, { recursive: true, force: true });
  }
});

test('unknown CLI commands fail with a non-success exit code', () => {
  assert.throws(() => execFileSync(process.execPath, ['cli/ai-cms.js', 'unknown'], { cwd: process.cwd(), stdio: 'pipe' }));
});
