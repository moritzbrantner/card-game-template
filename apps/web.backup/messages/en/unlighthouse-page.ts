export const unlighthousePage = {
  eyebrow: 'Staging quality snapshot',
  title: 'Unlighthouse report',
  description: 'This page summarizes the latest `ci-result.json` baked into the GitHub Pages build.',
  emptyTitle: 'No report available yet',
  emptyDescription: 'Run `bun run build:gh-pages` or the GitHub Pages workflow to generate `.generated/unlighthouse/ci-result.json`.',
  summary: {
    routes: 'Routes scanned',
    score: 'Average score',
    bestRoute: 'Best route',
    worstRoute: 'Lowest route',
    updatedAt: 'Report updated',
  },
  sections: {
    categories: 'Category averages',
    metrics: 'Average lab metrics',
    routes: 'Route breakdown',
    routesDescription: '{count} routes from the latest staging scan.',
  },
  routeTable: {
    path: 'Path',
    overall: 'Overall',
  },
};
