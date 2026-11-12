# Genogram

Draw a clear family genogram in minutes: add the family, mark how people relate, and save it as a picture or PDF. It runs entirely in the browser, works offline after the first visit, and can be installed on phones and desktops.

**Live site:** https://isaymotion.github.io/genogram/ (after GitHub Pages is switched on; see below)

## Features

- **Your genograms:** make as many as you need; each is saved on the device with a small preview. Duplicate or delete from the home screen. Five made-up sample families (Reyes, Santos, Dela Cruz, Villanueva, Lim; `sampleChart(n)` and `SAMPLES` in `js/app.js`) show what the app can draw.
- **Step 1, Family:** fill in the index person, then add relatives with one tap (+ Father, + Mother, + Sister…). Each person is a row that opens for age, occupation, conditions, living or deceased, lives with the index person, twin, and "Number of people" (one symbol for several people). "Someone else" covers step-parents, half-siblings, former partners, siblings' partners and children, children's partners, grandchildren, grandparents, aunts and uncles.
- **Step 2, Relationships:** lines between any two people: close, very close / enmeshed, distant, conflictual, close but conflictual, cut off / estranged, abusive toward.
- **Step 3, Genogram:** drawn automatically with standard symbols, siblings and children oldest to youngest, and a key that lists only what the chart uses. Save as a picture (PNG) or a one-page A4 PDF; both are made on the device.
- **Six generations and four partners:** great-grandparents above the grandparent chosen as their child; a third and fourth partner joined by a line over the top.
- **1.6.0:** member `born`, `died`, `med` (chart `ptBorn`, `ptDied`, `ptMed`) and chart `notes`; first-visit welcome card (`welcomeCard`, key `introSeen`), backup reminder (`backupNudge`, keys `lastBackup`, `bkSnooze`), `#/privacy` page (`PRIVACY` list).
- **1.5.0:** the age of a deceased person sits on a plate over the cross; curved relationship lines in one row get separate heights (`arcOf`, `rowUp` in the engine); `household` on a chart (`genoHousehold` for the engine) draws a dashed outline around the people living with the index person; six more kinds in `FAM_LINKS` (hostile, physical / emotional / sexual abuse, neglect, caregiver).
- **25 kinds of couple (1.3.0):** married, separated, legal separation, divorce, nullity, widowed; engaged; legal cohabitation, cohabitation and non-sentimental cohabitation; committed, casual and temporary relationships, love affair; forced relationship; other or unknown. Dark lines for married couples, blue for couples who are not married, a small house for living together, a slash for separation. The list and its drawing rules are `FAM_COUPLE_GROUPS` and `FAM_COUPLE_KIND` in `js/genogram-engine.js`.
- **Tagalog content:** `data/content-tl.js` holds the Tagalog for the forms, guide and symbols page, keyed by the English text; `tx()` and `txf()` in `js/app.js` look it up. The chart stays in English.
- **More of the family:** cousins (under the aunt or uncle who is their parent), adopted and foster children (dashed or dotted line), current pregnancy, miscarriage, abortion and stillbirth, and a separate mark for a substance use disorder (dark lower half) beside the shading for a psychiatric disorder.
- **On the chart:** tap a person to open their card; pinch or use + and − to zoom, drag to move. "Initials only" shortens every name on the chart and in the saved picture and PDF.
- **Undo** while editing (one step at a time, this visit only), and "Undo" after deleting a genogram.
- **Share file:** one genogram as a `.genogram.json` file. "Open a genogram file" on the home page adds it as a new genogram; PsychInterview opens the same file in its Family section.
- **Passcode lock** (About > Privacy): asks for 4 to 12 digits when the app opens and after two minutes in the background. It is a screen lock, not encryption; only a salted hash of the passcode is stored, and it is left out of backups.
- **Symbols and lines** and **How to use** pages.
- The shared isaymotion shell: menu (sidebar on desktop, drawer and bottom tabs on phones), search (`/`), back and forward, light / dark / match-device theme, text size, English / Tagalog shell, What's new, and backup (export, import, undo).
- No accounts and no server. Everything stays in the browser on each device. Fonts are bundled in `fonts/`, so the app makes no request to any other site. No build step and no dependencies.

## Files to upload

Upload everything in this folder to the root of the repository, keeping the folder structure:

```
.nojekyll               (empty file; tells GitHub Pages not to run Jekyll)
README.md
index.html              App shell (top bar, sidebar menu, footer, bottom tabs)
css/app.css             Styles (light and dark themes)
js/app.js               Router, menu, views (VIEWS), navigation (NAV), search, theme, backup
js/genogram-engine.js   Lays out and draws the genogram (shared with PsychInterview; see the note at the top of the file)
data/app-meta.js        App name, version, attribution (window.APP_META), menu links (window.APP_LINKS)
                        and the commented MIGRATE_KEYS example
data/changelog.js       What's new entries (window.APP_CHANGELOG)
data/hospital.js        Hospital, program, posts and year levels (window.HOSPITAL), shared across apps
data/strings.js         Shell UI strings in English and Tagalog (window.STRINGS)
fonts/                  Figtree, Fraunces and Source Serif 4 (latin, variable woff2) and their licence, OFL.txt
tools/sync_engine.py    Copies the shared drawing code into PsychInterview and checks the two are in step (not part of the app)
icons/                  icon-192.png, icon-512.png, icon-maskable-512.png (required),
                        favicon-32.png, favicon-64.png, apple-touch-icon.png (recommended)
manifest.webmanifest    Install metadata
sw.js                   Offline cache
```

