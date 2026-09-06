export const homePage = {
  eyebrow: 'Kartenspiel-Fundament',
  title: 'Kartenspiele auf einem wiederverwendbaren Fundament bauen.',
  description:
    'card-game-template trennt wiederverwendbare Spielverträge, Regeln, Sessions und Multiplayer-Belange von den einzelnen Spielen. Die GitHub-Pages-Seite zeigt dieses Fundament mit vollständig im Browser spielbaren Beispielen.',
  browseGames: 'Spielbare Beispiele ansehen',
  viewSource: 'Quellcode ansehen',
  pills: {
    engine: 'Gemeinsame Game Engine',
    rules: 'Komponierbare Regelpakete',
    delivery: 'Browserfähige Beispiele',
  },
  gamesEyebrow: 'Mit dem Template umgesetzt',
  gamesTitle: 'Spielbare Spiele',
  gamesDescription:
    'Jedes Beispiel nutzt dasselbe Fundament, während spielspezifische Regeln und Darstellung in eigenen Paketen und Oberflächen bleiben.',
  games: {
    uno: {
      category: 'Ablegespiel',
      title: 'UNO-artig',
      description:
        'Lobbys erstellen und betreten, erlaubte Kartenaktionen spielen, Bots verwenden, Partien fortsetzen und abgeschlossene Spiele über das gemeinsame Session-Modell ansehen.',
      cta: 'UNO-artiges Spiel öffnen',
    },
    phase10: {
      category: 'Rommé-artiges Spiel',
      title: 'Phase-10-artig',
      description:
        'Lokal mit konfigurierbaren Phasen, deterministischen Bot-Profilen, sichtbaren erlaubten Aktionen und wiederverwendbarem Rundenzustand spielen.',
      cta: 'Phase-10-artiges Spiel öffnen',
    },
    poker: {
      category: 'Poker',
      title: 'Texas Hold’em',
      description:
        'Einen persistierten Tisch erstellen, gegen deterministische Bots spielen, erlaubte Aktionen senden und die maßgebliche Hand nach einem Neuladen fortsetzen.',
      cta: 'Pokerspiel öffnen',
    },
    tcg: {
      category: 'Sammelkartenspiel',
      title: 'Arcane Duel',
      description:
        'Ein persistiertes eigenes Kartenduell mit Deckzustand, sichtbaren Händen, erlaubten Aktionen, menschlichen oder Bot-Gegnern und einem maßgeblichen Match-Modell.',
      cta: 'Arcane Duel öffnen',
    },
  },
  foundationEyebrow: 'Ein Fundament',
  foundationTitle: 'Wiederverwendbar, wo es sinnvoll ist; spielspezifisch, wo es zählt.',
  foundationDescription:
    'Die Beispiele sind Verbraucher der Template-Architektur. Sie demonstrieren die gemeinsamen Verträge, ohne ein einzelnes Spiel selbst zur Plattform zu machen.',
  foundation: {
    engine: {
      title: 'Game Engine und Verträge',
      description:
        'Gemeinsame Zustandsübergänge, Grenzen erlaubter Aktionen, Kataloge und typisierte Verträge bilden den wiederverwendbaren Kern.',
    },
    rules: {
      title: 'Unabhängige Regelpakete',
      description:
        'UNO-artige, Poker-, TCG- und weitere Regeln bleiben unabhängig testbare Verbraucher und sickern nicht in die Kern-Engine ein.',
    },
    sessions: {
      title: 'Sessions und Multiplayer',
      description:
        'Lobby-, Persistenz-, Bot-, Replay- und Multiplayer-Belange können spielübergreifend wiederverwendet werden, ohne Domain-Regeln zu duplizieren.',
    },
  },
};
