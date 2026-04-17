import { getAuthorizedAdminPageDefinitions } from '@/src/admin/pages';
import { DataStudioClient } from './data-studio-client';
import { notFoundUnlessFeatureEnabled, requirePermission, resolveLocale } from '@/src/server/page-guards';

export default async function DataStudioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('admin.dataStudio');
  const session = await requirePermission(locale, 'admin.dataStudio.read');
  return <DataStudioClient adminPages={await getAuthorizedAdminPageDefinitions(session.user.role)} />;
}
