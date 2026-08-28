import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';
import { exists, listFiles } from './loader.js';
import { CmsError } from './errors.js';

function walk(node, visit) {
  visit(node);
  for (const child of node.childNodes || []) walk(child, visit);
}

function attr(node, name) {
  return node.attrs?.find((item) => item.name === name)?.value;
}

function textContent(node) {
  return (node.childNodes || []).map((child) => child.value || textContent(child)).join('');
}

function hasRel(node, value) {
  return String(attr(node, 'rel') || '').toLowerCase().split(/\s+/).includes(value);
}

function localReference(reference) {
  if (!reference || reference.startsWith('#') || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(reference)) return null;
  return reference.split('#')[0].split('?')[0];
}

async function resolveReference(output, source, reference) {
  const local = localReference(reference);
  if (!local) return null;
  const absolute = path.resolve(path.dirname(source), local);
  const relative = path.relative(output, absolute);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return `reference leaves dist: ${reference}`;
  if (await exists(absolute)) return null;
  if (await exists(path.join(absolute, 'index.html'))) return null;
  return `missing local reference: ${reference}`;
}

function addValue(values, key, value) {
  if (!values.has(key)) values.set(key, []);
  values.get(key).push(value || '');
}

function firstValue(values, key) {
  return values.get(key)?.[0] || '';
}

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(value);
}

async function auditSitemap(output, details) {
  const sitemap = path.join(output, 'sitemap.xml');
  if (!(await exists(sitemap))) {
    details.push('dist/sitemap.xml is missing');
    return;
  }
  const source = await fs.readFile(sitemap, 'utf8');
  if (!/<urlset\b[^>]*xmlns=["']https?:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']/i.test(source)) details.push('dist/sitemap.xml has an invalid urlset namespace');
  const entries = [...source.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map((match) => match[1]);
  if (!entries.length) details.push('dist/sitemap.xml has no URL entries');
  for (const entry of entries) {
    const loc = entry.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1]?.trim();
    const lastmod = entry.match(/<lastmod>([\s\S]*?)<\/lastmod>/i)?.[1]?.trim();
    if (!loc || !isAbsoluteUrl(loc)) details.push('dist/sitemap.xml contains a non-absolute loc');
    if (lastmod && !/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) details.push(`dist/sitemap.xml has an invalid lastmod for ${loc || 'an entry'}`);
  }
}

async function auditRobots(output, details) {
  const robots = path.join(output, 'robots.txt');
  if (!(await exists(robots))) {
    details.push('dist/robots.txt is missing');
    return;
  }
  const source = await fs.readFile(robots, 'utf8');
  if (!/^User-agent:\s*\*/im.test(source)) details.push('dist/robots.txt is missing User-agent: *');
  if (!/^Sitemap:\s*https?:\/\//im.test(source)) details.push('dist/robots.txt is missing an absolute Sitemap URL');
}

export async function auditOutput(output) {
  const details = [];
  const htmlFiles = await listFiles(output, '.html');
  for (const filePath of htmlFiles) {
    const html = await fs.readFile(filePath, 'utf8');
    const document = parse(html);
    const meta = new Map();
    const links = [];
    let titleCount = 0;
    let titleText = '';
    let canonicalCount = 0;
    let canonicalValue = '';
    let h1Count = 0;
    let hasLang = false;
    let jsonLdCount = 0;
    let validJsonLdCount = 0;

    walk(document, (node) => {
      if (node.tagName === 'html' && attr(node, 'lang')) hasLang = true;
      if (node.tagName === 'title') { titleCount += 1; titleText = textContent(node).trim(); }
      if (node.tagName === 'h1') h1Count += 1;
      if (node.tagName === 'meta') {
        const name = attr(node, 'name');
        const property = attr(node, 'property');
        if (name) addValue(meta, `name:${name.toLowerCase()}`, attr(node, 'content'));
        if (property) addValue(meta, `property:${property.toLowerCase()}`, attr(node, 'content'));
      }
      if (node.tagName === 'link' && hasRel(node, 'canonical')) { canonicalCount += 1; canonicalValue = attr(node, 'href') || ''; }
      if (node.tagName === 'link' && attr(node, 'href')) links.push(attr(node, 'href'));
      if (node.tagName === 'a' && attr(node, 'href')) links.push(attr(node, 'href'));
      if (node.tagName === 'img') {
        if (attr(node, 'alt') === undefined) details.push(`${filePath}: image is missing alt text`);
        if (attr(node, 'src')) links.push(attr(node, 'src'));
      }
      if (node.tagName === 'script' && attr(node, 'src')) links.push(attr(node, 'src'));
      if (node.tagName === 'script' && String(attr(node, 'type') || '').toLowerCase() === 'application/ld+json') {
        jsonLdCount += 1;
        try {
          const data = JSON.parse(textContent(node).trim());
          if (data?.['@context'] === 'https://schema.org' && Array.isArray(data?.['@graph']) && data['@graph'].length) validJsonLdCount += 1;
          else details.push(`${filePath}: JSON-LD must contain a schema.org graph`);
        } catch {
          details.push(`${filePath}: JSON-LD is not valid JSON`);
        }
      }
      if (node.tagName === 'iframe') details.push(`${filePath}: iframe is not allowed`);
      if (node.tagName && attr(node, 'target') === '_blank') details.push(`${filePath}: target="_blank" is not allowed`);
    });

    const requiredMeta = [
      'name:description',
      'property:og:title',
      'property:og:description',
      'property:og:url',
      'property:og:image',
      'property:og:image:alt',
      'name:twitter:card',
      'name:twitter:title',
      'name:twitter:description',
      'name:twitter:image',
      'name:twitter:image:alt'
    ];
    for (const key of requiredMeta) {
      const values = meta.get(key) || [];
      if (values.length !== 1 || !values[0].trim()) details.push(`${filePath}: ${key} must occur exactly once with content`);
    }
    if (titleCount !== 1 || !titleText) details.push(`${filePath}: title must occur exactly once with text`);
    if (canonicalCount !== 1 || !isAbsoluteUrl(canonicalValue)) details.push(`${filePath}: canonical must occur exactly once with an absolute URL`);
    if (!hasLang) details.push(`${filePath}: html lang is missing`);
    if (h1Count !== 1) details.push(`${filePath}: expected exactly one h1, found ${h1Count}`);
    if (!jsonLdCount || jsonLdCount !== validJsonLdCount) details.push(`${filePath}: valid JSON-LD is missing`);
    if (path.basename(filePath) === '404.html' && !/\bnoindex\b/i.test(firstValue(meta, 'name:robots'))) details.push(`${filePath}: 404 page must be noindex`);
    if (html.includes('window.open')) details.push(`${filePath}: window.open is not allowed`);
    for (const reference of links) {
      const error = await resolveReference(output, filePath, reference);
      if (error) details.push(`${filePath}: ${error}`);
    }
  }
  await auditSitemap(output, details);
  await auditRobots(output, details);
  if (details.length) throw new CmsError(`Output audit failed with ${details.length} error${details.length === 1 ? '' : 's'}.`, details);
  return { htmlFiles: htmlFiles.length };
}
