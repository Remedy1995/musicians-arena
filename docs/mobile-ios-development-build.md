# iOS Development Build and Xcode Runbook

This guide runs the Musician's Arena React Native app as an iOS development build while using the live backend:

- REST API: `https://api.musicianz.site/api/v1`
- WebSocket API: `wss://api.musicianz.site`

The development build loads JavaScript from Metro on your Mac. A standalone Release build embeds the JavaScript bundle and does not need Metro.

## 1. Prerequisites

Install or confirm the following on the Mac:

```bash
xcode-select --install
node --version
npm --version
pod --version
```

Open Xcode once and accept its license if prompted. A physical iPhone must be trusted by the Mac and selected under **Window > Devices and Simulators**. A simulator does not need an Apple Developer membership. A physical iPhone needs a development team selected in Xcode under **Signing & Capabilities**.

## 2. Use a Safe Project Path

The current folder name contains an apostrophe (`Musician's arena`). Expo's iOS autolinking command can fail when that apostrophe is present in the absolute path. Use a copy with a simple path for iOS builds:

```bash
mkdir -p "$HOME/Projects"
rsync -a --exclude node_modules --exclude ios \
  "/Users/japhetadjetey/Documents/Musician's arena/mobile/app/" \
  "$HOME/Projects/musicians-arena-mobile/"
cd "$HOME/Projects/musicians-arena-mobile"
npm ci
```

Repeat the `rsync` command whenever source code changes and you are building from the safe copy. Alternatively, rename or clone the repository into a path without an apostrophe.

## 3. Generate the iOS Development Project

Run these commands from the safe copy:

```bash
cd "$HOME/Projects/musicians-arena-mobile"
export APP_VARIANT=development
export ALLOW_INSECURE_HTTP=false
export EXPO_PUBLIC_API_BASE_URL=https://api.musicianz.site/api/v1
export EXPO_PUBLIC_WS_BASE_URL=wss://api.musicianz.site

npx expo prebuild --platform ios
cd ios
pod install
cd ..
open ios/MusiciansArena.xcworkspace
```

Use the `.xcworkspace` file, not the `.xcodeproj` file, because CocoaPods dependencies are integrated into the workspace.

## 4. Configure Xcode Signing

1. In Xcode, select the `MusiciansArena` project in the navigator.
2. Select the `MusiciansArena` app target.
3. Open **Signing & Capabilities**.
4. Enable **Automatically manage signing**.
5. Select your Apple team.
6. Confirm the bundle identifier is `com.remedy1995.musiciansarena`.
7. Select the iPhone or simulator in the device selector.
8. Press `Cmd + R`.

The keychain prompt asking for the `login` keychain password expects the Mac user login password, not the Apple ID password. If it rejects the correct password, open **Keychain Access**, select the `login` keychain, choose **File > Unlock Keychain**, and then retry the build. Do not repeatedly guess passwords because macOS can lock the keychain temporarily.

## 5. Start Metro for a Debug Development Build

Keep Metro running in a separate terminal:

```bash
cd "$HOME/Projects/musicians-arena-mobile"
export APP_VARIANT=development
export ALLOW_INSECURE_HTTP=false
export EXPO_PUBLIC_API_BASE_URL=https://api.musicianz.site/api/v1
export EXPO_PUBLIC_WS_BASE_URL=wss://api.musicianz.site
npx expo start --dev-client --host lan --port 8081
```

For a physical iPhone:

- Keep the Mac and iPhone on the same Wi-Fi network.
- On the iPhone, allow **Settings > Privacy & Security > Local Network > Musician's Arena**.
- Do not start Metro with `--host localhost`; the iPhone cannot reach the Mac's loopback address.
- Allow Node or Terminal through the macOS firewall if macOS asks.
- Disable VPNs or Wi-Fi client isolation during testing.

In Xcode, select the iPhone and press `Cmd + R`. The Debug app should connect to Metro automatically. You can also open the development build and scan the Metro QR code when prompted.

## 6. Fix “No Script URL Provided”

This error means the Debug app cannot reach Metro. It is unrelated to the empty dSYM warning.

Find the Mac's LAN address:

```bash
ipconfig getifaddr en0
```

Check Metro from the Mac:

```bash
curl "http://$(ipconfig getifaddr en0):8081/status"
```

The response should contain `packager-status:running`. If the iPhone still cannot connect, restart Metro with tunnel mode:

```bash
npx expo start --dev-client --host tunnel --port 8081
```

If the development app keeps an old Metro URL, stop it, rebuild from Xcode, and relaunch after Metro is already running.

## 7. Standalone iOS Release Build Without Metro

Use this path when the app must run on a device without your Mac or Metro:

```bash
cd "$HOME/Projects/musicians-arena-mobile"
export APP_VARIANT=preview
export ALLOW_INSECURE_HTTP=false
export EXPO_PUBLIC_API_BASE_URL=https://api.musicianz.site/api/v1
export EXPO_PUBLIC_WS_BASE_URL=wss://api.musicianz.site

npx expo prebuild --platform ios
cd ios
pod install
cd ..
npx expo run:ios --device --configuration Release
```

To do the same in Xcode:

1. Open `ios/MusiciansArena.xcworkspace`.
2. Select **Product > Scheme > Edit Scheme**.
3. Select **Run** and set **Build Configuration** to `Release`.
4. Select the iPhone.
5. Press `Cmd + R`.

This build embeds the JavaScript bundle, so Metro is not required. The device still needs internet access to reach the live API and WebSocket endpoints.

## 8. After Code Changes

From the source checkout, sync the safe build copy and rebuild when native files or dependencies change:

```bash
rsync -a --exclude node_modules --exclude ios \
  "/Users/japhetadjetey/Documents/Musician's arena/mobile/app/" \
  "$HOME/Projects/musicians-arena-mobile/"
cd "$HOME/Projects/musicians-arena-mobile"
npm ci
npx expo prebuild --platform ios
cd ios && pod install && cd ..
```

For JavaScript-only changes, restart Metro with cache cleared:

```bash
npx expo start --dev-client --host lan --port 8081 --clear
```

## 9. Important Distribution Note

A local Debug or Release build installed from Xcode is for devices signed by your Apple development team. To distribute the app to other testers, use an EAS internal build, TestFlight, or Ad Hoc distribution. Push Notifications capability and wider device distribution require the appropriate paid Apple Developer Program membership and provisioning profile.
