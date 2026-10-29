# Tasks: Búsqueda inteligente

**Input**: Design documents in `specs/005-busqueda-inteligente/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ui.md`, `quickstart.md`

**Organization**: Tasks are grouped by user story and ordered so tests precede implementation. Every change is covered by example-based tests, and normalization/matching invariants also have fast-check properties.

## Phase 1: Setup

**Purpose**: Confirm project setup. The SPA, Vite, TypeScript, Vitest, jsdom and fast-check are already configured; no dependency or scaffolding task is needed.

## Phase 2: Foundational Gate

**Purpose**: Obtain the required owner approval before modifying the ficha base.

- [ ] T001 Obtain Jose's explicit approval for the minimal resolver extension to `src/features/ficha/ficha.component.ts`; record the approval in the feature PR discussion before starting T019 or T020.

**Checkpoint**: Feature-local service and suggestion work may proceed independently; do not begin ficha-base integration until T001 is complete.

## Phase 3: User Story 1 - Encontrar países con distintas escrituras (Priority: P1)

**Goal**: Resolve English and Spanish country names independent of case, whitespace, and diacritics; submitting by button or Enter yields the expected country.

**Independent Test**: With simulated CountriesNow records, prove `Perú`/`Peru`, `ESPAÑA`/`españa`, and English canonical names resolve to the expected API name; unknown names remain unknown and network failures remain typed errors.

### Tests for User Story 1 (write first)

- [ ] T002 [P] [US1] Add Vitest examples for normalized lookup keys, `Intl.DisplayNames` names from `iso2`, alias lookup, canonical-name priority, unknown aliases, and ambiguous aliases in `src/features/busqueda-inteligente/busqueda.service.test.ts`.
- [ ] T003 [P] [US1] Add fast-check properties for key-normalization idempotence, invariance to case and whitespace, and equivalence between composed and decomposed accented text in `src/features/busqueda-inteligente/busqueda.normalizar.prop.test.ts`.
- [ ] T004 [P] [US1] Add fast-check properties proving generated case/diacritic variants of a Spanish or canonical country name resolve to the same API country in `src/features/busqueda-inteligente/busqueda.matching.prop.test.ts`.
- [ ] T005 [US1] Add mocked-loader tests for one-time catalog loading, filtering invalid `name`/`iso2`, retry after failed load, and `sin-conexion`, `tiempo-agotado`, and `respuesta-invalida` results in `src/features/busqueda-inteligente/busqueda.service.test.ts`.

### Implementation for User Story 1

- [ ] T006 [US1] Implement a local lookup-key helper in `src/features/busqueda-inteligente/busqueda.service.ts` that first calls `normalizarNombre` from `src/features/ficha/normalizar.ts`, then uses Unicode NFD and removes `\p{M}` marks; leave `src/features/ficha/normalizar.ts` unchanged.
- [ ] T007 [US1] Implement catalog construction in `src/features/busqueda-inteligente/busqueda.service.ts`, deriving each Spanish label with `Intl.DisplayNames` locale `es`, type `region`, and the API `iso2`; retain distinct records when `iso2` repeats.
- [ ] T008 [US1] Implement alias resolution in `src/features/busqueda-inteligente/busqueda.service.ts` so canonical English exact matches take priority, unique Spanish exact aliases return the canonical API name, and unknown or ambiguous aliases are not selected arbitrarily.
- [ ] T009 [US1] Implement a session-cached catalog loader in `src/features/busqueda-inteligente/busqueda.service.ts` using `obtenerJson` from `src/api/http.ts`; cache successful data, clear failed promises for retry, and do not call `fetch` directly.
- [ ] T010 [US1] Run and refine `src/features/busqueda-inteligente/busqueda.service.test.ts`, `src/features/busqueda-inteligente/busqueda.normalizar.prop.test.ts`, and `src/features/busqueda-inteligente/busqueda.matching.prop.test.ts` until unit and property tests pass without live network requests.

**Checkpoint**: Story 1 passes independently for manual resolver behavior, normalized variants, and simulated service errors.

## Phase 4: User Story 2 - Elegir una sugerencia (Priority: P1)

**Goal**: Show up to five Spanish-name suggestions while typing and let users select by mouse or keyboard.

**Independent Test**: Against an injected catalog, verify prefix suggestions are stable and capped at five; select a result with click and keyboard; verify ArrowUp/ArrowDown, Enter, Escape, ARIA state, no-match behavior, and no stale options after input changes.

### Tests for User Story 2 (write first)

- [ ] T011 [US2] Add unit tests for prefix matching against English and Spanish aliases, stable source ordering, zero matches, and the five-item limit in `src/features/busqueda-inteligente/busqueda.service.test.ts`.
- [ ] T012 [P] [US2] Add jsdom component tests for listbox/option semantics, mouse selection, ArrowDown/ArrowUp, Enter, Escape, focus retention, empty results, and stale-option invalidation in `src/features/busqueda-inteligente/busqueda.component.test.ts`.

### Implementation for User Story 2

