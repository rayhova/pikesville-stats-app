# Native App Release Checklist

The native app shells are built with Capacitor and load the production app at
`https://app.pikesvillembb.com`.

## App Identity

- App name: `Pikesville MBB`
- Bundle/package ID: `com.pikesvillembb.app`
- Source URL: `https://app.pikesvillembb.com`
- Icon/splash source: `resources/icon.png` and `resources/splash.png`

## Local Setup

### Android

1. Install Android Studio.
2. Open Android Studio once and install the recommended Android SDK.
3. Install Java 21 and Android command-line tools if building from the terminal:

```bash
brew install openjdk@21 android-commandlinetools
```

4. Install the Android SDK packages:

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21 ANDROID_HOME=/opt/homebrew/share/android-commandlinetools sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

5. Add `android/local.properties` with your SDK path if Android Studio does not create it:

```properties
sdk.dir=/opt/homebrew/share/android-commandlinetools
```

6. Build a debug APK locally:

```bash
npm run mobile:sync:android
npm run mobile:android:debug
```

The debug APK is created at `android/app/build/outputs/apk/debug/app-debug.apk`.

7. Build the signed release bundle for Google Play:

```bash
npm run mobile:android:bundle
```

The signed release bundle is created at `android/app/build/outputs/bundle/release/app-release.aab`.

Signing files live locally and are intentionally ignored by git:

- `android/keystore.properties`
- `android/keystores/pikesville-upload-key.jks`

Back up both files somewhere secure. They are the Google Play upload key material for future app updates.

Run that command from `android/`.

### iOS

Local iOS builds require full Xcode. If this Mac cannot install Xcode, use the
Codemagic workflow in `codemagic.yaml`.

Known Apple signing values:

- Bundle ID: `com.pikesvillembb.app`
- Apple Developer Team ID: `WFGQ3RHL22`
- App Store Connect API Issuer ID: `d0da13eb-2521-4014-a9cc-39192c07a97e`
- App Store Connect API Key ID: `2369FD39S5`

#### Codemagic Cloud Build

1. Create or open a Codemagic account.
2. Add this project/repository as an app.
3. In **Teams > Integrations > App Store Connect**, add an API key integration named:

```text
pikesville-mbb-app-store-connect
```

4. Upload/select the saved `.p8` key and enter:

```text
Issuer ID: d0da13eb-2521-4014-a9cc-39192c07a97e
Key ID: 2369FD39S5
Team ID: WFGQ3RHL22
```

5. In App Store Connect, create the app record if it does not exist yet:

```text
Name: Pikesville MBB
Bundle ID: com.pikesvillembb.app
SKU: pikesville-mbb
Platform: iOS
```

6. Run the `Pikesville MBB iOS Release` workflow in Codemagic.
7. Download the generated `.ipa` artifact, or enable TestFlight publishing once
   the App Store Connect app record is ready.

#### Local Xcode Build

1. Install full Xcode from the Mac App Store.
2. Select it as the active developer directory:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

3. Open the workspace:

```bash
npm run mobile:open:ios
```

Use `ios/App/App.xcworkspace`, not the `.xcodeproj`, when opening manually.

## Common Commands

```bash
npm run mobile:assets
npm run mobile:sync
npm run mobile:sync:android
npm run mobile:android:debug
npm run mobile:android:bundle
npm run mobile:open:android
npm run mobile:open:ios
```

Run `mobile:assets` after changing `resources/icon.png` or `resources/splash.png`.
Run `mobile:sync` after changing Capacitor config or native plugins.

## Store Prep

- Create App Store Connect app using bundle ID `com.pikesvillembb.app`.
- Create Google Play app using package ID `com.pikesvillembb.app`.
- Prepare screenshots for phone and tablet.
- Add privacy policy URL and support URL.
- Confirm invite, login, password reset, RSVP, proof upload, alerts, and live scorer workflows inside the native shell before review.
