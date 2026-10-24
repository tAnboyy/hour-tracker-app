import assert from 'node:assert/strict';
import test from 'node:test';
import { assertMutation, retryDelayMs, type OfflineMutation } from '../src/index.ts';

const mutation: OfflineMutation = {
  id: '019c8c4c-65bb-7c60-a123-0123456789ab',
  entity: 'hour_log',
  entityKey: '2026-10-24:9',
  operation: 'upsert',
  payload: {},
  expectedVersion: 2,
  createdAt: '2026-10-24T12:00:00.000Z',
  attempts: 0,
  state: 'pending',
  lastErrorCode: null,
};

test('valid mutations pass and malformed envelopes fail', () => {
  assert.doesNotThrow(() => assertMutation(mutation));
  assert.throws(() => assertMutation({ ...mutation, id: 'not-a-uuid' }));
  assert.throws(() => assertMutation({ ...mutation, expectedVersion: -1 }));
  assert.throws(() => assertMutation({ ...mutation, createdAt: 'not-a-date' }));
});

test('retry delay is bounded exponential backoff with jitter', () => {
  assert.equal(retryDelayMs(0, () => 0), 750);
  assert.equal(retryDelayMs(2, () => 0.5), 4_000);
  assert.equal(retryDelayMs(99, () => 1), 80_000);
});
