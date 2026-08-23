# Voltra UI/UX and API Update

## Scope

This update applies the attached marketplace brief to the existing Voltra codebase. The work focuses on removing friction from the profile, upload, add-on detail, and review flows while preserving the existing visual language.

## User flows

### Profile update

1. The user opens **Profile** and selects **Edit profile**.
2. The user changes display name, profile image, bio, or border.
3. The save action shows a disabled/loading state and reports the server error when validation fails.
4. On success, a `voltra:profile-updated` browser event updates every mounted authentication consumer and every add-on authored by that user without a reload.

### Add-on deletion

1. The owner opens **My Uploads** and selects the visible delete control on the target card. The control remains visible on touch devices and is hover-enhanced on larger screens.
2. A confirmation dialog explains that the action cannot be undone.
3. The server validates ownership or admin role before deletion.
4. The parent add-on store removes the item immediately after a successful response, keeping the profile, marketplace data, and liked-item set consistent.

### Review deletion

1. The review owner or admin selects the trash control on a review.
2. A confirmation dialog explains that the review will be removed and the rating recalculated.
3. The server validates authorization, deletes the row in a transaction, recalculates rating count and average, and returns the deleted id.
4. The detail page removes the review from local state without a reload.

### Panorama upload

Panorama is now optional. If supplied, the client accepts JPG, PNG, and WebP files up to 20 MB, requires at least 1,200 px width, and requires a wide aspect ratio of at least 16:10. Upload progress, preview, replacement, removal, and validation errors are visible in the upload flow.

## Design decisions

| Area | Decision | Rationale |
| --- | --- | --- |
| Profile card | Added a clear “Your profile” eyebrow, stronger title hierarchy, bordered stat chips, and responsive edit action | Separates identity, metadata, and actions so the card is easier to scan |
| Touch actions | Delete controls remain visible below the `sm` breakpoint | Prevents hover-only functionality on mobile |
| Feedback | Save, delete, upload, and review operations report loading, success, or error states | Every important mutation has a visible response |
| Spacing | New layout changes use 8 px-grid values such as 16, 24, and 32 px | Keeps the revised surfaces consistent with the shared design system |
| Motion | Existing subtle motion and reduced-motion handling are preserved | Keeps transitions polished without adding decorative motion |
| State propagation | A browser event plus the central add-on hook synchronizes profile changes | Avoids a full page reload and updates existing cards immediately |

## API contract

### `DELETE /api/reviews?id={reviewId}`

The endpoint requires an authenticated user. The review owner or an admin may delete the review. The endpoint returns `200` with `{ "ok": true, "id": "..." }` on success. It returns `400` when the id is missing, `401` when the user is unauthenticated, `403` when the user lacks permission, and `404` when the review does not exist. Rating aggregates are recalculated in the same database transaction.

### `PATCH /api/users?scope=me`

The existing endpoint remains the source of truth for profile updates. The client now surfaces the endpoint’s validation message and broadcasts the accepted profile values to mounted UI consumers after a successful response.

### `DELETE /api/addons?id={addonId}`

The existing endpoint already enforces owner/admin authorization. The client now removes the deleted add-on from the shared in-memory collection immediately after a successful response.

## Validation status

The implementation was type-checked, built successfully with Vite, and covered by the existing API suite plus regression tests for unauthenticated review deletion. A local browser smoke test confirmed that the marketplace empty state and unauthenticated profile route render without runtime errors.
