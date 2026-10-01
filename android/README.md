# Android builds

Before running the app from Android Studio, run this from the repository root:

```sh
npm run build:android
```

This builds the latest tracker as a static export for Capacitor and syncs it into
Android. It sets the Android build environment automatically, including when a
GitHub Pages environment variable is present. Website exports use a
`/money-tracker/` URL prefix; Android assets must use `/_next/` directly.

Then build or run the app in Android Studio, or use Java 21 and run
`./gradlew assembleDebug` (`gradlew.bat assembleDebug` on Windows) in this folder.
The APK is at `app/build/outputs/apk/debug/app-debug.apk`.

The Android build checks that CSS and JavaScript links resolve to bundled files.
If that check fails, run `npm run build:android` again before building the APK.
Repeat the web build whenever the UI changes so Android includes those changes.
