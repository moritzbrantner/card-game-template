export const formsPage = {
  title: 'Mitarbeiterprofil-Formular',
  description: 'Ein produktionsnahes `react-hook-form`-Beispiel zusammen mit einer kompakten Referenz zum Formularzustand.',
  overviewTitle: 'Zentrale Bausteine',
  interactionsTitle: 'Zustandsinteraktionen',
  overview: {
    useForm: 'Erzeugt die Formular-API, Default-Werte, den Validierungsmodus und den State, aus dem alles andere liest.',
    register: 'Verbindet native Inputs mit dem Formular und haengt Regeln ohne zusaetzliche Wrapper an.',
    controller: 'Bindet kontrollierte Komponenten an denselben Formularzustand an, wenn direkte Registrierung nicht moeglich ist.',
    reset: 'Stellt Default-Werte wieder her, loescht Fehler und kann Teile des aktuellen Zustands behalten.',
  },
  interactions: {
    initialRender: {
      title: 'Initiales Rendern',
      required: 'Regeln sind registriert, aber unberuehrte Felder zeigen meist noch keine Fehler.',
      dirty: '`isDirty` ist false, weil Werte noch den Defaults entsprechen.',
      validity: '`isValid` haengt vom gewaehlten Validierungsmodus ab.',
      reset: '`reset()` kehrt zu dieser sauberen Basis zurueck.',
    },
    validInput: {
      title: 'Gueltiger Nutzereingang',
      required: 'Die Pflichtfeldregel ist jetzt erfuellt.',
      dirty: 'Der Dirty-State wird true, weil sich der Wert vom Default unterscheidet.',
      validity: 'Die Gueltigkeit wird true, sobald Validierung laeuft und keine weiteren Fehler mehr bestehen.',
      reset: '`reset()` stellt den Originalwert wieder her und loescht den Dirty-State.',
    },
    invalidClear: {
      title: 'Pflichtfeld wieder leeren',
      required: 'Das Feld verletzt erneut die Pflichtfeldregel.',
      dirty: 'Das Feld bleibt dirty, bis es wieder exakt dem Default entspricht.',
      validity: '`isValid` wird false, sobald Validierung laeuft.',
      reset: '`reset()` entfernt den Fehler, wenn die Defaults gueltig sind.',
    },
    resetWithValues: {
      title: 'reset(newValues)',
      required: 'Die Regeln bleiben an den Felddefinitionen haengen.',
      dirty: 'Dirty-Tracking wird gegen die neuen Defaults neu berechnet.',
      validity: 'Die Gueltigkeit wird aus dem neuen Reset-Zustand neu berechnet.',
      reset: 'Diese neuen Werte werden zum frischen, sauberen Schnappschuss.',
    },
  },
};
