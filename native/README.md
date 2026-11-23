# Genogram for the App Store and Google Play

This folder lives on the `store` branch only. GitHub Pages publishes `main`, so nothing here reaches the website.

- The phone app is the website's own files (copied by `build-web.js` into `www/`) inside a Capacitor 8 wrapper. App ID: `com.isaymotion.genogram`.
- `js/native.js` (phone only): keeps a copy of everything saved under `g:v1:` in the phone's app storage and restores it if the web view's storage is cleared; `GenoNative.save()` opens the native share sheet; `GenoNative.bio` / `bioCheck()` give Face ID, Touch ID or fingerprint to the passcode lock. The website's `js/app.js` (1.8.0+) uses these only when they exist.
- Android: built by GitHub Actions (`.github/workflows/android.yml`) on every push to `store`. Target API 36.
- iPhone and iPad: open `ios/App/App.xcodeproj` in Xcode on the Mac (after `npm ci && npm run sync`), choose the team, then Product > Archive.
- Updating: merge `main` into `store`, then `npm run sync`. Bump `versionCode` / `versionName` in `android/app/build.gradle` and the version in Xcode for each store upload.
