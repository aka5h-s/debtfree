# DebtFree - Debt & Lending Tracker

## Overview
Premium debt and lending tracker mobile app built with Expo React Native. Features a dark CRED-inspired design aesthetic with 3D NeoPop-style buttons and shimmer effects.

## Architecture
- **Frontend**: Expo React Native with file-based routing (expo-router)
- **Backend**: Express.js on port 5000 (serves API + static landing page)
- **Data Storage**: AsyncStorage for local persistence
- **Cloud Sync**: Firebase Firestore (optional, user-configured)
- **State**: React Context (DataContext) for app-wide state
- **Styling**: Dark theme (#0D0D0D background, #FFEB34 primary accent)

## Key Features
- Person management (add, edit, delete)
- Transaction tracking with edit history audit trails
- Credit card wallet with visual card displays and copy-to-clipboard
- Firebase cloud sync (upload/download) via Cloud tab
- 3D NeoPop-style custom components (NeoPopButton, NeoPopTiltedButton, NeoPopCard, ShimmerText)

## Project Structure
```
app/
  (tabs)/
    _layout.tsx      # Tab layout (Dashboard, Cards, Cloud)
    index.tsx        # Dashboard screen
    cards.tsx        # Credit card wallet
    cloud.tsx        # Firebase cloud sync settings
  person/[id].tsx    # Person detail with transactions
  add-person.tsx     # Add new person form
  edit-person.tsx    # Edit person form
  add-transaction.tsx
  edit-transaction.tsx
  add-card.tsx
  edit-card.tsx
  transaction-history.tsx
components/
  NeoPopButton.tsx
  NeoPopTiltedButton.tsx
  NeoPopCard.tsx
  ShimmerText.tsx
  CreditCardVisual.tsx
  ErrorBoundary.tsx
contexts/
  DataContext.tsx     # App-wide state management
lib/
  storage.ts         # AsyncStorage persistence layer
  types.ts           # TypeScript interfaces
  firebase.ts        # Firebase Firestore sync
  firebase-config-storage.ts  # Firebase config persistence
  formatters.ts      # Currency & date formatting
  query-client.ts    # React Query setup
constants/
  colors.ts          # Theme colors
```

## Recent Changes
- 2026-02-23: Replaced font-based icons with SVG icons (react-native-svg) for Android compatibility
- 2026-02-23: Added platform-aware font system (lib/fonts.ts) - custom fonts on web/iOS, system fonts on Android
- 2026-02-19: Added edit person screen with edit button on person detail
- 2026-02-19: Added Firebase cloud sync tab with config, upload, download
- 2026-02-19: Fixed Metro config for Firebase ESM module resolution
- 2026-02-19: Fixed button diagonal appearance (removed skewY transforms)

## User Preferences
- Buttons must be straight, not diagonal (no skewY transforms)
- Dark premium CRED-inspired aesthetic
- NeoPop 3D design language

## Notes
- Metro config uses `unstable_enablePackageExports` for Firebase compatibility
- Firebase is configured in-app by user (not hardcoded) via Cloud tab
- All data persisted locally via AsyncStorage with optional cloud backup
- Icons use SVG (react-native-svg) instead of @expo/vector-icons due to Android font loading issues in Expo Go
- Fonts: Custom Gilroy (Bold, Black) + Cirka (Bold, Regular) loaded via useFonts with require() in _layout.tsx — works on Android/iOS/Web
- Font mapping in lib/fonts.ts: regular/medium/semibold/bold → Gilroy-Bold, extraBold → Gilroy-Black, serif → Cirka-Bold, serifRegular → Cirka-Regular
- Icon component (components/Icon.tsx) renders all icons as SVG paths — add new icons by adding cases to the switch statement
