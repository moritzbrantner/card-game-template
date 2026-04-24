import { ImageResponse } from 'next/og';

import { getPublicSiteConfig } from '@/src/site-config/service';

export const dynamic = 'force-static';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const siteConfig = await getPublicSiteConfig();

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background:
          'linear-gradient(135deg, #fff7ed 0%, #f8fafc 45%, #dbeafe 100%)',
        color: '#111827',
        padding: 64,
      }}
    >
      <div
        style={{ fontSize: 24, letterSpacing: 6, textTransform: 'uppercase' }}
      >
        Hybrid content + product template
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 72, fontWeight: 700 }}>
          {siteConfig.siteName}
        </div>
        <div style={{ fontSize: 30, maxWidth: 900 }}>
          {siteConfig.seo.defaultDescription}
        </div>
      </div>
    </div>,
    size,
  );
}
