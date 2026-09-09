'use client';

import { useState, type DragEvent, type HTMLAttributes } from 'react';

import {
  type CardActionDescriptor,
  type CardActionTarget,
  useCardActionRegistry,
  useCardDragState,
} from './card-action-context';
import { cx } from './lib/cx';

export const CARD_DRAG_MIME_TYPE = 'application/x-card-game-card-id';

function resolveDropAction(
  actions: readonly CardActionDescriptor[],
  cardId: string | null,
  target: CardActionTarget,
) {
  if (!cardId) {
    return null;
  }

  const matches = actions.filter(
    (action) =>
      action.cardId === cardId &&
      action.target === target &&
      !action.disabled,
  );

  return matches.length === 1 ? matches[0] : null;
}

export interface CardDropZoneProps extends HTMLAttributes<HTMLDivElement> {
  activeClassName?: string;
  target: CardActionTarget;
}

export function CardDropZone({
  activeClassName,
  className,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  target,
  ...divProps
}: CardDropZoneProps) {
  const actions = useCardActionRegistry();
  const { draggedCardId, endCardDrag } = useCardDragState();
  const [active, setActive] = useState(false);
  const dropAction = resolveDropAction(actions, draggedCardId, target);

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    onDragEnter?.(event);

    if (!event.defaultPrevented && dropAction) {
      event.preventDefault();
      setActive(true);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    onDragOver?.(event);

    if (!event.defaultPrevented && dropAction) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setActive(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    onDragLeave?.(event);

    const relatedTarget = event.relatedTarget;
    if (
      relatedTarget instanceof Node &&
      event.currentTarget.contains(relatedTarget)
    ) {
      return;
    }

    setActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    onDrop?.(event);

    if (event.defaultPrevented) {
      return;
    }

    const transferredCardId =
      event.dataTransfer.getData(CARD_DRAG_MIME_TYPE) ||
      event.dataTransfer.getData('text/plain') ||
      draggedCardId;
    const action = resolveDropAction(actions, transferredCardId, target);

    if (!action) {
      setActive(false);
      return;
    }

    event.preventDefault();
    setActive(false);
    endCardDrag();
    action.onActivate();
  };

  return (
    <div
      {...divProps}
      className={cx(className, active ? activeClassName : null)}
      data-card-drop-active={active || undefined}
      data-card-drop-target={target}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  );
}
