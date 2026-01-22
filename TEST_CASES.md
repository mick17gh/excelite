# Dinelytix End-to-End Test Cases

## Test Environment Setup
- **Login Credentials**: mike17gh@gmail.com / pass1234
- **Role**: CEO (Full Access)
- **Database**: Fresh/Clean (no existing data)

---

## 1. Authentication & User Management

### Test Case 1.1: Login Flow
**Objective**: Verify user can successfully log in and access the dashboard

**Steps**:
1. Navigate to `/login`
2. Enter email: `mike17gh@gmail.com`
3. Enter password: `pass1234`
4. Click "Sign In"
5. Verify redirect to `/dashboard`
6. Verify user name "Mike" appears in header
7. Verify CEO role permissions are active

**Expected Result**: Successfully logged in with full dashboard access

### Test Case 1.2: User Creation
**Objective**: Create additional users with different roles

**Steps**:
1. Navigate to `/dashboard/users`
2. Click "Add User" button
3. Fill in user details:
   - Name: "Sarah Manager"
   - Email: "sarah@test.com"
   - Role: "BRANCH_MANAGER"
   - Phone: "+233 24 123 4567"
4. Click "Create User"
5. Verify user appears in users list
6. Repeat for other roles (FINANCE_OPS, CASHIER, etc.)

**Expected Result**: Users created successfully with appropriate role permissions

---

## 2. Branch Management

### Test Case 2.1: Create First Branch
**Objective**: Set up the first restaurant branch

**Steps**:
1. Navigate to `/dashboard/branches`
2. Click "Add Branch" button
3. Fill in branch details:
   - Name: "Accra Central"
   - Code: "AC-001"
   - Address: "15 Oxford Street, Osu"
   - City: "Accra"
   - State: "Greater Accra"
   - Country: "Ghana"
   - Currency: "GHS"
   - Phone: "+233 30 277 0001"
   - Email: "accra@test.com"
   - Timezone: "Africa/Accra"
4. Set opening date
5. Click "Create Branch"
6. Verify branch appears in branches list
7. Verify branch status shows as "Active"

**Expected Result**: Branch created successfully and visible in dashboard

### Test Case 2.2: Create Multiple Branches
**Objective**: Create additional branches for multi-location testing

**Steps**:
1. Create "East Legon" branch (EL-002)
2. Create "Kumasi Mall" branch (KM-003)
3. Create "Tema Harbour" branch (TH-004)
4. Verify all branches appear in branches list
5. Test branch switching functionality
6. Verify branch-specific data isolation

**Expected Result**: Multiple branches created with proper data separation

---

## 3. Staff Management

### Test Case 3.1: Add Staff to Branch
**Objective**: Create staff members for each branch

**Steps**:
1. Navigate to `/dashboard/staff`
2. Select "Accra Central" branch
3. Click "Add Staff" button
4. Fill in staff details:
   - Employee ID: "EMP-AC-001"
   - First Name: "John"
   - Last Name: "Smith"
   - Email: "john.smith@test.com"
   - Role: "MANAGER"
   - Hourly Rate: 25.00
   - Hire Date: Current date
5. Click "Create Staff"
6. Repeat for different roles (KITCHEN, SERVICE, CASHIER)
7. Verify staff appears in staff list for selected branch

**Expected Result**: Staff members created and assigned to correct branch

### Test Case 3.2: Staff Scheduling
**Objective**: Create and manage staff schedules

**Steps**:
1. Navigate to staff scheduling section
2. Create weekly schedule for "John Smith"
3. Set work hours (e.g., 9 AM - 5 PM, Monday-Friday)
4. Assign shifts to other staff members
5. Verify schedule conflicts are detected
6. Test schedule modification
7. Verify labor cost calculations

**Expected Result**: Schedules created with proper conflict detection and cost calculation

---

## 4. Menu Management

### Test Case 4.1: Create Menu Categories
**Objective**: Set up menu structure with categories

**Steps**:
1. Navigate to `/dashboard/menu`
2. Create categories:
   - "Appetizers"
   - "Main Courses"
   - "Beverages"
   - "Desserts"
3. Verify categories appear in menu structure

**Expected Result**: Menu categories created successfully

