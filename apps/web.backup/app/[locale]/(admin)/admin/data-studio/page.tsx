import { getEnabledAdminPageDefinitions } from '@/src/admin/pages';
import { DataStudioClient } from './data-studio-client';
import { notFoundUnlessFeatureEnabled } from '@/src/server/page-guards';

export default function DataStudioPage() {
  notFoundUnlessFeatureEnabled('admin.dataStudio');
  return <DataStudioClient adminPages={getEnabledAdminPageDefinitions()} />;
}
