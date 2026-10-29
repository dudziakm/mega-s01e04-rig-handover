---
name: publish-preview
description: Put one rig page on this repo's GitHub Pages as a preview for a reviewer, check the public link, and later upload it again without the lane marker. Use when a plan step sends a preview or cleans one up.
---

# publish-preview

A preview is one HTML file of a rig page on this repo's GitHub Pages,
`https://<owner>.github.io/<repo>/`. The workflow `.github/workflows/preview.yml` builds it: it
runs rig, saves the page with `curl` and deploys it as a Pages artifact, so the page never lands
in git (ADR 0003). The lane marker comes from the repository secret `LANE_MARKER`. Without that
secret the banner reads "no marker set".

## Before the first upload

1. Ask the human, because the page is public: anyone with the link can read it.
2. Let Pages deploy from workflows (once per repo):

   ```sh
   gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow
   ```

3. The workflow saves the path in its save step (`/digest/2026-10-28`). For another page, change
   that path in the plan's own commit.
4. The human sets the marker. Give them this command and wait: a secret is theirs to write, and
   Claude Code's auto mode blocks an agent from writing one anyway.

   ```sh
   gh secret set LANE_MARKER --repo <owner>/<repo> < <file that holds the marker>
   ```

## Upload

```sh
gh workflow run preview.yml --repo <owner>/<repo> --ref main
gh run watch <run id> --repo <owner>/<repo> --exit-status
```

`gh workflow run` prints the new run's URL when GitHub returns it; the run id is its last part.
Otherwise take the newest run from `gh run list --repo <owner>/<repo> --workflow preview.yml`.

## Check the link before you send it

Fetch it the way the reviewer opens it: no sign-in, no cookies.

```sh
curl -sS -D - -o "${TMPDIR:-/tmp}/preview.html" https://<owner>.github.io/<repo>/
```

Expect `HTTP/2 200`, a `last-modified` after the run, and the marker in the banner of the saved
file. Pages caches a page for up to ten minutes (`cache-control: max-age=600`), so an old copy can
answer right after an upload. Delete the saved file after the check: it is a preview too.

## While the review is out

The issue that sends the link stays open until the reviewer has looked (ADR 0005). Keep the
marked page up until then: wait, or come back later, but don't start the clean-up.

## Clean-up: the same link without the marker

1. The human deletes the secret: `gh secret delete LANE_MARKER --repo <owner>/<repo>`.
2. Upload again, as above.
3. Check the link: 200, the banner reads "no marker set", and the marker is gone.
4. Delete the marked run's Pages artifact, so no marked copy is left:

   ```sh
   gh api repos/<owner>/<repo>/actions/artifacts \
     --jq '.artifacts[] | "\(.id) run \(.workflow_run.id) \(.created_at)"'
   gh api -X DELETE repos/<owner>/<repo>/actions/artifacts/<artifact id>
   ```

## Don'ts

- Don't serve Pages from a branch, and don't commit the saved page or attach it to an issue or a
  chat: there the marker can't be taken off again (ADR 0003).
- Don't put the marker in the workflow, a commit or an issue.
- Don't take the marker off before the reviewer has looked.
