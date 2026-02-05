# Manual Testing Guide - BUG-001 & BUG-003 Fixes

## BUG-001: Database Initialization Error Handling

### Test Scenario 1: Simulate Database Failure
**Objective**: Verify that database initialization failure shows error dialog and exits

**Steps**:
1. Locate the database file (typically in userData folder)
2. Create a file with no write permissions or corrupt the database
3. Start the application
4. **Expected Result**: 
   - Error dialog appears: "Database Initialization Failed"
   - Error message includes details
   - Application exits cleanly without crashing

### Test Scenario 2: Normal Startup
**Objective**: Verify normal operation still works

**Steps**:
1. Ensure database file is accessible or doesn't exist (will be created)
2. Start the application
3. **Expected Result**: 
   - Application starts normally
   - No error dialogs
   - Database functionality works

---

## BUG-003: Subscription Renewal with Quota Tracking

### Test Scenario 1: Basic Renewal
**Objective**: Verify subscription renewal creates new quota and deactivates old

**Steps**:
1. Create a new member with a 1-month subscription
2. Wait a moment or advance system time
3. Renew the subscription for 3 months
4. Check database:
   ```sql
   -- Should show only 1 active subscription
   SELECT * FROM subscriptions WHERE member_id = '<ID>' AND is_active = 1;
   
   -- Should show 2 quotas: old (ended) and new (active)
   SELECT * FROM quotas WHERE member_id = '<ID>';
   ```
5. **Expected Result**:
   - Only 1 active subscription exists
   - Old subscription is deactivated (is_active = 0)
   - Old quota has cycle_end set to renewal time
   - New quota created with sessions_used = 0

### Test Scenario 2: Renewal Preserves History
**Objective**: Verify old quota usage is preserved

**Steps**:
1. Create member with subscription
2. Record some gym sessions (increment sessions_used)
3. Renew subscription
4. Check old quota:
   ```sql
   SELECT * FROM quotas WHERE member_id = '<ID>' ORDER BY cycle_start;
   ```
5. **Expected Result**:
   - Old quota still shows sessions_used count
   - Old quota has ended cycle (cycle_end in the past)
   - New quota starts fresh with sessions_used = 0

### Test Scenario 3: Renewal Without Previous Subscription
**Objective**: Verify renewal works as first subscription

**Steps**:
1. Create a new member (no subscription)
2. Call renewSubscription (acts as first subscription)
3. Check database
4. **Expected Result**:
   - Subscription created successfully
   - Quota created with proper session cap
   - No errors thrown

### Test Scenario 4: Concurrent Renewal Attempts
**Objective**: Verify transaction atomicity prevents race conditions

**Steps**:
1. Create member with subscription
2. Attempt to renew subscription twice rapidly
3. **Expected Result**:
   - Only 1 new subscription created
   - Database remains consistent
   - No duplicate quotas or subscriptions

### Test Scenario 5: Gender-Based Session Caps
**Objective**: Verify new quota uses correct session cap

**Steps**:
1. Create male member, renew subscription → check quota has sessions_cap = 26
2. Create female member, renew subscription → check quota has sessions_cap = 30
3. **Expected Result**:
   - Session caps match gender settings
   - Settings are properly read during renewal

---

## Database Queries for Verification

```sql
-- Check subscription status
SELECT 
  s.*,
  m.name,
  m.gender
FROM subscriptions s
JOIN members m ON s.member_id = m.id
WHERE s.member_id = '<MEMBER_ID>'
ORDER BY s.created_at DESC;

-- Check quota history
SELECT 
  q.*,
  s.is_active as sub_active,
  s.plan_months
FROM quotas q
JOIN subscriptions s ON q.subscription_id = s.id
WHERE q.member_id = '<MEMBER_ID>'
ORDER BY q.cycle_start DESC;

-- Check for orphaned quotas (should be none)
SELECT q.*
FROM quotas q
LEFT JOIN subscriptions s ON q.subscription_id = s.id
WHERE s.id IS NULL OR s.is_active = 0
  AND q.cycle_end > unixepoch();

-- Verify only one active subscription per member
SELECT member_id, COUNT(*) as active_count
FROM subscriptions
WHERE is_active = 1
GROUP BY member_id
HAVING active_count > 1;
```

---

## Known Behaviors

### Expected Behavior
1. **Renewal creates new subscription**: Always starts from current time
2. **Old quotas preserved**: Historical data maintained for reporting
3. **Atomic operation**: All or nothing - no partial states
4. **Session cap applied**: Based on member gender and settings

### What Changed
- **Before**: Renewals left active quota cycles orphaned
- **After**: Old cycles properly ended, new cycles created

### Performance Notes
- Transaction ensures atomicity but may have slight performance overhead
- Operation is still very fast (< 10ms typically)
- No impact on application responsiveness

---

## Troubleshooting

### If database error dialog appears:
1. Check userData folder permissions
2. Verify disk space available
3. Check database file is not locked by another process
4. Review application logs for detailed error

### If quota tracking seems wrong:
1. Run orphaned quotas query above
2. Check subscription is_active status
3. Verify quota cycle_start and cycle_end dates
4. Ensure member exists and has correct gender

### If tests fail:
1. Ensure better-sqlite3 is properly installed
2. Run: `npm run rebuild:node`
3. Check Node.js version compatibility
4. Review test output for specific assertion failures
