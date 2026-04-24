export const reportProblemPage = {
  eyebrow: 'Support Intake',
  title: 'Problem melden',
  description:
    'Beschreibe den Fehler, den Ort im Produkt und genug Kontext, damit jemand ihn schnell reproduzieren kann. Nach dem Absenden liefert der Endpoint eine Referenznummer zurück.',
  checklistTitle: 'So wird der Bericht brauchbar',
  checklistDescription:
    'Ein paar konkrete Angaben sparen meistens mehrere Rückfragen.',
  checklist: {
    summary: {
      title: 'Beginne mit dem Symptom',
      description:
        'Beschreibe zuerst den sichtbaren Fehler, damit das Problem sofort eingeordnet werden kann.',
    },
    context: {
      title: 'Nenne die betroffene Stelle',
      description:
        'Gib die Seite, den Ablauf oder die Aktion an und erwähne, ob der Fehler jedes Mal auftritt.',
    },
    contact: {
      title: 'Hinterlasse einen erreichbaren Kontakt',
      description:
        'Nutze eine E-Mail-Adresse, unter der Rückfragen zu Screenshots, Zeitpunkten oder Repro-Schritten möglich sind.',
    },
  },
  responseTitle: 'Was danach passiert',
  responseBody:
    'Beim Absenden wird der Bericht serverseitig validiert und du erhältst eine Referenznummer, die du in Rückfragen teilen kannst.',
  privacyNote:
    'Bitte keine Passwörter, Geheimnisse oder unnötigen personenbezogenen Daten einfügen.',
  fields: {
    name: {
      label: 'Dein Name',
      placeholder: 'Alex Johnson',
    },
    email: {
      label: 'E-Mail-Adresse',
      placeholder: 'alex@example.com',
    },
    area: {
      label: 'Bereich',
      options: {
        bug: 'Fehler',
        performance: 'Performance',
        account: 'Konto oder Zugriff',
        billing: 'Abrechnung',
        other: 'Sonstiges',
      },
    },
    pageUrl: {
      label: 'Seiten-URL',
      placeholder: 'https://app.example.com/settings',
    },
    subject: {
      label: 'Kurze Zusammenfassung',
      placeholder: 'Beim Speichern schließt sich das Modal unerwartet',
    },
    details: {
      label: 'Was ist passiert?',
      placeholder:
        'Was hast du erwartet, was ist tatsächlich passiert und wie lässt sich das Problem reproduzieren?',
    },
  },
  footnote:
    'Die Pflichtfelder reichen zum Melden. Zusätzlicher Kontext beschleunigt nur die Einordnung.',
  actions: {
    submit: 'Bericht senden',
    submitting: 'Bericht wird gesendet...',
  },
  success: {
    message: 'Problembericht eingegangen. Referenznummer: {referenceId}.',
  },
  errors: {
    generic:
      'Der Bericht konnte nicht gesendet werden. Bitte prüfe das Formular und versuche es erneut.',
  },
};
