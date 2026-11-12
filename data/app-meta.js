/* App identity. Edit these values (or let the scaffolding script fill the placeholders). */
window.APP_META = {
  name: 'Genogram',
  short: 'Genogram',
  tagline: 'Family genogram maker',
  version: '1.6.0',
  repo: 'genogram',
  attribution: 'App created by Isabella Navarro, MD. Latest version November 2026. isaymotion@gmail.com'
};

/* Other isaymotion apps, listed as the last group ("Other apps") in the menu. External links only:
   they are not added to the home tiles, search or the tab bar. The entry whose URL ends in this
   app's own repo slug (APP_META.repo) is skipped automatically, so the same list can be copied to every app. */
/* Show the "Other apps" group in the menu? Off for now: the apps are not interlinked yet.
   Set to true when ready; the list below is already in place. */
window.SHOW_OTHER_APPS = false;

window.APP_LINKS = [
  { name: 'MSE Trainer', href: 'https://isaymotion.github.io/MSEtrainer/' },
  { name: 'Usap Tayo (Tagalog)', href: 'https://isaymotion.github.io/Tagalog/' },
  { name: 'DSM-5-TR Study Companion', href: 'https://isaymotion.github.io/DSMVapp/' },
  { name: 'Stahl Study Companion', href: 'https://isaymotion.github.io/Stahl/' },
  { name: 'Kaplan Study', href: 'https://isaymotion.github.io/KaplanStudy/' },
  { name: 'Shea Trainer', href: 'https://isaymotion.github.io/sheatrainer/' }
];

/* Key migration: for a restyled app whose storage prefix changed, so saved progress survives.
   Leave this commented out (not defined) unless the prefix changed. Runs once at startup, before anything is read.
   Each key: old prefix. Each value: a string (put the rest of the key under that sub-prefix of the new
   PREFIX; '' keeps the rest as is) or a function (rest, oldKey) returning the new key suffix to store
   under PREFIX (return a falsy value to skip that key).
   window.MIGRATE_KEYS = {
     'old-app:': '',
     'old-app-v1:': function (rest) { return rest.replace(/^deck-/, 'cards-'); }
   };
*/
