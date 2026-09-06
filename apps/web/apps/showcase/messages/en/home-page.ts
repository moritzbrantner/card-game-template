export const homePage = {
  eyebrow: 'Card game foundation',
  title: 'Build card games from one reusable foundation.',
  description:
    'card-game-template separates reusable game contracts, rules, sessions, and multiplayer concerns from individual games. The GitHub Pages site demonstrates that foundation with complete browser-playable examples.',
  browseGames: 'Explore playable games',
  viewSource: 'View source',
  pills: {
    engine: 'Shared game engine',
    rules: 'Composable rule packages',
    delivery: 'Browser-ready examples',
  },
  gamesEyebrow: 'Implemented with the template',
  gamesTitle: 'Playable games',
  gamesDescription:
    'Each example exercises the same foundation while keeping game-specific rules and presentation in their own packages and surfaces.',
  games: {
    uno: {
      category: 'Shedding game',
      title: 'UNO-style',
      description:
        'Create and join lobbies, play legal card actions, use bots, resume matches, and inspect completed games through the shared session model.',
      cta: 'Open UNO-style game',
    },
    phase10: {
      category: 'Rummy-style game',
      title: 'Phase 10-style',
      description:
        'Play locally with configurable phase definitions, deterministic bot profiles, visible legal actions, and reusable round state.',
      cta: 'Open Phase 10-style game',
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
  foundationEyebrow: 'One foundation',
  foundationTitle: 'Reusable where it should be, game-specific where it matters.',
  foundationDescription:
    'The examples are consumers of the template architecture. They demonstrate the shared contracts without turning any one game into the platform itself.',
  foundation: {
    engine: {
      title: 'Game engine and contracts',
      description:
        'Common state transitions, legal-action boundaries, catalogs, and typed contracts provide the reusable kernel.',
    },
    rules: {
      title: 'Independent rule packages',
      description:
        'UNO-style, poker, TCG, and other rules remain independently testable consumers rather than leaking into the core engine.',
    },
    sessions: {
      title: 'Sessions and multiplayer',
      description:
        'Lobby, persistence, bot, replay, and multiplayer concerns can be reused across games without duplicating their domain rules.',
    },
  },
};
