import type { DigestRow, RunStatus } from './types.js';

export type StatusCounts = Record<RunStatus, number>;

// How many jobs ended the night in each status (each job's last status).
export function countByLastStatus(rows: DigestRow[]): StatusCounts {
  const counts: StatusCounts = { ok: 0, retry: 0, fail: 0 };
  for (const row of rows) counts[row.lastStatus] += 1;
  return counts;
}
