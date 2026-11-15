# Implementation plan

## Current test results

Command run: `python3 -m unittest discover -s tests -v`

```text
test_add_disc_returns_saved_record (test_api.ApiSkeletonTests.test_add_disc_returns_saved_record) ... FAIL
test_list_discs_returns_bag (test_api.ApiSkeletonTests.test_list_discs_returns_bag) ... FAIL
test_update_disc_returns_updated_record (test_api.ApiSkeletonTests.test_update_disc_returns_updated_record) ... FAIL

----------------------------------------------------------------------
Ran 3 tests in 0.398s

FAILED (failures=3)
```

Failing tests grouped by acceptance criterion:

- Scenario-001: `test_add_disc_returns_saved_record` fails because POST returns HTTP 501 instead of a 2xx saved-record response. It tests the add route, not the full Scenario-001 interaction.
- Scenario-002: `test_update_disc_returns_updated_record` fails because PUT returns HTTP 501 instead of a 2xx updated-record response. It tests the update route, not the full Scenario-002 interaction.
- FR-003 (no corresponding acceptance criterion ID): `test_list_discs_returns_bag` fails because GET returns HTTP 501 instead of a 2xx bag-list response.

All three tests fail against the current skeleton because each route returns HTTP 501. Their expected successful result shapes come from the function contracts in `contracts.md`.

## Ordered implementation slices

### 1. Thin add-disc path

- **Name:** Thin add-disc path
- **Goal:** Let a client submit a disc record through one route and persist it to the active user's bag.
- **Spec sources:** Goals; Domain Model; Functional Requirements (FR-001); Acceptance Criteria (Scenario-001, partial path only).
- **Criteria:** None completed; this is a thin vertical path and does not complete Scenario-001.
- **Tests that should turn green:** `test_add_disc_returns_saved_record`.
- **Skeleton to fill in:** `UserSessionAndBagIdentity.get_bag_id_for_user`, `BagRepository.add_disc_to_bag`, `HomeBagView.route_to_add_disc`; `POST /bags/{user_id}/discs`.
- **Depends on:** None.
- **Done when:** The listed test passes with a success assertion and no previously passing test fails.
- **Status:** not started.

### 2. Home bag listing

- **Name:** Home bag listing
- **Goal:** Return the active user's stored discs from the home-screen route.
- **Spec sources:** Domain Model; Functional Requirements (FR-003); Acceptance Criteria (Scenario-002 precondition).
- **Criteria:** None; FR-003 is not an acceptance criterion ID.
- **Tests that should turn green:** `test_list_discs_returns_bag`.
- **Skeleton to fill in:** `UserSessionAndBagIdentity.get_active_user`, `BagRepository.list_disc_records`, `HomeBagView.render_home_bag`; `GET /bags/{user_id}/discs`.
- **Depends on:** Slice 1.
- **Done when:** The listed test passes with a bag-response assertion and no previously passing test fails.
- **Status:** not started.

### 3. Edit an existing disc

- **Name:** Edit disc record
- **Goal:** Accept edits to a selected disc, persist them, and complete the update flow back to the home screen.
- **Spec sources:** Functional Requirements (FR-002); Acceptance Criteria (Scenario-002).
- **Criteria:** Scenario-002.
- **Tests that should turn green:** `test_update_disc_returns_updated_record`.
- **Skeleton to fill in:** `DiscFormEditor.build_disc_form`, `DiscFormEditor.submit_disc_form`, `BagRepository.update_disc_record`; `PUT /bags/{user_id}/discs/{disc_id}`.
- **Depends on:** Slices 1 and 2.
- **Done when:** The listed test passes with an update assertion and no previously passing test fails.
- **Status:** not started.

### 4. Photo and OCR intake

