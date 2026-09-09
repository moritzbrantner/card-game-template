'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { CardControlActionKind } from './card-controls';

export type CardActionTarget = 'draw-pile' | 'discard-pile';

export type CardActionDescriptor = {
  cardId?: string;
  disabled?: boolean;
  id: string;
  kind?: CardControlActionKind;
  label: ReactNode;
  onActivate: () => void;
  target?: CardActionTarget;
};

const CardActionContext = createContext<readonly CardActionDescriptor[]>([]);

export function CardActionProvider({
  actions,
  children,
}: {
  actions: readonly CardActionDescriptor[];
  children: ReactNode;
}) {
  return (
    <CardActionContext.Provider value={actions}>
      {children}
    </CardActionContext.Provider>
  );
}

export function useCardActionRegistry() {
  return useContext(CardActionContext);
}

export function useCardActions(cardId: string | null) {
  const actions = useCardActionRegistry();

  if (!cardId) {
    return [];
  }

  return actions.filter((action) => action.cardId === cardId);
}

export function useCardPileActions(target: CardActionTarget) {
  return useCardActionRegistry().filter((action) => action.target === target);
}
