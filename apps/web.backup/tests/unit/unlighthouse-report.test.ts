import { describe, expect, it } from 'vitest';

import {
  formatUnlighthouseMetric,
  formatUnlighthouseScore,
  summarizeUnlighthouseReport,
  type UnlighthouseExpandedReport,
} from '@/src/unlighthouse/report';

const report: UnlighthouseExpandedReport = {
  summary: {
    score: 0.91,
    categories: {
      performance: { averageScore: 0.82 },
      accessibility: { averageScore: 0.97 },
    },
    metrics: {
      'largest-contentful-paint': { averageNumericValue: 2480 },
      'cumulative-layout-shift': { averageNumericValue: 0.04 },
    },
  },
  routes: [
    {
      path: '/en',
      score: 0.96,
      categories: {
        performance: { score: 0.9 },
        accessibility: { score: 1 },
      },
      metrics: {
        'largest-contentful-paint': {
          numericValue: 2100,
          displayValue: '2.1 s',
        },
      },
    },
    {
      path: '/de/about',
      score: 0.85,
      categories: {
        performance: { score: 0.74 },
        accessibility: { score: 0.94 },
      },
      metrics: {
        'largest-contentful-paint': {
          numericValue: 2860,
          displayValue: '2.9 s',
        },
      },
    },
  ],
  metadata: {
    categories: {
      performance: { id: 'performance', title: 'Performance' },
      accessibility: { id: 'accessibility', title: 'Accessibility' },
    },
    metrics: {
      'largest-contentful-paint': {
        id: 'largest-contentful-paint',
        title: 'Largest Contentful Paint',
        description: 'Time to render the largest element.',
        numericUnit: 'millisecond',
      },
      'cumulative-layout-shift': {
        id: 'cumulative-layout-shift',
        title: 'Cumulative Layout Shift',
        description: 'Visual stability score.',
        numericUnit: 'unitless',
      },
    },
  },
};

describe('unlighthouse report helpers', () => {
  it('summarizes the strongest and weakest route', () => {
    const summary = summarizeUnlighthouseReport(report);

    expect(summary.routeCount).toBe(2);
    expect(summary.bestRoute).toEqual({ path: '/en', score: 0.96 });
    expect(summary.worstRoute).toEqual({ path: '/de/about', score: 0.85 });
    expect(summary.categories.map((category) => category.title)).toEqual([
      'Accessibility',
      'Performance',
    ]);
  });

  it('formats scores and metrics for display', () => {
    expect(formatUnlighthouseScore(0.91, 'en')).toBe('91%');
    expect(formatUnlighthouseMetric(2480, 'millisecond', 'en')).toBe('2.48 s');
    expect(formatUnlighthouseMetric(0.04, 'unitless', 'en')).toBe('0.04');
  });
});
