import './index.css';

import { createSharedButtonLabel } from '@moritzbrantner/ui';

import type { DocumentState } from '@moritzbrantner/electron-documents/renderer';

import { AppRoute, createNavbar } from './navbar';
import {
  defaultDesktopPreferences,
  resolveThemePreference,
  type DesktopPreferences,
} from './platform/shared/preferences';

const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

const defaultDocumentState: DocumentState = {
  content: '',
  displayName: 'Untitled',
  filePath: null,
  isDirty: false,
  lastSavedAt: null,
  recentDocuments: [],
  statusMessage: 'Ready',
};

const appState = {
  documents: defaultDocumentState,
  preferences: defaultDesktopPreferences,
  ready: false,
};

function applyTheme(preferences: DesktopPreferences) {
  const theme = resolveThemePreference(preferences.appearance.theme, systemThemeQuery.matches);
  document.documentElement.dataset.theme = theme;
}

function getCurrentRoute(): AppRoute {
  if (window.location.hash === '#/settings') {
    return 'settings';
  }

  if (window.location.hash === '#/documents') {
    return 'documents';
  }

  if (window.location.hash === '#/uploads') {
    return 'uploads';
  }

  if (window.location.hash === '#/communication') {
    return 'communication';
  }

  if (window.location.hash === '#/three') {
    return 'three';
  }

  if (window.location.hash === '#/react-hook-form') {
    return 'react-hook-form';
  }

  return 'home';
}

function createScreenFrame(eyebrowText: string, titleText: string, descriptionText: string) {
  const screen = document.createElement('section');
  screen.className = 'screen';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'screen__eyebrow';
  eyebrow.textContent = eyebrowText;

  const title = document.createElement('h1');
  title.className = 'screen__title';
  title.textContent = titleText;

  const description = document.createElement('p');
  description.className = 'screen__description';
  description.textContent = descriptionText;

  screen.append(eyebrow, title, description);

  return screen;
}

function createHomeScreen() {
  const screen = createScreenFrame(
    'Desktop foundation',
    'Hello Electron!',
    'This template now wires reusable platform packages for preferences, commands, document save/load, and window state while keeping app-specific UI at the root.',
  );

  const grid = document.createElement('div');
  grid.className = 'overview-grid';

  const sharedPackageCard = document.createElement('article');
  sharedPackageCard.className = 'overview-card';

  const sharedPackageTitle = document.createElement('h2');
  sharedPackageTitle.textContent = 'Shared platform package';

  const sharedPackageBody = document.createElement('p');
  sharedPackageBody.textContent =
    'The renderer consumes the same final package names you can publish later under the @moritzbrantner scope.';

  const sharedPackageLabel = document.createElement('code');
  sharedPackageLabel.className = 'shared-package-label';
  sharedPackageLabel.textContent = createSharedButtonLabel({ label: 'desktop-launch' });

  sharedPackageCard.append(sharedPackageTitle, sharedPackageBody, sharedPackageLabel);

  const featuresCard = document.createElement('article');
  featuresCard.className = 'overview-card';

  const featuresTitle = document.createElement('h2');
  featuresTitle.textContent = 'Foundation features';

  const featuresList = document.createElement('ul');
  featuresList.className = 'overview-list';

  [
    'Preferences now persist through a typed preload-safe store.',
    'Documents support save, save as, reopen recent, and dirty state.',
    'CmdOrCtrl+, / N / O / S hotkeys run through a reusable command registry.',
  ].forEach((text) => {
    const item = document.createElement('li');
    item.textContent = text;
    featuresList.append(item);
  });

  featuresCard.append(featuresTitle, featuresList);
  grid.append(sharedPackageCard, featuresCard);
  screen.append(grid);

  return screen;
}

