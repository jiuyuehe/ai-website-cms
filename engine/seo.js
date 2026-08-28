import { normalizeBasePath } from './config.js';
import { canonicalRoute } from './routes.js';

function siteUrl(site, route) {
  const basePath = normalizeBasePath(site.basePath);
  const suffix = canonicalRoute(route);
  return new URL(`${basePath === '/' ? '' : basePath}${suffix}`, `${site.origin.replace(/\/$/, '')}/`).toString();
}

function assetUrl(site, source) {
  if (!source) return undefined;
  return siteUrl(site, `assets/content/${String(source).replace(/^\/+/, '')}`);
}

function localeFor(language) {
  return String(language || 'en-US').replace('-', '_');
}

function mainEntityOfPage(canonical) {
  return { '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical };
}

function breadcrumbItems(site, route, sourceSeo, item) {
  const items = [{ '@type': 'ListItem', position: 1, name: site.name, item: siteUrl(site, 'index.html') }];
  if (route === 'index.html' || route === '404.html') return items;

  const [module, id] = route.split('/');
  const labels = { products: '产品', cases: '案例', news: '新闻', downloads: '资料下载', faq: '常见问题' };
  if (labels[module]) items.push({ '@type': 'ListItem', position: 2, name: labels[module], item: siteUrl(site, `${module}/index.html`) });
  if (id && id !== 'index.html' && item && !Array.isArray(item)) {
    items.push({ '@type': 'ListItem', position: items.length + 1, name: item.title || sourceSeo.title, item: siteUrl(site, route) });
  }
  return items;
}

export function pageSeo(site, source, route, kind, item) {
  const sourceSeo = source || site.seo;
  const image = assetUrl(site, sourceSeo.image || site.seo.image);
  const canonical = siteUrl(site, route);
  const imageAlt = (!Array.isArray(item) && item?.cover?.alt) || (sourceSeo.image === site.logo?.src ? site.logo.alt : `${site.name}企业智能服务场景`);
  const organizationId = `${siteUrl(site, 'index.html')}#organization`;
  const websiteId = `${siteUrl(site, 'index.html')}#website`;
  const breadcrumbId = `${canonical}#breadcrumb`;
  const publishedTime = !Array.isArray(item) ? (item?.publishedAt || (kind === 'case' ? item?.updatedAt : undefined)) : undefined;
  const modifiedTime = !Array.isArray(item) ? item?.updatedAt : undefined;
  const breadcrumbs = breadcrumbItems(site, route, sourceSeo, item);
  const graph = [
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: site.name,
      url: siteUrl(site, 'index.html'),
      email: site.contact.email,
      telephone: site.contact.phone,
      logo: site.logo?.src ? { '@type': 'ImageObject', url: assetUrl(site, site.logo.src), alt: site.logo.alt } : undefined
    },
    { '@type': 'WebSite', '@id': websiteId, name: site.name, url: siteUrl(site, 'index.html'), inLanguage: site.language, publisher: { '@id': organizationId } },
    {
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      name: sourceSeo.title,
      description: sourceSeo.description,
      url: canonical,
      inLanguage: site.language,
      isPartOf: { '@id': websiteId },
      primaryImageOfPage: image ? { '@type': 'ImageObject', url: image, caption: imageAlt } : undefined,
      breadcrumb: { '@id': breadcrumbId }
    },
    { '@type': 'BreadcrumbList', '@id': breadcrumbId, itemListElement: breadcrumbs }
  ];
  if (kind === 'product') {
    graph.push({
      '@type': 'Product',
      name: item.title,
      description: item.summary,
      image,
      category: '企业智能服务软件',
      keywords: sourceSeo.keywords,
      dateModified: item.updatedAt,
      brand: { '@type': 'Brand', name: site.name },
      url: canonical,
      mainEntityOfPage: mainEntityOfPage(canonical)
    });
  } else if (kind === 'news') {
    graph.push({
      '@type': 'Article',
      headline: item.title,
      description: item.summary,
      image,
      keywords: sourceSeo.keywords,
      datePublished: item.publishedAt,
      dateModified: item.updatedAt,
      mainEntityOfPage: mainEntityOfPage(canonical),
      author: { '@id': organizationId },
      publisher: { '@id': organizationId }
    });
  } else if (kind === 'faq') {
    graph.push({ '@type': 'FAQPage', mainEntity: (item || []).map((faq) => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })) });
  } else if (kind === 'case') {
    graph.push({
      '@type': 'Article',
      headline: item.title,
      description: item.summary,
      image,
      keywords: sourceSeo.keywords,
      about: item.customer,
      datePublished: item.updatedAt,
      dateModified: item.updatedAt,
      mainEntityOfPage: mainEntityOfPage(canonical),
      author: { '@id': organizationId },
      publisher: { '@id': organizationId }
    });
  }
  return {
    title: sourceSeo.title,
    description: sourceSeo.description,
    keywords: sourceSeo.keywords || [],
    image,
    imageAlt,
    canonical,
    locale: localeFor(site.language),
    type: kind === 'news' || kind === 'case' ? 'article' : 'website',
    robots: kind === 'notFound' ? 'noindex,follow' : 'index,follow',
    publishedTime,
    modifiedTime,
    jsonLd: { '@context': 'https://schema.org', '@graph': graph }
  };
}

export { assetUrl as seoAssetUrl, siteUrl };
