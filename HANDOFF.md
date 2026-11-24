# Genogram: handoff (updated 2026-11-23, fourth chat: 1.8.1 live, store assets ready, waiting on her accounts)

## 1. Project and audience
- Standalone family genogram maker for psychiatry residents and nurses. Owner: Ma. Isabella P. Navarro, MD (GitHub `isaymotion`). She does not code: explain plainly, short replies (she is often on her phone).
- Repo `isaymotion/genogram` (public). `main` is the live site (GitHub Pages, https://isaymotion.github.io/genogram/). `dev-tools` holds this file and the test tools; it is never published. `store` (from 2026-11-23) = `main` + `native/` (Capacitor wrapper) + `.github/workflows/android.yml`; also never published.
- Sister app: PsychInterview, repo `isaymotion/case-psychinterview` (one big `index.html`, plus `slides.js`, `pdf.js`). It carries the same genogram drawing code.
- Live now: **Genogram 1.8.1** (main `e244a08`, 2026-11-23: `privacy.html` + phone-app privacy wording; no drawing change, PsychInterview untouched). `store` branch at `523b69c`. PsychInterview is at **v43** (main `26bcc8a`, released by the PsychInterview chat); its genogram code is in step with 1.7.0 (synced in v42). The PsychInterview chat publishes in between, so always take the next number after whatever is live.

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
- `data/content-tl.js`: `window.CONTENT_TL = { "English text": "Tagalog" }` (about 450 entries). `tx(s)`, `txf(s, {name})`, `txh(s, html)` in `app.js` look it up. Stored values and `<option value>` stay English. Shell strings use the older `t('key')` and `data/strings.js`.
- Saved data: `g:v1:charts` = `{order:[ids], byId:{id: chart}}`. Chart: `title, ptName, ptAge, ptSex, ptOcc, ptCond, ptFill, ptSubst, ptBond, ptDead, parentsRel, ptRel, byAge, showTitle, initials, family[], links[{a,b,type}]`. `toEngine(c)` maps it to the engine's shape (`genoPt*`, `family`, `famLinks`).
- Member: `{id, name, rel, age, sex, status, occ, cond, count, of, relStatus, psych, subst, withPt, twin, bond, preg}`. `bond`: Adopted / Foster. `preg`: Pregnancy / Miscarriage / Abortion / Stillbirth. `rel` is one of `G.FAMILY_RELS` (includes cousins and `Great-grandfather` / `Great-grandmother`, whose `of` is a grandparent id).
- **Couple's relationship (1.3.0):** `parentsRel`, `ptRel` and a partner's `relStatus` hold one of `G.FAM_COUPLE` (27 English names; empty = married line). `FAM_COUPLE_GROUPS` is the 25 offered, in five groups; `FAM_COUPLE_OLD` = `Living together`, `Annulled / divorced` (older charts only: still drawn as before, shown in a picker only when already chosen). `FAM_COUPLE_KIND[name]` = `{c, dash, house, mark}` is the one place that says how each is drawn. `G.famCoupleOptions(current, blankLabel, translate)` builds the grouped `<option>`s for both apps. Line patterns: `true` (dash), `'dot'`, `'sparse'`, `'dashdot'`, `'dashdotdot'`, `'short'`; `genoDash()` turns them into SVG, and PsychInterview's `slides.js` (prstDash / custDash) and `pdf.js` (`dashOf`) each have their own small table: a new pattern must be added in all three.
- Choices made in 1.3.0 that differ from the GenoPro pictures she sent: married-family lines stay dark (not dark red) so old charts are unchanged; plain separation keeps the existing `/` slash and legal separation is `\`; cohabitation kinds keep the house when separated (house + slash), so they do not look the same as "Casual relationship and separation". She has been told; change only if she asks.
- **1.5.0:** a deceased person's age is drawn on a small plate over the cross. Curved relationship lines in one row get separate heights and the row more room (`arcOf`, `rowUp`); a row with one curve and no over-the-top partner is unchanged. Chart `household` (engine `genoHousehold`) draws a dashed blue outline per row around the index person and everyone with `withPt`, instead of the small houses. `FAM_LINKS` has 13 kinds (added: Hostile, Physical / Emotional / Sexual abuse toward, Neglect toward, Caregiver of); `famLinkKey()` gives the key text; `arrowLine()` in `genoLinkPrims` draws the arrowed ones.
- **1.6.0:** member `born`, `died`, `med`; chart `ptBorn`, `ptDied`, `ptMed`, `notes` (engine `genoPtBorn`, `genoPtDied`, `genoPtMed`, `genoNotes`). Years show under the name (`genoYears`), medical illness is a small dark cross beside the symbol (not red: stores reject red-cross emblems), notes are wrapped under the key. Genogram app only: first-visit welcome card (`welcomeCard`, key `introSeen`; inline in place of the empty list, never a modal, so the tests' first clicks still work), backup reminder (`backupNudge`: 3+ charts, no backup in 30 days, snooze 14 days in `bkSnooze`), `#/privacy` page (`PRIVACY` list).
- **1.7.0:** chart `pos` = `{memberId or 'pt': sideways shift in symbol widths}` (engine `genoPos`, ignored when `genoPosOff`), applied right after `nodes` is built so every line follows; “Move people” in the view step sets `moveMode`, and `pzDown` / pointermove / `pzUp` drag via `pzHit()`. Member `gid` / chart `ptGid` from `FAM_GID` (Transgender, Non-binary): a small symbol beside the main one. `Pet` relationship (role `other`, rounded square). People with role `other` (Other relative, Household member, Pet) are no longer left out: they get a last row of their own.
- PsychInterview carries all of these (chips `genoHousehold`, `genoPtMed`, `genoPtTrans`, `genoPosOff`; inputs `born`, `died`, `gid`, `genoNotes`), but its Word family table does not export `born`, `died`, `med` or `gid`, and it has no drag: positions come only from a Genogram file. Left for the PsychInterview chat to decide.
- Sample families (1.4.0, Genogram app only): `sampleChart(n)` and the `SAMPLES` list in `js/app.js`; the home screen's "Sample families" card has one row per family (`data-act="sample-n"`, `data-n`), with its one-line description written there inside `tx()`. The hero button still opens Reyes (`data-act="sample"`; several tests click it).
- Share file: `{app:'genogram', kind:'chart', format:1, chart}` as `*.genogram.json`. Both apps open and save it.
- Passcode lock: salted PBKDF2 hash under `g:v1:lock`, left out of backups. It is a screen lock, not encryption.
- **1.8.0 / phone version (`store` branch, `native/`):** Capacitor 8.6, app ID `com.isaymotion.genogram`, name Genogram. `native/build-web.js` copies `index.html css js data fonts icons` into `native/www`, drops the manifest link and replaces the seven app `<script>` tags with `window.GENO_SCRIPTS` + `js/native.js`, which (1) mirrors every `g:v1:` localStorage write into Capacitor Preferences (patched `Storage.prototype.setItem/removeItem`) and restores them when the web view's storage is empty, (2) sets `window.GenoNative = {bio, save(data,name), bioCheck(reason)}` (Filesystem cache file + Share sheet; @capgo/capacitor-native-biometric), then (3) loads the app scripts in order. `js/app.js` on `main` uses `GenoNative` only when it exists: `deliver()`, `bkExport()`, the lock screen (Face ID button, asked automatically, passcode still works) and the `lockCard` note; no service worker when `window.Capacitor`. iOS `Info.plist` has `NSFaceIDUsageDescription`; Android manifest has `USE_BIOMETRIC`. Android targets API 36 (Capacitor 8 default). Plugins: share, filesystem, preferences, capgo native-biometric 8.9.
- **1.8.1:** `PRIVACY_APP` (shown instead of `PRIVACY` when `window.Capacitor`), app variant of the `backupNudge` text, and `backup.textApp` in `data/strings.js` (swapped in by `applyStatic()`): the phone app no longer talks about a browser or website. `check_tagalog.js` reads both PRIVACY lists. `privacy.html` (repo root, standalone page, not in `sw.js` CORE, not bundled into the phone app) is the store privacy-policy URL: https://isaymotion.github.io/genogram/privacy.html. Genogram-only change, so no PsychInterview release.
- **Store assets (`store` branch):** `native/make-assets.py` makes every iOS/Android icon and splash from `icons/icon-source.png` (1024 px, no transparency; background `#033D4C` = the art's edge colour; Android adaptive foreground has the art at 53% so the word GENOGRAM stays inside the circle mask; `windowSplashScreenBackground` set for Android 12+). `native/store/`: `listing.md` (all English listing text, limits checked, URLs, category, data-safety and age-rating answers, review notes), `play-icon-512.png`, `play-feature-1024x500.png`, `screenshots/{iphone-6.9,ipad-13,android-phone}/1..6.png` with captions. Versions: Android `versionCode 10801` / `versionName 1.8.1` (scheme major*10000+minor*100+patch), iOS `MARKETING_VERSION 1.8.1`, build 1.
- Data in the phone app is separate from the website's (different origin): moving genograms between them is by backup export / import.
- Drawing pieces must stay within `line`, `poly`, `shape` (rect, ellipse, diamond) and `text`: PsychInterview's slide export understands only those.

## 4. Recipe for one release
1. Restore tools and run the baseline tests (section 5) before changing anything.
2. Make the change. If it touches the shared block: `python3 ../genogram-dt/tools/sync_engine.py ../case-psychinterview` (from the main checkout), then add any new field to BOTH forms (Genogram: `memberEditor` in `js/app.js`; PsychInterview: `familyHTML` in `index.html`, plus its table export/import of family members).
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
python3 -I $T/t_150.py "$PWD" ../case-psychinterview   # 10 of 10
python3 -I $T/t_160.py "$PWD" ../case-psychinterview   # 16 of 16
python3 -I $T/t_170.py "$PWD" ../case-psychinterview   # 13 of 13
python3 -I $T/t_181.py "$PWD"             # 8 of 8 (phone-app wording, website unchanged)
# store branch: cd native && node build-web.js && python3 -I <dev-tools>/tools/tests/t_native.py "$PWD/www"   # 11 of 11
# screenshots: python3 -I <dev-tools>/tools/store/shots.py <genogram main checkout> /tmp/shots   (raw + *-store captioned sets)
python3 $T/t_app.py "$PWD" /tmp/geno-out      # errors []
git show <last release>:js/genogram-engine.js > /tmp/old-engine.js
node $T/regress.js /tmp/old-engine.js js/genogram-engine.js   # IDENTICAL x3 (against 1.5.0 or later; 1.5.0 itself changed the deceased age on purpose)
python3 ../genogram-dt/tools/sync_engine.py ../case-psychinterview --check   # "In step" (run from the main checkout)
python3 <isaymotion-app-design skill>/scripts/check_design.py .   # PASS
python3 <skill>/scripts/check_sw.py ../case-psychinterview        # PASS
node $T/regress_random.js /tmp/old-engine.js js/genogram-engine.js   # different: 0 of 300
# PsychInterview's own tests (its dev-tools branch): every 'errors' line must be []
cd ../case-psychinterview && git fetch origin dev-tools && git worktree add ../psych-dt origin/dev-tools && bash ../psych-dt/tools/tests/run_all.sh "$PWD"
```
Release helpers are in `tools/release/` on this branch (`tl_add.py` for Tagalog and version bumps, `psych_apply.py` for the PsychInterview side); read its `README.md`.
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
| 1.5.0 to 1.7.0: the eleven improvements she approved before publishing (see section 3) | done, live |
| PsychInterview genogram in step | done (v42) |
| PowerPoint slide check of new symbols | done, all draw correctly |
| Her review of the Tagalog draft (everything since 1.2.0) | not done |
| Her test on a real iPhone and iPad (especially “Move people” by finger) | not done |
| 1.8.0: hooks for the phone version | done, live |
| Phone wrapper (`store` branch), Android build on GitHub | done (build passes with the new icon) |
| 1.8.1: privacy page `privacy.html`, phone-app privacy wording | done, live |
| App icon, splash, store graphics, screenshots, English listing text, version 1.8.1 | done (`store` branch, `native/store/`) |
| Android upload-key signing | not started: needs her Play account first |
| Store publishing | waiting on her step 1 (accounts, Xcode, testers): still not started at 18:30 on 2026-11-23 |

## 7. Next steps
- **2026-11-23 (fourth chat):** she replied “1-6 all not done yet” (no Apple or Google account, no Xcode, no testers, no iPhone/iPad test, no Tagalog review). Baseline re-run from a fresh clone: all pass. Built 1.8.1 (above) and all store assets. Walking her through the store steps ONE AT A TIME, plain words; she was given **Step 1 of 1a: Apple Developer enrollment in the Apple Developer app on her iPhone** (two-factor on, passport/ID photo, legal name exactly as on the ID, Philippine address; 99 USD/year; same device throughout; her legal name shows as seller). Next chat: ask whether Apple enrollment went through, then give the next single step: (1b) Google Play Console personal account (25 USD, ID check, choose "Personal"), (1c) Xcode from the Mac App Store, (1d) collect 15–20 Android testers' Gmail addresses. After 1b: Android upload-key signing (keystore as GitHub secrets, signed `bundleRelease` in the workflow). After 1a+1c: Xcode walk-through (`npm ci && npm run sync` in `native/`, open `ios/App/App.xcodeproj`, Signing & Capabilities > Team, run on her iPhone, Product > Archive > Distribute > TestFlight). Still ask for her iPhone/iPad test and Tagalog review; if Tagalog is still unreviewed at submission, offer English-first.
- **2026-11-23 19:46 update:** Apple enrollment on the website first failed with "We are unable to process your request. An unknown error occurred." (her Apple Account was on the US store; a new PH account never received its two-factor code). She moved her existing account to the Philippines App Store and the purchase then went through (Apple Developer Program, 99 USD). The receipt's billing contact and address were someone else's (US card): she was asked to check that Membership details at developer.apple.com/account show HER legal name as Account Holder (that is the App Store seller name) and to wait for Apple's welcome email. Next single step given: 1b, Google Play Console.
- **2026-11-24:** Apple membership ACTIVE (welcome emails 19:02-19:37 Manila time; Apple Developer emails address her as "Ma. Isabella Pamintuan Navarro", App Store Connect access granted as "Isabella Navarro"). Asked her to confirm Membership details shows her full legal name (= seller name) and, if she sent the name/card support message, to tell Apple it is approved. Next steps: 1c Xcode, then the Xcode walk-through to TestFlight; Google Play (1b) status not yet reported.
- Possible review risk to mention if asked: Apple guideline 4.2 (minimum functionality) for wrapped web apps; we have the native share sheet, Face ID and offline bundling. If the name "Genogram" is taken on the App Store, `listing.md` has fallbacks.
- If she asks for another genogram feature first: next Genogram version 1.8.0; PsychInterview: current `CACHE` + 1.
- **2026-11-23 (third chat):** she had started none of her step 1 (no Apple or Google account, no Xcode, no testers, no iPhone/iPad test, no Tagalog review); step-by-step sign-up instructions given again. Built: 1.8.0 on `main` (all tests pass), the `store` branch wrapper, and the Android build on GitHub Actions (passes; it checks the app ID, target API 36 and the bundled files; artifact `genogram-android` = debug .apk + unsigned .aab). This workspace cannot reach dl.google.com or the artifact download host, so Android builds only run on GitHub. `tools/tests/t_native.py <native/www>`: 11 checks of the bridge with mocked plugins (run `node build-web.js` in `native/` first, `npm ci` there if `node_modules` is missing).
  - Still to build (ours, can be done before her accounts exist): replace Capacitor's placeholder app icons and splash with the Genogram icon (iOS needs a 1024 px source; `icons/` has up to 512, so make a 1024 from the source art or redraw); a static `privacy.html` on `main` as the store privacy-policy URL (from the in-app `#/privacy` text); screenshots; listing text in English; Android upload-key signing (keystore as GitHub secrets, signed `bundleRelease`) once her Play account exists; version numbers (`versionCode`/`versionName` in `native/android/app/build.gradle`, Xcode marketing version 1.8.0).
  - Hers, after accounts: open `native/ios/App/App.xcodeproj` in Xcode (after `npm ci && npm run sync` in `native/`), pick her team, run on her iPhone, Archive, upload to TestFlight. Walk her through each click.
- **Store publishing, where it stood (2026-11-13, second chat):** baseline re-run from a fresh clone, everything passes (1.7.0 `99b8438`, v43 `26bcc8a`, in step). No app change was made.
  - Decided by her: accounts enrolled under the **Philippines**; app ID **`com.isaymotion.genogram`** on both stores (permanent).
  - Still not done by her: trying the app on her iPhone and iPad (especially “Move people” by finger) and reviewing the Tagalog. Ask again at the start of the next chat and fix what she finds before wrapping. If the Tagalog is still unreviewed at submission, say so to her and offer to ship English-first or keep the draft label.
  - Step 1, given to her and waiting: (a) Apple Developer Program as an individual through the Apple Developer app on her iPhone (same Apple Account she will keep, two-factor on, legal name exactly as on her ID, Philippine address/phone/card; 99 USD a year in local currency; the store shows her legal name as seller); (b) Google Play Console personal account (25 USD once, identity check); (c) install Xcode on the MacBook Air (large download); (d) collect the Gmail addresses of 15 to 20 Android users (12 must stay opted in for 14 days in a row before Google allows the public release, so extra people are the safety margin).
  - Checked 2026-11-13: Google Play needs target API 36 (Android 16) for new apps; the 12-tester / 14-day closed test still applies to new personal accounts.
  - Step 2, ours, next: Capacitor wrapper with files bundled (keep it out of `main`'s published files, e.g. its own branch or repo, decide at the start), Face ID lock and native share sheet (Apple guideline 4.2), Android target API 36, privacy policy page on GitHub Pages (start from the in-app `#/privacy` text from 1.6.0), app icon and screenshots. Then: TestFlight, Android closed test (14 days), listings, review.
- Ideas not built: sexual orientation marks, moving people up or down (only sideways works), in-laws beyond a sibling's partner, Tagalog on the chart itself, Tagalog search, linking this app from the other apps' menus.

## 8. Pitfalls learned
- 2026-11-13: the PsychInterview chat released v39, v41 and v43 (navigation, Word file without the name, backup reminder, PHQ-9 and GAD-7) between this chat's v38, v40 and v42; none touch the shared block. PsychInterview now has an address per place (`#/r/<id>/<section>`), so a test that needs its home screen should open the bare URL. Its `tools/bump.py` on `dev-tools` numbers a release from whatever is live.
- 2026-11-13: the PsychInterview chat ran every test here on 1.4.0 / v37 from a fresh clone: all pass, both apps in step. PsychInterview's own `t_family.py` had to be updated for the 1.3.0 couple picker: when a shared change alters a PsychInterview form control, also run `bash tools/tests/run_all.sh` from its `dev-tools` branch (a blank line under a heading there means a test crashed).
- `git pull` before work AND before pushing; PsychInterview's version moved from v29 to v36 in one day through other chats.
- Uncommitted work can be left in a checkout by a cut-off turn. Run `git status` first; test any such change before trusting it.
- Tapping a symbol: do not rely on SVG hit targets (overlays cover them). `pzUp` in `app.js` finds the person from the layout coordinates.
- PsychInterview redraws its genogram 250 ms after a change: wait 600 ms in tests.
- In headless tests PsychInterview's export shows a Share button; `t_pptx.py` removes `navigator.share` so the file downloads.
- Do not run two background jobs that edit the same file (`sw.js`, `app.js`).
- The shell's curl cannot reach most sites; fonts came from the `@fontsource-variable` npm packages.
- A long choice list in PsychInterview's form schema is a `radio` field with `couple:true` and a getter for `o` (the list lives in the shared block, which is defined further down the file); it renders as a `<select data-f>`.
- Marks on a couple's line: the house is drawn last (`onTop`) so it covers the lines under it; on the short line over the top the house and slash sit closer together (`tight`).
- PsychInterview side of a release: apply it as a script on a fresh `origin/main` right before pushing (the other chat pushes often), then run BOTH test sets before pushing: ours and `bash tools/tests/run_all.sh <app>` from PsychInterview's `dev-tools` branch. If a shared change makes one of their expectations outdated (1.7.0 did: `t_geno.js`), fix that line on their `dev-tools` with a comment.
- GitHub Pages for `genogram` may need switching on by her: Settings > Pages > Deploy from a branch > main, / (root). She has not yet confirmed trying the app on a real iPhone.

- 2026-11-13: `sync_engine.py --check` said DIFFERENT on a clean baseline because it compared the `dev-tools` branch's own older engine copy. Fixed: it now reads `js/genogram-engine.js` from the folder you run it in, so run it from the main checkout.

- 2026-11-23: `rm -rf *` after `cd` is blocked by the session's safety check; use `mktemp -d`. GitHub Actions artifacts cannot be downloaded here (the proxy blocks the blob host): put checks inside the workflow and read them with `gh run view <id> --log`. Fetch this branch with `git fetch origin +dev-tools:refs/remotes/origin/dev-tools` (a shallow clone does not track it).
- The `store` branch must be refreshed from `main` after every release: `git switch store && git merge main`, then `cd native && npm run sync`, and bump the Android `versionCode`.

- 2026-11-23 (fourth chat): `add_repo` with push access to `case-psychinterview` was refused by the session's safety check; read access (public repo, anonymous clone) was enough for the tests. If a PsychInterview release is needed, ask her to re-attach it.
- WebFetch of the live GitHub Pages site needed her approval and went unanswered; the Pages build API is blocked by the proxy. Ask her to open the privacy page link to confirm it is live.
- Store screenshots: on phones the action sheet covers the bottom of the view step; `shots.py` scrolls `#canvas` under the top bar instead of zooming (zooming crops the chart). Android shots are 1080x2160 because 1080x1920 left no room for the chart.

## 9. Files to re-attach
None. Everything needed is in the two repos and this branch.
