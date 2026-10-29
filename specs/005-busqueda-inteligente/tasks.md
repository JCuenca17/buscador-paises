# Tasks: Búsqueda inteligente

**Input**: Design documents in `specs/005-busqueda-inteligente/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ui.md`, `quickstart.md`

**Organization**: Tasks are grouped by user story and ordered so tests precede implementation. Every change is covered by example-based tests, and normalization/matching invariants also have fast-check properties.

## Phase 1: Setup

**Purpose**: Confirm project setup. The SPA, Vite, TypeScript, Vitest, jsdom and fast-check are already configured; no dependency or scaffolding task is needed.

## Phase 2: Foundational Gate

**Purpose**: Obtain the required owner approval before modifying the ficha base.

- [ ] T001 Obtain Jose's explicit approval for the query-resolver extension in `src/features/ficha/ficha.component.ts` and read-only shared-capitals accessor in `src/features/ficha/ficha.service.ts`; record approval before starting T006, T010, or T022-T023.

**Checkpoint**: Feature-local service and suggestion work may proceed independently; do not begin ficha-base integration until T001 is complete.

## Phase 3: User Story 1 - Encontrar países con distintas escrituras (Priority: P1)

**Goal**: Resolve English and Spanish country names independent of case, whitespace, and diacritics; submitting by button or Enter yields the expected country.

**Independent Test**: With simulated CountriesNow records, prove `Perú`/`Peru`, `ESPAÑA`/`españa`, and English canonical names resolve to the expected API name; unknown names remain unknown and network failures remain typed errors.

### Tests for User Story 1 (write first)

- [ ] T002 [P] [US1] Add Vitest examples for normalized lookup keys, `Intl.DisplayNames` names from `iso2`, alias lookup, canonical-name priority, unknown aliases, and ambiguous aliases in `src/features/busqueda-inteligente/busqueda.service.test.ts`.
- [ ] T003 [P] [US1] Add fast-check properties for key-normalization idempotence, invariance to case and whitespace, and equivalence between composed and decomposed accented text in `src/features/busqueda-inteligente/busqueda.normalizar.prop.test.ts`.
- [ ] T004 [P] [US1] Add fast-check properties proving generated case/diacritic variants of a Spanish or canonical country name resolve to the same API country in `src/features/busqueda-inteligente/busqueda.matching.prop.test.ts`.
- [ ] T005 [US1] Add mocked-loader tests for filtering invalid `name`/`iso2`, clearing failed derived-catalog promises for retry, and preserving `sin-conexion`, `tiempo-agotado`, and `respuesta-invalida` in `src/features/busqueda-inteligente/busqueda.service.test.ts`.
- [ ] T006 [US1] After T001 approval, add a test proving `buscarFicha` and the exported capital-list accessor share one cached promise and one `/countries/capital` request in `src/features/ficha/ficha.service.test.ts`.

### Implementation for User Story 1

- [ ] T007 [US1] Implement a local lookup-key helper in `src/features/busqueda-inteligente/busqueda.service.ts` that first calls `normalizarNombre` from `src/features/ficha/normalizar.ts`, then uses Unicode NFD and removes `\p{M}` marks; leave `src/features/ficha/normalizar.ts` unchanged.
- [ ] T008 [US1] Implement catalog construction in `src/features/busqueda-inteligente/busqueda.service.ts`, deriving each Spanish label with `Intl.DisplayNames` locale `es`, type `region`, and the API `iso2`; retain distinct records when `iso2` repeats.
- [ ] T009 [US1] Implement alias resolution in `src/features/busqueda-inteligente/busqueda.service.ts` so canonical English exact matches take priority, unique Spanish exact aliases return the canonical API name, duplicate Spanish aliases produce and resolve `nombreEspanol — nombreApi (iso2)`, and ambiguous bare aliases are never selected arbitrarily.
- [ ] T010 [US1] After T001 approval, export `obtenerCapitalesCompartidas(): Promise<readonly unknown[]>` from `src/features/ficha/ficha.service.ts`, returning the existing cached capital-list promise without mutating its data or issuing another request.
- [ ] T011 [US1] Implement the derived catalog loader in `src/features/busqueda-inteligente/busqueda.service.ts` using `obtenerCapitalesCompartidas` from `src/features/ficha/ficha.service.ts`; cache the derived catalog promise, clear it after failure, and never call `fetch` or `obtenerJson` independently.
- [ ] T012 [US1] Run and refine `src/features/busqueda-inteligente/busqueda.service.test.ts`, `src/features/busqueda-inteligente/busqueda.normalizar.prop.test.ts`, `src/features/busqueda-inteligente/busqueda.matching.prop.test.ts`, and `src/features/ficha/ficha.service.test.ts` until unit and property tests pass without live network requests.

