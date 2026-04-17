export const communicationPage = {
  eyebrow: 'Kommunikationskategorie',
  title: 'Echtzeitkommunikation',
  description:
    'Eine kurze Referenz fuer Kollaborationsbausteine, sobald mehrere Clients denselben Zustand teilen muessen.',
  intro:
    'Nutze diese Seite als Vorlagenbaustein, wenn du Transportwege mit geteiltem Zustand vergleichen willst. WebSockets bewegen Ereignisse schnell, CRDTs halten Replikate trotz paralleler Bearbeitungen konsistent.',
  newsletter: {
    eyebrow: 'E-Mail-Kanal',
    title: 'Newsletter',
    description: 'Erfasse eine E-Mail-Adresse und sende bei lokaler Entwicklung und e2e-Tests eine echte Nachricht ueber Mailpit.',
    email: 'E-Mail-Adresse',
    submit: 'Abonnieren',
    submitting: 'Abonnement wird erstellt...',
    requiredEmail: 'E-Mail ist erforderlich.',
    invalidEmail: 'Gib eine gueltige E-Mail-Adresse ein.',
    success: 'Du bist angemeldet. Pruefe deinen Posteingang auf die Willkommensmail.',
    genericError: 'Das Abonnement konnte gerade nicht erstellt werden.',
  },
  sections: {
    websockets: {
      eyebrow: 'Kommunikationsthema',
      title: 'WebSockets',
      summary:
        'WebSockets halten eine langlebige Verbindung offen, damit Clients und Server Ereignisse mit geringer Latenz ohne wiederholten Request-Aufbau austauschen koennen.',
      bullets: {
        0: 'Hilfreich fuer Presence, Chat, kollaborative Cursor und Streaming-Updates.',
        1: 'Die meisten Apps brauchen Verbindungsmanagement, Auth-Aktualisierung, Heartbeats und Reconnect-Zustaende.',
        2: 'Kleine Event-Payloads lassen sich in der UI einfacher inkrementell zusammenfuehren.',
      },
    },
    crdts: {
      eyebrow: 'Kommunikationsthema',
      title: 'CRDTs',
      summary:
        'CRDTs erlauben gleichzeitige Bearbeitungen auf mehreren Clients und fuehren trotzdem zum selben Endzustand ohne zentrale Sperrschritte.',
      bullets: {
        0: 'Hilfreich, wenn Zusammenarbeit auch bei Offline-Phasen oder instabiler Verbindung weiterlaufen muss.',
        1: 'Die meisten Apps speichern Operationen lokal und synchronisieren sie spaeter zurueck.',
        2: 'Konfliktaufloesung liegt in der Datenstruktur statt in spontaner Merge-Logik der UI.',
      },
    },
  },
};
