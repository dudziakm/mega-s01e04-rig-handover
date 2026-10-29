import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('status board digest links', () => {
  it('links each night to its digest with its counts', async () => {
    const html = await (await createApp(config).request('/')).text();
    expect(html).toContain('<a href="/digest/2026-10-28">2026-10-28</a>');
    expect(html).toContain('<a href="/digest/2026-10-27">2026-10-27</a>');
    expect(html).toContain('ok 4 · retry 0 · fail 1');
    expect(html).toContain('ok 4 · retry 0 · fail 0');
  });

  it('keeps the empty case when runs/ has no nights', async () => {
    const html = await (await createApp({ ...config, runsDir: 'test/no-such-dir' }).request('/')).text();
    expect(html).toContain('nothing in runs/');
  });
});