Icons are generated from `icons/icon.svg`.

## The drawing engine (shared with PsychInterview)

`js/genogram-engine.js` holds the code that lays out and draws a genogram, between the `BEGIN shared block` and `END shared block` marks. PsychInterview (repo `case-psychinterview`, `index.html`) carries the same block between the same marks, so both apps draw the same chart, and its slides and Word export use the same drawing pieces.

The two are developed together. **Edit the block here, never in PsychInterview**, then:

```
python3 tools/sync_engine.py ../case-psychinterview          # copy the block into PsychInterview
python3 tools/sync_engine.py ../case-psychinterview --check   # only compare; fails if they differ
```

For every change to the block: update this app's form if a new field is involved, do the same in PsychInterview's family form (`familyHTML` in its `index.html`), bump both versions (`sw.js` cache names included), and publish both repos together. New drawing pieces must stay within the four kinds the slide export understands: `line`, `poly`, `shape` (rect, ellipse, diamond) and `text`.

Fields the engine reads on a family member: `name, rel, age, sex, status, occ, cond, count, of, relStatus, psych, subst, withPt, twin, bond` (Adopted / Foster) and `preg` (Pregnancy / Miscarriage / Abortion / Stillbirth). For the index person: `genoPtName, genoPtOcc, genoPtCond, genoPtFill, genoPtSubst, genoPtBond, genoPtDead`.

## Publish on GitHub Pages

1. Create a new repository named `genogram` on GitHub and upload all files in this folder, keeping the folder structure.
2. In the repository, open **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, and save.
4. After a minute the site is live at `https://isaymotion.github.io/genogram/`.
5. On a phone, open that link, then use **Add to Home Screen** (iPhone Safari) or **Install app** (Android Chrome).

There is no build step and no dependencies. To preview locally, run `python3 -m http.server` in this folder and visit `http://localhost:8000`.

## Adding a screen

1. In `js/app.js`, inside the `APP VIEWS` section, add `VIEWS.myscreen = function (arg) { return '<div class="wrap page">...</div>'; };` (use `esc()` on any data).
2. Add one entry to the `NAV` array: `{ label: 'My screen', href: '#/myscreen', icon: 'star', group: 'Screens' }`. That adds it to the sidebar, the drawer and the home tiles.
3. Optional: add rows to `SEARCH_INDEX` (`{title, text, href, kind}`) so the screen shows up in search.
4. Add an entry to the top of `data/changelog.js` and bump the version (below).

Reusable CSS classes are in `css/app.css`: `btn`, `btn--solid`, `link-btn`, `filters`/`filter`, `seg`, `card`, `row`, `callout`, `table-wrap`, `page`/`page__head`, `crumb`, `empty`, `badge`, `meter`. Flashcards, quizzes and spaced repetition are not included; copy them from the Stahl or DSMVapp repos if a study app needs them.

## Shared data, languages and other apps

- `data/hospital.js` defines `window.HOSPITAL` (hospital name, program, province, posts, year levels, form prefix). It is shared across the apps: edit it in one place and copy the file to the others instead of hardcoding these values.
- `data/strings.js` defines `window.STRINGS = { en, tl }` for the shell's own UI text. Use `t('key')` in `js/app.js`; it falls back to English, then to the key. The Tagalog values are a draft until Dr. Navarro reviews them. Add the same key to both languages when you add shell text.
- `window.APP_LINKS` (in `data/app-meta.js`) feeds the "Other apps" menu group. The entry matching this app's own repo slug is skipped, so the same list works in every app. These links never appear in the home tiles, search or tab bar.
- `window.MIGRATE_KEYS` (optional; a commented example is in `data/app-meta.js`) is for a restyled app whose storage prefix changed: at startup each saved key under an old prefix is copied under the new prefix and the old key removed, so saved progress survives.

## Version and What's new

- The app version is a semantic version string (for example `1.0.0`). It lives in `data/app-meta.js` (`version`), in the first entry of `data/changelog.js`, and in `sw.js` (`VERSION`).
- `data/changelog.js` is newest first. Each entry is `{version, date, title, items:[{type, text}]}` where `date` is ISO `YYYY-MM-DD` and `type` is `feature`, `update`, `correction` or `content`. Write plain sentences, sentence-case titles, no emoji, and start an item with the feature name and a colon.
- For every release: add the changelog entry at the top, update `version` in `data/app-meta.js`, set `VERSION` in `sw.js` to the same version (this makes returning users get the new files), and update "Latest version November 2026" in `index.html`, `data/app-meta.js` and this README.
- The unseen badge is keyed on the version string: visitors see a count of entries newer than the last version they opened on the What's new page.
- Storage keys start with `g:v1:`, and cache names start with `genogram-`. All isaymotion apps share one origin (`isaymotion.github.io`), so keep both unique per app. Do not change them after release, or saved data will be lost.

## Attribution

App created by Isabella Navarro, MD. Latest version November 2026. isaymotion@gmail.com

A tool for the Psychiatry and Public Mental Health Residency Training Program, Mariveles Mental Wellness and General Hospital. Everything you enter stays on this device unless you export it; nothing is sent to a server.
