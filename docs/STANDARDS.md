# GenHub CRM — Development Standards

## Data Integrity

### Soft Delete
- All deletes MUST be soft deletes: set `is_deleted = 'TRUE'` and `modified_by` / `modified_at`.
- NEVER call `SheetsAPI.deleteRow()` from any user-facing page.
- All queries reading data for display MUST filter out `is_deleted === 'TRUE'` records.
- The `is_deleted` field must exist on every entity sheet (Accounts, Contacts, and all future entities).

### Audit Fields
- Every record must have: `created_by`, `created_at`, `modified_by`, `modified_at`.
- These are set automatically on create and update — never left blank.

## List Views

### Sortable Headers
- All list table headers MUST be sortable (A-Z / Z-A toggle).
- Use `makeSortable()` from `app.js`.
- Sort arrows visible on all columns; active sort column highlighted.

### Column Filters
- All list views MUST support column-level filtering (per-column filter inputs or dropdowns).
- Text columns: free-text filter input.
- Boolean/enum columns: dropdown filter.

### Column Picker
- All list views MUST include a column picker allowing users to show/hide columns.
- User selections should persist in `localStorage`.
- A sensible default set of visible columns per entity.

## UI Patterns

### Active/Inactive
- Inactive rows (where applicable) should be visually faded (reduced opacity, grey background).
- A "Show inactive" toggle in the toolbar controls visibility — off by default.

### Forms
- Required fields must be validated before save.
- Cancel always returns to the list view without saving.

### Navigation
- All list views accessible from the sidebar.
- Detail pages show breadcrumbs back to their list view.