function createSettingsScreen() {
  const screen = createScreenFrame(
    'Application settings',
    'Settings',
    'Preferences are stored in the Electron main process and streamed back into the renderer through the preload bridge.',
  );

  const grid = document.createElement('div');
  grid.className = 'settings-grid';

  const appearanceCard = document.createElement('article');
  appearanceCard.className = 'overview-card';

  const appearanceTitle = document.createElement('h2');
  appearanceTitle.textContent = 'Appearance';

  const themeGroup = document.createElement('div');
  themeGroup.className = 'settings-toggle-group';

  ['system', 'light', 'dark'].forEach((themeMode) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className =
      appState.preferences.appearance.theme === themeMode ? 'settings-chip is-active' : 'settings-chip';
    button.textContent =
      themeMode === 'system'
        ? 'System theme'
        : themeMode === 'light'
          ? 'Light mode'
          : 'Dark mode';
    button.addEventListener('click', () => {
      void window.desktop.preferences.set('appearance', {
        theme: themeMode as DesktopPreferences['appearance']['theme'],
      });
    });
    themeGroup.append(button);
  });

  appearanceCard.append(appearanceTitle, themeGroup);

  const developerCard = document.createElement('article');
  developerCard.className = 'overview-card';

  const developerTitle = document.createElement('h2');
  developerTitle.textContent = 'Developer';

  const developerToggle = document.createElement('label');
  developerToggle.className = 'settings-checkbox';

  const developerCheckbox = document.createElement('input');
  developerCheckbox.type = 'checkbox';
  developerCheckbox.checked = appState.preferences.developer.openDevToolsOnLaunch;
  developerCheckbox.addEventListener('change', () => {
    void window.desktop.preferences.set('developer', {
      openDevToolsOnLaunch: developerCheckbox.checked,
    });
  });

  const developerText = document.createElement('span');
  developerText.textContent = 'Open DevTools automatically on launch';
  developerToggle.append(developerCheckbox, developerText);
  developerCard.append(developerTitle, developerToggle);

  const documentsCard = document.createElement('article');
  documentsCard.className = 'overview-card';

  const documentsTitle = document.createElement('h2');
  documentsTitle.textContent = 'Documents';

  const reopenToggle = document.createElement('label');
  reopenToggle.className = 'settings-checkbox';

  const reopenCheckbox = document.createElement('input');
  reopenCheckbox.type = 'checkbox';
  reopenCheckbox.checked = appState.preferences.documents.reopenLastDocument;
  reopenCheckbox.addEventListener('change', () => {
    void window.desktop.preferences.set('documents', {
      reopenLastDocument: reopenCheckbox.checked,
    });
  });

  const reopenText = document.createElement('span');
  reopenText.textContent = 'Reopen the last document on launch';
  reopenToggle.append(reopenCheckbox, reopenText);
  documentsCard.append(documentsTitle, reopenToggle);

  grid.append(appearanceCard, developerCard, documentsCard);
  screen.append(grid);

  return screen;
}

