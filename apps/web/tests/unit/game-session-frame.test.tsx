// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GameSessionFrame } from '@/apps/showcase/components/game-session';

describe('GameSessionFrame', () => {
  it('renders the shared play frame from normalized data and slots', () => {
    render(
      <GameSessionFrame
        actions={[
          {
            id: 'draw',
            label: 'Draw card',
            onSelect: vi.fn(),
          },
        ]}
        actionsLabel="Legal actions"
        badges={[{ id: 'active', label: 'Active', tone: 'success' }]}
        emptyActionsLabel="Waiting for players."
        eyebrow="UNO-style"
        participants={[
          {
            id: 'p1',
            displayName: 'Alice',
            detail: 'Human seat',
            isActive: true,
            isActor: true,
            isViewer: true,
          },
          {
            id: 'p2',
            displayName: 'Bot',
            detail: 'Bot seat',
          },
        ]}
        result="Winner: Alice"
        statusItems={[
          {
            id: 'status',
            label: 'Status',
            value: 'Alice to act',
            detail: 'Turn 3',
          },
        ]}
        subtitle="One active table"
        table={<div>Table slot</div>}
        title="Active match"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Active match' })).toBeTruthy();
    expect(screen.getByText('UNO-style')).toBeTruthy();
    expect(screen.getByText('Winner: Alice')).toBeTruthy();
    expect(screen.getByText('Status')).toBeTruthy();
    expect(screen.getByText('Alice to act')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('You')).toBeTruthy();
    expect(screen.getByText('Actor')).toBeTruthy();
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getByText('Table slot')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Legal actions' })).toBeTruthy();
  });

  it('fires enabled actions once and leaves disabled actions inert', () => {
    const enabled = vi.fn();
    const disabled = vi.fn();

    render(
      <GameSessionFrame
        actions={[
          {
            id: 'enabled',
            label: 'Enabled action',
            onSelect: enabled,
          },
          {
            disabled: true,
            id: 'disabled',
            label: 'Disabled action',
            onSelect: disabled,
          },
        ]}
        actionsLabel="Legal actions"
        emptyActionsLabel="Waiting for players."
        table={<div>Table slot</div>}
        title="Active match"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enabled action' }));
    fireEvent.click(screen.getByRole('button', { name: 'Disabled action' }));

    expect(enabled).toHaveBeenCalledTimes(1);
    expect(disabled).not.toHaveBeenCalled();
  });

  it('renders empty action, pending, announcement, and error states', () => {
    render(
      <GameSessionFrame
        actions={[]}
        actionsLabel="Legal actions"
        announcement="Move accepted."
        emptyActionsLabel="Waiting for players."
        error="Unable to submit move."
        pending
        table={<div>Table slot</div>}
        title="Active match"
      />,
    );

    expect(screen.getByText('Waiting for players.')).toBeTruthy();
    expect(screen.getByText('Move accepted.')).toBeTruthy();
    expect(screen.getByText('Unable to submit move.')).toBeTruthy();
  });
});
