import type { Metadata } from 'next';

import { AppHydrationMarker } from '@/components/app-hydration-marker';
import { AppServiceWorker } from '@/components/app-service-worker';
import { DocumentBootstrap } from '@/components/document-bootstrap';
import { createNavigationInputRegistry } from '@/src/input-bindings/foundation';
import { InputBindingsProvider } from '@/src/input-bindings/provider';
import { appPageDefinitions } from '@/src/navigation/app-routes';
import { AppSettingsProvider } from '@/src/settings/provider';
import { loadDocumentContext } from '@/src/runtime/document-context';
import { getPublicSiteConfig } from '@/src/site-config/service';

import './globals.css';

const navigationInputRegistry = createNavigationInputRegistry(appPageDefinitions);

export async function generateMetadata(): Promise<Metadata> {
  const siteConfig = await getPublicSiteConfig();

  return {
    metadataBase: new URL(siteConfig.siteUrl),
    title: {
      default: siteConfig.seo.defaultTitle,
      template: `%s${siteConfig.seo.titleSuffix}`,
    },
    description: siteConfig.seo.defaultDescription,
    openGraph: {
      title: siteConfig.seo.defaultTitle,
      description: siteConfig.seo.defaultDescription,
      images: siteConfig.seo.defaultOgImage
        ? [siteConfig.seo.defaultOgImage]
        : undefined,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const documentContext = await loadDocumentContext();

  return (
    <html
      lang="en"
      className={documentContext.theme}
      data-background={documentContext.settings.background}
      data-density={
        documentContext.settings.compactSpacing ? 'compact' : 'comfortable'
      }
      data-motion={documentContext.settings.reducedMotion ? 'reduced' : 'full'}
      data-hotkey-hints={
        documentContext.settings.showHotkeyHints ? 'visible' : 'hidden'
      }
      suppressHydrationWarning
    >
      <body className="antialiased">
        <DocumentBootstrap />
        <AppHydrationMarker />
        <AppServiceWorker />
        <AppSettingsProvider initialSettings={documentContext.settings}>
          <InputBindingsProvider registry={navigationInputRegistry}>
            {children}
          </InputBindingsProvider>
        </AppSettingsProvider>
      </body>
    </html>
  );
}
