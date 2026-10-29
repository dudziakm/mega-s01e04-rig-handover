import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const GOOD_LINE = JSON.stringify({
  at: '2026-01-02T01:00:00Z',
  job: 'nightly-sync',
  status: 'ok',
  owner: null,
});

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  const runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  mkdirSync(runsDir, { recursive: true });
  writeFileSync(join(runsDir, '2026-01-01.jsonl'), '');
  writeFileSync(join(runsDir, '2026-01-02.jsonl'), `${GOOD_LINE}\nthis is not json\n`);
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
});

describe('GET /digest/:night', () => {
  it('renders the page for a night with a file', async () => {
    const res = await app.request('/digest/2026-01-02');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('digest 2026-01-02');
    expect(html).toContain('nightly-sync');
  });

  it('returns 404 for a night with no file', async () => {
    const res = await app.request('/digest/2026-01-03');
    expect(res.status).toBe(404);
  });

  it('says nothing ran for an empty night and draws no table', async () => {
    const res = await app.request('/digest/2026-01-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
    expect(html).not.toContain('<table');
  });

  it('renders a night with a bad line and counts it', async () => {
    const res = await app.request('/digest/2026-01-02');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nightly-sync');
    expect(html).toContain('bad lines: 1');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns the night as JSON', async () => {
    const res = await app.request('/api/digest/2026-01-02');
    const body = (await res.json()) as { night: string; rows: { job: string }[] };
    expect(res.status).toBe(200);
    expect(body.night).toBe('2026-01-02');
    expect(body.rows.map((row) => row.job)).toEqual(['nightly-sync']);
  });

  it('returns 404 with an error body for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-01-03');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no such night' });
  });

  it('returns no rows for an empty night', async () => {
    const res = await app.request('/api/digest/2026-01-01');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: '2026-01-01', rows: [], badLines: 0 });
  });

  it('counts the bad line', async () => {
    const res = await app.request('/api/digest/2026-01-02');
    const body = (await res.json()) as { badLines: number };
    expect(body.badLines).toBe(1);
  });
});
