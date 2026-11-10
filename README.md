# Disc Golf Manager

An Expo and React Native app for iOS and Android. This project is set up to use
development builds, which are your own installable app with Expo's developer
tools included.

## Requirements

- Node.js 22.13 or newer (required by the Expo SDK used by this project)
- npm
- An Expo account to build with EAS

## Run the app

Install dependencies and start the development server:

```sh
npm install
npm start
```

The first time you run the app, install a development build on your device or
simulator using one of the options below. After that, `npm start` starts the
server; open the installed Disc Golf Manager app to connect to it. Expo Go is
not a substitute for this project's development build.

## Create a development build with EAS

Log in and link this app to your Expo account. The configure command creates an
EAS project ID in the app configuration:

```sh
npx eas-cli@latest login
npx eas-cli@latest build:configure
```

Build for an Android device or emulator:

```sh
npx eas-cli@latest build --profile development --platform android
```

Build for the iOS Simulator:

```sh
npx eas-cli@latest build --profile development-simulator --platform ios
```

Install the build by following the link or instructions EAS provides, then run
`npm start` and open the development build. Android and iOS device builds use
the `development` profile. The iOS Simulator has its own profile because it
needs a simulator-specific build.

The app's **+ add disc** button opens the camera so you can take and preview a
disc photo. Tapping **Done** runs on-device text recognition and shows the
recognized text on the home screen. Camera and OCR use native code, so rebuild
and reinstall your development build after installing this update.

Before publishing to an app store, replace the example iOS bundle identifier
and Android package name in `app.json` with identifiers you own.

## Useful commands

```sh
npm run typecheck
npx expo-doctor
```