- [ ] T013 [US2] Implement prefix suggestion lookup in `src/features/busqueda-inteligente/busqueda.service.ts`, matching the current query against canonical and Spanish normalized keys and returning at most five records in source order.
- [ ] T014 [US2] Implement suggestion rendering for the existing `#nombre-pais` input in `src/features/busqueda-inteligente/busqueda.component.ts`, using DOM nodes and `textContent` for every country label.
- [ ] T015 [US2] Implement mouse and keyboard selection in `src/features/busqueda-inteligente/busqueda.component.ts`: ArrowUp/ArrowDown navigation, Enter selection, Escape dismissal, focus retention, and invalidation of the active option after input changes.
- [ ] T016 [US2] Add `aria-expanded`, `aria-controls`, `aria-activedescendant`, `role="listbox"`, and `role="option"` updates to `src/features/busqueda-inteligente/busqueda.component.ts` and verify them in `src/features/busqueda-inteligente/busqueda.component.test.ts`.
- [ ] T017 [US2] Add focused styles for the suggestion list, active option, and visible keyboard focus in `src/features/busqueda-inteligente/busqueda.css`.
- [ ] T018 [US2] Run and refine `src/features/busqueda-inteligente/busqueda.service.test.ts` and `src/features/busqueda-inteligente/busqueda.component.test.ts` until the suggestion story passes independently.

**Checkpoint**: Story 2 displays zero to five current Spanish suggestions, supports mouse and keyboard, and can be tested without the base ficha or live API.

## Phase 5: Integration - Conectar ambas historias al buscador base

**Purpose**: Connect manual form submissions and suggestion selection to the existing ficha flow without replacing it. This phase is blocked by T001.

- [ ] T019 [US1] After T001 approval, add jsdom tests for the optional query-resolver contract in `src/features/ficha/ficha.component.test.ts`: no resolver preserves base behavior; resolver receives button and Enter submissions; resolver failures preserve existing Spanish error/retry states.
- [ ] T020 [US1] After T001 approval, add the optional query-resolver parameter to `montarFicha` in `src/features/ficha/ficha.component.ts`; resolve non-empty manual input before `buscarFicha` and preserve existing validation, loading, cancellation, rendering, and retry behavior.
- [ ] T021 [P] [US2] Add an integration test in `src/features/busqueda-inteligente/busqueda.integracion.test.ts` proving selecting a suggestion fills the existing field and submits through the base flow, while manual button/Enter submissions resolve Spanish aliases.
- [ ] T022 [US2] Register the resolver and suggestion component in `src/main.ts` and import `src/features/busqueda-inteligente/busqueda.css`; do not create or replace the base form.
- [ ] T023 [US2] Verify in `src/features/busqueda-inteligente/busqueda.integracion.test.ts` that suggestions close on selection, the Spanish label remains in the field, and the ficha base renders the corresponding canonical country result.

**Checkpoint**: Both stories work through the existing form; base loading/error/retry/ficha states remain owned by the ficha feature.

## Phase 6: Polish and Cross-Cutting Validation

- [ ] T024 [P] Run all unit, component, integration, and fast-check tests with `npm test` and confirm all network calls are mocked; record results in `specs/005-busqueda-inteligente/quickstart.md`.
- [ ] T025 [P] Run `npm run typecheck` and `npm run build`; resolve only feature-related failures in `src/features/busqueda-inteligente/` and approved integration changes in `src/features/ficha/ficha.component.ts` and `src/main.ts`.
- [ ] T026 Manually validate Spanish lookup, five-result cap, keyboard-only selection, visible focus, and existing base error/retry behavior against `specs/005-busqueda-inteligente/quickstart.md`; record verification in `specs/005-busqueda-inteligente/quickstart.md`.
- [ ] T027 Obtain PR reviews from Jose and Gabriel, recorded on the pull request for `specs/005-busqueda-inteligente/`, with comments stating what they reviewed, how they tested it, and their observations before merging.

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Already satisfied by the repository; no installation or scaffolding is needed.
- **Foundational Gate (Phase 2)**: T001 must be complete before T019-T020 modify or test changes owned by the ficha base. Feature-local work T002-T018 can proceed while approval is pending.
- **User Story 1 (Phase 3)**: T002-T005 tests precede T006-T009 implementation; T010 is the story validation checkpoint.
- **User Story 2 (Phase 4)**: T011-T012 tests precede T013-T017 implementation; T018 is the story validation checkpoint.
- **Integration (Phase 5)**: Depends on the Story 1 resolver and Story 2 suggestion component. T019-T020 also require T001; T021-T023 connect and verify the full user flow.
- **Polish (Phase 6)**: Depends on both stories and integration being complete.

### User Story Dependencies

- **US1 (P1)**: Independent feature-local service slice; unlocks resolving manual Spanish searches through the adapter.
- **US2 (P1)**: Suggestion matching uses the US1 catalog and normalization; component tests can use an injected catalog independently, but end-to-end integration follows US1.

### Parallel Opportunities

- T002, T003, and T004 may be drafted in parallel because they target three different test files.
- T011 and T012 may be written in parallel because they use separate test files; the service implementation T013 depends on T011, while component tasks T014-T017 depend on T012.
- After both stories and their checkpoints, T022 and T023 can run independently; T024 requires the application to be runnable.
- Do not parallelize edits to `busqueda.service.ts`; T005-T008 and T012 are sequential changes to the same file.
- Do not start T019/T020 until Jose has approved the integration surface in T001.

## Implementation Strategy

### MVP First

1. Complete T001 approval before any ficha-base integration.
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

- All tasks use the required checkbox, sequential ID, optional parallel marker, user-story label, and exact file path format.
- Tests are required by the constitution and the feature specification; tests must never call the real API.
- `normalizarNombre` remains unchanged. Any future proposal to edit it requires a new justification and approval before implementation.