function createDocumentsScreen() {
  const screen = createScreenFrame(
    'Save and load',
    'Documents',
    'This route is backed by reusable document workflow packages and the application command registry.',
  );

  const toolbar = document.createElement('div');
  toolbar.className = 'document-toolbar';

  const actions: Array<{ commandId: string; label: string }> = [
    { commandId: 'document.new', label: 'New' },
    { commandId: 'document.open', label: 'Open' },
    { commandId: 'document.save', label: 'Save' },
    { commandId: 'document.saveAs', label: 'Save As' },
  ];

  actions.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'upload-button';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      void window.desktop.commands.run(action.commandId);
    });
    toolbar.append(button);
  });

  const summary = document.createElement('div');
  summary.className = 'document-summary';

  const statusBadge = document.createElement('span');
  statusBadge.className = appState.documents.isDirty ? 'status-badge status-badge--warn' : 'status-badge';
  statusBadge.textContent = appState.documents.isDirty ? 'Unsaved changes' : 'Saved';

  const meta = document.createElement('div');
  meta.className = 'document-meta';
  meta.innerHTML = `
    <strong>${appState.documents.displayName}</strong>
    <span>${appState.documents.filePath ?? 'No file path yet'}</span>
    <span>${appState.documents.statusMessage}</span>
  `;

  summary.append(statusBadge, meta);

  const layout = document.createElement('div');
  layout.className = 'document-layout';

  const editorCard = document.createElement('article');
  editorCard.className = 'overview-card';

  const editorLabel = document.createElement('label');
  editorLabel.className = 'document-editor-label';
  editorLabel.textContent = 'Current document';

  const editor = document.createElement('textarea');
  editor.className = 'document-editor';
  editor.value = appState.documents.content;
  editor.placeholder = 'Write something, then save it to a .desktop.json file.';
  editor.addEventListener('input', () => {
    void window.desktop.documents.updateDraft(editor.value);
  });

  editorCard.append(editorLabel, editor);

  const recentCard = document.createElement('article');
  recentCard.className = 'overview-card';

  const recentTitle = document.createElement('h2');
  recentTitle.textContent = 'Recent files';

  const recentList = document.createElement('div');
  recentList.className = 'recent-list';

  if (appState.documents.recentDocuments.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No recent documents yet.';
    recentList.append(empty);
  } else {
    appState.documents.recentDocuments.forEach((recentDocument) => {
      const recentButton = document.createElement('button');
      recentButton.type = 'button';
      recentButton.className = 'recent-item';
      recentButton.innerHTML = `
        <strong>${recentDocument.name}</strong>
        <span>${recentDocument.filePath}</span>
        <span>${new Date(recentDocument.lastOpenedAt).toLocaleString()}</span>
      `;
      recentButton.addEventListener('click', () => {
        void window.desktop.documents.openRecent(recentDocument.filePath);
      });
      recentList.append(recentButton);
    });
  }

  recentCard.append(recentTitle, recentList);
  layout.append(editorCard, recentCard);
  screen.append(toolbar, summary, layout);

  return screen;
}

function createThreeScreen() {
  const screen = createScreenFrame(
    'Three dimensional',
    'Three.js',
    'A dedicated route for 3D demos, experiments, and future scene work in the desktop app.',
  );

  const showcase = document.createElement('div');
  showcase.className = 'three-showcase';

  const orbit = document.createElement('div');
  orbit.className = 'three-orbit';

  const cube = document.createElement('div');
  cube.className = 'three-cube';

  [
    'three-face three-face--front',
    'three-face three-face--back',
    'three-face three-face--right',
    'three-face three-face--left',
    'three-face three-face--top',
    'three-face three-face--bottom',
  ].forEach((className) => {
    const face = document.createElement('span');
    face.className = className;
    cube.append(face);
  });

  showcase.append(orbit, cube);
  screen.append(showcase);
  return screen;
}

function createReactHookFormScreen() {
  const screen = createScreenFrame(
    'Form state overview',
    'React Hook Form',
    'A reference page for the core React Hook Form pieces and how they affect required, dirty, validity, and reset.',
  );

  const grid = document.createElement('div');
  grid.className = 'overview-grid';

  [
    ['useForm', 'Creates the form API, default values, and formState for the rest of the tree.'],
    ['register', 'Connects uncontrolled inputs and attaches validation rules at the field edge.'],
    ['Controller', 'Bridges controlled components into the same dirty and validity model.'],
    ['reset', 'Restores defaults, clears errors, and can establish a new clean baseline.'],
  ].forEach(([titleText, bodyText]) => {
    const card = document.createElement('article');
    card.className = 'overview-card';

    const title = document.createElement('h2');
    title.textContent = titleText;

    const body = document.createElement('p');
    body.textContent = bodyText;

    card.append(title, body);
    grid.append(card);
  });

  screen.append(grid);
  return screen;
}

