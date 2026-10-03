'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

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

type CardActionContextValue = {
  actions: readonly CardActionDescriptor[];
  draggedCardId: string | null;
  endCardDrag: () => void;
  startCardDrag: (cardId: string) => void;
};

const EMPTY_CARD_ACTIONS: readonly CardActionDescriptor[] = [];
const CardActionContext = createContext<CardActionContextValue>({
  actions: EMPTY_CARD_ACTIONS,
  draggedCardId: null,
  endCardDrag: () => undefined,
  startCardDrag: () => undefined,
});

export function CardActionProvider({
  actions,
  children,
}: {
  actions: readonly CardActionDescriptor[];
  children: ReactNode;
}) {
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  return (
    <CardActionContext.Provider
      value={{
        actions,
        draggedCardId,
        endCardDrag: () => setDraggedCardId(null),
        startCardDrag: setDraggedCardId,
      }}
    >
      {children}
    </CardActionContext.Provider>
  );
}

export function useCardActionRegistry() {
  return useContext(CardActionContext).actions;
}

export function useCardDragState() {
  const { draggedCardId, endCardDrag, startCardDrag } =
    useContext(CardActionContext);

  return { draggedCardId, endCardDrag, startCardDrag };
}

export function useCardActions(cardId: string | null) {
  const actions = useCardActionRegistry();

  if (!cardId) {
    return [];
  }

  return actions.filter((action) => action.cardId === cardId);
}

export function useCardPileActions(target: CardActionTarget) {
  // Card-scoped actions (e.g. discarding a specific hand card) share the pile
  // target for drag and drop, but the pile control itself only activates
  // pile-level actions such as drawing from that pile.
  return useCardActionRegistry().filter(
    (action) => action.target === target && !action.cardId,
  );
}
