import Handlebars from 'handlebars';

function escape(value) {
  return Handlebars.escapeExpression(String(value ?? ''));
}

function assetPath(root, source) {
  return `${root.paths.assets}/${String(source || '').replace(/^\/+/, '')}`;
}

export function renderBlocks(blocks = [], root) {
  const html = blocks.map((block) => {
    if (block.type === 'paragraph') return `<p>${escape(block.text)}</p>`;
    if (block.type === 'heading') return `<h${block.level}>${escape(block.text)}</h${block.level}>`;
    if (block.type === 'list') return `<ul>${block.items.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>`;
    if (block.type === 'quote') return `<blockquote>${escape(block.text)}${block.attribution ? `<cite>${escape(block.attribution)}</cite>` : ''}</blockquote>`;
    if (block.type === 'image') return `<figure><img src="${escape(assetPath(root, block.src))}" alt="${escape(block.alt)}" loading="lazy" width="1200" height="675">${block.caption ? `<figcaption>${escape(block.caption)}</figcaption>` : ''}</figure>`;
    return '';
  }).join('');
  return new Handlebars.SafeString(html);
}

export function renderJsonLd(value) {
  const json = JSON.stringify(value || {}).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
  return new Handlebars.SafeString(json);
}

export function renderSeoHead(page, root) {
  const seo = page.seo || {};
  const esc = escape;
  const keywords = Array.isArray(seo.keywords) ? seo.keywords.join(', ') : '';
  const image = seo.image || root.site.seo.image;
  const favicon = root.site.favicon ? assetPath(root, root.site.favicon) : '';
  const tags = [
    `<title>${esc(seo.title)}</title>`,
    `<meta name="description" content="${esc(seo.description)}">`,
    `<meta name="keywords" content="${esc(keywords)}">`,
    `<meta name="robots" content="${esc(seo.robots || 'index,follow')}">`,
    `<meta name="author" content="${esc(root.site.name)}">`,
    `<link rel="canonical" href="${esc(seo.canonical)}">`,
    `<meta property="og:type" content="${esc(seo.type || 'website')}">`,
    `<meta property="og:site_name" content="${esc(root.site.name)}">`,
    `<meta property="og:locale" content="${esc(seo.locale || root.site.language)}">`,
    `<meta property="og:title" content="${esc(seo.title)}">`,
    `<meta property="og:description" content="${esc(seo.description)}">`,
    `<meta property="og:url" content="${esc(seo.canonical)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:image:alt" content="${esc(seo.imageAlt || root.site.name)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(seo.title)}">`,
    `<meta name="twitter:description" content="${esc(seo.description)}">`,
    `<meta name="twitter:url" content="${esc(seo.canonical)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    `<meta name="twitter:image:alt" content="${esc(seo.imageAlt || root.site.name)}">`
  ];
  if (seo.publishedTime && seo.type === 'article') tags.push(`<meta property="article:published_time" content="${esc(seo.publishedTime)}">`);
  if (seo.modifiedTime && seo.type === 'article') tags.push(`<meta property="article:modified_time" content="${esc(seo.modifiedTime)}">`);
  if (favicon) tags.push(`<link rel="icon" href="${esc(favicon)}" type="image/svg+xml">`);
  tags.push(`<script type="application/ld+json">${renderJsonLd(seo.jsonLd)}</script>`);
  return new Handlebars.SafeString(tags.join(''));
}
