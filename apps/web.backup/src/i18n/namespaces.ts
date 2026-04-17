export const shellNamespaces = ['NavigationBar', 'LanguageSelector', 'ThemeToggle'] as const;

export const publicWebsiteNamespaces = [...shellNamespaces, 'ReportProblemPage'] as const;

export const guestWebsiteNamespaces = [...shellNamespaces] as const;

export const protectedWebsiteNamespaces = [...shellNamespaces, 'NotificationsPage', 'PeoplePage', 'SettingsPage'] as const;

export const adminWebsiteNamespaces = [...shellNamespaces, 'AdminPage'] as const;
