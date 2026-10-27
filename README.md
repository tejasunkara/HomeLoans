# HomeLoans

A borrower-facing mobile app for following a home loan from application to closing. Borrowers can track their loan's progress, review and acknowledge disclosures, scan and upload paperwork, and run mortgage calculators.

Built with **React 19**, **TypeScript**, and **Expo (React Native)**.

## Features

### My Loan
- Loan summary: amount, rate, estimated principal and interest, and loan officer
- Progress timeline: Application → Processing → Underwriting → Conditional Approval → Clear to Close → Closed
- A list of outstanding conditions that links straight to scanning
- Disclosures (Loan Estimate, Intent to Proceed, …) with due dates. The borrower reviews and acknowledges each one in the app.

### Document center
- Three folders: **My Uploads**, **Sent to Me**, and **Not Sent** (saved drafts)
- Drafts can be sent to the loan team or deleted. Documents can be shared with a co-borrower, agent, or title/escrow.
- Status badges (Submitted, In review, Accepted, Needs attention) show both an icon and text, never color alone
- **Recent files:** the last 10 documents opened or uploaded, with no duplicates, saved on the device

### Scan & upload
- Three steps: **Scan → Details → Review**
- Pages come from the camera, the photo library, or files (PDF or image), up to 20 pages per document
- The last step offers **Send to loan team** or **Save as draft** (the draft goes to Not Sent)

### Calculators
- **Payment:** principal and interest, taxes, insurance, PMI, and HOA, plus a yearly breakdown of principal, interest, and balance
- **Affordability:** maximum home price at a 36% debt-to-income ratio
- **Refinance:** monthly savings, break-even point, and the change in total cost over the life of the loan

## How state is managed (React 19)

The app uses React 19 Actions in place of separate `isLoading` and `error` variables.

| Need | Primitive | Where |
| --- | --- | --- |
| Multi-step upload | One `useActionState` action handles every step | [`uploadAction.ts`](src/features/upload/uploadAction.ts) |
| Instant folder moves and shares, undone automatically on failure | `useOptimistic`, using the same reducer as the saved state | [`DocumentsProvider.tsx`](src/features/documents/DocumentsProvider.tsx) |
| Send, share, delete, acknowledge | `useActionState` started inside `startTransition` | [`components.tsx`](src/features/documents/components.tsx), [`document/[id].tsx`](src/app/document/[id].tsx) |
| Showing which upload step is in progress | `useOptimistic`, which clears itself when the action finishes | [`UploadWizard.tsx`](src/features/upload/UploadWizard.tsx) |
| Initial data and context | `use()` with `<Suspense>` | [`LoanProvider.tsx`](src/features/loan/LoanProvider.tsx) |
| Keeping input responsive while the breakdown table recalculates | `useDeferredValue` | [`Calculators.tsx`](src/features/calculators/Calculators.tsx) |

The upload action takes its dependencies as arguments, so the whole flow is unit-tested without rendering:

```ts
const action = createUploadAction({ pickPages, upload: api.uploadDocument, onUploaded: addDocument });
const [state, dispatch, isPending] = useActionState(action, initialUploadState);
```

## Tech stack

- Expo SDK 58, React Native 0.88, React 19.3
- Expo Router (routes defined by files, with typed routes)
- TypeScript 6 (`strict`, `noUncheckedIndexedAccess`)
- `expo-image-picker`, `expo-document-picker`, AsyncStorage
- Jest 30, `jest-expo`, React Native Testing Library 14

## Getting started

Requires Node 20+ and either the Expo Go app or an iOS/Android simulator.

```bash
npm install
npm start          # then press i (iOS), a (Android), or w (web)
```

The camera and file pickers are native modules. If Expo Go doesn't include them for your SDK, make a development build with `npx expo run:ios` or `npx expo run:android`.

### Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run ios` / `android` / `web` | Start the server and open that platform |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run the Jest test suite |
| `npm run lint` | `expo lint` |

## Project structure

```
src/
  app/              Screens and navigation (Expo Router); kept thin
  features/
    documents/      Documents provider, reducer, folder and recent-files components
    upload/         Scan & upload: the step action, pickers, and the wizard UI
    loan/           Loan provider, dashboard, disclosures
    calculators/    Calculator screens
  lib/              Plain functions with no React imports: mortgage math, formatting
  services/api.ts   Mock backend
  types/            Shared data types
  ui/               Theme tokens and shared UI components
```

## Mock backend

There's no server yet. [`src/services/api.ts`](src/services/api.ts) keeps sample data in memory and adds a delay so loading states actually appear. To make it instant or make requests fail, so you can see error handling and rollback:

```ts
configureMockApi({ latencyMs: 0, failureRate: 0.5 });
```

To connect a real server, rewrite the function bodies in `api.ts` and keep the same function signatures. Nothing else in the app needs to change.

## Testing

```bash
npm test
```

- **Mortgage math:** checked against published reference values, including edge cases (0% rate, LTV over 80%, refinances that never break even)
- **Upload wizard action:** every step, picker cancellation, the page limit, validation, and failed uploads that can be retried
- **Documents reducer and recent files:** de-duplication and the 10-file cap
- **Folder browser (component test):** sending a draft moves it right away, and a failed send puts it back and shows an error

## Roadmap

- Connect a real backend and authentication
- Combine multi-page scans into a single PDF on the device
- Push notifications for status changes and new disclosures
- End-to-end tests with Maestro

## Working with Claude Code

[`CLAUDE.md`](CLAUDE.md) records the architecture and state conventions for this repo, and [`AGENTS.md`](AGENTS.md) holds Expo's rules for this SDK version.