**Checkpoint**: Story 1 passes independently for manual resolver behavior, normalized variants, and simulated service errors.

## Phase 4: User Story 2 - Elegir una sugerencia (Priority: P1)

**Goal**: Show up to five Spanish-name suggestions while typing and let users select by mouse or keyboard.

**Independent Test**: Against an injected catalog, verify prefix suggestions are stable and capped at five; select a result with click and keyboard; verify ArrowUp/ArrowDown, Enter, Escape, ARIA state, no-match behavior, and no stale options after input changes.

### Tests for User Story 2 (write first)

- [ ] T013 [US2] Add unit tests for prefix matching against English and Spanish aliases, stable source ordering, zero matches, the five-item limit, and distinct labels resolving to distinct records in `src/features/busqueda-inteligente/busqueda.service.test.ts`.
- [ ] T014 [P] [US2] Add jsdom component tests for listbox/option semantics, mouse/keyboard selection, ArrowDown/ArrowUp, Enter, Escape, focus, stale-option invalidation, duplicate-label differentiators, all three visible error messages, and retrying the current query without submitting in `src/features/busqueda-inteligente/busqueda.component.test.ts`.

### Implementation for User Story 2

- [ ] T015 [US2] Implement prefix suggestion lookup in `src/features/busqueda-inteligente/busqueda.service.ts`, matching the current query against canonical and Spanish normalized keys and returning at most five records in source order.
- [ ] T016 [US2] Implement suggestion rendering for the existing `#nombre-pais` input in `src/features/busqueda-inteligente/busqueda.component.ts`, using DOM nodes and `textContent` for every country label.
- [ ] T017 [US2] Implement visible suggestion-load errors in `src/features/busqueda-inteligente/busqueda.component.ts` with the exact Spanish messages for `sin-conexion`, `tiempo-agotado`, and `respuesta-invalida`, plus «Reintentar sugerencias» that retries the current query without submitting the form.
- [ ] T018 [US2] Implement mouse and keyboard selection in `src/features/busqueda-inteligente/busqueda.component.ts`: ArrowUp/ArrowDown navigation, Enter selection, Escape dismissal, focus retention, invalidation after input changes, and use of the differentiated label for ambiguous aliases.
- [ ] T019 [US2] Add `aria-expanded`, `aria-controls`, `aria-activedescendant`, `role="listbox"`, `role="option"`, and `role="alert"` updates to `src/features/busqueda-inteligente/busqueda.component.ts` and verify them in `src/features/busqueda-inteligente/busqueda.component.test.ts`.
- [ ] T020 [US2] Add focused styles for the suggestion list, active option, visible keyboard focus, and retryable alert in `src/features/busqueda-inteligente/busqueda.css`.
- [ ] T021 [US2] Run and refine `src/features/busqueda-inteligente/busqueda.service.test.ts` and `src/features/busqueda-inteligente/busqueda.component.test.ts` until the suggestion story passes independently.

**Checkpoint**: Story 2 displays zero to five current Spanish suggestions, supports mouse and keyboard, and can be tested without the base ficha or live API.

## Phase 5: Integration - Conectar ambas historias al buscador base

**Purpose**: Connect manual form submissions and suggestion selection to the existing ficha flow without replacing it. This phase is blocked by T001.

- [ ] T022 [US1] After T001 approval, add jsdom tests for the optional query-resolver contract in `src/features/ficha/ficha.component.test.ts`: no resolver preserves base behavior; resolver receives button and Enter submissions; resolver failures preserve the ficha's Spanish error/retry states.
- [ ] T023 [US1] After T001 approval, add the optional query-resolver parameter to `montarFicha` in `src/features/ficha/ficha.component.ts`; resolve non-empty manual input before `buscarFicha` and preserve existing validation, loading, cancellation, rendering, and retry behavior.
- [ ] T024 [P] [US2] Add an integration test in `src/features/busqueda-inteligente/busqueda.integracion.test.ts` proving mouse/keyboard selection and manual button/Enter submissions resolve ordinary and differentiated duplicate Spanish labels through the base flow.
- [ ] T025 [US2] Connect the shared catalog consumer, resolver, and suggestion component in `src/main.ts` and import `src/features/busqueda-inteligente/busqueda.css`; do not create or replace the base form.

