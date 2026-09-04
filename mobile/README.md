# Sweet Fusion Mobile

React Native app (Expo SDK 57) for creating and viewing sales orders on a phone.

It talks to the Sweet Fusion web app over HTTP, so the web app must be running
and reachable from the phone. All business logic (costing, stock movements,
order numbering) stays on the server — the app is a client only.

## Prerequisites

- Node.js 20+
- The [Expo Go](https://expo.dev/go) app on your phone, or an Android/iOS emulator
- The web app running with `APP_PASSWORD` set (see the root `.env.example`)

## Setup

```bash
cd mobile
npm install
npm start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

## Signing in

The login screen asks for two things:

| Field | What to enter |
| --- | --- |
| Server address | Where the web app runs, e.g. `https://sweet-fusion.vercel.app` |
| Password | The `APP_PASSWORD` value set on the server |

Both are saved to the device keychain (`expo-secure-store`), so you only enter
them once. Signing out clears the token but remembers the server address.

### Pointing at your computer during development

`localhost` on the phone means the phone itself, so it will not reach your PC.
Use your machine's LAN IP instead:

```bash
# Find your IP (Windows)
ipconfig | findstr IPv4

# Start the web app so it accepts connections from the network
npm run dev
```

Then enter `http://192.168.x.x:3000` as the server address. Phone and computer
must be on the same Wi-Fi network.

The default prefilled value comes from `expo.extra.apiUrl` in `app.json`.

## What the app does

- **Orders list** — search by order number or customer, pull to refresh
- **Order detail** — line items, totals, discount, payment status, cost and profit
- **New order** — pick a customer (or create one), add products with quantity and
  price, apply a discount, record a payment, and save

Stock is decremented and costs are frozen onto the order by the server, exactly
as they are when an order is created from the web app.

## Project layout

```
app/                    expo-router routes (file = screen)
  _layout.tsx           auth gate + navigation stack
  login.tsx             server address + password
  index.tsx             orders list (home)
  orders/[id].tsx       order detail
  orders/new.tsx        create order
src/
  api/client.ts         typed fetch wrapper, bearer token, error mapping
  api/types.ts          DTOs mirroring the server's src/lib/api/dto.ts
  auth/auth-context.tsx session state, token persistence
  components/           shared UI (buttons, fields, pickers, modals)
  theme.ts              colors matching the web app's Tailwind palette
  format.ts             currency, date, unit formatting
```

## Building a standalone app

Expo Go is enough for daily use on your own phone. To install it as a real app
without Expo Go, use [EAS Build](https://docs.expo.dev/build/setup/):

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview   # produces an installable APK
```

`app.json` already sets the bundle identifier and package name to
`com.sweetfusion.app`.

## Commands

| Command | Description |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run android` | Open on a connected Android device or emulator |
| `npm run ios` | Open on an iOS simulator (macOS only) |
| `npm run typecheck` | TypeScript check |
