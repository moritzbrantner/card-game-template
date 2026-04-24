import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export const unlighthouseReportPath = path.join(
  process.cwd(),
  '.generated',
  'unlighthouse',
  'ci-result.json',
);

type UnlighthouseCategorySummary = {
  score?: number;
  averageScore?: number;
};

type UnlighthouseMetricSummary = {
  numericValue?: number;
  displayValue?: string;
  averageNumericValue?: number;
};

export type UnlighthouseExpandedReport = {
  summary: {
    score: number;
    categories: Record<string, UnlighthouseCategorySummary>;
    metrics: Record<string, UnlighthouseMetricSummary>;
  };
  routes: Array<{
    path: string;
    score: number;
    categories: Record<string, UnlighthouseCategorySummary>;
    metrics: Record<string, UnlighthouseMetricSummary>;
  }>;
  metadata: {
    categories: Record<string, { id: string; title: string }>;
    metrics: Record<
      string,
      { id: string; title: string; description: string; numericUnit: string }
    >;
  };
};

export type LoadedUnlighthouseReport = {
  report: UnlighthouseExpandedReport;
  updatedAt: Date;
};

export type UnlighthouseReportSummary = {
  routeCount: number;
  averageScore: number;
  bestRoute: {
    path: string;
    score: number;
  } | null;
  worstRoute: {
    path: string;
    score: number;
  } | null;
  categories: Array<{
    key: string;
    title: string;
    averageScore: number;
  }>;
  metrics: Array<{
    key: string;
    title: string;
    averageNumericValue: number;
    numericUnit: string;
  }>;
};

export async function loadUnlighthouseReport(): Promise<LoadedUnlighthouseReport | null> {
  try {
    const [contents, metadata] = await Promise.all([
      readFile(unlighthouseReportPath, 'utf8'),
      stat(unlighthouseReportPath),
    ]);

    return {
      report: JSON.parse(contents) as UnlighthouseExpandedReport,
      updatedAt: metadata.mtime,
    };
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return null;
    }

    throw error;
  }
}

export function summarizeUnlighthouseReport(
  report: UnlighthouseExpandedReport,
): UnlighthouseReportSummary {
  const routes = [...report.routes].sort(
    (left, right) => right.score - left.score,
  );
  const categories = Object.entries(report.summary.categories)
    .map(([key, value]) => ({
      key,
      title: report.metadata.categories[key]?.title ?? key,
      averageScore: value.averageScore ?? value.score ?? 0,
    }))
    .sort((left, right) => right.averageScore - left.averageScore);
  const metrics = Object.entries(report.summary.metrics)
    .map(([key, value]) => ({
      key,
      title: report.metadata.metrics[key]?.title ?? key,
      averageNumericValue: value.averageNumericValue ?? value.numericValue ?? 0,
      numericUnit: report.metadata.metrics[key]?.numericUnit ?? 'unitless',
    }))
    .sort((left, right) => left.title.localeCompare(right.title));
  const worstRoute = routes.at(-1);

  return {
    routeCount: report.routes.length,
    averageScore: report.summary.score,
    bestRoute: routes[0]
      ? { path: routes[0].path, score: routes[0].score }
      : null,
    worstRoute: worstRoute
      ? { path: worstRoute.path, score: worstRoute.score }
      : null,
    categories,
    metrics,
  };
}

export function formatUnlighthouseScore(
  score: number | undefined,
  locale: string,
) {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(score ?? 0);
}

export function formatUnlighthouseMetric(
  value: number,
  numericUnit: string,
  locale: string,
) {
  if (numericUnit === 'millisecond') {
    if (value >= 1000) {
      return `${new Intl.NumberFormat(locale, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }).format(value / 1000)} s`;
    }

    return `${new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    }).format(value)} ms`;
  }

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(value);
}
