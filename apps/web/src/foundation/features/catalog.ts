import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';

export type FoundationFeatureCategory =
  | 'account'
  | 'profiles'
  | 'workspace'
  | 'content'
  | 'admin'
  | 'marketing'
  | 'showcase';

export type FoundationFeatureMetadata = {
  label: string;
  description: string;
  category: FoundationFeatureCategory;
  supportsUserOverrides: boolean;
};

export const foundationFeatureMetadata: Record<FoundationFeatureKey, FoundationFeatureMetadata> = {
  'account.register': {
    label: 'Account registration',
    description: 'Allow new users to create accounts.',
    category: 'account',
    supportsUserOverrides: false,
  },
  'account.passwordRecovery': {
    label: 'Password recovery',
    description: 'Expose forgot-password and reset-password flows.',
    category: 'account',
    supportsUserOverrides: false,
  },
  'profiles.public': {
    label: 'Public profiles',
    description: 'Publish user profile pages to other visitors.',
    category: 'profiles',
    supportsUserOverrides: false,
  },
  'profiles.follow': {
    label: 'Profile following',
    description: 'Let signed-in users follow and unfollow profiles.',
    category: 'profiles',
    supportsUserOverrides: true,
  },
  'profiles.blog': {
    label: 'Profile blog editor',
    description: 'Let signed-in users manage their own profile blog posts.',
    category: 'profiles',
    supportsUserOverrides: true,
  },
  'people.directory': {
    label: 'People directory',
    description: 'Open the authenticated people directory.',
    category: 'profiles',
    supportsUserOverrides: true,
  },
  notifications: {
    label: 'Notifications center',
    description: 'Open personal notifications and notification actions.',
    category: 'workspace',
    supportsUserOverrides: true,
  },
  newsletter: {
    label: 'Newsletter signup',
    description: 'Expose newsletter subscription forms and APIs.',
    category: 'marketing',
    supportsUserOverrides: false,
  },
  reportProblem: {
    label: 'Problem reporting',
    description: 'Expose report-problem pages and APIs.',
    category: 'workspace',
    supportsUserOverrides: false,
  },
  'content.blog': {
    label: 'Marketing blog',
    description: 'Publish the shared blog content collection.',
    category: 'content',
    supportsUserOverrides: false,
  },
  'content.changelog': {
    label: 'Changelog',
    description: 'Publish the changelog content collection.',
    category: 'content',
    supportsUserOverrides: false,
  },
  'workspace.dataEntry': {
    label: 'Data entry workspace',
    description: 'Open the protected data-entry workspace and write APIs.',
    category: 'workspace',
    supportsUserOverrides: true,
  },
  'admin.workspace': {
    label: 'Admin workspace',
    description: 'Open the admin area entrypoint.',
    category: 'admin',
    supportsUserOverrides: false,
  },
  'admin.content': {
    label: 'Admin content tools',
    description: 'Open announcement and content operations.',
    category: 'admin',
    supportsUserOverrides: false,
  },
  'admin.reports': {
    label: 'Admin reports',
    description: 'Open reporting dashboards and exports.',
    category: 'admin',
    supportsUserOverrides: false,
  },
  'admin.users': {
    label: 'Admin user management',
    description: 'Open the user directory and user inspection surfaces.',
    category: 'admin',
    supportsUserOverrides: false,
  },
  'admin.systemSettings': {
    label: 'Admin system settings',
    description: 'Open platform-wide system settings.',
    category: 'admin',
    supportsUserOverrides: false,
  },
  'admin.dataStudio': {
    label: 'Admin data studio',
    description: 'Open schema-driven data studio tools.',
    category: 'admin',
    supportsUserOverrides: false,
  },
  'showcase.forms': {
    label: 'Showcase forms',
    description: 'Expose the forms example page.',
    category: 'showcase',
    supportsUserOverrides: false,
  },
  'showcase.story': {
    label: 'Showcase story',
    description: 'Expose the storytelling example page.',
    category: 'showcase',
    supportsUserOverrides: false,
  },
  'showcase.communication': {
    label: 'Showcase communication',
    description: 'Expose the communication example page.',
    category: 'showcase',
    supportsUserOverrides: false,
  },
  'showcase.uploads': {
    label: 'Showcase uploads',
    description: 'Expose the uploads example page.',
    category: 'showcase',
    supportsUserOverrides: false,
  },
  'showcase.remocn': {
    label: 'Showcase Remocn',
    description: 'Expose the Remocn showcase page.',
    category: 'showcase',
    supportsUserOverrides: false,
  },
  'showcase.employeeTable': {
    label: 'Showcase employee table',
    description: 'Expose the employee table example page and API.',
    category: 'showcase',
    supportsUserOverrides: false,
  },
  'showcase.unlighthouse': {
    label: 'Showcase unlighthouse',
    description: 'Expose the unlighthouse report page.',
    category: 'showcase',
    supportsUserOverrides: false,
  },
};

export const userConfigurableFoundationFeatureKeys = Object.entries(foundationFeatureMetadata)
  .filter(([, metadata]) => metadata.supportsUserOverrides)
  .map(([featureKey]) => featureKey as FoundationFeatureKey);
