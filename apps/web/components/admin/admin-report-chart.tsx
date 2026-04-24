'use client';

import type { ChartConfig } from '@moritzbrantner/ui';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@moritzbrantner/ui';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';

import type { AdminReportSeries } from '@/src/domain/admin-reports/use-cases';

type AdminReportChartProps = {
  series: AdminReportSeries;
};

function buildChartConfig(series: AdminReportSeries): ChartConfig {
  return Object.fromEntries(
    series.categories.map((category) => [
      category.key,
      {
        label: category.label,
        color: category.color,
      },
    ]),
  );
}

function hasSeriesData(series: AdminReportSeries) {
  return series.data.some((row) =>
    series.categories.some((category) => {
      const value = row[category.key];
      return typeof value === 'number' && value > 0;
    }),
  );
}

export function AdminReportChart({ series }: AdminReportChartProps) {
  if (!hasSeriesData(series)) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        {series.emptyMessage}
      </p>
    );
  }

  const config = buildChartConfig(series);
  const chartHeightClass = series.type === 'sparkline' ? 'h-24' : 'h-80';
  const commonAxisProps = {
    tickLine: false,
    axisLine: false,
  } as const;

  return (
    <ChartContainer config={config} className={`w-full ${chartHeightClass}`}>
      {series.type === 'bar' ? (
        <BarChart data={series.data} margin={{ left: 0, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey={series.xKey} minTickGap={24} {...commonAxisProps} />
          <YAxis allowDecimals={false} width={32} {...commonAxisProps} />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" />}
          />
          {series.categories.map((category) => (
            <Bar
              key={category.key}
              dataKey={category.key}
              fill={`var(--color-${category.key})`}
              radius={6}
            />
          ))}
        </BarChart>
      ) : series.type === 'area' ? (
        <AreaChart data={series.data} margin={{ left: 0, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey={series.xKey} minTickGap={24} {...commonAxisProps} />
          <YAxis allowDecimals={false} width={32} {...commonAxisProps} />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" />}
          />
          {series.categories.map((category) => (
            <Area
              key={category.key}
              type="monotone"
              dataKey={category.key}
              stroke={`var(--color-${category.key})`}
              fill={`var(--color-${category.key})`}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      ) : (
        <LineChart data={series.data} margin={{ left: 0, right: 12, top: 8 }}>
          {series.type === 'sparkline' ? null : (
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
          )}
          <XAxis
            dataKey={series.xKey}
            hide={series.type === 'sparkline'}
            minTickGap={24}
            {...commonAxisProps}
          />
          <YAxis
            hide={series.type === 'sparkline'}
            allowDecimals={false}
            width={32}
            {...commonAxisProps}
          />
          <ChartTooltip
            cursor={series.type === 'sparkline' ? false : undefined}
            content={
              <ChartTooltipContent
                indicator={series.type === 'sparkline' ? 'dot' : 'line'}
              />
            }
          />
          {series.categories.map((category) => (
            <Line
              key={category.key}
              type="monotone"
              dataKey={category.key}
              stroke={`var(--color-${category.key})`}
              strokeWidth={series.type === 'sparkline' ? 3 : 2}
              dot={series.type === 'sparkline' ? false : { r: 2 }}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      )}
    </ChartContainer>
  );
}
