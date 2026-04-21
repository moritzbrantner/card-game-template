export type AppRoute =
  | 'home'
  | 'uno'
  | 'poker'
  | 'tcg'
  | 'settings'
  | 'documents'
  | 'three'
  | 'react-hook-form'
  | 'uploads'
  | 'communication';

export function createNavbar(route: AppRoute): HTMLElement {
  const navbar = document.createElement('nav');
  navbar.className = 'navbar';

  const brand = document.createElement('span');
  brand.className = 'navbar__brand';
  brand.textContent = 'Desktop App';

  const actions = document.createElement('div');
  actions.className = 'navbar__actions';

  const homeLink = document.createElement('a');
  homeLink.href = '#/';
  homeLink.textContent = 'Home';
  if (route === 'home') {
    homeLink.className = 'is-active';
  }

  const unoLink = document.createElement('a');
  unoLink.href = '#/uno';
  unoLink.textContent = 'UNO-style';
  if (route === 'uno') {
    unoLink.className = 'is-active';
  }

  const pokerLink = document.createElement('a');
  pokerLink.href = '#/poker';
  pokerLink.textContent = "Hold'em";
  if (route === 'poker') {
    pokerLink.className = 'is-active';
  }

  const tcgLink = document.createElement('a');
  tcgLink.href = '#/tcg';
  tcgLink.textContent = 'Arcane Duel';
  if (route === 'tcg') {
    tcgLink.className = 'is-active';
  }

  const settingsLink = document.createElement('a');
  settingsLink.href = '#/settings';
  settingsLink.textContent = 'Settings';
  if (route === 'settings') {
    settingsLink.className = 'is-active';
  }

  const documentsLink = document.createElement('a');
  documentsLink.href = '#/documents';
  documentsLink.textContent = 'Documents';
  if (route === 'documents') {
    documentsLink.className = 'is-active';
  }

  const threeLink = document.createElement('a');
  threeLink.href = '#/three';
  threeLink.textContent = 'Three.js';
  if (route === 'three') {
    threeLink.className = 'is-active';
  }

  const reactHookFormLink = document.createElement('a');
  reactHookFormLink.href = '#/react-hook-form';
  reactHookFormLink.textContent = 'React Hook Form';
  if (route === 'react-hook-form') {
    reactHookFormLink.className = 'is-active';
  }

  const uploadsLink = document.createElement('a');
  uploadsLink.href = '#/uploads';
  uploadsLink.textContent = 'Uploads';
  if (route === 'uploads') {
    uploadsLink.className = 'is-active';
  }

  const communicationLink = document.createElement('a');
  communicationLink.href = '#/communication';
  communicationLink.textContent = 'Communication';
  if (route === 'communication') {
    communicationLink.className = 'is-active';
  }

  actions.append(
    homeLink,
    unoLink,
    pokerLink,
    tcgLink,
    settingsLink,
    documentsLink,
    threeLink,
    reactHookFormLink,
    uploadsLink,
    communicationLink,
  );
  navbar.append(brand, actions);

  return navbar;
}