- **Name:** Photo and OCR intake
- **Goal:** Capture a disc photo and produce the provisional brand and disc name used by the add flow.
- **Spec sources:** Goals; Domain Model; Acceptance Criteria (Scenario-001).
- **Criteria:** None; Scenario-001 is completed only by Slice 6.
- **Tests that should turn green:** None in the current suite.
- **Skeleton to fill in:** `PhotoCaptureAndOcrIntake.capture_photo`, `PhotoCaptureAndOcrIntake.infer_brand_and_name`.
- **Depends on:** Slice 1.
- **Done when:** New tests for the specified function results pass and no previously passing test fails.
- **Status:** not started.

### 5. TryDiscs candidate lookup

- **Name:** TryDiscs candidate lookup
- **Goal:** Find and return possible catalog records from the confirmed brand and disc name.
- **Spec sources:** Goals; Acceptance Criteria (Scenario-001).
- **Criteria:** None; Scenario-001 is completed only by Slice 6.
- **Tests that should turn green:** None in the current suite.
- **Skeleton to fill in:** `TryDiscsCatalogLookup.find_candidate_matches`.
- **Depends on:** Slice 4.
- **Done when:** New tests for candidate lookup pass and no previously passing test fails.
- **Status:** not started.

### 6. Confirmed photo-to-bag flow

- **Name:** Confirmed photo-to-bag flow
- **Goal:** Complete the user-confirmed photo, OCR, TryDiscs selection, editable record, and bag insertion journey.
- **Spec sources:** Goals; Domain Model; Functional Requirements (FR-001); Acceptance Criteria (Scenario-001).
- **Criteria:** Scenario-001.
- **Tests that should turn green:** None in the current suite; it has no test for the full acceptance flow.
- **Skeleton to fill in:** Integrate `PhotoCaptureAndOcrIntake.capture_photo`, `PhotoCaptureAndOcrIntake.infer_brand_and_name`, `TryDiscsCatalogLookup.find_candidate_matches`, `DiscFormEditor.build_disc_form`, `DiscFormEditor.submit_disc_form`, and `BagRepository.add_disc_to_bag` through the existing `POST /bags/{user_id}/discs` route.
- **Depends on:** Slices 1, 3, 4, and 5.
- **Done when:** A test of the full Scenario-001 sequence passes and no previously passing test fails.
- **Status:** not started.

## Test issues

- `test_plan.md` is absent, so there is no separate planned test inventory to compare against the code suite.
- The three route tests currently fail as intended because the handlers return HTTP 501. They now require 2xx responses and the success-result shapes described in `contracts.md`.
- No existing test covers OCR, TryDiscs matching, the edit form, persistence results, or the end-to-end acceptance scenarios.

## Design questions

- The spec and architecture describe interactive steps (confirm OCR text, select a catalog match, edit data), but the contracts expose only three REST routes and none for the intermediate photo/OCR, candidate lookup, or form steps. Can the existing POST route carry all intermediate selections in one request, or are additional routes/client-side calls needed? The latter would change the current route list, so it is not assumed here.
- `DiscFormEditor.build_disc_form(disc_id, catalog_match)` has no contract input for retrieving the existing disc's fields in Scenario-002. How should the editor obtain the stored record without adding a function or dependency?
- The architecture gives User session and bag identity and Bag repository reciprocal dependencies. Which direction is intended to avoid a dependency cycle?
- The architecture describes local-first, device-local behavior, while the skeleton is a server exposing REST routes. Where does the server run relative to the mobile app, and what persistence boundary is intended?
- The spec and architecture use unnumbered headings. This plan cites those heading names and the existing FR/Scenario identifiers rather than inventing section numbers.

## Coverage check

- Acceptance criteria assigned exactly once: Scenario-001 (Slice 6), Scenario-002 (Slice 3).
- Failing tests assigned exactly once: `test_add_disc_returns_saved_record` (Slice 1), `test_list_discs_returns_bag` (Slice 2), `test_update_disc_returns_updated_record` (Slice 3).
- Current test names assigned once: `test_add_disc_returns_saved_record` (Slice 1), `test_list_discs_returns_bag` (Slice 2), `test_update_disc_returns_updated_record` (Slice 3).
- Functions with no slice: none.
- REST routes with no slice: none.
