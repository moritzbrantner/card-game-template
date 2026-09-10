export const homePage = {
  eyebrow: 'Card game preview',
  title: 'Pick a game and play against bots.',
  description:
    'The preview is deliberately local and simple: no account, no analytics, no ads, no lobby, and no server state. Open a game and play it in the browser.',
  browseGames: 'Choose a game',
  viewSource: 'View source',
  pills: {
    engine: 'Shared game engine',
    rules: 'Independent rules',
    delivery: 'Local bot play',
  },
  gamesEyebrow: 'Playable now',
  gamesTitle: 'Local browser games',
  gamesDescription:
    'These examples run through the reusable game packages and local session model without exposing unfinished account or multiplayer surfaces.',
  games: {
    uno: {
      category: 'Shedding game',
      title: 'UNO-style',
      description:
        'Play a complete local UNO-style match against a deterministic bot with the real rules engine and legal actions.',
      cta: 'Play UNO-style',
    },
    phase10: {
      category: 'Rummy-style game',
      title: 'Phase 10-style',
      description:
        'Play locally with configurable phase definitions, deterministic bot profiles, visible legal actions, and reusable round state.',
      cta: 'Play Phase 10-style',
    },
    poker: {
      category: 'Poker',
      title: 'Texas Hold’em',
      description:
        'Create a persisted table, play against deterministic bots, submit legal actions, and resume the authoritative hand after reload.',
      cta: 'Open poker game',
    },
    tcg: {
      category: 'Collectible card game',
      title: 'Arcane Duel',
      description:
        'A persisted custom card duel with deck state, visible hands, legal actions, human or bot opponents, and an authoritative match model.',
      cta: 'Open Arcane Duel',
    },
  },
  foundationEyebrow: 'Under the games',
  foundationTitle: 'Reusable engine, rules, and local sessions.',
  foundationDescription:
    'The preview focuses on the parts that are useful for building card games and keeps unfinished website-account infrastructure out of the way.',
  foundation: {
    engine: {
      title: 'Game engine and contracts',
      description:
        'Common state transitions, legal-action boundaries, catalogs, and typed contracts provide the reusable kernel.',
    },
    rules: {
      title: 'Independent rule packages',
      description:
        'Each game keeps its rules in an independently testable package instead of leaking game-specific behavior into the core engine.',
    },
    sessions: {
      title: 'Local sessions and bots',
      description:
        'Browser-local sessions exercise the same game contracts with deterministic bot opponents and no account or persistence requirement.',
    },
  },
};
