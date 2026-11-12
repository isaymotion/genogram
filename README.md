# Genogram

Draw a clear family genogram in minutes: add the family, mark how people relate, and save it as a picture or PDF. It runs entirely in the browser, works offline after the first visit, and can be installed on phones and desktops.

**Live site:** https://isaymotion.github.io/genogram/ (after GitHub Pages is switched on; see below)

## Features

- **Your genograms:** make as many as you need; each is saved on the device with a small preview. Duplicate or delete from the home screen. A made-up sample family shows what the app can draw.
- **Step 1, Family:** fill in the index person, then add relatives with one tap (+ Father, + Mother, + Sister…). Each person is a row that opens for age, occupation, conditions, living or deceased, lives with the index person, twin, and "How many" (one symbol for several people). "Someone else" covers step-parents, half-siblings, former partners, siblings' partners and children, children's partners, grandchildren, grandparents, aunts and uncles.
- **Step 2, Relationships:** lines between any two people: close, very close / enmeshed, distant, conflictual, close but conflictual, cut off / estranged, abusive toward.
- **Step 3, Genogram:** drawn automatically with standard symbols, siblings and children oldest to youngest, and a key that lists only what the chart uses. Save as a picture (PNG) or a one-page A4 PDF; both are made on the device.
- **Symbols and lines** and **How to use** pages.
- The shared isaymotion shell: menu (sidebar on desktop, drawer and bottom tabs on phones), search (`/`), back and forward, light / dark / match-device theme, text size, English / Tagalog shell, What's new, and backup (export, import, undo).
- No accounts and no server. Everything stays in the browser on each device. No build step and no dependencies.

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
icons/                  icon-192.png, icon-512.png, icon-maskable-512.png (required),
                        favicon-32.png, favicon-64.png, apple-touch-icon.png (recommended)
manifest.webmanifest    Install metadata
sw.js                   Offline cache
```

Icons are generated from `icons/icon.svg`.

## The drawing engine

`js/genogram-engine.js` is the same code PsychInterview uses for its genogram (repo `case-psychinterview`, `index.html`, the block that starts "Family members and genogram"). When the drawing is changed in one app, copy that block into the other between the `BEGIN shared block` / `END shared block` marks so both apps draw the same chart.

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
