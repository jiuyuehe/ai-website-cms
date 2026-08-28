import Handlebars from 'handlebars';

function escape(value) {
  return Handlebars.escapeExpression(String(value ?? ''));
}

function assetPath(root, source) {
  return `${root.paths.assets}/${String(source || '').replace(/^\/+/, '')}`;
}

function aspectStyle(aspectRatio) {
  if (!aspectRatio) return '';
  const parts = String(aspectRatio).split(':').map(Number);
  if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) return ` style="aspect-ratio:${parts[0]}/${parts[1]}"`;
  return '';
}

function mediaHtml(root, image, options = {}) {
  if (!image || !image.src) return '';
  const alt = escape(image.alt || '');
  const loading = escape(options.loading || image.loading || 'lazy');
  const full = assetPath(root, image.src);
  const src = escape(full);
  const srcset = image.mobileSrc
    ? ` srcset="${escape(assetPath(root, image.mobileSrc))} 640w, ${full} 1280w" sizes="(max-width: 767px) 640px, 1280px"`
    : '';
  const figure = !image.caption && !image.aspectRatio ? '<figure class="media-figure">' : '<figure class="media-figure"' + aspectStyle(image.aspectRatio) + '>';
  const width = image.width ? ` width="${escape(image.width)}"` : '';
  const height = image.height ? ` height="${escape(image.height)}"` : '';
  return `${figure}<img src="${src}"${srcset} alt="${alt}" loading="${loading}" decoding="async"${width}${height}>${image.caption ? `<figcaption>${escape(image.caption)}</figcaption>` : ''}</figure>`;
}

function renderItem(item, root) {
  if (!item || typeof item !== 'object') return '';
  switch (item.type) {
    case 'paragraph':
      return `<p>${escape(item.text)}</p>`;
    case 'heading': {
      const level = Number(item.level) >= 2 && Number(item.level) <= 6 ? Number(item.level) : 3;
      return `<h${level}>${escape(item.text)}</h${level}>`;
    }
    case 'list': {
      const tag = item.ordered ? 'ol' : 'ul';
      return `<${tag}>${(item.items || []).map((entry) => `<li>${escape(entry)}</li>`).join('')}</${tag}>`;
    }
    case 'quote':
      return `<blockquote>${escape(item.text)}${item.attribution ? `<cite>${escape(item.attribution)}</cite>` : ''}</blockquote>`;
    case 'image':
      return mediaHtml(root, item, { loading: item.loading });
    case 'card': {
      const badge = item.badge ? `<span class="card-badge">${escape(item.badge)}</span>` : '';
      const media = item.image ? `<div class="card-media">${mediaHtml(root, item.image)}</div>` : '';
      const body = `<div class="card-body">${badge}${item.title ? `<h3>${escape(item.title)}</h3>` : ''}${item.body ? `<p>${escape(item.body)}</p>` : ''}${item.items ? `<ul>${item.items.map((entry) => `<li>${escape(entry)}</li>`).join('')}</ul>` : ''}${item.link ? `<a class="text-link" href="${escape(item.link.route)}">${escape(item.link.label)}${item.link.external ? ' ↗' : ''}</a>` : ''}</div>`;
      return `<article class="layout-card">${media}${body}</article>`;
    }
    default:
      return '';
  }
}

function renderImageGrid(block, root) {
  const cols = Math.min(Number(block.cols) || 3, 4);
  const items = (block.items || []).map((image) => `<figure class="image-grid-cell">${mediaHtml(root, image)}${image.caption ? `<figcaption>${escape(image.caption)}</figcaption>` : ''}</figure>`).join('');
  return `<div class="layout-image-grid" data-cols="${cols}">${items}</div>`;
}

function renderGrid(block, root) {
  const cols = Math.min(Number(block.cols) || 2, 4);
  const items = (block.items || []).map((item) => `<div class="layout-grid-cell">${renderItem(item, root)}</div>`).join('');
  return `<div class="layout-grid" data-cols="${cols}">${items}</div>`;
}

function renderTwoColumn(block, root) {
  const layout = block.layout === 'media-text' ? 'media-text' : 'text-media';
  const columns = (block.columns || []).map((col) => `<div class="two-column-col">${(col || []).map((item) => renderItem(item, root)).join('')}</div>`).join('');
  return `<div class="layout-two-column" data-layout="${layout}">${columns}</div>`;
}

function renderCarousel(block, root) {
  const slides = (block.items || []).map((item, index) => {
    const media = item.image ? mediaHtml(root, item.image) : '';
    const content = item.title || item.body || item.caption
      ? `<div class="carousel-content">${item.title ? `<h3>${escape(item.title)}</h3>` : ''}${item.body ? `<p>${escape(item.body)}</p>` : ''}${item.caption ? `<p class="carousel-caption">${escape(item.caption)}</p>` : ''}</div>`
      : '';
    return `<div class="carousel-slide" data-index="${index}">${media}${content}</div>`;
  }).join('');
  const autoplay = block.autoplay ? ` data-autoplay="${Math.max(Number(block.autoplay) || 0, 2000)}"` : '';
  const arrows = block.showArrows === false ? '' : `<button type="button" class="carousel-arrow carousel-prev" data-carousel-prev aria-label="上一张">‹</button><button type="button" class="carousel-arrow carousel-next" data-carousel-next aria-label="下一张">›</button>`;
  const dots = block.showDots === false ? '' : `<div class="carousel-dots" data-carousel-dots></div>`;
  return `<div class="layout-carousel" data-carousel${autoplay}>${arrows}<div class="carousel-viewport"><div class="carousel-track">${slides}</div></div>${dots}</div>`;
}

export function renderBlocks(blocks = [], root) {
  const html = blocks.map((block) => {
    if (!block || typeof block !== 'object') return '';
    switch (block.type) {
      case 'paragraph':
        return `<p>${escape(block.text)}</p>`;
      case 'heading': {
        const level = Number(block.level) >= 2 && Number(block.level) <= 6 ? Number(block.level) : 2;
        return `<h${level}>${escape(block.text)}</h${level}>`;
      }
      case 'list': {
        const tag = block.ordered ? 'ol' : 'ul';
        return `<${tag}>${(block.items || []).map((item) => `<li>${escape(item)}</li>`).join('')}</${tag}>`;
      }
      case 'quote':
        return `<blockquote>${escape(block.text)}${block.attribution ? `<cite>${escape(block.attribution)}</cite>` : ''}</blockquote>`;
      case 'image':
        return mediaHtml(root, block, { loading: block.loading });
      case 'image-grid':
        return renderImageGrid(block, root);
      case 'grid':
        return renderGrid(block, root);
      case 'two-column':
        return renderTwoColumn(block, root);
      case 'carousel':
        return renderCarousel(block, root);
      default:
        return '';
    }
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
