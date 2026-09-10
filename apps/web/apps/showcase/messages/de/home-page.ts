export const homePage = {
  eyebrow: 'Kartenspiel-Vorschau',
  title: 'Waehle ein Spiel und spiele gegen Bots.',
  description:
    'Die Vorschau ist bewusst lokal und einfach: kein Konto, keine Analyse, keine Werbung, keine Lobby und kein Serverzustand. Oeffne ein Spiel und spiele direkt im Browser.',
  browseGames: 'Spiel auswaehlen',
  viewSource: 'Quellcode ansehen',
  pills: {
    engine: 'Gemeinsame Game Engine',
    rules: 'Unabhaengige Regeln',
    delivery: 'Lokales Bot-Spiel',
  },
  gamesEyebrow: 'Jetzt spielbar',
  gamesTitle: 'Lokale Browser-Spiele',
  gamesDescription:
    'Diese Beispiele nutzen die wiederverwendbaren Spielpakete und das lokale Session-Modell, ohne unfertige Konto- oder Multiplayer-Oberflaechen zu zeigen.',
  games: {
    uno: {
      category: 'Ablegespiel',
      title: 'UNO-artig',
      description:
        'Spiele eine komplette lokale UNO-artige Partie gegen einen deterministischen Bot mit der echten Regel-Engine und zulaessigen Aktionen.',
      cta: 'UNO-artig spielen',
    },
    phase10: {
      category: 'Romme-artiges Spiel',
      title: 'Phase-10-artig',
      description:
        'Spiele lokal mit konfigurierbaren Phasen, deterministischen Bot-Profilen, sichtbaren erlaubten Aktionen und wiederverwendbarem Rundenzustand.',
      cta: 'Phase-10-artig spielen',
    },
    poker: {
      category: 'Poker',
      title: 'Texas Hold’em',
      description:
        'Einen persistierten Tisch erstellen, gegen deterministische Bots spielen, erlaubte Aktionen senden und die massgebliche Hand nach einem Neuladen fortsetzen.',
      cta: 'Pokerspiel oeffnen',
    },
    tcg: {
      category: 'Sammelkartenspiel',
      title: 'Arcane Duel',
      description:
        'Ein persistiertes eigenes Kartenduell mit Deckzustand, sichtbaren Haenden, erlaubten Aktionen, menschlichen oder Bot-Gegnern und einem massgeblichen Match-Modell.',
      cta: 'Arcane Duel oeffnen',
    },
  },
  foundationEyebrow: 'Unter den Spielen',
  foundationTitle: 'Wiederverwendbare Engine, Regeln und lokale Sessions.',
  foundationDescription:
    'Die Vorschau konzentriert sich auf die Teile, die fuer Kartenspiele nuetzlich sind, und haelt unfertige Website-Konto-Infrastruktur aus dem Weg.',
  foundation: {
    engine: {
      title: 'Game Engine und Vertraege',
      description:
        'Gemeinsame Zustandsuebergaenge, Grenzen erlaubter Aktionen, Kataloge und typisierte Vertraege bilden den wiederverwendbaren Kern.',
    },
    rules: {
      title: 'Unabhaengige Regelpakete',
      description:
        'Jedes Spiel behaelt seine Regeln in einem unabhaengig testbaren Paket, statt spielspezifisches Verhalten in die Kern-Engine sickern zu lassen.',
    },
    sessions: {
      title: 'Lokale Sessions und Bots',
      description:
        'Browser-lokale Sessions verwenden dieselben Spielvertraege mit deterministischen Bot-Gegnern und ohne Konto- oder Persistenzanforderung.',
    },
  },
};
