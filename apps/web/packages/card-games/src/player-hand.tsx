'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';

import { useCardActionRegistry } from './card-action-context';
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

export function PlayerHand({
  label = 'Player hand',
  'aria-label': ariaLabel,
  className,
  children,
  ...divProps
}: PlayerHandProps) {
  const actionRegistry = useCardActionRegistry();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const accessibleLabel =
    ariaLabel ?? (typeof label === 'string' ? label : undefined);
  const selectedActions = selectedCardId
    ? actionRegistry.filter((action) => action.cardId === selectedCardId)
    : [];
  let selectedCardLabel: string | null = null;

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
    const childLabel = child.props['aria-label'];

    if (selected && typeof childLabel === 'string') {
      selectedCardLabel = childLabel;
    }

    const childOnClick = child.props.onClick;
    const childOnKeyDown = child.props.onKeyDown;

    const activateSelection = () => {
      setSelectedCardId((current) => (current === cardId ? null : cardId));
    };

    return cloneElement(child, {
      'aria-pressed': selected,
      interactive: true,
      onClick: (event: MouseEvent<HTMLDivElement>) => {
        childOnClick?.(event);

        if (!event.defaultPrevented) {
          activateSelection();
        }
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
