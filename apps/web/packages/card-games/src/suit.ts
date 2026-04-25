export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker';

const SUIT_SYMBOLS: Record<CardSuit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  joker: '★',
};

const SUIT_NAMES: Record<CardSuit, string> = {
  spades: 'spades',
  hearts: 'hearts',
  diamonds: 'diamonds',
  clubs: 'clubs',
  joker: 'joker',
};

export function getSuitSymbol(suit: CardSuit) {
  return SUIT_SYMBOLS[suit];
}

export function getSuitName(suit: CardSuit) {
  return SUIT_NAMES[suit];
}

export function formatCardLabel(rank: string, suit?: CardSuit) {
  if (!suit) return rank;

  return suit === 'joker' ? `${rank} joker` : `${rank} of ${getSuitName(suit)}`;
}
