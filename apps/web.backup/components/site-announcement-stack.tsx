import { SiteAnnouncementBanner } from '@/components/site-announcement-banner';
import type { AppLocale } from '@/i18n/routing';
import { getActiveAnnouncements } from '@/src/site-config/service';

export async function SiteAnnouncementStack({ locale }: { locale: AppLocale }) {
  const announcements = await getActiveAnnouncements(locale);

  if (!announcements.length) {
    return null;
  }

  return announcements.map((announcement) => (
    <SiteAnnouncementBanner
      key={announcement.id}
      announcement={announcement}
      locale={locale}
    />
  ));
}
