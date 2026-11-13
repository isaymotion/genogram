# Release helpers (used for 1.5.0 to 1.7.0)

Run from the `genogram` checkout unless noted. Nothing here is published.

- `tl_add.py`: `from tl_add import add, edit, bump` (put this folder on `sys.path`).
  - `add(note, [(english, tagalog), ...])` appends Tagalog drafts to `data/content-tl.js`.
  - `bump(old, new, title, [(type, text), ...])` sets the version in `data/app-meta.js` and `sw.js` and adds the entry at the top of `data/changelog.js`.
  - `edit(path, [(old, new), ...])` replaces text that must occur exactly once.
- `psych_apply.py <case-psychinterview> <genogram> "<changelog title>" "<type::text|type::text>"`: the PsychInterview side of a release.
  Run it on a fresh `git reset --hard origin/main` of PsychInterview right before pushing. It copies the shared block (`tools/sync_engine.py`),
  applies the replacements in the file named by `PSYCH_EXTRA` (a python file with `EXTRA = [(old, new), ...]`, this release's form changes only;
  see `psych_extra.example.py`, which is the 1.7.0 one), then takes the next `CACHE` version and changelog id from whatever is live.
  If PsychInterview moved after you applied: reset, apply again, RUN BOTH TEST SETS AGAIN, then push.
- `../tests/regress_random.js <old engine> <new engine>`: 300 random older-style charts must draw the same.
