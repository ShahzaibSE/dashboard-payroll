# PayrollOps

PayrollOps is a **frontend-only** payroll operations dashboard pilot. It models the work of a payroll operations team across APAC and EMEA: reviewing payroll runs, inspecting exceptions, and approving or rejecting runs.

Everything in it is **synthetic and simulated**. All data is deterministic fixture data, every action only changes in-memory state, and a page reload or **Reset demo data** restores the original data. It is a portfolio and engineering pilot, not a payroll product.

## Key features

| Module | What it does |
|---|---|
| **Overview** | Key figures, runs awaiting approval, items needing attention, a country chart, and recent activity, all derived from the shared state. |
| **Payroll runs** | Searchable, filterable (status, region, country) and sortable list of 24 October 2026 runs. |
| **Payroll details** | One run's facts, exceptions and activity timeline, plus the simulated workflow actions. |
| **Exceptions** | Filterable and sortable exceptions across all runs. Take ownership or resolve an exception in place. |
| **Approvals** | The queue of runs awaiting approval with their blockers, and recent decisions. It has no decision controls; decisions are made on the run page. |
| **Audit activity** | Every event, newest first, filterable by event type, run and actor. Actions taken in the app appear here. |
| **Employees** | A paginated sample directory of fictional employees, tied to an organisation and a country only. It does not say which run a person is paid in. |

List state (search, filters, sort, page) lives in the URL, so views can be shared, reloaded and navigated with Back and Forward.

## Technology stack

- React 19, TypeScript (strict) and Vite
- React Router (data router)
- Tailwind CSS 4, with hand-written UI primitives in the shadcn style (class-variance-authority, lucide-react icons)
- Recharts for the Overview chart
- Zod, imported only as `zod/mini`, to validate URL parameters and the reject-reason input
- Vitest, React Testing Library, user-event, jsdom and vitest-axe for tests
- oxlint for linting; npm as the package manager

## Architecture

- **Client-only single-page app.** There is no backend, database, mock server, API client or artificial latency. Data is synchronous, so there are no loading or error states.
- **Feature-oriented `src/`.** Each module in `src/features/` owns its components, pure view logic and tests.
- **Deterministic fixtures** (`src/fixtures/`): typed, seeded data with a fixed "today" (`REFERENCE_DATE`, 2026-10-12). Nothing reads the clock or a random source.
- **One pure reducer and one Provider** (`src/state/payroll/`). State is `{ runs, exceptions, events }`, and the reducer is `(state, action) => state` with no React imports. State and dispatch are separate React Contexts. Redux, Zustand and `useSyncExternalStore` are deliberately not used.
- **Derived views.** Every page builds its view from the shared state with a pure function (`buildOverview`, `buildRunList`, `buildRunDetail`, `buildExceptionList`, `buildApprovals`, `buildAuditList`, `buildEmployeeList`), so all pages agree after any action.
- **Shared workflow rules.** The rules are pure guards in `transitions.ts`, used by both the UI and the reducer, so the UI never offers an action the reducer would refuse.
- **URL-driven pages.** The four list pages use the `useUrlDraft` hook (`src/lib/useUrlDraft.ts`). It keeps a draft of the whole filter state and composes each change onto it before writing the URL, because router navigations land after the next user action and building the next URL from the current one would drop keystrokes and filters. The draft re-syncs from the URL on any navigation the page did not write itself.

## Simulated payroll workflow

There is one fixed simulated actor and no role switching, so the UI is not authorization.

| Action | From | To | Rule |
|---|---|---|---|
| Submit for approval | In review | Awaiting approval | none |
| Approve | Awaiting approval | Approved | Blocked while the run has an unresolved critical exception |
| Reject | Awaiting approval | In review | Needs a reason of 10 to 300 characters |
| Take ownership | Exception open | In progress | Not on a paid run |
| Resolve | Exception open or in progress | Resolved | Not on a paid run |

- Approve and Reject use an inline confirmation, not a modal.
- A refused action returns the same state and writes nothing. A successful one appends exactly one audit event.
- Event ids and timestamps are derived from the existing events (highest id plus one, newest time plus one minute), never from the clock.
- Nothing is paid, held or revoked, and no payment is made.
- **Reset demo data** in the header restores the original fixtures.

