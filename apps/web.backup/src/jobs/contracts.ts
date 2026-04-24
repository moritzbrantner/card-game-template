import type { SendEmailRequest } from '@/src/email/service';

export const jobNames = [
  'sendEmail',
  'fanoutNotification',
  'publishAnnouncement',
  'archiveAnnouncement',
  'pruneAnalytics',
] as const;

export type JobName = (typeof jobNames)[number];

export type JobPayloadMap = {
  sendEmail: SendEmailRequest;
  fanoutNotification: {
    actorId: string;
    audience: 'user' | 'role' | 'all';
    audienceValue?: string | null;
    title: string;
    body: string;
    href?: string | null;
    recipientUserIds: string[];
  };
  publishAnnouncement: {
    announcementId: string;
    scheduledFor: string;
  };
  archiveAnnouncement: {
    announcementId: string;
    scheduledFor: string;
  };
  pruneAnalytics: {
    olderThanDays?: number;
  };
};