### Test Case 4.2: Add Menu Items
**Objective**: Create menu items with pricing and cost information

**Steps**:
1. Click "Add Menu Item"
2. Fill in item details:
   - Name: "Grilled Tilapia"
   - SKU: "MENU-001"
   - Category: "Main Courses"
   - Price: 45.00 GHS
   - Cost: 20.00 GHS
   - Description: "Fresh tilapia with local spices"
3. Upload item image (optional)
4. Set as active
5. Click "Create Item"
6. Repeat for 10-15 different menu items
7. Verify items appear in menu list
8. Test item editing and deactivation

**Expected Result**: Menu items created with proper pricing and categorization

---

## 5. Inventory Management

### Test Case 5.1: Create Inventory Categories
**Objective**: Set up inventory categorization system

**Steps**:
1. Navigate to `/dashboard/categories`
2. Create inventory categories:
   - "FOOD" - Fresh ingredients
   - "BEVERAGE" - Drinks and liquids
   - "SUPPLIES" - Kitchen supplies
   - "CLEANING" - Cleaning materials
3. Verify categories are available in inventory creation

**Expected Result**: Inventory categories created and usable

### Test Case 5.2: Add Inventory Items
**Objective**: Create inventory items with stock management

**Steps**:
1. Navigate to `/dashboard/inventory`
2. Select "Accra Central" branch
3. Click "Add Item"
4. Fill in inventory details:
   - Name: "Tilapia Fish"
   - SKU: "INV-FISH-001"
   - Category: "FOOD"
   - Unit: "KG"
   - Unit Cost: 15.00 GHS
   - Current Stock: 50
   - Min Stock: 10
   - Max Stock: 100
   - Reorder Point: 20
5. Click "Create Item"
6. Repeat for various inventory items (rice, oil, vegetables, etc.)
7. Test stock level alerts
8. Verify low stock notifications

**Expected Result**: Inventory items created with proper stock tracking

### Test Case 5.3: Stock Movements
**Objective**: Test inbound and outbound stock operations

**Steps**:
1. Select an inventory item
2. Record inbound stock (delivery):
   - Quantity: 25 KG
   - Supplier: "Fresh Foods Ghana"
   - Cost per unit: 15.00 GHS
   - Notes: "Weekly delivery"
3. Record outbound stock (usage):
   - Quantity: 5 KG
   - Reason: "Daily consumption"
   - Notes: "Kitchen usage"
4. Verify stock levels update correctly
5. Check stock movement history
6. Verify cost calculations (FIFO/LIFO)

**Expected Result**: Stock movements recorded accurately with proper cost tracking

---

## 6. Sales & Transactions

### Test Case 6.1: Manual Transaction Entry
**Objective**: Record sales transactions manually

**Steps**:
1. Navigate to `/dashboard/transactions/manual`
2. Select "Accra Central" branch
3. Create new transaction:
   - Add menu items to order
   - Set quantities
   - Apply any discounts
   - Select payment method (Cash/Card/Mobile Money)
   - Add customer information (optional)
4. Complete transaction
5. Verify transaction appears in sales dashboard
6. Check inventory deduction (if linked)

**Expected Result**: Transaction recorded with proper sales and inventory impact

### Test Case 6.2: Daily Sales Summary
**Objective**: Verify sales reporting and analytics

**Steps**:
1. Navigate to `/dashboard/sales`
2. Select date range (today)
3. Select "Accra Central" branch
4. Verify sales metrics:
   - Total revenue
   - Number of transactions
   - Average order value
   - Top-selling items
5. Test different date ranges
6. Compare branch performance
7. Export sales report

**Expected Result**: Accurate sales reporting with proper calculations

---

## 7. Reporting & Analytics

### Test Case 7.1: Executive Dashboard
**Objective**: Verify high-level analytics and KPIs

**Steps**:
1. Navigate to `/dashboard` (main page)
2. Verify dashboard widgets display:
   - Total revenue across all branches
   - Active branches count
   - Recent transactions
   - Inventory alerts
   - Staff on duty
3. Test date range filters
4. Verify real-time updates
5. Test branch comparison charts

**Expected Result**: Dashboard shows accurate, real-time business metrics

### Test Case 7.2: Detailed Reports
**Objective**: Generate comprehensive business reports