## Getting started

Requirements: Node.js and npm. The project was developed on Node 24; a minimum version is not declared in `package.json`.

```bash
npm install --ignore-scripts
npm run dev
```

Vite prints the local address. `npm ci --ignore-scripts` installs exactly from the lockfile.

## Development commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check, then build for production |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | oxlint |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm test -- <path>` | Run one test file |

## Testing and quality

- The suite has 419 tests across 33 files (Vitest, React Testing Library, jsdom).
- Pure logic is unit-tested: the transition engine across every run status, the reducer invariants, list and view builders, URL parameter parsing, and the fixtures.
- Components are tested by role and accessible name, with user-event.
- Cross-module journeys (`src/app/journeys.test.tsx`) run over the real route tree: for example, approving a run and checking every module agrees, or resolving a blocker and then approving.
- URL race tests (`filterRace.test.tsx`, `urlSync.test.tsx`) delay `router.navigate`, because jsdom otherwise hides the races that happen in a real router.
- Typecheck, lint and build are clean at the M9 checkpoint. Real-browser checks (Playwright) were run by hand during development and are not part of the repository.
- **Cypress is not installed.** The journeys are React Testing Library tests, not browser end-to-end tests.

## Accessibility

- An automated axe sweep covers every route in populated, filtered, empty and not-found states.
- Semantic landmarks, one `h1` per page, labelled controls, sortable table headers with `aria-sort`, and a skip link.
- After a workflow action, focus moves to a persistent status message, because the clicked button usually disappears. Empty-state reset buttons move focus to the first filter.
- A blocked Approve button stays focusable and describes why it is blocked.
- Result counts are announced politely after the count stops changing, so typing does not produce an announcement per keystroke.
- Status is never conveyed by colour alone.
- The layout was checked in a real browser at 1280, 768 and 360 px.
- **No manual screen-reader testing has been done.** Automated checks do not replace it.

## Project structure

```text
src/
  app/          router, shell, navigation, route-level tests (journeys, accessibility)
  components/   shared components (page header, badges, outcome message, result count) and ui/ primitives
  features/     overview, payroll-runs, run-details, exceptions, approvals, audit, employees
  fixtures/     typed synthetic data, no UI imports
  lib/          formatting, status presentation, useUrlDraft, shared placement helper
  state/payroll/  reducer, transition rules, provider, contexts
  styles/       design tokens
  test/         test setup and render helpers
docs/engineering/  project context, standards, design system
STATE.md           current resumable project state
MEMORY.md          durable project lessons
```

See [`docs/engineering/PROJECT.md`](docs/engineering/PROJECT.md) for architecture and decisions, and [`docs/engineering/design-system.md`](docs/engineering/design-system.md) for the design tokens and contrast checks.

## Engineering decisions

- Pure reducer and guards over a state library: the workflow is small, and pure functions are easy to test exhaustively.
- `zod/mini` instead of full Zod, which keeps the bundle roughly 18 kB gzipped smaller.
- Hand-written semantic tables with pure sort and filter functions; TanStack Table is not installed.
- UI primitives are hand-written in the shadcn style rather than generated by the shadcn CLI.
- Inline confirmations instead of modals, so no focus trap is needed.
- oxlint is used instead of ESLint with typescript-eslint, as shipped with the current Vite template.
- Bundle size at the M9 checkpoint: about 229 kB gzipped JavaScript and 5.6 kB gzipped CSS. Recharts is bundled eagerly and is not lazy-loaded.

## Limitations and demo boundaries

- No backend, no authentication, no persistence, and no network calls.
- No real payroll execution and no real payments. Nothing is paid, held or revoked.
- No sensitive employee data: all names, organisations and figures are fictional.
- State resets on reload; the only browser storage used is the router's scroll positions.
- Light theme only.
- The sample employee directory does not link employees to runs.
- "Clear filters" also resets the sort.
- An outside navigation followed by the late landing of the page's own earlier URL write could leave the URL on the older write while the page shows the correct filters; this was not reproduced in a real browser.
- No manual screen-reader pass, and no browser end-to-end suite.
- This is a pilot. It has not been deployed and makes no production-readiness or security claims.
