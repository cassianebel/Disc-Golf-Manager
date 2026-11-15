# Implementation plan

## Current test results

Command run: `python3 -m unittest discover -s tests -v`

```text
test_add_disc_returns_saved_record (test_api.ApiSkeletonTests.test_add_disc_returns_saved_record) ... ok
test_list_discs_returns_bag (test_api.ApiSkeletonTests.test_list_discs_returns_bag) ... ok
test_update_disc_returns_updated_record (test_api.ApiSkeletonTests.test_update_disc_returns_updated_record) ... ok
test_build_disc_form_uses_catalog_match_for_new_disc (test_api.DiscFormEditorTests.test_build_disc_form_uses_catalog_match_for_new_disc) ... ok
test_build_disc_form_uses_existing_record_for_edit (test_api.DiscFormEditorTests.test_build_disc_form_uses_existing_record_for_edit) ... ok

----------------------------------------------------------------------
Ran 5 tests in 0.460s

OK
```

Failing tests grouped by acceptance criterion:

- Scenario-001: none currently fail.
- Scenario-002: none currently fail.
- FR-003 (no corresponding acceptance criterion ID): none currently fail.

The current tests exercise route and form-result shapes; they do not yet cover the full acceptance scenarios.

## Ordered implementation slices

### 1. Thin add-disc path

- **Name:** Thin add-disc path
- **Goal:** Let a client submit a disc record through one route and store it in the active user's in-memory bag with a generated ID.
- **Spec sources:** Goals; Domain Model; Functional Requirements (FR-001); Acceptance Criteria (Scenario-001, partial path only).
- **Criteria:** None completed; this thin path does not complete Scenario-001.
- **Tests that should turn green:** `test_add_disc_returns_saved_record`.
- **Skeleton to fill in:** `UserSessionAndBagIdentity.get_bag_id_for_user`, `BagRepository.add_disc_to_bag`; `POST /bags/{user_id}/discs`.
- **Depends on:** None.
- **Done when:** `test_add_disc_returns_saved_record` passes and no previously passing test fails.
- **Status:** done.

### 2. Home bag listing

- **Name:** Home bag listing
- **Goal:** Return the active user's stored discs from the home-screen route.
- **Spec sources:** Domain Model; Functional Requirements (FR-003); Acceptance Criteria (Scenario-002 precondition).
- **Criteria:** None; FR-003 is not an acceptance criterion ID.
- **Tests that should turn green:** `test_list_discs_returns_bag`.
- **Skeleton to fill in:** `UserSessionAndBagIdentity.get_active_user`, `BagRepository.list_disc_records`, `HomeBagView.render_home_bag`; `GET /bags/{user_id}/discs`.
- **Depends on:** Slice 1.
- **Done when:** `test_list_discs_returns_bag` passes and no previously passing test fails.
- **Status:** done.

### 3. Edit an existing disc

- **Name:** Edit disc record
- **Goal:** Accept edits to a selected disc, preserve its generated ID, persist changes, and complete the update route.
- **Spec sources:** Functional Requirements (FR-002); Acceptance Criteria (Scenario-002).
- **Criteria:** Scenario-002.
- **Tests that should turn green:** `test_update_disc_returns_updated_record`, `test_build_disc_form_uses_existing_record_for_edit`.
- **Skeleton to fill in:** `DiscFormEditor.build_disc_form`, `DiscFormEditor.submit_disc_form`, `BagRepository.update_disc_record`; `PUT /bags/{user_id}/discs/{disc_id}`.
- **Depends on:** Slices 1 and 2.
- **Done when:** Both listed tests pass and no previously passing test fails.
- **Status:** done.

### 4. OCR token selection and editable query

