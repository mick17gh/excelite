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
    {
      "id": "clx...",
      "name": "Main Branch",
      "code": "MAIN",
      "currency": "GHS",
      "taxRate": 0.125,
      "taxInclusive": true
    }
  ],
  "checkout": {
    "currency": "GHS",
    "minimumOrderAmount": 0,
    "deliveryFee": 0,
    "taxRate": 0.125,
    "taxInclusive": true
  }
}
```

Use `store.logoUrl` in the header; omit or fallback when `null`.

### Tax (per branch)

Each entry in `branches` includes that branch's tax settings:

| Field | Type | Description |
|-------|------|-------------|
| `taxRate` | number | Decimal rate (e.g. `0.125` = 12.5%). `0` when tax is disabled. |
| `taxInclusive` | boolean | `true` = menu prices include tax; `false` = tax added at checkout. |
| `currency` | `"GHS"` \| `"NGN"` | Branch currency for totals. |

After the customer selects a branch, read tax from `branches.find(b => b.id === branchId)` — **not** from top-level `checkout.taxRate` / `checkout.taxInclusive` (those mirror the first branch only and are deprecated).

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
2. User selects branch → store `branchId` in session/state; cache that branch's `taxRate`, `taxInclusive`, and `currency` for cart totals.
3. Load **menu** with `?branchId=...` → render categories and items.
4. On branch change, refetch menu, update tax settings from the new branch, and clear cart lines that are no longer available.
5. Create order with the same `branchId` (existing orders API already requires it).

## Paystack checkout

When `features.paystackEnabled` is true in config, each branch exposes `paystackConfigured`:

| Field | Type | Description |
|-------|------|-------------|
| `paystackConfigured` | boolean | `true` when this branch has a linked Paystack subaccount and card checkout is allowed for that branch. |

Only show the Paystack payment option when the customer's selected branch has `paystackConfigured: true`. Admins link or create subaccounts under **Dashboard → Branches → [branch] → Payments**.

Initialize payments with the order's `branchId`; the server routes 100% of funds to that branch's subaccount.

## Orders

`POST /api/public/store/{organizationId}/orders` validates that each line item is available at `branchId`. Forcing unavailable item IDs returns an error from the server.

## Admin / CSV

Products imported or edited in the dashboard support `visibleAtAllBranches` and `branches` CSV columns; behavior matches manual product setup.
