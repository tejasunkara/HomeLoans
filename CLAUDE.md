# HomeLoans

Borrower-facing mobile app for a home loan: track loan submissions, manage documents (document center), review disclosures, scan-and-upload paperwork, and run mortgage calculators.

Also read [AGENTS.md](AGENTS.md) — Expo's own rules for this SDK (always `npx expo install`, never hand-edit `ios/`/`android/`, check versioned docs before using an Expo API).

## Stack

- **Expo SDK 58** (React Native 0.88) with **Expo Router** — file-based routes in `src/app/`, typed routes on
- **React 19.3** — use the new primitives, not legacy patterns (see "State conventions")
- **TypeScript 6**, `strict` + `noUncheckedIndexedAccess`. No `any`; use discriminated unions for status/step fields.
- Native modules: `expo-image-picker` (camera scan + photos), `expo-document-picker` (files), `@react-native-async-storage/async-storage` (recent-files history)
- Tests: `jest` 30 + `jest-expo` + `@testing-library/react-native` 14

## Commands

```bash
npm start            # Expo dev server (i = iOS sim, a = Android, w = web)
npm run typecheck    # tsc --noEmit
npm test             # jest
npm run lint         # expo lint (eslint-config-expo)
npx expo export --platform ios --output-dir <tmp>   # full Metro bundle check
```

Run `npm run typecheck && npm test && npm run lint` before calling work done.

## Layout

```
src/
  app/                          Expo Router routes — thin; compose feature components
    _layout.tsx                 Root Stack, <Suspense> + ErrorBoundary, Loan/Documents providers
    (tabs)/_layout.tsx          Bottom tabs (badges: pending disclosures, Not Sent count)
    (tabs)/index.tsx            My Loan — summary, conditions, disclosures, milestone timeline
    (tabs)/documents.tsx        Document center — recent files + folder browser
    (tabs)/scan.tsx             Scan & upload wizard
    (tabs)/calculators.tsx      Payment / affordability / refinance
    document/[id].tsx           Document detail — send/delete draft, share
    disclosures/[id].tsx        Disclosure review + acknowledge
  features/
    documents/                  DocumentsProvider, reducer (pure), folder/row/recent components
    upload/                     uploadAction.ts (pure wizard action), pickers.ts, UploadWizard.tsx
    loan/                       LoanProvider, dashboard components
    calculators/                Calculator screens
  lib/                          Pure TS, no React/RN imports: mortgage math, formatting, errors
  services/api.ts               Mock backend + `resources` (cached promises for use())
  types/                        Shared domain types
  ui/                           theme.ts tokens + components.tsx primitives (Screen, Card, Button, …)
```

Rules:
- Logic lives in `src/features/*` and `src/lib/*`, never in route files. Route files must default-export.
- `src/lib/*` stays pure so it's trivially unit-testable.
- All network goes through `src/services/api.ts`. Its signatures are the contract; swapping the mock for a real backend must not touch UI code.
- Import via `@/` (`@/features/...`). The alias is set in both `tsconfig.json` and the Jest `moduleNameMapper`.

## Domain

- **Folders** (`FolderId`): `my-uploads` (borrower sent), `sent-to-me` (lender sent), `not-sent` (drafts saved from the scan flow).
- **Document status**: `draft | uploading | submitted | under-review | accepted | rejected`. `uploading` exists only as an optimistic state.
- **Recent files**: last 10 opened/uploaded, de-duplicated by id, persisted to AsyncStorage (`pushRecent` in `documents/reducer.ts`).
- **Loan milestones**: Application → Processing → Underwriting → Conditional Approval → Clear to Close → Closed.
- **Disclosures**: borrower opens and acknowledges; acknowledgement is a server action.
- Only `not-sent` drafts can be deleted.

## State conventions (React 19)

Use React 19 Actions instead of hand-rolled `isLoading`/`error` state:

- **`useActionState`** for any async mutation with a result: the upload wizard (a single action handling every step's intent), sending, sharing, deleting, acknowledging. The action returns the next state, errors included.
- **Always dispatch inside a transition**: `onPress={() => startTransition(() => dispatch(x))}`. RN has no `<form action>`, so React warns if you call an async action dispatch directly.
- **`useOptimistic`** in providers: `DocumentsProvider` reuses `documentsReducer` for both committed state and optimistic patches. Mutations (`sendDocument`, `shareDocument`, `deleteDocument`) apply the patch synchronously *before* the first `await`, then commit. If they throw, React reverts automatically.
- **State updates after `await` must be wrapped in `startTransition`** again, because the Action context doesn't survive the await.
- **Own an action's state above anything the optimistic update unmounts.** Sending a draft moves it out of Not Sent, so the row unmounts mid-flight. That's why `FolderBrowser` and the document screen own the send/delete actions, not the row or `DraftActions`. Otherwise the error message is lost on rollback. `FolderBrowser.test.tsx` covers this.
- **`use()`** reads context (`use(DocumentsContext)`) and initial data (`use(resources.documents())`). Promises passed to `use()` must be cached (`resources` in `api.ts`); never create them during render.
- `useOptimistic` also works as a self-clearing "what's pending" marker (see `pendingIntent` in `UploadWizard`).
- `useDeferredValue` on primitives only. Deferring a fresh object re-renders every time.
- Context providers render as `<Ctx value={...}>`, not `<Ctx.Provider>`.
- `useFormStatus` is react-dom only. Pass `isPending` down explicitly.
- No Redux/Zustand.

## Testing

- Put pure logic (reducers, wizard action, mortgage math) behind dependency injection and test it without rendering. `createUploadAction(deps)` is the model to follow.
- RNTL 14: `render`, `fireEvent.*`, and `rerender` are **async** and must be awaited.
- Component tests: call `resetMockApi()` + `resources.invalidate()` in `beforeEach`. Use `configureMockApi({ latencyMs, failureRate })` with fake timers to drive pending and failure states. Mock `@expo/vector-icons/Ionicons` and `expo-router`'s `Link`.
- TS 6 doesn't auto-include `@types/*`. Add new global type packages to `compilerOptions.types`.

## Style

- Functional components, named exports. `StyleSheet.create` at the bottom of the file; colors/spacing/type come from `@/ui/theme`.
- Accessibility: every pressable has `accessibilityRole` + label. Status always has an icon/text, never color alone. Errors use `<Banner tone="error">` (an `alert` live region).
- Format money with `formatCurrency`, never by hand. Parse user numeric input with `parseNumber`.
- Write comments for *why*, not *what*.
