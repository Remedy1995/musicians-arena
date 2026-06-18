# Musician's Arena Mobile App

Premium React Native mobile foundation for the Musician's Arena marketplace.

## Stack

- Expo
- React Native
- TypeScript
- Expo Font
- Expo Linear Gradient

## Structure

- `App.tsx`: app entry point
- `src/AppShell.tsx`: font loading and app bootstrap
- `src/theme/`: mobile theme tokens and semantic roles
- `src/components/`: reusable UI primitives
- `src/screens/`: screen-level compositions
- `src/data/mock.ts`: placeholder data for early UI iteration

## Run

```bash
npm start
```

## Next Build Steps

- add token persistence for authenticated sessions
- connect booking actions, gig interest, and message send flows
- wire WebSocket chat and notifications
- replace lightweight tabs with full navigation when feature depth increases
