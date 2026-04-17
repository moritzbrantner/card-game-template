export const notificationsPage = {
  fallbackUser: 'dir',
  badge: 'Updates nach Anmeldung',
  title: 'Benachrichtigungen',
  description:
    'Ein einfaches Postfach fuer {name}. Behalte Sicherheitsereignisse, Arbeitsbereich-Updates und geplante Digests im Blick.',
  summary: {
    unread: {
      label: 'Ungelesen',
      hint: 'Alles Neue seit deiner letzten Sitzung wird hier gebuendelt angezeigt.',
    },
    today: {
      label: 'Heute',
      hint: 'Aktuelle Aktivitaeten aus deinem Konto und Arbeitsbereich der letzten Stunden.',
    },
    preferences: {
      label: 'Zustellung',
      value: 'E-Mail + In-App',
      hint: 'In den Einstellungen wechselst du zwischen Sofortmeldungen und ruhigeren Digests.',
    },
  },
  feed: {
    title: 'Letzte Aktivitaeten',
    description: 'Hier stehen deine zuletzt zugestellten In-App-Benachrichtigungen.',
    empty: 'Noch keine Benachrichtigungen.',
    markRead: 'Als gelesen markieren',
    markingRead: 'Wird aktualisiert...',
    markReadError: 'Diese Benachrichtigung konnte gerade nicht aktualisiert werden.',
    status: {
      unread: 'Ungelesen',
      read: 'Gelesen',
    },
  },
  actions: {
    title: 'Schnellzugriffe',
    description: 'Springe direkt zu den Bereichen, die am haeufigsten mit Kontobenachrichtigungen verknuepft sind.',
    profile: 'Profil oeffnen',
    settings: 'Benachrichtigungen',
    markAllRead: 'Alle als gelesen markieren',
    markingAllRead: 'Wird aktualisiert...',
    markAllReadError: 'Deine Benachrichtigungen konnten gerade nicht aktualisiert werden.',
  },
  preferences: {
    title: 'Zustelloptionen',
    description:
      'Diese Seite dient als leichtgewichtiges Benachrichtigungszentrum, waehrend die vollstaendigen Optionen in den Einstellungen liegen.',
    email: 'E-Mail-Benachrichtigungen bleiben fuer Sicherheit und Kontowiederherstellung aktiv.',
    push: 'In-App-Hinweise eignen sich fuer Aktivitaeten im Arbeitsbereich, die keine sofortige Reaktion brauchen.',
    digest: 'Woechentliche Digests reduzieren Laerm und fassen dennoch relevante Aenderungen zusammen.',
  },
};
