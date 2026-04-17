'use client';

import { useServerInsertedHTML } from 'next/navigation';

import { settingsScript, themeScript } from '@/src/runtime/bootstrap-scripts';

export function DocumentBootstrap() {
  useServerInsertedHTML(() => (
    <>
      <script id="theme-script" dangerouslySetInnerHTML={{ __html: themeScript }} />
      <script id="settings-script" dangerouslySetInnerHTML={{ __html: settingsScript }} />
    </>
  ));

  return null;
}
