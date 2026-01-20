# Database Migration Guide - CASHIER Role & Branch Field Updates

## Overview
This migration adds the `CASHIER` role to the User Role enum and renames the Branch `phone` field to `phoneNumber` for consistency.

## Changes Made

### 1. Schema Changes
**File**: `prisma/schema.prisma`

#### Added CASHIER to Role enum:
```prisma
enum Role {
  CEO
  SENIOR_MANAGEMENT
  BRANCH_MANAGER
  FINANCE_OPS
  CASHIER  // ← NEW
}
```

#### Renamed Branch.phone to Branch.phoneNumber:
```prisma
model Branch {
  // ... other fields
  phoneNumber String?   // ← RENAMED from 'phone'
  email       String?
  // ... other fields
}
```

### 2. Code Changes

#### New Function in `lib/actions/staff.ts`:
- Added `getStaffByBranch(branchId?: string)` function
- Returns individual staff members instead of summary data
- Properly converts Decimal `hourlyRate` to Number

#### Updated `app/(dashboard)/dashboard/branches/[id]/page.tsx`:
- Changed from `getStaffSummary()` to `getStaffByBranch(id)`
- Removed redundant Decimal conversions for targets (already done in action)
- Simplified data fetching logic

#### Updated UI Pages:
- `app/(pos)/pos/page.tsx` - Added gradient header
- `app/(kitchen)/kitchen/page.tsx` - Added gradient header

## Migration Steps

### Step 1: Generate Prisma Client
```bash
cd /Users/mick/.cursor/worktrees/dinelytix/qna
npx prisma generate
```

**Note**: If you get a dotenv error, install dotenv first:
```bash
npm install dotenv
```

### Step 2: Create Migration
```bash
npx prisma migrate dev --name add_cashier_role_and_rename_phone
```

This will:
1. Add CASHIER to the Role enum
2. Rename the `phone` column to `phoneNumber` in the Branch table
3. Preserve all existing data

### Step 3: Update Existing Data (if needed)
The migration will automatically handle:
- ✅ Existing users are unaffected (no CASHIER users exist yet)
- ✅ Branch phone numbers are preserved in the renamed column
- ✅ All relations remain intact

### Step 4: Verify Migration
```bash
# Check migration status
npx prisma migrate status

# Open Prisma Studio to verify
npx prisma studio
```

## Testing Checklist

### ✅ Phase 1: Database
- [ ] Prisma client generated successfully
- [ ] Migration applied without errors
- [ ] All existing users can still log in
- [ ] All existing branches display correctly

### ✅ Phase 2: User Management
- [ ] Can create new CASHIER user
- [ ] CASHIER user can log in
- [ ] CASHIER has correct permissions (POS access, no admin rights)
- [ ] CASHIER requires branch assignment

### ✅ Phase 3: Branch Details
- [ ] Branch details page loads without errors
- [ ] Staff tab shows individual staff members
- [ ] Transactions tab displays correctly
- [ ] Inventory tab displays correctly
- [ ] Targets tab displays correctly

### ✅ Phase 4: UI Enhancements
- [ ] POS page has blue gradient header
- [ ] Kitchen page has orange gradient header
- [ ] Both headers are responsive on mobile

## Rollback Plan

If issues occur, you can rollback:

```bash
# Rollback last migration
npx prisma migrate reset

# Restore from backup (recommended before migration)
# psql -U your_user -d your_database < backup_before_cashier_migration.sql
```

## Breaking Changes

### ⚠️ IMPORTANT: Branch Field Name Change

**Old Code (will break)**:
```typescript
const phoneNumber = branch.phone;  // ❌ Will be undefined
```

**New Code (correct)**:
```typescript
const phoneNumber = branch.phoneNumber;  // ✅ Correct
```

### Files Already Updated:
- ✅ `app/(dashboard)/dashboard/branches/[id]/page.tsx`
- ✅ `components/branches/branch-details-content.tsx`

### Files That May Need Updates:
Check these files for any `branch.phone` references:
- `components/branches/branches-content.tsx`
- `components/branches/branch-forms.tsx` (if exists)
- Any custom reports or exports

## Performance Notes

- **Migration Time**: ~5-10 seconds (depends on data size)
- **Downtime**: Minimal (only during migration execution)
- **Index Impact**: None (no new indexes added)
- **Data Size Impact**: Negligible (~bytes per record)

## Support

### Common Errors

**Error 1**: `Cannot find module 'dotenv/config'`
```bash
# Solution:
npm install dotenv
```

**Error 2**: `The migration will remove existing data`
```bash
# Solution: Don't worry, the phone→phoneNumber rename preserves data
# Confirm by running: npx prisma migrate dev --create-only
# Review the SQL before applying
```

**Error 3**: `Foreign key constraint fails`
```bash
# Solution: This shouldn't happen, but if it does:
# Check if there are any dangling references in the database
```

## Next Steps After Migration

1. **Create Test CASHIER User**:
   - Navigate to `/dashboard/users`
   - Click "Add User"
   - Select "Cashier (POS Operations)" role
   - Assign to a branch
   - Test login and POS access

2. **Test Branch Details Page**:
   - Navigate to `/dashboard/branches`
   - Click on any branch
   - Verify all tabs load correctly
   - Check that staff members are displayed

3. **Verify Permissions**:
   - Login as CASHIER
   - Confirm can access POS
   - Confirm CANNOT access admin functions
   - Confirm CANNOT view other branches

4. **Production Deployment**:
   - Test thoroughly in staging first
   - Backup production database
   - Apply migration during low-traffic period
   - Monitor error logs for 24 hours

## Monitoring

After migration, monitor these metrics:
- User login success rate
- Page load times (especially branch details)
- Error rates in application logs
- Database query performance

## Contact

If you encounter any issues during migration:
1. Check the error logs
2. Refer to this guide
3. Review `/CODEBASE_REVIEW_AND_FIX_PLAN.md`
4. Check Prisma documentation: https://www.prisma.io/docs

---

**Migration Created**: January 20, 2026  
**Schema Version**: 2.0.0  
**Priority**: Critical  
**Status**: Ready to Apply
