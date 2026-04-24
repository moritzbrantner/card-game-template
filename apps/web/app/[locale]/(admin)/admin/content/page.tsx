import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  AdminAnnouncementForm,
  type AnnouncementFormState,
  type AnnouncementFormValues,
} from '@/components/admin/admin-announcement-form';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LocalizedLink } from '@/i18n/server-link';
import { withLocalePath, type AppLocale } from '@/i18n/routing';
import { getAuthSession } from '@/src/auth.server';
import { getAuthorizedAdminPageDefinitions } from '@/src/admin/pages';
import { hasPermissionForRole } from '@/src/domain/authorization/service';
import { createTranslator } from '@/src/i18n/messages';
import { enqueueJob } from '@/src/jobs/service';
import {
  notFoundUnlessFeatureEnabled,
  requirePermission,
  resolveLocale,
} from '@/src/server/page-guards';
import {
  archiveAnnouncementNow,
  deleteAnnouncement,
  getAnnouncementById,
  listAnnouncements,
  publishAnnouncementNow,
  saveAnnouncement,
  type SiteAnnouncementRecord,
} from '@/src/site-config/service';

function parseOptionalDate(value: FormDataEntryValue | null) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized ? new Date(normalized) : null;
}

function toDateTimeLocalValue(value: Date | string | null | undefined) {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 16);
}

function getRedirectPath(locale: AppLocale, announcementId?: string) {
  return announcementId
    ? withLocalePath(`/admin/content?announcementId=${announcementId}`, locale)
    : withLocalePath('/admin/content', locale);
}

async function saveAnnouncementAction(
  _state: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  'use server';

  const session = await getAuthSession();

  if (!(await hasPermissionForRole(session?.user.role, 'admin.content.edit'))) {
    return {
      error: 'You do not have permission to update admin content.',
      fieldErrors: {},
    };
  }

  const locale = String(formData.get('locale') ?? 'en') as AppLocale;
  const result = await saveAnnouncement({
    id: String(formData.get('id') ?? '') || undefined,
    locale,
    title: String(formData.get('title') ?? ''),
    body: String(formData.get('body') ?? ''),
    href: String(formData.get('href') ?? '') || undefined,
    status: String(formData.get('status') ?? 'draft') as
      | 'draft'
      | 'scheduled'
      | 'published'
      | 'archived',
    publishAt: parseOptionalDate(formData.get('publishAt')),
    unpublishAt: parseOptionalDate(formData.get('unpublishAt')),
  });

  if (!result.ok) {
    return {
      error: result.error.message,
      fieldErrors: result.error.fieldErrors,
    };
  }

  if (result.data.status === 'scheduled' && result.data.publishAt) {
    await enqueueJob(
      'publishAnnouncement',
      {
        announcementId: result.data.id,
        scheduledFor: result.data.publishAt.toISOString(),
      },
      { runAt: result.data.publishAt },
    );
  }

  if (result.data.unpublishAt && result.data.status !== 'archived') {
    await enqueueJob(
      'archiveAnnouncement',
      {
        announcementId: result.data.id,
        scheduledFor: result.data.unpublishAt.toISOString(),
      },
      { runAt: result.data.unpublishAt },
    );
  }

  revalidatePath(withLocalePath('/admin/content', locale));
  redirect(getRedirectPath(locale, result.data.id));
}

async function publishAnnouncementAction(formData: FormData) {
  'use server';

  const session = await getAuthSession();

  if (!(await hasPermissionForRole(session?.user.role, 'admin.content.edit'))) {
    throw new Error('Forbidden');
  }

  const locale = String(formData.get('locale') ?? 'en') as AppLocale;
  const announcementId = String(formData.get('id') ?? '');
  await publishAnnouncementNow(announcementId);
  revalidatePath(withLocalePath('/admin/content', locale));
  redirect(getRedirectPath(locale, announcementId));
}

async function archiveAnnouncementAction(formData: FormData) {
  'use server';

  const session = await getAuthSession();

  if (!(await hasPermissionForRole(session?.user.role, 'admin.content.edit'))) {
    throw new Error('Forbidden');
  }

  const locale = String(formData.get('locale') ?? 'en') as AppLocale;
  const announcementId = String(formData.get('id') ?? '');
  await archiveAnnouncementNow(announcementId);
  revalidatePath(withLocalePath('/admin/content', locale));
  redirect(getRedirectPath(locale, announcementId));
}

