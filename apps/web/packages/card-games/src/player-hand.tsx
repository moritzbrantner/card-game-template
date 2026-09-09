'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';

import {
  useCardActionRegistry,
  useCardDragState,
} from './card-action-context';
import { CARD_DRAG_MIME_TYPE } from './card-drop-zone';
import { CardControls } from './card-controls';
import { CardFan, type CardFanProps } from './card-fan';
import { cx } from './lib/cx';
import { PlayingCard, type PlayingCardProps } from './playing-card';

export interface PlayerHandProps extends CardFanProps {
  label?: ReactNode;
}

function cardIdFromKey(key: unknown) {
  if (key === null || key === undefined) {
    return null;
  }

  const value = String(key);
  return value.startsWith('.$') ? value.slice(2) : value;
}

function getSelectedCardLabel(
  children: ReactNode,
  selectedCardId: string | null,
) {
  if (!selectedCardId) {
    return null;
  }

  const selectedChild = Children.toArray(children).find(
    (child) =>
      isValidElement<PlayingCardProps>(child) &&
      child.type === PlayingCard &&
      cardIdFromKey(child.key) === selectedCardId,
  );

  if (!isValidElement<PlayingCardProps>(selectedChild)) {
    return null;
  }

  const childLabel = selectedChild.props['aria-label'];
  return typeof childLabel === 'string' ? childLabel : null;
}

export function PlayerHand({
  label = 'Player hand',
  'aria-label': ariaLabel,
  className,
  children,
  ...divProps
}: PlayerHandProps) {
  const actionRegistry = useCardActionRegistry();
  const { endCardDrag, startCardDrag } = useCardDragState();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const accessibleLabel =
    ariaLabel ?? (typeof label === 'string' ? label : undefined);
  const selectedActions = selectedCardId
    ? actionRegistry.filter((action) => action.cardId === selectedCardId)
    : [];
  const selectedCardLabel = getSelectedCardLabel(children, selectedCardId);

  useEffect(() => {
    if (
      selectedCardId &&
      !actionRegistry.some((action) => action.cardId === selectedCardId)
    ) {
      setSelectedCardId(null);
    }
  }, [actionRegistry, selectedCardId]);

  const interactiveChildren = Children.map(children, (child) => {
    if (
      !isValidElement<PlayingCardProps>(child) ||
      child.type !== PlayingCard
    ) {
      return child;
    }

    const cardId = cardIdFromKey(child.key);
    const actions = cardId
      ? actionRegistry.filter((action) => action.cardId === cardId)
      : [];

    if (!cardId || actions.length === 0) {
      return child;
    }

    const selected = selectedCardId === cardId;
    const draggable = actions.some(
      (action) => Boolean(action.target) && !action.disabled,
    );
    const childOnClick = child.props.onClick;
    const childOnDragEnd = child.props.onDragEnd;
    const childOnDragStart = child.props.onDragStart;
    const childOnKeyDown = child.props.onKeyDown;

    const activateSelection = () => {
      setSelectedCardId((current) => (current === cardId ? null : cardId));
    };

    return cloneElement(child, {
      'aria-pressed': selected,
      className: cx(
        child.props.className,
        draggable ? 'cursor-grab active:cursor-grabbing' : null,
      ),
      'data-card-draggable': draggable || undefined,
      draggable: child.props.draggable ?? draggable,
      interactive: true,
      onClick: (event: MouseEvent<HTMLDivElement>) => {
        childOnClick?.(event);

        if (!event.defaultPrevented) {
          activateSelection();
        }
      },
      onDragEnd: (event: DragEvent<HTMLDivElement>) => {
        childOnDragEnd?.(event);
        endCardDrag();
      },
      onDragStart: (event: DragEvent<HTMLDivElement>) => {
        childOnDragStart?.(event);

        if (event.defaultPrevented || !draggable) {
          return;
        }

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(CARD_DRAG_MIME_TYPE, cardId);
        event.dataTransfer.setData('text/plain', cardId);
        startCardDrag(cardId);
      },
      onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
        childOnKeyDown?.(event);

        if (
          !event.defaultPrevented &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault();
          activateSelection();
        }
      },
      role: 'button',
      selected,
      tabIndex: child.props.tabIndex ?? 0,
    });
  });

  const hand = (
    <CardFan
      {...divProps}
      aria-label={accessibleLabel}
      className={cx('mb-player-hand justify-start overflow-x-auto', className)}
      data-player-hand=""
    >
      {interactiveChildren}
    </CardFan>
  );

  if (!selectedCardId || selectedActions.length === 0) {
    return hand;
  }

  return (
    <div className="space-y-3" data-interactive-player-hand="">
      {hand}
      <CardControls
        actions={selectedActions.map((action) => ({
          disabled: action.disabled,
          id: action.id,
          kind: action.kind,
          label: action.label,
          onActivate: () => {
            action.onActivate();
            setSelectedCardId(null);
          },
        }))}
        label={`${accessibleLabel ?? 'Player hand'} card actions`}
        selectionLabel={
          selectedCardLabel ? `${selectedCardLabel} selected` : 'Card selected'
        }
      />
    </div>
  );
}
