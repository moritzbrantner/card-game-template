import { LocalizedLink } from '@/i18n/server-link';
import type { AppLocale } from '@/i18n/routing';

export function SiteAnnouncementBanner({
  announcement,
  locale,
}: {
  announcement: {
    id: string;
    title: string;
    body: string;
    href: string | null;
  };
  locale: AppLocale;
}) {
  const content = (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold">{announcement.title}</p>
      <p className="mt-1">{announcement.body}</p>
    </div>
  );

  if (!announcement.href) {
    return content;
  }

  return (
    <LocalizedLink href={announcement.href} locale={locale} className="block">
      {content}
    </LocalizedLink>
  );
}
