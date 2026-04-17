export const publicSiteSettingKeys = [
  'site.name',
  'site.url',
  'seo.defaultTitle',
  'seo.titleSuffix',
  'seo.defaultDescription',
  'seo.defaultOgImage',
  'contact.supportEmail',
] as const;

export const analyticsSiteSettingKeys = [
  'analytics.pageVisitRetentionDays',
  'analytics.defaultAdminReportWindow',
] as const;

export const siteSettingKeys = [...publicSiteSettingKeys, ...analyticsSiteSettingKeys] as const;

export type SiteSettingKey = (typeof siteSettingKeys)[number];
export type PublicSiteSettingKey = (typeof publicSiteSettingKeys)[number];
export type AnalyticsSiteSettingKey = (typeof analyticsSiteSettingKeys)[number];

export const featureFlagKeys = [
  'marketing.blog',
  'marketing.changelog',
  'marketing.announcements',
  'analytics.pageVisits',
] as const;

export type FeatureFlagKey = (typeof featureFlagKeys)[number];

export type PublicSiteConfig = {
  siteName: string;
  siteUrl: string;
  seo: {
    defaultTitle: string;
    titleSuffix: string;
    defaultDescription: string;
    defaultOgImage: string | null;
  };
  contact: {
    supportEmail: string;
  };
  flags: Record<FeatureFlagKey, boolean>;
};
