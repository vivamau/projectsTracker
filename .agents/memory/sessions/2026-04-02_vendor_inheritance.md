# Session: Inherit Vendor from PO for PO Items
Date: 2026-04-02

## Task
When creating PO items, the system was asking users to select the vendor for each item even though the vendor was already selected at the PO level. The vendor should be inherited from the PO.

## Decisions
- When PO has a vendor: lock vendor selection (show badge with Lock icon), auto-fetch contracts/resources
- When PO has no vendor: require vendor selection via dropdown (with validation)
- On edit: inherit PO vendor if item has no vendor data

## Changes
- `frontend/src/pages/budgets/PoItemsModal.jsx`:
  - Added `vendorLocked` state
  - Modified `openCreate`: auto-populates vendor from PO, pre-fetches contracts/resources
  - Modified `openEdit`: inherits PO vendor when available
  - Replaced vendor dropdown with locked badge (Lock icon + vendor name) when inherited
  - Added `required` attribute on vendor select when not locked
  - Added validation in `handleSaveItem`: prevents save if no vendor and not locked

## Results
- Frontend builds successfully
- 727 tests passing, 91.96% coverage