**Checkpoint**: Both stories work through the existing form; base loading/error/retry/ficha states remain owned by the ficha feature.

## Phase 6: Polish and Cross-Cutting Validation

- [ ] T026 [P] Run all unit, component, integration, and fast-check tests with `npm test` and confirm all network calls are mocked; record results in `specs/005-busqueda-inteligente/quickstart.md`.
- [ ] T027 [P] Run `npm run typecheck` and `npm run build`; resolve only feature-related failures in `src/features/busqueda-inteligente/` and approved integration changes in `src/features/ficha/ficha.component.ts`, `src/features/ficha/ficha.service.ts`, and `src/main.ts`.
- [ ] T028 Manually validate Spanish lookup, five-result cap, duplicate-label differentiation, retryable suggestion errors, one shared capital-list download, keyboard-only selection, visible focus, and existing base error/retry behavior against `specs/005-busqueda-inteligente/quickstart.md`; record verification in `specs/005-busqueda-inteligente/quickstart.md`.
- [ ] T029 Obtain PR reviews from Jose and Gabriel, recorded on the pull request for `specs/005-busqueda-inteligente/`, with comments stating what they reviewed, how they tested it, and their observations before merging.

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Already satisfied by the repository; no installation or scaffolding is needed.
- **Foundational Gate (Phase 2)**: T001 must be complete before T006, T010, and T022-T023 modify or test changes owned by the ficha base. Other feature-local work can proceed while approval is pending.
- **User Story 1 (Phase 3)**: T002-T006 tests precede T007-T011 implementation; T012 is the story validation checkpoint.
- **User Story 2 (Phase 4)**: T013-T014 tests precede T015-T020 implementation; T021 is the story validation checkpoint.
- **Integration (Phase 5)**: Depends on the Story 1 resolver/shared catalog and Story 2 suggestion component. T022-T023 also require T001; T024-T025 connect and verify the full user flow.
- **Polish (Phase 6)**: Depends on both stories and integration being complete.

### User Story Dependencies

- **US1 (P1)**: Independent feature-local service slice; unlocks resolving manual Spanish searches through the adapter.
- **US2 (P1)**: Suggestion matching uses the US1 catalog and normalization; component tests can use an injected catalog independently, but end-to-end integration follows US1.

### Parallel Opportunities

- T002, T003, and T004 may be drafted in parallel because they target three different test files. T005 and T006 target separate test files; T006 also requires T001.
- T013 and T014 may be written in parallel because they use separate service and component test files.
- After both stories and their checkpoints, T026 and T027 can run independently; T028 requires the application to be runnable.
- Do not parallelize edits to `busqueda.service.ts`; T007-T009, T011, and T015 are sequential changes to the same service surface.
- Do not start T006, T010, or T022-T023 until Jose has approved the shared-cache and resolver integration in T001.

## Implementation Strategy

### MVP First

1. Complete T001 approval before any ficha-base integration or shared-cache accessor change.
2. Implement and validate US1: canonical and Spanish manual lookup, including diacritic and case variants.
3. Implement and validate US2: up to five suggestions and accessible selection.
4. Integrate both through the existing form after the owner-approved adapter is available.
5. Run full tests, typecheck, build, and the manual keyboard/accessibility checks.

### Incremental Delivery

- Deliver US1 service and its unit/property tests as the first independently verifiable increment.
- Deliver US2 suggestion lookup and component with isolated tests as the next increment.
- Deliver the approved adapter and composition wiring as the end-to-end increment.
- Complete cross-cutting validation and obtain the two required reviewed approvals before merge.

## Notes

- All 29 tasks use the required checkbox, sequential ID, optional parallel marker, user-story label, and exact file path format.
- Tests are required by the constitution and the feature specification; tests must never call the real API.
- `normalizarNombre` remains unchanged. Any future proposal to edit it requires a new justification and approval before implementation.
