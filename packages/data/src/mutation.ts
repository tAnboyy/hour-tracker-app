import type { OfflineMutation } from './contracts.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertMutation(mutation: OfflineMutation): void {
  if (!UUID.test(mutation.id)) throw new TypeError('Mutation id must be a UUID.');
  if (!mutation.entityKey.trim()) throw new TypeError('Mutation entityKey is required.');
  if (mutation.expectedVersion !== null && (!Number.isInteger(mutation.expectedVersion) || mutation.expectedVersion < 0)) {
    throw new RangeError('expectedVersion must be null or a non-negative integer.');
  }
  if (!Number.isInteger(mutation.attempts) || mutation.attempts < 0) throw new RangeError('attempts must be a non-negative integer.');
  if (Number.isNaN(Date.parse(mutation.createdAt))) throw new TypeError('createdAt must be an ISO date.');
}

export function retryDelayMs(attempt: number, random = Math.random): number {
  const boundedAttempt = Math.max(0, Math.min(6, attempt));
  const base = 1_000 * 2 ** boundedAttempt;
  return Math.round(base * (0.75 + random() * 0.5));
}
