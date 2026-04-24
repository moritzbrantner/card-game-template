import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('auth contract exposes the core shared auth interfaces', () => {
  const source = readFileSync(
    new URL('../src/index.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /export type AuthUser = \{/);
  assert.match(source, /export type AuthSession = \{/);
  assert.match(source, /export type AuthState = \{/);
  assert.match(source, /export type AuthConfig = \{/);
  assert.match(source, /export interface AuthClient/);
  assert.match(source, /export interface AuthServerAdapter/);
});

test('auth contract includes helper functions for session state decisions', () => {
  const source = readFileSync(
    new URL('../src/index.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /export function isSessionActive/);
  assert.match(source, /export function createAuthState/);
  assert.match(
    source,
    /status: isSessionActive\(session\) \? 'authenticated' : 'unauthenticated'/,
  );
});
