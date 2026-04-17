import { adminPage } from './admin-page';
import { blogPage } from './blog-page';
import { authPages } from './auth-pages';
import { dataEntryPage } from './data-entry-page';
import { languageSelector } from './language-selector';
import { navigationBar } from './navigation-bar';
import { notificationsPage } from './notifications-page';
import { peoplePage } from './people-page';
import { profilePage } from './profile-page';
import { reportProblemPage } from './report-problem-page';
import { settingsPage } from './settings-page';
import { themeToggle } from './theme-toggle';
import { unlighthousePage } from './unlighthouse-page';

const deMessages = {
  NavigationBar: navigationBar,
  AuthPages: authPages,
  LanguageSelector: languageSelector,
  ThemeToggle: themeToggle,
  AdminPage: adminPage,
  BlogPage: blogPage,
  DataEntryPage: dataEntryPage,
  SettingsPage: settingsPage,
  NotificationsPage: notificationsPage,
  PeoplePage: peoplePage,
  ProfilePage: profilePage,
  ReportProblemPage: reportProblemPage,
  UnlighthousePage: unlighthousePage,
};

export default deMessages;
