import type { NextConfig } from 'next';
import createMDX from '@next/mdx';

import { getEnv } from './src/config/env';
import { normalizeRouterBasePath } from './src/runtime/base-path';

const allowedDevOrigins = [
  'http://127.0.0.1:3005',
  'http://localhost:3005',
  'http://127.0.0.1',
  'http://localhost',
  '127.0.0.1',
  'localhost',
] as const;

const env = getEnv();
const githubPagesBasePath = normalizeRouterBasePath(env.githubPagesBasePath);

export const normalNextConfig: NextConfig = {
  allowedDevOrigins: [
    ...allowedDevOrigins,
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export const githubPagesNextConfig: NextConfig = {
  allowedDevOrigins: [
    ...allowedDevOrigins,
  ],
  assetPrefix: githubPagesBasePath === '/' ? undefined : githubPagesBasePath,
  basePath: githubPagesBasePath === '/' ? undefined : githubPagesBasePath,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    unoptimized: true,
  },
  output: 'export',
  trailingSlash: true,
};

const nextConfig =
  env.deploymentTarget === 'gh-pages'
    ? githubPagesNextConfig
    : normalNextConfig;

const withMDX = createMDX({
  options: {
    remarkPlugins: ['remark-gfm'],
    rehypePlugins: ['rehype-slug'],
  },
});

export default withMDX({
  ...nextConfig,
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
});
