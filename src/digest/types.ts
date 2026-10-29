// Plan morning-digest §1. Every part of §2 builds against this file.
export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job. A missing owner or error stays null here; the page renders it as —.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  rows: DigestRow[];
  badLines: number;
};

// null when the night has no file, or isn't a YYYY-MM-DD date.
export type ReadNight = (runsDir: string, night: string) => Night | null;