- **Name:** OCR query preparation
- **Goal:** Reuse the current Expo camera/OCR flow, present recognized text as initially selected, ordered word tokens, and let the user edit the assembled query before searching.
- **Spec sources:** Goals; Domain Model; Acceptance Criteria (Scenario-001).
- **Criteria:** None completed; this is part of Scenario-001, which is completed in Slice 6.
- **Tests that should turn green:** None in the current suite. Add client tests for token initialization/order, selection changes, and manual query editing before implementation.
- **Skeleton to fill in:** Existing `CameraScreen.takePhoto` and `CameraScreen.finishAddingDisc` flow in `App.tsx`, plus the existing raw OCR text state/display in `App`. Add no server-side camera or OCR behavior; the device photo URI remains local.
- **Depends on:** None; the existing camera and OCR packages are already present.
- **Done when:** New client tests verify raw OCR is exposed as selectable words, selected words populate an editable query, and the final edited query remains available for lookup; no previously passing test fails.
- **Status:** done.

### 5. TryDiscs lookup by confirmed query

- **Name:** TryDiscs query lookup
- **Goal:** Search TryDiscs using the exact query submitted by the user and return possible catalog records with attribution.
- **Spec sources:** Goals; Acceptance Criteria (Scenario-001).
- **Criteria:** None completed; catalog lookup is part of Scenario-001, which is completed in Slice 6.
- **Tests that should turn green:** None in the current suite. Add API tests for successful query results and upstream failure handling before implementation.
- **Skeleton to fill in:** `TryDiscsCatalogLookup.find_candidate_matches(query: str)`; add the documented `GET /catalog/discs?q={query}` route. The API key is injected server-side, not embedded in the mobile client.
- **Depends on:** Slice 4.
- **Done when:** New tests verify the exact submitted query is sent, matches and attribution are returned, and upstream failures are not reported as empty successful results; no previously passing test fails.
- **Status:** not started.

### 6. Confirmed photo-to-bag flow

- **Name:** Confirmed photo-to-bag flow
- **Goal:** Complete the user-reviewed OCR query, TryDiscs result selection, editable disc form, and bag insertion journey.
- **Spec sources:** Goals; Domain Model; Functional Requirements (FR-001); Acceptance Criteria (Scenario-001).
- **Criteria:** Scenario-001.
- **Tests that should turn green:** None in the current suite. Add an end-to-end Scenario-001 test that verifies reviewable query -> catalog selection -> editable form -> saved bag record.
- **Skeleton to fill in:** Integrate the existing Expo photo/OCR UI, `TryDiscsCatalogLookup.find_candidate_matches`, `DiscFormEditor.build_disc_form`, `DiscFormEditor.submit_disc_form`, and `BagRepository.add_disc_to_bag` through the catalog lookup and existing `POST /bags/{user_id}/discs` routes.
- **Depends on:** Slices 1, 3, 4, and 5.
- **Done when:** The end-to-end Scenario-001 test passes and no previously passing test fails.
- **Status:** not started.

## Test issues

- `test_plan.md` is absent, so there is no separate test inventory to compare against the available suite.
- Existing tests cover route response shapes and form data selection, but not camera permissions, OCR failure, token selection, editable search, catalog attribution, or the end-to-end acceptance scenarios.
- The API key requirement and attribution are from the TryDiscs API terms/documentation, not from `spec.md`.

## Design questions

- If the user edits the query and then toggles OCR tokens, should the selection rebuild/replace their edited text, or should manual edits remain untouched?
- What should happen when the final query is empty or TryDiscs returns no matches?
- The existing photo/OCR implementation is in the Expo client, while `server/modules/photo_capture_and_ocr_intake.py` is a Python stub. Should that unused server stub be removed or explicitly retained as non-runtime documentation?
- The architecture and spec use unnumbered headings; this plan cites heading names and the existing FR/Scenario identifiers rather than inventing section numbers.

## Coverage check

- Acceptance criteria assigned exactly once: Scenario-001 (Slice 6), Scenario-002 (Slice 3).
- Current test names assigned exactly once: `test_add_disc_returns_saved_record` (Slice 1), `test_list_discs_returns_bag` (Slice 2), `test_update_disc_returns_updated_record` and `test_build_disc_form_uses_existing_record_for_edit` (Slice 3), `test_build_disc_form_uses_catalog_match_for_new_disc` (Slice 6).
- Current failing tests assigned exactly once: none.
- Functions with no implementation slice: `HomeBagView.route_to_add_disc` remains deferred because no UI navigation target has been specified.
- REST routes with no implementation slice: none; `GET /catalog/discs?q={query}` is assigned to Slice 5.
