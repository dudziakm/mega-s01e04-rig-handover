import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, Night, ReadNight, RunLine, RunStatus } from './types.js';

const STATUSES: readonly RunStatus[] = ['ok', 'retry', 'fail'];

// A real calendar date, so 2026-02-30 and path tricks like ../x never reach the filesystem.
function isNightDate(night: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return false;
  const date = new Date(`${night}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === night;
}

function isStatus(value: unknown): value is RunStatus {
  return STATUSES.some((status) => status === value);
}

// null when the line isn't JSON or isn't the RunLine shape.
export function parseLine(text: string): RunLine | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const { at, job, status, owner, error } = value as Record<string, unknown>;
  if (typeof at !== 'string' || typeof job !== 'string' || !isStatus(status)) return null;
  if (owner !== null && typeof owner !== 'string') return null;
  if (error !== undefined && typeof error !== 'string') return null;
  return error === undefined ? { at, job, status, owner } : { at, job, status, owner, error };
}

function readText(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') return null;
    throw err;
  }
}

function toRow(lines: RunLine[]): DigestRow {
  const first = lines[0];
  const last = lines[lines.length - 1];
  if (first === undefined || last === undefined) throw new Error('toRow needs at least one line');
  return {
    job: first.job,
    owner: last.owner,
    runs: lines.length,
    retries: lines.filter((line) => line.status === 'retry').length,
    lastStatus: last.status,
    lastError: last.error ?? null,
    firstAt: first.at,
    lastAt: last.at,
  };
}

export const readNight: ReadNight = (runsDir, night) => {
  if (!isNightDate(night)) return null;
  const text = readText(join(runsDir, `${night}.jsonl`));
  if (text === null) return null;

  const byJob = new Map<string, RunLine[]>();
  let badLines = 0;
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (line === null) {
      badLines += 1;
      continue;
    }
    const lines = byJob.get(line.job) ?? [];
    lines.push(line);
    byJob.set(line.job, lines);
  }

  const rows = [...byJob.values()]
    .map(toRow)
    .sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { night, rows, badLines };
};
