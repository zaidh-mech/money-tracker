# Google account sync and Android app setup

The site and Android app use the same Supabase account and cloud row. Each signed-in user's data is protected by row-level security. The first Google sign-in on a device uploads its existing local tracker if that account has no cloud data yet; after that, the cloud copy is shared across devices.

## Cloud sync configuration

1. The Supabase **Money Tracker** project is in the personal **zaidh-mech's Org** organization, in South Asia (Mumbai): `https://djjqtwxeaxwnesrpdotq.supabase.co`.
2. Its SQL Editor has run the initial table and account-access setup. [`supabase/schema.sql`](supabase/schema.sql) is kept for reference.
3. Google sign-in is enabled in Supabase. The Google Cloud **Money Tracker** project has a web OAuth client with `https://djjqtwxeaxwnesrpdotq.supabase.co/auth/v1/callback` as its authorized redirect URI. Its OAuth app is in Testing mode, with `rizme.zaidh@gmail.com` added as a test user. The OAuth client backup is in the ignored `.private/google-oauth-client.json` file.
4. Supabase Authentication URL configuration allows these redirects:
   - `https://zaidh-mech.github.io/money-tracker/`
   - `moneytracker://auth-callback`
5. The GitHub repository's **Settings > Secrets and variables > Actions** has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Use the publishable key, never a service-role or secret key, in these client-side values.
6. Push to `main` or rerun the Pages workflow to rebuild the site with the cloud settings. The ignored `.env.local` has the same values for local development.

## Build and install the APK

The `Build Android APK` GitHub Actions workflow builds an installable debug APK whenever `main` is updated, or when manually started from **Actions > Build Android APK > Run workflow**. Download `money-tracker-android-apk` from that workflow run's **Artifacts** section, transfer `app-debug.apk` to the Android device, and open it to install. Android may ask you to allow installs from that source.

To open the native project in Android Studio, open the repository's `android` folder. The project uses Capacitor and packages the same tracker UI as the website. The native Google sign-in returns through the `moneytracker://auth-callback` app link.

Monthly PDFs use Android's system Save as picker. Choose **Downloads** or another folder when prompted; the app writes the PDF to that location. On the website, the same report downloads through the browser.

GitHub artifact downloads expire after 30 days. The workflow restores a project-specific debug signing key from the `ANDROID_DEBUG_KEYSTORE_BASE64` GitHub Actions secret, so later direct-install builds can update the installed app. Keep the local `.private/money-tracker-debug.keystore` backup; losing both it and the secret will prevent in-place updates. A Play Store release needs separate release signing and a publishing setup.
