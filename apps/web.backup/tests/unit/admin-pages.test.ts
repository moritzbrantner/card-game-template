import { describe, expect, it } from 'vitest';

import type { AppManifest } from '@/src/app-config/contracts';
import {
  getEnabledAdminPageDefinitions,
  getEnabledAdminWorkspacePageDefinitions,
} from '@/src/admin/pages';

function createManifest(
  enabledFeatures: AppManifest['enabledFeatures'],
): AppManifest {
  return {
    id: 'test-app',
    siteName: 'Test App',
    defaultLocaleMetadata: {
      title: 'Test App',
      description: 'Description',
    },
    enabledFeatures,
    publicPages: [],
    publicNavigation: [],
    contentRoots: {
      pages: [],
      blog: [],
      changelog: [],
    },
    loadMessages: () => ({}),
    exampleApis: {},
  };
}

describe('admin page helpers', () => {
  it('filters disabled admin workspaces from the navigation definitions', () => {
    const manifest = createManifest({
      'admin.workspace': true,
      'admin.content': true,
      'admin.reports': false,
      'admin.users': true,
      'admin.systemSettings': false,
      'admin.dataStudio': true,
    });

    expect(
      getEnabledAdminPageDefinitions(manifest).map((page) => page.key),
    ).toEqual(['overview', 'content', 'users', 'dataStudio']);
    expect(
      getEnabledAdminWorkspacePageDefinitions(manifest).map((page) => page.key),
    ).toEqual(['content', 'users', 'dataStudio']);
  });
});
