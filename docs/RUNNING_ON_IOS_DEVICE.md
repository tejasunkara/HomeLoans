# Running HomeLoans on an iPhone

There are three ways to get the app onto a physical iPhone. Start with **Option 1** if you just want to see it running.

| Option | Apple account | Needs Xcode | Runs as its own app | Lasts |
| --- | --- | --- | --- | --- |
| [1. Expo Go](#option-1-expo-go) | None | No | No (runs inside Expo Go) | While your Mac's dev server is running |
| [2. Xcode build over USB](#option-2-install-a-build-from-xcode-free-apple-id) | Free Apple ID | Yes | Yes | 7 days |
| [3. EAS Build / TestFlight](#option-3-eas-build--testflight-paid-developer-account) | Apple Developer Program ($99/yr) | No | Yes | Up to 1 year (ad hoc) / 90 days per TestFlight build |

## Before you start

```bash
git clone https://github.com/tejasunkara/HomeLoans.git
cd HomeLoans
npm install
```

You need Node 20 or later. Options 1 and 2 also need a Mac.

---

## Option 1: Expo Go

The app's native modules (camera and photo picker, file picker, on-device storage) are all built into Expo Go, so you don't need a custom build.

1. Install **Expo Go** from the App Store on your iPhone.
2. Start the dev server on your Mac:
   ```bash
   npm start
   ```
3. Open the iPhone **Camera** app and scan the QR code shown in the terminal. The app opens in Expo Go.

**Troubleshooting**

- **Phone can't reach the server:** the phone and Mac must be on the same Wi-Fi. On restrictive networks, such as corporate Wi-Fi or a VPN, use a tunnel:
  ```bash
  npx expo start --tunnel
  ```
- **"Project is incompatible with this version of Expo Go":** Expo Go only supports the newest Expo SDK, and this project uses SDK 58. Update Expo Go, or use Option 2.

---

## Option 2: Install a build from Xcode (free Apple ID)

This installs HomeLoans as a standalone app with its own icon.

**Requirements:** Xcode (from the Mac App Store), a USB cable, and an Apple ID signed in under Xcode → Settings → Accounts.

1. **Connect the iPhone** to your Mac with the cable. When the phone asks, tap **Trust This Computer**.
2. **Turn on Developer Mode** on the iPhone: **Settings → Privacy & Security → Developer Mode**, then restart when prompted.
   The option only appears after Xcode has detected the phone once. If it's missing, open Xcode with the phone connected, then check again.
3. **Make the bundle ID unique.** Apple requires every app ID to be unique. In `app.json`, change:
   ```json
   "ios": { "bundleIdentifier": "com.homeloans.app" }
   ```
   to something only you would use, for example `com.<your-name>.homeloans`.
4. **Build and install:**
   ```bash
   npx expo run:ios --device
   ```
   Choose your iPhone from the list. This generates the `ios/` folder (it's gitignored, so don't edit it by hand), builds the app, and installs it.
5. **Fix signing if the build fails with a signing error:**
   - Open `ios/HomeLoans.xcworkspace` in Xcode.
   - Select the **HomeLoans** target, then the **Signing & Capabilities** tab.
   - Tick **Automatically manage signing** and choose your Apple ID under **Team**.
   - Run `npx expo run:ios --device` again.
6. **Trust the developer certificate** on the iPhone: **Settings → General → VPN & Device Management**, tap your Apple ID, then **Trust**.
7. Open **HomeLoans** from the home screen.

**Good to know**

- Apps signed with a free Apple ID **stop launching after 7 days**. Run step 4 again to reinstall.
- A debug build loads JavaScript from your Mac, so keep `npm start` running. To build a version that runs without the Mac:
  ```bash
  npx expo run:ios --device --configuration Release
  ```

---

## Option 3: EAS Build / TestFlight (paid developer account)

Expo builds the app in the cloud, so you don't need Xcode or a cable. This is also the way to share the app with other testers.

**Requirements:** an [Expo account](https://expo.dev/signup) (free) and membership in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/yr).

1. **Log in and configure:**
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest build:configure
   ```
   This creates `eas.json` with `development`, `preview`, and `production` profiles. Commit that file.

2. **Choose how to install.**

   **a) Ad hoc build, installed from a link or QR code:**
   ```bash
   npx eas-cli@latest device:create        # register each iPhone (open the link on the phone)
   npx eas-cli@latest build --platform ios --profile preview
   ```
   When the build finishes, open the install link on the registered iPhone. Turn on Developer Mode if asked (see Option 2, step 2).

   **b) TestFlight, with no device registration:**
   ```bash
   npx eas-cli@latest build --platform ios --profile production --auto-submit
   ```
   After Apple finishes processing the build (usually 10–30 minutes), install it with the **TestFlight** app. Add testers in App Store Connect → TestFlight.

3. EAS creates and manages the signing certificates and provisioning profiles for you; accept the defaults when asked.

**Good to know**

- Every device that installs an ad hoc build has to be registered before the build is made. Build again after adding a device.
- Free Expo accounts have a monthly limit on cloud builds. Building locally with `npx eas-cli@latest build --local` doesn't count toward it, but needs Xcode.

---

## Which one should I use?

- **To see the app running today:** Option 1.
- **To keep it on your own phone without paying:** Option 2, reinstalling weekly.
- **To share it with testers, or have it last more than a week:** Option 3.
