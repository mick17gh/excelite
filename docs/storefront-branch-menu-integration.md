# Online store: branch menu and branding

## Overview

The public storefront uses one organization-wide product catalog. Each product can be visible at **all branches** or **selected branches only**. After the customer picks a branch, fetch the menu filtered for that branch.

Organization logo from Settings → Organization (`storeLogoUrl`) is exposed on the store config as `store.logoUrl`.

## Config (`GET /api/public/store/{organizationId}/config`)

```json
{
  "store": {
    "name": "My Restaurant",
    "logoUrl": "https://cdn.example.com/logo.png"
  },
  "branches": [
    { "id": "clx...", "name": "Main Branch", "code": "MAIN" }
  ]
}
```

Use `store.logoUrl` in the header; omit or fallback when `null`.

## Menu (`GET /api/public/store/{organizationId}/menu`)

| Query param   | Required | Description                                      |
|---------------|----------|--------------------------------------------------|
| `branchId`    | Recommended | Branch selected at checkout; filters visibility |
| `categoryId`  | No       | Optional category filter                         |

Example:

```
GET /api/public/store/{orgId}/menu?branchId={branchId}
```

- Without `branchId`, all active products are returned (legacy behavior).
- With `branchId`, only items visible at that branch are returned.
- Invalid `branchId` (not in config `branches`) → `400`.

## Recommended client flow

1. Load **config** → show logo, list `branches` for picker.
2. User selects branch → store `branchId` in session/state.
3. Load **menu** with `?branchId=...` → render categories and items.
4. On branch change, refetch menu and clear cart lines that are no longer available.
5. Create order with the same `branchId` (existing orders API already requires it).

## Orders

`POST /api/public/store/{organizationId}/orders` validates that each line item is available at `branchId`. Forcing unavailable item IDs returns an error from the server.

## Admin / CSV

Products imported or edited in the dashboard support `visibleAtAllBranches` and `branches` CSV columns; behavior matches manual product setup.
