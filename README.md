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
disc photo. Tapping **Done** runs on-device text recognition and opens the
search preparation screen, where recognized words start unselected and
selecting them builds the query. Edit it before submitting to the TryDiscs
lookup API. Select a result to review and edit its brand, name, type, and
flight numbers, then tap **Add to bag**. Other catalog data is retained without
being shown in the form. The app copies the captured photo into its private
document storage and saves its path and disc details locally with AsyncStorage.
The inventory and photos remain available after app restarts, but are not
synced across devices and are removed if the app is uninstalled. The Python
server is used for catalog lookup only; the bag is stored on the device.
Use **Delete** on a bag card to remove that disc and its saved photo after
confirmation.

AsyncStorage and FileSystem include native code, so rebuild and reinstall your
development build after installing these packages. JavaScript-only changes can
be picked up by the development server.

## TryDiscs lookup during local development

The Python API server must be reachable from the device and needs a TryDiscs API
key. The server reads it from `TRYDISCS_API_KEY` (no hyphens). Uvicorn does not
automatically load Expo's `.env.local`, so either export the variable directly
in the server terminal:

```sh
export TRYDISCS_API_KEY="your-issued-trydiscs-key"
python3 -m uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload
```

Or put `TRYDISCS_API_KEY="your-issued-trydiscs-key"` in the ignored
`.env.local` file, then load it into the server terminal before starting
Uvicorn:

```sh
set -a
. ./.env.local
set +a
python3 -m uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload
```

In another terminal, set the API base URL to the Mac's local network address
and start Expo:

```sh
EXPO_PUBLIC_API_BASE_URL="http://192.168.0.18:8000" npm start
```

Replace `192.168.0.18` with the current local network address of the computer
running Uvicorn. `127.0.0.1` is not reachable from a physical phone, and port
`8081` is commonly used by the Expo development server rather than this API.
Keep the TryDiscs key only in the server environment; do not put it in the Expo
app or commit it.

Before publishing to an app store, replace the example iOS bundle identifier
and Android package name in `app.json` with identifiers you own.

## Useful commands

```sh
npm run typecheck
npx expo-doctor
```
