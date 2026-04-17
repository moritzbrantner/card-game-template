import type { ReactNode } from 'react';
import type { Metadata } from 'next';

import type { AppLocale } from '@/i18n/routing';
import type { ContentCollection } from '@/src/content/contracts';
import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';

export type AppHotkey = readonly [modifier: 'alt', key: string];

export type AppFeatureConfig = Partial<Record<FoundationFeatureKey, boolean>>;

export type AppContentRoots = Record<ContentCollection, readonly string[]>;

export type AppMessageValue = string | number | boolean | null | undefined | AppMessageTree;

export type AppMessageTree = {
  [key: string]: AppMessageValue;
};

export type AppMessageCatalog = Record<string, AppMessageTree>;

export type AppMessageCatalogLoader = (locale: AppLocale) => AppMessageCatalog;

export type PublicPageRenderProps = {
  locale: AppLocale;
  pageId: string;
  matchedSlug: string;
  pathname: string;
};

export type PublicPageDefinition = {
  id: string;
  slug: string;
  kind: 'component' | 'mdx' | 'redirect';
  featureKey?: FoundationFeatureKey;
  namespace: string;
  aliases?: string[];
  render: (props: PublicPageRenderProps) => ReactNode | Promise<ReactNode>;
  generateMetadata?: (props: PublicPageRenderProps) => Metadata | Promise<Metadata>;
};

export type PublicNavigationItem = {
  pageId: string;
  category: 'discover' | 'workspace';
  hotkey: AppHotkey;
  prefetch?: boolean;
  order: number;
};

export type AppExampleApiRouteModule = Partial<Record<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', (request: Request) => Response | Promise<Response>>>;

export type AppExampleApiDefinition = {
  featureKey?: FoundationFeatureKey;
  loadRouteModule: () => Promise<AppExampleApiRouteModule>;
};

export type AppExampleApiRegistry = Record<string, AppExampleApiDefinition>;

export type AppManifest = {
  id: string;
  siteName: string;
  defaultLocaleMetadata: {
    title: string;
    description: string;
  };
  enabledFeatures: AppFeatureConfig;
  publicPages: readonly PublicPageDefinition[];
  publicNavigation: readonly PublicNavigationItem[];
  contentRoots: AppContentRoots;
  loadMessages: AppMessageCatalogLoader;
  resolveOgImage?: (locale: AppLocale, pageId: string) => string | null | undefined;
  exampleApis: AppExampleApiRegistry;
};
