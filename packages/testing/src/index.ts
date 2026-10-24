export const TEST_USER_ID = '00000000-0000-4000-8000-000000000001';
export const TEST_DATE = '2026-10-24';

export function fixedIso(hour: number): string {
  return `2026-10-24T${`${hour}`.padStart(2, '0')}:00:00.000Z`;
}