**Steps**:
1. Navigate to `/dashboard/reports`
2. Generate reports:
   - Daily Sales Report
   - Inventory Valuation Report
   - Staff Performance Report
   - Profit & Loss Summary
3. Test different date ranges
4. Filter by branch
5. Export reports (PDF/Excel)
6. Verify calculation accuracy

**Expected Result**: Reports generated with accurate data and proper formatting

---

## 8. Alerts & Notifications

### Test Case 8.1: Inventory Alerts
**Objective**: Test automated alert system

**Steps**:
1. Reduce inventory item below reorder point
2. Verify low stock alert appears
3. Navigate to `/dashboard/alerts`
4. Verify alert details and severity
5. Test alert acknowledgment
6. Test alert resolution

**Expected Result**: Alerts triggered automatically and manageable through UI

### Test Case 8.2: Sales Performance Alerts
**Objective**: Test business performance monitoring

**Steps**:
1. Set daily sales targets for branches
2. Monitor for sales drop alerts
3. Test exceptional performance notifications
4. Verify alert escalation rules
5. Test email notifications (if configured)

**Expected Result**: Performance alerts work correctly with proper thresholds

---

## 9. Multi-Branch Operations

### Test Case 9.1: Branch Comparison
**Objective**: Compare performance across multiple branches

**Steps**:
1. Ensure data exists for multiple branches
2. Navigate to branch comparison view
3. Compare metrics:
   - Sales performance
   - Inventory turnover
   - Staff productivity
   - Profit margins
4. Test different time periods
5. Identify top and bottom performers

**Expected Result**: Accurate cross-branch analytics and comparisons

### Test Case 9.2: Inter-Branch Transfers
**Objective**: Test inventory transfers between branches

**Steps**:
1. Navigate to inventory transfer section
2. Create transfer from "Accra Central" to "East Legon"
3. Select items and quantities
4. Process transfer
5. Verify stock deduction from source
6. Verify stock addition to destination
7. Check transfer audit trail

**Expected Result**: Transfers processed correctly with proper audit trail

---

## 10. User Permissions & Security

### Test Case 10.1: Role-Based Access
**Objective**: Verify different user roles have appropriate access

**Steps**:
1. Log out as CEO
2. Log in as BRANCH_MANAGER
3. Verify limited access:
   - Can only see assigned branch
   - Cannot access user management
   - Cannot modify system settings
4. Test CASHIER role limitations
5. Test FINANCE_OPS permissions

**Expected Result**: Role permissions enforced correctly

### Test Case 10.2: Data Security
**Objective**: Ensure data isolation and security

**Steps**:
1. Verify branch managers can't see other branches
2. Test API endpoint security
3. Verify session management
4. Test password reset functionality
5. Verify audit logging for sensitive actions

**Expected Result**: Proper security measures in place

---

## 11. Performance & Scalability

### Test Case 11.1: Large Dataset Handling
**Objective**: Test system performance with substantial data

**Steps**:
1. Create 100+ inventory items
2. Generate 500+ transactions
3. Add 50+ staff members across branches
4. Test dashboard load times
5. Test report generation speed
6. Verify search and filter performance

**Expected Result**: System performs well with large datasets

---

## 12. Integration Testing

### Test Case 12.1: End-to-End Business Flow
**Objective**: Complete business cycle from setup to reporting

**Steps**:
1. Set up complete restaurant (branches, staff, menu, inventory)
2. Process daily operations (sales, inventory usage, staff scheduling)
3. Generate end-of-day reports
4. Review alerts and take actions
5. Plan next day operations
6. Verify data consistency across all modules

**Expected Result**: Complete business workflow functions seamlessly

---

## Success Criteria

✅ **All test cases pass without critical errors**
✅ **Data consistency maintained across all operations**
✅ **Role-based permissions work correctly**
✅ **Real-time updates function properly**
✅ **Reports generate accurate data**
✅ **System handles multi-branch operations**
✅ **Performance acceptable with realistic data volumes**

---

## Test Data Cleanup

After testing, you can reset the database by running:
```bash
npx prisma db push --force-reset
npx tsx prisma/seed.ts
```

This will restore the clean state with just your admin user account.
