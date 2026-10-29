import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { parseLine, readNight } from '../src/digest/read.js';

const tempDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));

function night(name: string, content: string): string {
  writeFileSync(join(tempDir, `${name}.jsonl`), content);
  return name;
}

afterAll(() => rmSync(tempDir, { recursive: true, force: true }));

describe('readNight on runs/2026-10-28.jsonl', () => {
  const result = readNight('runs', '2026-10-28');

  it('gives one row per job, sorted by job, and counts the cut last line', () => {
    expect(result?.night).toBe('2026-10-28');
    expect(result?.rows.map((row) => row.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(result?.badLines).toBe(1);
  });

  it('counts runs and retries, and takes the last status from the last line', () => {
    const row = (job: string) => result?.rows.find((r) => r.job === job);
    expect(row('fixtures/refresh')).toMatchObject({
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
    });
    expect(row('lane/sync')).toMatchObject({ runs: 8, retries: 1, lastStatus: 'ok' });
    expect(row('notes/backup')).toEqual({
      job: 'notes/backup',
      owner: 'lane-07',
      runs: 1,
      retries: 0,
      lastStatus: 'fail',
      lastError: 'quota exceeded',
      firstAt: '2026-10-29T04:00:01+01:00',
      lastAt: '2026-10-29T04:00:01+01:00',
    });
  });

  it('keeps a row with a null owner', () => {
    expect(result?.rows.find((r) => r.job === 'digest/render')?.owner).toBeNull();
  });

  it('keeps first and last time with the offset as logged', () => {
    const sync = result?.rows.find((r) => r.job === 'lane/sync');
    expect(sync?.firstAt).toBe('2026-10-28T23:00:06+01:00');
    expect(sync?.lastAt).toBe('2026-10-29T05:00:04+01:00');
  });
});

describe('readNight edges', () => {
  it('gives null for a night with no file', () => {
    expect(readNight(tempDir, '2026-01-01')).toBeNull();
  });

  it('gives null for a night that is not a YYYY-MM-DD date', () => {
    night('2026-1-1', '{"at":"a","job":"j","status":"ok","owner":null}\n');
    expect(readNight(tempDir, '../x')).toBeNull();
    expect(readNight(tempDir, '2026-1-1')).toBeNull();
    expect(readNight(tempDir, '2026-02-30')).toBeNull();
  });

  it('gives no rows and no bad lines for an empty file', () => {
    expect(readNight(tempDir, night('2026-03-01', ''))).toEqual({
      night: '2026-03-01',
      rows: [],
      badLines: 0,
    });
  });

  it('counts lines of the wrong shape as bad and skips blank lines', () => {
    const content = [
      '{"at":"2026-03-02T01:00:00+01:00","job":"a","status":"retry","owner":"x","error":"e1"}',
      '',
      '{"at":"2026-03-02T02:00:00+01:00","job":"a","status":"ok","owner":"x"}',
      '{"at":"2026-03-02T03:00:00+01:00","job":"a","status":"done","owner":"x"}',
      '[1,2]',
      'not json',
      '   ',
    ].join('\n');
    const result = readNight(tempDir, night('2026-03-02', content));
    expect(result?.badLines).toBe(3);
    expect(result?.rows).toEqual([
      {
        job: 'a',
        owner: 'x',
        runs: 2,
        retries: 1,
        lastStatus: 'ok',
        lastError: null,
        firstAt: '2026-03-02T01:00:00+01:00',
        lastAt: '2026-03-02T02:00:00+01:00',
      },
    ]);
  });

  it('throws read errors other than a missing file', () => {
    // A directory named like a night file makes readFileSync fail with EISDIR.
    const dir = mkdtempSync(join(tempDir, 'nested-'));
    mkdirSync(join(dir, '2026-03-03.jsonl'));
    expect(() => readNight(dir, '2026-03-03')).toThrow();
  });
});

describe('parseLine', () => {
  it('accepts the RunLine shape', () => {
    expect(parseLine('{"at":"t","job":"j","status":"fail","owner":null,"error":"e"}')).toEqual({
      at: 't',
      job: 'j',
      status: 'fail',
      owner: null,
      error: 'e',
    });
  });

  it.each([
    ['missing owner', '{"at":"t","job":"j","status":"ok"}'],
    ['numeric owner', '{"at":"t","job":"j","status":"ok","owner":7}'],
    ['non-string error', '{"at":"t","job":"j","status":"ok","owner":null,"error":5}'],
    ['non-string at', '{"at":1,"job":"j","status":"ok","owner":null}'],
    ['null', 'null'],
    ['cut mid-JSON', '{"at":"t","job":"lane/sy'],
  ])('rejects %s', (_label, text) => {
    expect(parseLine(text)).toBeNull();
  });
});
