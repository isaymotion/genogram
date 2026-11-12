# Genogram: handoff (updated 2026-11-13, after 1.4.0)

## 1. Project and audience
- Standalone family genogram maker for psychiatry residents and nurses. Owner: Ma. Isabella P. Navarro, MD (GitHub `isaymotion`). She does not code: explain plainly, short replies (she is often on her phone).
- Repo `isaymotion/genogram` (public). `main` is the live site (GitHub Pages, https://isaymotion.github.io/genogram/). `dev-tools` holds this file and the test tools; it is never published.
- Sister app: PsychInterview, repo `isaymotion/case-psychinterview` (one big `index.html`, plus `slides.js`, `pdf.js`). It carries the same genogram drawing code.
- Live now: **Genogram 1.4.0** (main `f9fc1d8`). PsychInterview's genogram code matches it (synced in its **v37**, main `2c2189e`; 1.4.0 was sample families only, which PsychInterview does not have, so it stayed at v37).

## 2. Fixed rules
- **Parallel development (her standing instruction):** every genogram change goes to BOTH apps in the same release. Edit the shared block only in `genogram/js/genogram-engine.js`, never in PsychInterview.
- Push straight to `main` in both repos, no PR. Fetch and rebase first: other chats push to PsychInterview often.
- Attribution, exact: `App created by Isabella Navarro, MD. Latest version <Month YYYY>. isaymotion@gmail.com`.
- Storage prefix `g:v1:`, cache prefix `genogram-`. All her apps share one origin, so never change these.
- No accounts, servers, tracking or outside requests (fonts are bundled in `fonts/`).
- Design follows the `isaymotion-app-design` skill; `check_design.py` must pass.
- The five sample families are invented (Reyes, Santos, Dela Cruz, Villanueva, Lim). Never put a real family in a repo.
- She prefers subagents for simpler work; design, clinical content and final review stay with the main session.
- Tagalog text is a draft until she reviews it. The chart itself stays in English.
- Existing genograms must keep drawing exactly the same (run `regress.js`).

## 3. Architecture and data
- `js/genogram-engine.js`: layout and SVG, exposed as `window.Geno`. The part between `BEGIN shared block` and `END shared block` is the shared code. PsychInterview's `index.html` has the same two marks.
- `js/app.js` (ES5 style): shell, then the genogram screens: home, `#/chart/<id>` (Family), `/lines` (Relationships), `/view` (Genogram), `#/symbols`, `#/guide`, `#/about` (language switch, passcode lock).
- `data/content-tl.js`: `window.CONTENT_TL = { "English text": "Tagalog" }` (360 entries). `tx(s)`, `txf(s, {name})`, `txh(s, html)` in `app.js` look it up. Stored values and `<option value>` stay English. Shell strings use the older `t('key')` and `data/strings.js`.
- Saved data: `g:v1:charts` = `{order:[ids], byId:{id: chart}}`. Chart: `title, ptName, ptAge, ptSex, ptOcc, ptCond, ptFill, ptSubst, ptBond, ptDead, parentsRel, ptRel, byAge, showTitle, initials, family[], links[{a,b,type}]`. `toEngine(c)` maps it to the engine's shape (`genoPt*`, `family`, `famLinks`).
- Member: `{id, name, rel, age, sex, status, occ, cond, count, of, relStatus, psych, subst, withPt, twin, bond, preg}`. `bond`: Adopted / Foster. `preg`: Pregnancy / Miscarriage / Abortion / Stillbirth. `rel` is one of `G.FAMILY_RELS` (includes cousins and `Great-grandfather` / `Great-grandmother`, whose `of` is a grandparent id).
- **Couple's relationship (1.3.0):** `parentsRel`, `ptRel` and a partner's `relStatus` hold one of `G.FAM_COUPLE` (27 English names; empty = married line). `FAM_COUPLE_GROUPS` is the 25 offered, in five groups; `FAM_COUPLE_OLD` = `Living together`, `Annulled / divorced` (older charts only: still drawn as before, shown in a picker only when already chosen). `FAM_COUPLE_KIND[name]` = `{c, dash, house, mark}` is the one place that says how each is drawn. `G.famCoupleOptions(current, blankLabel, translate)` builds the grouped `<option>`s for both apps. Line patterns: `true` (dash), `'dot'`, `'sparse'`, `'dashdot'`, `'dashdotdot'`, `'short'`; `genoDash()` turns them into SVG, and PsychInterview's `slides.js` (prstDash / custDash) and `pdf.js` (`dashOf`) each have their own small table: a new pattern must be added in all three.
- Choices made in 1.3.0 that differ from the GenoPro pictures she sent: married-family lines stay dark (not dark red) so old charts are unchanged; plain separation keeps the existing `/` slash and legal separation is `\`; cohabitation kinds keep the house when separated (house + slash), so they do not look the same as "Casual relationship and separation". She has been told; change only if she asks.
- Sample families (1.4.0, Genogram app only): `sampleChart(n)` and the `SAMPLES` list in `js/app.js`; the home screen's "Sample families" card has one row per family (`data-act="sample-n"`, `data-n`), with its one-line description written there inside `tx()`. The hero button still opens Reyes (`data-act="sample"`; several tests click it).
- Share file: `{app:'genogram', kind:'chart', format:1, chart}` as `*.genogram.json`. Both apps open and save it.
- Passcode lock: salted PBKDF2 hash under `g:v1:lock`, left out of backups. It is a screen lock, not encryption.
- Drawing pieces must stay within `line`, `poly`, `shape` (rect, ellipse, diamond) and `text`: PsychInterview's slide export understands only those.

## 4. Recipe for one release
1. Restore tools and run the baseline tests (section 5) before changing anything.
2. Make the change. If it touches the shared block: `python3 tools/sync_engine.py ../case-psychinterview`, then add any new field to BOTH forms (Genogram: `memberEditor` in `js/app.js`; PsychInterview: `familyHTML` in `index.html`, plus its table export/import of family members).
3. New on-screen text: wrap in `tx()` (engine lists such as `FAM_COUPLE_GROUPS` are picked up by `check_tagalog.js` directly) and add the Tagalog to `data/content-tl.js`; `check_tagalog.js` must report 0 missing.
4. Genogram version: `data/app-meta.js` `version`, `sw.js` `VERSION`, new entry at the top of `data/changelog.js` (all three agree). New files go in the `sw.js` CORE list. Update `README.md`.
5. PsychInterview version: read the current `CACHE` in its `sw.js`, add one; add an entry at the top of `CHANGELOG` in its `index.html` (next `id`).
6. Run every test. Commit and push both repos together.
7. Update this file here and in the claude.ai Project (`claude/handoff.md`).

## 5. Commands
```
git clone https://github.com/isaymotion/genogram && git clone https://github.com/isaymotion/case-psychinterview
cd genogram && git fetch origin dev-tools && git worktree add ../genogram-dt origin/dev-tools
T=../genogram-dt/tools/tests; export GENO_QA=/tmp/geno-qa
python3 -I $T/t_features.py "$PWD"            # 34 of 35 (known wrong check: "undo disabled at first")
python3 -I $T/t_psych.py ../case-psychinterview   # 9 of 9; run AFTER t_features (uses its saved file)
python3 -I $T/t_tagalog.py "$PWD"             # 24 of 24
node $T/check_tagalog.js "$PWD"               # 0 missing, 0 unused
python3 -I $T/t_couples.py "$PWD" ../case-psychinterview   # 14 of 14 (couple kinds, both apps)
python3 -I $T/t_samples.py "$PWD"             # 6 of 6 (sample families)
python3 $T/t_app.py "$PWD" /tmp/geno-out      # errors []
git show <last release>:js/genogram-engine.js > /tmp/old-engine.js
node $T/regress.js /tmp/old-engine.js js/genogram-engine.js   # IDENTICAL x3
python3 tools/sync_engine.py ../case-psychinterview --check   # "In step"
python3 <isaymotion-app-design skill>/scripts/check_design.py .   # PASS
python3 <skill>/scripts/check_sw.py ../case-psychinterview        # PASS
```
PowerPoint check (only when drawing changes): `node $T/make_stress_chart.js` (or `node $T/make_couple_chart.js 0..3` for the couple lines), then `python3 -I $T/t_pptx.py ../case-psychinterview`, convert `$GENO_QA/pp/case.pptx` with `soffice --headless --convert-to pdf`, render the genogram page with `pdftoppm` and look at it.
Both repos must be attached with push access (`add_repo`, access push).

## 6. Status
| Item | State |
|---|---|
| 1.0.x base app | done |
| 1.1.0: cousins, adopted/foster, pregnancy and losses, substance use mark, undo, zoom and tap to edit, initials only, share file, passcode lock, bundled fonts | done, live |
| 1.2.0: great-grandparents, up to four partners, Tagalog content | done, live |
| 1.3.0: 25 kinds of couple in five groups, grouped pickers, symbols page rows, guide section, Tagalog drafts | done, live |
| 1.4.0: four more sample families and a Sample families list on the home screen (Genogram app only) | done, live |
| PsychInterview genogram in step | done (v37) |
| PowerPoint slide check of new symbols | done, all draw correctly |
| Her review of the Tagalog draft (now including the 1.3.0 couple names and 1.4.0 sample descriptions) | not done |
| Store publishing | ON HOLD by her (see below) |

## 7. Next steps
- **She will say which new genogram features come next.** Ask; do not guess. Next Genogram version: 1.5.0. PsychInterview: current `CACHE` + 1.
- GenoPro's next page is "Emotional Relationships in Genograms"; she may send it next. Those belong in `FAM_LINKS` / `genoLinkPrims`, not in the couple list.
- **Store publishing:** the reminder was given on 2026-11-13 when 1.3.0 shipped and again after 1.4.0; it is still on hold until she says go. Where it stopped:
  - She has no Apple or Google developer account yet. Her steps: enroll in the Apple Developer Program as an individual (Apple Developer app), create a personal Google Play Console account, install Xcode on her MacBook Air, line up 12 Android testers for the 14-day closed test.
  - Two answers still needed: which country she enrols under (dual Filipino-American citizen, lives and works in the Philippines; advice given: use the country where she lives and can show matching ID, address, phone and card, and decide before paying), and whether `com.isaymotion.genogram` is fine as the permanent app ID.
  - Then ours: Capacitor wrapper with files bundled, Face ID lock and native share sheet (Apple guideline 4.2), Android target API 36, privacy policy page on GitHub Pages, TestFlight, closed test, listings, review.
- Ideas not built: drag to rearrange people, in-laws beyond a sibling's partner, Tagalog on the chart itself, Tagalog search, linking this app from the other apps' menus.

## 8. Pitfalls learned
- `git pull` before work AND before pushing; PsychInterview's version moved from v29 to v36 in one day through other chats.
- Uncommitted work can be left in a checkout by a cut-off turn. Run `git status` first; test any such change before trusting it.
- Tapping a symbol: do not rely on SVG hit targets (overlays cover them). `pzUp` in `app.js` finds the person from the layout coordinates.
- PsychInterview redraws its genogram 250 ms after a change: wait 600 ms in tests.
- In headless tests PsychInterview's export shows a Share button; `t_pptx.py` removes `navigator.share` so the file downloads.
- Do not run two background jobs that edit the same file (`sw.js`, `app.js`).
- The shell's curl cannot reach most sites; fonts came from the `@fontsource-variable` npm packages.
- A long choice list in PsychInterview's form schema is a `radio` field with `couple:true` and a getter for `o` (the list lives in the shared block, which is defined further down the file); it renders as a `<select data-f>`.
- Marks on a couple's line: the house is drawn last (`onTop`) so it covers the lines under it; on the short line over the top the house and slash sit closer together (`tight`).
- GitHub Pages for `genogram` may need switching on by her: Settings > Pages > Deploy from a branch > main, / (root). She has not yet confirmed trying the app on a real iPhone.

## 9. Files to re-attach
None. Everything needed is in the two repos and this branch.