function createUploadScreen() {
  const screen = createScreenFrame(
    'Cross-app upload reference',
    'Uploads',
    'Uploads stay app-specific here, while the reusable platform layer handles preferences, commands, persistence, and documents.',
  );

  const card = document.createElement('article');
  card.className = 'overview-card';
  card.innerHTML = `
    <h2>Renderer picker</h2>
    <p>This route remains a placeholder for future drag-and-drop and file intake work.</p>
    <p>Current upload items and queue normalization can now be layered on top of the new package-backed foundation.</p>
  `;
  screen.append(card);
  return screen;
}

function createCommunicationScreen() {
  const screen = createScreenFrame(
    'Communication category',
    'Realtime communication',
    'A reference page for the main building blocks behind low-latency collaboration and shared-state syncing.',
  );

  const grid = document.createElement('div');
  grid.className = 'overview-grid';

  [
    {
      body: 'Websockets keep a persistent connection open so the app can exchange low-latency events.',
      title: 'Websockets',
    },
    {
      body: 'CRDTs allow multiple replicas to edit the same document concurrently and still converge.',
      title: 'CRDTs',
    },
  ].forEach((section) => {
    const card = document.createElement('article');
    card.className = 'overview-card';

    const title = document.createElement('h2');
    title.textContent = section.title;

    const body = document.createElement('p');
    body.textContent = section.body;

    card.append(title, body);
    grid.append(card);
  });

  screen.append(grid);
  return screen;
}

function renderApp() {
  const app = document.getElementById('app');
  if (!app) {
    return;
  }

  const route = getCurrentRoute();
  app.innerHTML = '';
  app.append(createNavbar(route));

  if (!appState.ready) {
    app.append(createScreenFrame('Loading', 'Loading desktop services', 'Connecting to the preload bridge.'));
    return;
  }

  if (route === 'settings') {
    app.append(createSettingsScreen());
    return;
  }

  if (route === 'documents') {
    app.append(createDocumentsScreen());
    return;
  }

  if (route === 'three') {
    app.append(createThreeScreen());
    return;
  }

  if (route === 'react-hook-form') {
    app.append(createReactHookFormScreen());
    return;
  }

  if (route === 'uploads') {
    app.append(createUploadScreen());
    return;
  }

  if (route === 'communication') {
    app.append(createCommunicationScreen());
    return;
  }

  app.append(createHomeScreen());
}

function handleKeyboardShortcuts(event: KeyboardEvent) {
  if (!event.ctrlKey && !event.metaKey) {
    return;
  }

  if (event.altKey) {
    return;
  }

  const key = event.key.toLowerCase();
  let commandId: string | null = null;

  if (key === ',') {
    commandId = 'app.openPreferences';
  } else if (key === 'n' && !event.shiftKey) {
    commandId = 'document.new';
  } else if (key === 'o' && !event.shiftKey) {
    commandId = 'document.open';
  } else if (key === 's' && event.shiftKey) {
    commandId = 'document.saveAs';
  } else if (key === 's') {
    commandId = 'document.save';
  }

  if (!commandId) {
    return;
  }

  event.preventDefault();
  void window.desktop.commands.run(commandId);
}

async function bootstrap() {
  const [preferences, documents] = await Promise.all([
    window.desktop.preferences.getAll(),
    window.desktop.documents.getState(),
  ]);

  appState.preferences = preferences;
  appState.documents = documents;
  appState.ready = true;
  applyTheme(preferences);

  window.desktop.preferences.subscribe((nextPreferences) => {
    appState.preferences = nextPreferences;
    applyTheme(nextPreferences);
    renderApp();
  });

  window.desktop.documents.subscribe((nextDocuments) => {
    appState.documents = nextDocuments;
    renderApp();
  });

  systemThemeQuery.addEventListener('change', () => {
    applyTheme(appState.preferences);
  });

  window.addEventListener('keydown', handleKeyboardShortcuts);
  renderApp();
}

window.addEventListener('hashchange', renderApp);
renderApp();
void bootstrap();
