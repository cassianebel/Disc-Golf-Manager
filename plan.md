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
- **Goal:** Reuse the current Expo camera/OCR flow, present recognized text as initially unselected, ordered word tokens, and let the user assemble and edit the query before searching.
- **Spec sources:** Goals; Domain Model; Acceptance Criteria (Scenario-001).
- **Criteria:** None completed; this is part of Scenario-001, which is completed in Slice 6.
- **Tests that should turn green:** None in the current suite. Add client tests for token initialization/order, selection changes, and manual query editing before implementation.
- **Skeleton to fill in:** Existing `CameraScreen.takePhoto` and `CameraScreen.finishAddingDisc` flow in `App.tsx`, plus the existing raw OCR text state/display in `App`. Add no server-side camera or OCR behavior; the device photo URI remains local.
- **Depends on:** None; the existing camera and OCR packages are already present.
- **Done when:** Client behavior exposes raw OCR as ordered, initially unselected words; selected words populate an editable query, and the final edited query remains available for lookup; no previously passing test fails.
- **Status:** done.

### 5. TryDiscs lookup by confirmed query

- **Name:** TryDiscs query lookup
- **Goal:** Search TryDiscs using the exact query submitted by the user and return possible catalog records with attribution.
- **Spec sources:** Goals; Acceptance Criteria (Scenario-001).
- **Criteria:** None completed; catalog lookup is part of Scenario-001, which is completed in Slice 6.
- **Tests that should turn green:** `test_lookup_sends_exact_query_and_returns_matches_with_attribution`, `test_lookup_rejects_empty_query_without_request`, `test_lookup_reports_missing_api_key`, `test_lookup_surfaces_upstream_failure`, `test_catalog_route_passes_query_to_lookup`.
- **Skeleton to fill in:** `TryDiscsCatalogLookup.find_candidate_matches(query: str)`; `GET /catalog/discs?q={query}`. The server reads `TRYDISCS_API_KEY` from its environment; the key is not embedded in the mobile client.
- **Depends on:** Slice 4.
- **Done when:** The listed tests pass; blank queries return HTTP 400, missing key configuration returns HTTP 503, and upstream failures return HTTP 502 rather than an empty success; no previously passing test fails.
- **Status:** done.

### 6. Confirmed photo-to-bag flow

- **Name:** Confirmed photo-to-bag flow
- **Goal:** Complete the user-reviewed OCR query, TryDiscs result selection, editable disc form, and bag insertion journey.
- **Spec sources:** Goals; Domain Model; Functional Requirements (FR-001); Acceptance Criteria (Scenario-001).
- **Criteria:** Scenario-001.
- **Tests:** `test_catalog_disc_form_is_saved_to_the_user_bag` verifies that the edited catalog record is stored and listed through the bag API. The camera/OCR-to-form interaction requires on-device acceptance testing; this repository has no React Native UI test runner.
- **Skeleton filled in:** The Expo client submits the final query, renders selectable catalog matches with attribution, opens an editable form, and posts the confirmed record to `POST /bags/{user_id}/discs`. The camera photo URI remains on-device. The client uses the prototype identity `local-user` because authentication is not implemented.
- **Depends on:** Slices 1, 3, 4, and 5.
- **Done when:** The result-selection, editable-form, and save flow is implemented; the bag API save test passes and no previously passing test fails. Verify camera/OCR and catalog lookup on a physical device.
- **Status:** done.

## Test issues

- `test_plan.md` is absent, so there is no separate test inventory to compare against the available suite.
- Existing Python tests cover route response shapes, catalog lookup, and bag insertion. Camera permissions, OCR, token interaction, and the full mobile acceptance scenario still require device testing.
- The API key requirement and attribution are from the TryDiscs API terms/documentation, not from `spec.md`.

## Design questions

- Toggling OCR tokens rebuilds the query and replaces manual edits; no-match results are shown with an option to revise and resubmit the query.
- The existing photo/OCR implementation is in the Expo client, while `server/modules/photo_capture_and_ocr_intake.py` is a Python stub. Should that unused server stub be removed or explicitly retained as non-runtime documentation?
- The architecture and spec use unnumbered headings; this plan cites heading names and the existing FR/Scenario identifiers rather than inventing section numbers.

## Coverage check

- Acceptance criteria assigned exactly once: Scenario-001 (Slice 6), Scenario-002 (Slice 3).
- Current test names assigned exactly once: `test_add_disc_returns_saved_record` (Slice 1), `test_list_discs_returns_bag` (Slice 2), `test_update_disc_returns_updated_record` and `test_build_disc_form_uses_existing_record_for_edit` (Slice 3), `test_lookup_sends_exact_query_and_returns_matches_with_attribution`, `test_lookup_rejects_empty_query_without_request`, `test_lookup_reports_missing_api_key`, `test_lookup_surfaces_upstream_failure`, and `test_catalog_route_passes_query_to_lookup` (Slice 5), `test_build_disc_form_uses_catalog_match_for_new_disc` and `test_catalog_disc_form_is_saved_to_the_user_bag` (Slice 6).
- Current failing tests assigned exactly once: none.
- Functions with no implementation slice: `HomeBagView.route_to_add_disc` remains deferred because no UI navigation target has been specified.
- REST routes with no implementation slice: none; `GET /catalog/discs?q={query}` is assigned to Slice 5.
