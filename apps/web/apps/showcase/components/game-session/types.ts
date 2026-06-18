import type { ReactNode } from 'react';

export type GameSessionBadge = {
  id: string;
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
};

export type GameSessionStatusItem = {
  id: string;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
};

export type GameSessionParticipant = {
  id: string;
  displayName: string;
  detail?: ReactNode;
  isActive?: boolean;
  isActor?: boolean;
  isViewer?: boolean;
};

export type GameSessionAction = {
  id: string;
  label: string;
  disabled?: boolean;
  pending?: boolean;
  tone?: 'primary' | 'secondary' | 'danger';
  onSelect(): void;
};

export type GameSessionFrameProps = {
  title: string;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  badges?: readonly GameSessionBadge[];
  statusItems?: readonly GameSessionStatusItem[];
  participants?: readonly GameSessionParticipant[];
  actions: readonly GameSessionAction[];
  actionsLabel: string;
  emptyActionsLabel: string;
  pending?: boolean;
  announcement?: string;
  error?: string;
  result?: ReactNode;
  table: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
};
