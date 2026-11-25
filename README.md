# Genogram

Draw a clear family genogram in minutes. Genogram is an app for iPhone, iPad and Android.

**This branch (`main`) is only the public website:** https://isaymotion.github.io/genogram/

- `index.html`: landing page with store links and support contact. If this browser still has genograms from the old web app (keys starting `g:v1:`), it shows a **Download my genograms** button that writes the same backup file as the app's "Export backup", so "Import backup" in the app accepts it.
- `privacy.html`: privacy policy linked from the store listings. Keep it online.
- `sw.js`: retires the old web app's offline copy (deletes `genogram-` caches, unregisters itself). Keep it so old visitors get the new page.
- `icons/`, `fonts/`: used by the two pages.

**The app's source lives on the `store` branch** (website files at its root, the Capacitor wrapper in `native/`, builds in `.github/workflows/`). Make app changes there. Do not merge `main` into `store`: it would delete the app files.

When the app is live, put its App Store and Google Play links in the two buttons at the top of `index.html` (ids `appstore`, `googleplay`) and remove `aria-disabled`.
