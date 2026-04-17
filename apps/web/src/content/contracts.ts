export type SeoFields = {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
};

export type ContentCollection = 'pages' | 'blog' | 'changelog';

export type ContentIndexRecord = {
  id: string;
  collection: ContentCollection;
  slug: string;
  locale: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string | null;
  draft: boolean;
  tags: string[];
  seo: SeoFields;
  href: string;
};

export type ContentEntry = ContentIndexRecord & {
  body: string;
};