async function deleteAnnouncementAction(formData: FormData) {
  'use server';

  const session = await getAuthSession();

  if (!(await hasPermissionForRole(session?.user.role, 'admin.content.edit'))) {
    throw new Error('Forbidden');
  }

  const locale = String(formData.get('locale') ?? 'en') as AppLocale;
  await deleteAnnouncement(String(formData.get('id') ?? ''));
  revalidatePath(withLocalePath('/admin/content', locale));
  redirect(getRedirectPath(locale));
}

function buildInitialValues(
  locale: AppLocale,
  announcement: Awaited<ReturnType<typeof getAnnouncementById>>,
): AnnouncementFormValues {
  return {
    id: announcement?.id,
    locale,
    title: announcement?.title ?? '',
    body: announcement?.body ?? '',
    href: announcement?.href ?? '',
    status: announcement?.status ?? 'draft',
    publishAt: toDateTimeLocalValue(announcement?.publishAt),
    unpublishAt: toDateTimeLocalValue(announcement?.unpublishAt),
  };
}

function AnnouncementCard({
  announcement,
  locale,
}: {
  announcement: SiteAnnouncementRecord;
  locale: AppLocale;
}) {
  return (
    <div
      key={announcement.id}
      className="rounded-2xl border p-4 dark:border-zinc-800"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{announcement.title}</p>
        <Badge variant="outline">{announcement.status}</Badge>
        <Badge variant="secondary">{announcement.locale}</Badge>
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        {announcement.body}
      </p>
      {announcement.href ? (
        <p className="mt-2 text-xs text-zinc-500">Link: {announcement.href}</p>
      ) : null}
      <div className="mt-2 space-y-1 text-xs text-zinc-500">
        <p>
          {announcement.publishAt
            ? `Publish: ${new Date(announcement.publishAt).toLocaleString(locale)}`
            : 'Publish immediately'}
        </p>
        <p>
          {announcement.unpublishAt
            ? `Unpublish: ${new Date(announcement.unpublishAt).toLocaleString(locale)}`
            : 'No auto-archive scheduled'}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <LocalizedLink
          href={`/admin/content?announcementId=${announcement.id}`}
          locale={locale}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Edit
        </LocalizedLink>
        <form action={publishAnnouncementAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={announcement.id} />
          <button
            type="submit"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Publish now
          </button>
        </form>
        <form action={archiveAnnouncementAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={announcement.id} />
          <button
            type="submit"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            Archive now
          </button>
        </form>
        <form action={deleteAnnouncementAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={announcement.id} />
          <button
            type="submit"
            className={buttonVariants({
              variant: 'ghost',
              size: 'sm',
              className: 'text-red-600 dark:text-red-400',
            })}
          >
            Delete
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function AdminContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ announcementId?: string }>;
}) {
  const [{ locale: rawLocale }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('admin.content');
  const session = await requirePermission(locale, 'admin.content.read');
  const t = createTranslator(locale, 'AdminPage');
  const adminPages = await getAuthorizedAdminPageDefinitions(session.user.role);
  const editingAnnouncementId =
    typeof rawSearchParams.announcementId === 'string'
      ? rawSearchParams.announcementId
      : undefined;
  const [announcements, editingAnnouncement] = await Promise.all([
    listAnnouncements(locale),
    editingAnnouncementId
      ? getAnnouncementById(editingAnnouncementId)
      : Promise.resolve(null),
  ]);
  const initialValues = buildInitialValues(locale, editingAnnouncement);

  return (
    <AdminPageShell
      title={t('content.title')}
      description={t('content.description')}
      adminPages={adminPages}
    >
      <Card>
        <CardHeader>
          <CardTitle>
            {editingAnnouncement ? 'Edit announcement' : 'Create announcement'}
          </CardTitle>
          <CardDescription>
            Announcements are localized, schedulable, and rendered in the public
            shell.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminAnnouncementForm
            mode={editingAnnouncement ? 'edit' : 'create'}
            initialValues={initialValues}
            action={saveAnnouncementAction}
            cancelHref={editingAnnouncement ? '/admin/content' : undefined}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing announcements</CardTitle>
          <CardDescription>
            Publish, schedule, archive, or edit operational content without
            changing repo-managed MDX.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {announcements.length > 0 ? (
            announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                locale={locale}
              />
            ))
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              No announcements have been created yet.
            </p>
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
