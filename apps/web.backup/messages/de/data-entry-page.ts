export const dataEntryPage = {
  title: 'Schema-Dateneingabe',
  description: 'Erstelle Zeilen für erlaubte Tabellen. Zugriff wird pro Tabelle und Rolle gesteuert.',
  permissions: {
    read: 'Lesen',
    write: 'Schreiben',
    noWrite: 'Du kannst diese Tabelle lesen, aber nicht schreiben.',
  },
  form: {
    creating: 'Erstelle…',
    createRow: '{table}-Zeile erstellen',
    fields: {
      bio: 'Bio',
      locale: 'Sprache',
      timezone: 'Zeitzone',
      email: 'E-Mail',
      name: 'Name',
      role: 'Rolle',
      action: 'Aktion',
      outcome: 'Ergebnis',
      statusCode: 'Statuscode',
      metadataJson: 'Metadata JSON',
      key: 'Schlüssel',
      count: 'Anzahl',
      resetAt: 'Zurücksetzen um',
    },
  },
};
