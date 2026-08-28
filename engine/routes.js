import path from 'node:path';

export const moduleNames = ['products', 'cases', 'news', 'downloads', 'faq'];

export const routes = {
  home: 'index.html',
  pricingIndex: 'pricing/index.html',
  productsIndex: 'products/index.html',
  casesIndex: 'cases/index.html',
  newsIndex: 'news/index.html',
  downloadsIndex: 'downloads/index.html',
  faqIndex: 'faq/index.html',
  notFound: '404.html'
};

export function detailRoute(module, id) {
  return `${module}/${id}.html`;
}

export function relativeRoute(fromRoute, toRoute) {
  const fromDirectory = path.posix.dirname(fromRoute);
  const value = path.posix.relative(fromDirectory, toRoute) || path.posix.basename(toRoute);
  return value.startsWith('.') ? value : `./${value}`;
}

export function canonicalRoute(route) {
  if (route === 'index.html') return '/';
  if (route.endsWith('/index.html')) return `/${route.slice(0, -'index.html'.length)}`;
  return `/${route}`;
}

export function pagePaths(route, themeId, themeStyles, themeScripts) {
  const relativeAsset = (target) => relativeRoute(route, target);
  return {
    page: relativeRoute(route, route),
    assets: relativeAsset('assets/content'),
    themeStyles: themeStyles.map((file) => relativeAsset(`assets/themes/${themeId}/${file}`)),
    themeScripts: themeScripts.map((file) => relativeAsset(`assets/themes/${themeId}/${file}`))
  };
}
