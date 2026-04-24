import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_RNG_VERSION,
  GAME_ENGINE_VERSION,
} from '../../game-engine/src/index.ts';
import { evaluateTexasHoldemHand } from '../../game-poker/src/index.ts';
import {
  createServerGameSession,
  reconstructMatchHistoryFromReplay,
  resumeServerGameSession,
  verifyReplayIntegrity,
} from '../../game-session/src/index.ts';
import { summarizeUnoReplay } from '../../game-uno/src/index.ts';
import {
  engineFixtureCases,
  pokerShowdownRankCases,
  runEngineFixtureCase,
} from '../src/index.ts';

function createFixtureClock() {
  let tick = 0;

  return () => {
    const currentTick = tick;
    tick += 1;
    return new Date(Date.UTC(2026, 3, 21, 12, 0, currentTick)).toISOString();
  };
}

function expectedAdapterVersions(fixture: (typeof engineFixtureCases)[number]) {
  return {
    engineVersion: GAME_ENGINE_VERSION,
    gameVersion:
      fixture.adapter.metadata?.gameVersion ??
      fixture.adapter.definition.gameId,
    rngVersion: fixture.adapter.metadata?.rngVersion ?? DEFAULT_RNG_VERSION,
    rulesetVersion:
      fixture.adapter.metadata?.rulesetVersion ??
      fixture.adapter.definition.gameId,
    setup: fixture.setup,
  };
}

for (const fixture of engineFixtureCases) {
  test(`${fixture.id} satisfies the generic engine fixture contract`, () => {
    runEngineFixtureCase(fixture);
  });
}

for (const fixture of engineFixtureCases.filter(
  (candidate) => candidate.expected.replay,
)) {
  test(`${fixture.id} can be replayed and resumed through server sessions`, () => {
    const session = createServerGameSession({
      adapter: fixture.adapter,
      matchId: `${fixture.id}:server-session`,
      now: createFixtureClock(),
      participants: fixture.players,
      setup: fixture.setup,
    });

    for (const step of fixture.steps) {
      const snapshot = session.getSnapshot();
      session.submitMove(
        step.chooseMove({
          state: snapshot.match,
          legalMoves: snapshot.legalMoves,
        }),
      );
    }

    const replay = session.getReplay();
    const expectedReplay = fixture.expected.replay;

    assert.ok(expectedReplay);
    assert.deepEqual(replay.metadata, expectedAdapterVersions(fixture));
    assert.deepEqual(
      replay.acceptedMoves.map((move) => move.sequence),
      replay.acceptedMoves.map((_move, index) => index + 1),
    );
    assert.deepEqual(
      replay.acceptedMoves.map((entry) => entry.move.kind),
      expectedReplay.moveKinds,
    );
    assert.equal(replay.acceptedMoves.length, expectedReplay.acceptedMoveCount);
    assert.deepEqual(replay.result?.winnerIds ?? [], expectedReplay.winnerIds);
    assert.deepEqual(
      verifyReplayIntegrity({ adapter: fixture.adapter, replay }),
      { ok: true },
    );

    const resumed = resumeServerGameSession({
      adapter: fixture.adapter,
      now: createFixtureClock(),
      participants: fixture.players,
      replay,
    });
    assert.deepEqual(resumed.getSnapshot().match, session.getSnapshot().match);
    assert.deepEqual(
      resumed.getSnapshot().matchResult,
      session.getSnapshot().matchResult,
    );
    assert.equal(
      reconstructMatchHistoryFromReplay({ adapter: fixture.adapter, replay })
        .length,
      replay.acceptedMoves.length + 1,
    );
  });
}

test('UNO replay fixture exposes UNO-specific replay summary metrics', () => {
  const fixture = engineFixtureCases.find(
    (candidate) => candidate.id === 'uno/replay-summary',
  );

  assert.ok(fixture);

  const session = createServerGameSession({
    adapter: fixture.adapter,
    matchId: 'uno/replay-summary:summary',
    now: createFixtureClock(),
    participants: fixture.players,
    setup: fixture.setup,
  });

  const step = fixture.steps[0];
  assert.ok(step);

  const snapshot = session.getSnapshot();
  session.submitMove(
    step.chooseMove({ state: snapshot.match, legalMoves: snapshot.legalMoves }),
  );

  const analysis = summarizeUnoReplay(session.getReplay());
  const winner = analysis.players.find((player) => player.playerId === 'p1');
  const opponent = analysis.players.find((player) => player.playerId === 'p2');

  assert.equal(analysis.acceptedMoveCount, 1);
  assert.equal(winner?.cardsPlayed, 1);
  assert.equal(winner?.won, true);
  assert.equal(opponent?.cardsPlayed, 0);
});

for (const showdownCase of pokerShowdownRankCases) {
  test(`poker/showdown-ranks evaluates ${showdownCase.id}`, () => {
    assert.equal(
      evaluateTexasHoldemHand(showdownCase.cards).rank,
      showdownCase.expectedRank,
    );
  });
}
