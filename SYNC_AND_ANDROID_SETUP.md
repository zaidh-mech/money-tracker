# Google account sync and Android app setup

The site and Android app use the same Supabase account and cloud row. Each signed-in user's data is protected by row-level security. The first Google sign-in on a device uploads its existing local tracker if that account has no cloud data yet; after that, the cloud copy is shared across devices.

## Configure cloud sync

1. Create a Supabase project.
2. In its SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. In Supabase Authentication, enable Google as a provider. In Google Cloud Console, create a web OAuth client and add Supabase's callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) to its authorized redirect URIs. Put that client ID and secret in Supabase's Google provider settings.
4. In Supabase Authentication URL configuration, add these allowed redirect URLs:
   - `https://zaidh-mech.github.io/money-tracker/`
   - `moneytracker://auth-callback`
5. In the GitHub repository's **Settings → Secrets and variables → Actions**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`: the project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the project's publishable/anon key. Do not use a service-role key.
6. Push to `main` or rerun the Pages workflow so the site is rebuilt with those values. For local development, copy `.env.example` to `.env.local` and fill in the same two values.

## Build and install the APK

The `Build Android APK` GitHub Actions workflow builds an installable debug APK whenever `main` is updated, or when manually started from **Actions → Build Android APK → Run workflow**. Download `money-tracker-android-apk` from that workflow run's **Artifacts** section, transfer `app-debug.apk` to the Android device, and open it to install. Android may ask you to allow installs from that source.

To open the native project in Android Studio, open the repository's `android` folder. The project uses Capacitor and packages the same tracker UI as the website. The native Google sign-in returns through the `moneytracker://auth-callback` app link.

GitHub artifact downloads expire after 30 days. This workflow produces a debug-signed APK for direct installation; a stable signed release for Play Store distribution needs a release signing key and a publishing setup.
