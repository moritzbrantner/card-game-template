import { createElement } from 'react';
import { redirect } from 'next/navigation';

import type { AppManifest } from '@/src/app-config/contracts';
import { withLocalePath } from '@/i18n/routing';
import { isGithubPagesBuild } from '@/src/runtime/build-target';
import { StaticRedirectPage } from '@/components/static-redirect-page';

import { loadShowcaseMessages } from './messages';

const enabledFeatures = {
  'account.register': true,
  'account.passwordRecovery': true,
  'profiles.public': true,
  'profiles.follow': true,
  'profiles.blog': true,
  'people.directory': true,
  'notifications': true,
  'newsletter': true,
  'reportProblem': true,
  'content.blog': true,
  'content.changelog': true,
  'workspace.dataEntry': true,
  'admin.workspace': true,
  'admin.content': true,
  'admin.reports': true,
  'admin.users': true,
  'admin.systemSettings': true,
  'admin.dataStudio': true,
  'showcase.forms': true,
  'showcase.story': true,
  'showcase.communication': true,
  'showcase.uploads': true,
  'showcase.remocn': true,
  'showcase.employeeTable': true,
  'showcase.unlighthouse': true,
} as const;

const showcaseManifest: AppManifest = {
  id: 'showcase',
  siteName: 'Next Template',
  defaultLocaleMetadata: {
    title: 'Next Template',
    description: 'Next.js application with auth, admin examples, and Drizzle/Postgres persistence.',
  },
  enabledFeatures,
  publicPages: [
    {
      id: 'home',
      slug: '',
      kind: 'component',
      namespace: 'HomePage',
      render: async ({ locale }) => {
        const pageModule = await import('./pages/home-page');
        const HomePage = pageModule.default;
        return createElement(HomePage, { locale });
      },
    },
    {
      id: 'about',
      slug: 'about',
      kind: 'component',
      namespace: 'AboutPage',
      render: async ({ locale }) => {
        const pageModule = await import('./pages/about-page');
        const AboutPage = pageModule.default;
        return createElement(AboutPage, { locale });
      },
    },
    {
      id: 'remocn',
      slug: 'remocn',
      kind: 'component',
      namespace: 'RemocnPage',
      featureKey: 'showcase.remocn',
      render: async ({ locale }) => {
        const pageModule = await import('./pages/remocn-page');
        const RemocnPage = pageModule.default;
        return createElement(RemocnPage, { locale });
      },
    },
    {
      id: 'forms',
      slug: 'examples/forms',
      kind: 'component',
      namespace: 'FormsPage',
      featureKey: 'showcase.forms',
      aliases: ['forms'],
      render: async ({ locale, matchedSlug }) => {
        if (matchedSlug === 'forms') {
          if (isGithubPagesBuild) {
            return createElement(StaticRedirectPage, { href: '../examples/forms/' });
          }

          redirect(withLocalePath('/examples/forms', locale));
        }

        const pageModule = await import('./pages/examples/forms-page');
        const FormsPage = pageModule.default;
        return createElement(FormsPage, { locale });
      },
    },
    {
      id: 'story',
      slug: 'examples/story',
      kind: 'component',
      namespace: 'StoryPage',
      featureKey: 'showcase.story',
      aliases: ['story'],
      render: async ({ locale, matchedSlug }) => {
        if (matchedSlug === 'story') {
          if (isGithubPagesBuild) {
            return createElement(StaticRedirectPage, { href: '../examples/story/' });
          }

          redirect(withLocalePath('/examples/story', locale));
        }

        const pageModule = await import('./pages/examples/story-page');
        const StoryPage = pageModule.default;
        return createElement(StoryPage, { locale });
      },
    },
    {
      id: 'communication',
      slug: 'examples/communication',
      kind: 'component',
      namespace: 'CommunicationPage',
      featureKey: 'showcase.communication',
      aliases: ['communication'],
      render: async ({ locale, matchedSlug }) => {
        if (matchedSlug === 'communication') {
          if (isGithubPagesBuild) {
            return createElement(StaticRedirectPage, { href: '../examples/communication/' });
          }

          redirect(withLocalePath('/examples/communication', locale));
        }

        const pageModule = await import('./pages/examples/communication-page');
        const CommunicationPage = pageModule.default;
        return createElement(CommunicationPage, { locale });
      },
    },
    {
      id: 'table',
      slug: 'table',
      kind: 'component',
      namespace: 'NavigationBar',
      featureKey: 'showcase.employeeTable',
      render: async ({ locale }) => {
        const pageModule = await import('./pages/table-page');
        const TablePage = pageModule.default;
        return createElement(TablePage, { locale });
      },
    },
    {
      id: 'uploads',
      slug: 'examples/uploads',
      kind: 'component',
      namespace: 'UploadsPage',
      featureKey: 'showcase.uploads',
      aliases: ['uploads'],
      render: async ({ locale, matchedSlug }) => {
        if (matchedSlug === 'uploads') {
          if (isGithubPagesBuild) {
            return createElement(StaticRedirectPage, { href: '../examples/uploads/' });
          }

          redirect(withLocalePath('/examples/uploads', locale));
        }

        const pageModule = await import('./pages/examples/uploads-page');
        const UploadsPage = pageModule.default;
        return createElement(UploadsPage, { locale });
      },
    },
  ],
  publicNavigation: [
    { pageId: 'home', category: 'discover', hotkey: ['alt', 'h'], order: 10 },
    { pageId: 'about', category: 'discover', hotkey: ['alt', 'a'], order: 20 },
    { pageId: 'remocn', category: 'discover', hotkey: ['alt', 'v'], prefetch: false, order: 30 },
    { pageId: 'story', category: 'discover', hotkey: ['alt', 's'], prefetch: false, order: 40 },
    { pageId: 'communication', category: 'discover', hotkey: ['alt', 'c'], prefetch: false, order: 50 },
    { pageId: 'forms', category: 'workspace', hotkey: ['alt', 'f'], prefetch: false, order: 60 },
    { pageId: 'table', category: 'workspace', hotkey: ['alt', 't'], order: 70 },
    { pageId: 'uploads', category: 'workspace', hotkey: ['alt', 'u'], prefetch: false, order: 80 },
  ],
  contentRoots: {
    pages: ['apps/showcase/content/pages'],
    blog: ['apps/showcase/content/blog'],
    changelog: ['apps/showcase/content/changelog'],
  },
  loadMessages: loadShowcaseMessages,
  exampleApis: {
    employees: {
      featureKey: 'showcase.employeeTable',
      loadRouteModule: () => import('./api/examples/employees'),
    },
  },
};

export default showcaseManifest;
