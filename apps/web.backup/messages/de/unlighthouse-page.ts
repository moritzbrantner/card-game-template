export const unlighthousePage = {
  eyebrow: 'Qualitaets-Snapshot fuer Staging',
  title: 'Unlighthouse-Bericht',
  description: 'Diese Seite fasst die neueste `ci-result.json` aus dem GitHub-Pages-Build zusammen.',
  emptyTitle: 'Noch kein Bericht vorhanden',
  emptyDescription: 'Fuehre `bun run build:gh-pages` aus oder starte den GitHub-Pages-Workflow, um `.generated/unlighthouse/ci-result.json` zu erzeugen.',
  summary: {
    routes: 'Gepruefte Routen',
    score: 'Durchschnittlicher Score',
    bestRoute: 'Beste Route',
    worstRoute: 'Schwaechste Route',
    updatedAt: 'Bericht aktualisiert',
  },
  sections: {
    categories: 'Kategorie-Durchschnitte',
    metrics: 'Durchschnittliche Lab-Metriken',
    routes: 'Routenaufschluesselung',
    routesDescription: '{count} Routen aus dem letzten Staging-Scan.',
  },
  routeTable: {
    path: 'Pfad',
    overall: 'Gesamt',
  },
};
