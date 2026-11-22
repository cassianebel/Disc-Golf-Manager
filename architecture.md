# 1. Overview

This system is a mobile-first application for managing a single user's disc golf collection. The existing Expo client captures disc photos and recognizes text on-device; the user selects OCR words and edits a search query before a server-side TryDiscs lookup, then confirms and edits a match before adding it to the bag (FR-001, FR-003; Scenario-001).

# 2. Modules

| Module | Responsibility | May depend on |
|---|---|---|
| User session and bag identity | Own the authenticated user boundary and the bag associated with that user so every add/edit operation is scoped to the right collection. This is needed by FR-001, FR-002, FR-003 and the logged-in preconditions in Scenario-001 and Scenario-002. | Bag repository |
| Photo capture and OCR intake | Capture the photo, recognize raw text on the device, and let the user build and edit the catalog query from selectable OCR words. This is needed by Scenario-001 and the goal to add a disc via photo and OCR. | None |
| TryDiscs catalog lookup | Search TryDiscs using the final user-edited query and return possible catalog records for user selection. This is needed by Scenario-001 and the goal to use TryDiscs. | None; receives the confirmed query from the client |
| Disc form editor | Build editable form data from either a selected catalog match or the existing disc record supplied by the caller, and accept the user’s final confirmation before save. This is needed by FR-002 and Scenario-001/002. | Bag repository, TryDiscs catalog lookup |
| Bag repository | Store and retrieve the user's bag and all disc records, including updates to field values and notes. This is needed by FR-001, FR-002, and FR-003. | User session and bag identity |
| Home bag view | Render the user's bag as the main list and route the user to the add-disc or edit-disc flows. This is needed by FR-003 and Scenario-002. | Bag repository |

# 3. Request flow

Most important scenario: add a disc to the bag (FR-001; Scenario-001).

1. The user opens the app and the home bag view loads the bag for the active user.
2. The user taps the add-disc control from the home view.
3. The app launches the photo capture flow and the user takes a picture of a disc.
4. The app runs on-device OCR and displays the raw recognized text as selectable words, initially unselected and in the original order.
5. The selected words populate an editable query field. The user may edit the query and explicitly starts the lookup with that final text.
6. The client calls the catalog lookup route; the server queries TryDiscs with the final query and returns possible catalog matches with the provider's attribution.
7. The user selects the matching disc record.
8. The app loads the selected record into the disc form editor so the user can review and edit the full disc information.
9. The user confirms the final disc data and taps the add-to-bag action.
10. The bag repository writes the disc to the user’s bag and the app returns to the home bag view.

This ordering preserves the acceptance-criterion flow: photo -> OCR-derived text -> user confirms/edits the search terms -> TryDiscs match list -> full record edit -> add to bag -> home screen return.

# 4. Design decisions

| Decision | Reason |
|---|---|
| Single bag per authenticated user | The Domain Model states that each user has a bag and the home screen must display that bag (Domain Model; FR-003). This is a design decision enforced by the user session and bag identity module: the bag repository is keyed by the active user. |
| The add-disc flow is interactive and user-confirmed at each critical step | Scenario-001 requires the user to confirm the brand/name, select the matching TryDiscs record, and confirm the final disc data before the disc is added. This is enforced by the Photo capture and OCR intake, TryDiscs catalog lookup, and Disc form editor modules. |
| OCR provides search suggestions, not automatic brand/model identification | Scenario-001 places user confirmation before catalog results. Selectable OCR words and an editable query preserve that confirmation without guessing which OCR tokens are brand or model. |
| The TryDiscs API key stays server-side and attribution accompanies displayed catalog data | The TryDiscs API documentation requires a key and attribution; this is an external API constraint, not a requirement stated in spec.md. The server-side catalog lookup uses the key and the client presents the returned attribution with results. |
| Disc updates are done in-place on a single disc record rather than through a separate review queue | Scenario-002 says the user clicks a disc from the bag list and is presented with all fields as editable inputs; the update ends by returning to the home screen. The form editor is therefore the single update path, with the bag repository as the write point. |
| The app stores bag data locally on the device | The spec defines the user, bag, and disc model but does not define a server-side persistence layer or multi-device sync. This is a preference, not a requirement: it is the simplest design that satisfies the local mobile app behavior without inventing a backend. |
| Catalog matching is a user-assisted lookup, not an automatic record write | Scenario-001 explicitly requires a list of possible matches and requires the user to select the matching disc before final confirmation. This is a requirement, not a preference, and it is enforced in the TryDiscs catalog lookup and Disc form editor modules. |
| The home view is the system’s center of navigation | FR-003 says the home screen displays the bag, and Scenario-002 returns the user there after editing. The Home bag view therefore acts as the primary navigation hub, and the add/edit flows begin and end there. |
| No multi-bag, shared-bag, or cross-user sync model is designed | The Domain Model defines one bag per user and all acceptance criteria assume a single logged-in user working on their own collection. This is a requirement limit, not a product expansion: the design intentionally omits shared collections and sync. |

# 5. Constraints and known limits

Constraints
- The app is a mobile application and the add-disc experience depends on the camera and image handling on the device (Description; Scenario-001).
- The user is the owner of the bag and the bag is the unit of organization (Domain Model; FR-003).
- The add-disc flow is a human-assisted workflow that includes OCR, catalog selection, and final confirmation; there is no requirement for automatic disc creation without user review (Scenario-001).
- The spec does not define a server, database, or authentication provider; therefore the design has no remote persistence or multi-user identity model unless the requirements expand.

This design does not handle
- Multiple bags per user.
- Shared collections or collaborative editing.
- Multi-device sync or cloud backup.
- Large-scale disc catalog maintenance beyond catalog match selection.
- Automated duplicate detection beyond the user’s manual confirmation flow.
- A backend queue, asynchronous processing pipeline, or offline-first job scheduler; the workflow is device-local and inline.

If the requirements grew, the system would need to change in the following ways
- If the app must support multiple bags or shared collections, the bag identity boundary would move from the device-local user identity to a server-backed collection model.
- If the product needs sync across devices, a remote persistence layer and conflict resolution policy would be required.
- If offline use becomes a requirement, the add-disc and catalog lookup steps would need a queued or deferred submission strategy and a local-first conflict model.
- If catalog quality or OCR accuracy becomes a hard product requirement, the design would need a more formal validation pipeline and failure handling than the current simple user-confirmed match flow.

# 6. Out of scope

The specification does not declare explicit non-goals. This design therefore does not add any extra non-goals beyond the limits already stated in the functional and domain model sections. There is no named “non-goals” section in the spec that can be copied verbatim.

# Spec issues

- The spec says the user is “logged in” in each scenario, but it never identifies the authentication method, the auth provider, or whether the app is single-user or multi-user.
- Scenario-001 requires brand/name confirmation before catalog selection but does not define whether selecting OCR words and editing the query satisfies that confirmation; the design treats this as the user-confirmed query step.
- The spec does not define whether toggling OCR-word selection after manually editing the query should replace the edited query, nor behavior for an empty query or no catalog results.
- The app description mentions avoiding duplicate purchases and making disc-use decisions, but those ideas are not defined as functional requirements or explicit product features; they are aspirational product value rather than architecture requirements.
- The spec names many disc attributes but does not define validation rules for them, so the design cannot enforce field constraints without inventing them silently.
- The bag is described as a collection of discs, but no persistence technology or storage lifecycle is specified, so the architecture cannot define a trusted long-term data model without assuming one.
- The architecture uses the existing Expo camera and OCR in the mobile client; the Python photo/OCR stub is not part of that device flow and should not be treated as a server-side camera or OCR implementation.
