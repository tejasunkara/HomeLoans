# Running HomeLoans on an Android phone

There are three ways to get the app onto a physical Android device. Start with **Option 1** if you just want to see it running.

Unlike iOS, Android doesn't need a paid developer account for any of them, and an installed build doesn't expire.

| Option | Account needed | Needs Android Studio | Runs as its own app | Needs your computer after install |
| --- | --- | --- | --- | --- |
| [1. Expo Go](#option-1-expo-go) | None | No | No (runs inside Expo Go) | Yes (dev server) |
| [2. Build over USB](#option-2-build-and-install-over-usb) | None | Yes (SDK + JDK) | Yes | Debug: yes · Release: no |
| [3. EAS Build APK](#option-3-eas-build-apk) | Free Expo account | No | Yes | No |

## Before you start

```bash
git clone https://github.com/tejasunkara/HomeLoans.git
cd HomeLoans
npm install
```

You need Node 20 or later. This works on macOS, Windows, or Linux.

---

## Option 1: Expo Go

The app's native modules (camera and photo picker, file picker, on-device storage) are all built into Expo Go, so you don't need a custom build.

1. Install **Expo Go** from the Google Play Store.
2. Start the dev server on your computer:
   ```bash
   npm start
   ```
3. Open **Expo Go** and tap **Scan QR code**, then scan the QR code shown in the terminal. Android's own camera app won't open it; use the scanner in Expo Go.

**Troubleshooting**

- **Phone can't reach the server:** the phone and computer must be on the same Wi-Fi. On restrictive networks, such as corporate Wi-Fi or a VPN, use a tunnel:
  ```bash
  npx expo start --tunnel
  ```
- **"Project is incompatible with this version of Expo Go":** Expo Go only supports the newest Expo SDK, and this project uses SDK 58. Update Expo Go, or use Option 2 or 3.

---

## Option 2: Build and install over USB

This installs HomeLoans as a standalone app with its own icon.

**Requirements:**

- [Android Studio](https://developer.android.com/studio), which provides the Android SDK, platform tools (`adb`), and a bundled JDK.
- These environment variables, added to `~/.zshrc` or `~/.bashrc` on macOS/Linux:
  ```bash
  export ANDROID_HOME=$HOME/Library/Android/sdk        # Linux: $HOME/Android/Sdk
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  ```
  On Windows, set `ANDROID_HOME` to `%LOCALAPPDATA%\Android\Sdk` and add its `platform-tools` folder to `PATH`.
- A USB cable.

Steps:

1. **Turn on Developer options** on the phone: **Settings → About phone**, then tap **Build number** 7 times. On some brands it's under **Software information**.
2. **Turn on USB debugging:** **Settings → System → Developer options → USB debugging**.
3. **Connect the phone** and tap **Allow** on the "Allow USB debugging?" prompt. Check that your computer can see it:
   ```bash
   adb devices
   ```
   The phone should be listed with the status `device`. If it says `unauthorized`, accept the prompt on the phone.
4. **Build and install:**
   ```bash
   npx expo run:android --device
   ```
   Choose your phone from the list. This generates the `android/` folder (it's gitignored, so don't edit it by hand), builds the app, and installs it.
5. Open **HomeLoans** from the app drawer.

**Good to know**

- A debug build loads JavaScript from your computer, so keep `npm start` running and stay on the same network, or keep the cable connected. To build a version that runs without the computer:
  ```bash
  npx expo run:android --device --variant release
  ```
  This is signed with the debug keystore, which is fine for your own phone but not for the Play Store.
- **Wireless debugging (Android 11+):** instead of a cable, use **Developer options → Wireless debugging → Pair device with pairing code**, then run `adb pair <ip>:<port>` and `adb connect <ip>:<port>`.
- If the build can't find Java, point `JAVA_HOME` at Android Studio's bundled JDK. On macOS that's `/Applications/Android Studio.app/Contents/jbr/Contents/Home`.

---

## Option 3: EAS Build APK

Expo builds an installable `.apk` in the cloud, so you don't need Android Studio. This is the easiest way to share the app with testers: send them the link.

**Requirements:** a free [Expo account](https://expo.dev/signup).

1. **Log in and configure:**
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest build:configure
   ```
   This creates `eas.json`.

2. **Make the `preview` profile produce an APK.** By default EAS builds an `.aab`, which only the Play Store can install. In `eas.json`:
   ```json
   {
     "build": {
       "preview": {
         "distribution": "internal",
         "android": { "buildType": "apk" }
       }
     }
   }
   ```
   Commit `eas.json`.

3. **Build:**
   ```bash
   npx eas-cli@latest build --platform android --profile preview
   ```
   EAS creates and stores a signing keystore for you; accept the default when asked.

4. **Install:** when the build finishes, open the build link on the phone, or scan its QR code, and download the APK. Allow **Install unknown apps** for your browser when Android asks, then open the file.

**Good to know**

- You don't need to register devices or pay for an account. Anyone with the link can install it.
- Free Expo accounts have a monthly limit on cloud builds. Building locally with `npx eas-cli@latest build --platform android --profile preview --local` doesn't count toward it, but needs the Android SDK and JDK from Option 2.
- **Google Play:** publishing to Play requires a Google Play Developer account (one-time $25). Use the `production` profile, which builds an `.aab`, then run `npx eas-cli@latest submit --platform android`.

---

## Which one should I use?

- **To see the app running today:** Option 1.
- **To develop on your own phone:** Option 2.
- **To share it with testers, or install it without any tools:** Option 3.
