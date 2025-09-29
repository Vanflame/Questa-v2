# Database Migration Guide

## Issue
The `group_id` column is missing from your `todoemails` table, which is required for the new group functionality.

## Solution
Run the following SQL commands in your Supabase SQL editor to add the missing columns:

### Step 1: Add the missing columns
```sql
ALTER TABLE todoemails 
ADD COLUMN IF NOT EXISTS group_id TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
```

### Step 2: Update existing emails
```sql
-- Set default group_id for existing emails
UPDATE todoemails 
SET group_id = 'active' 
WHERE group_id IS NULL;

-- Set default status for existing emails
UPDATE todoemails 
SET status = 'active' 
WHERE status IS NULL;
```

### Step 3: Verify the changes
```sql
-- Check the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'todoemails'
ORDER BY ordinal_position;
```

## How to run this migration:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the SQL commands above
5. Run the query
6. Refresh your application

## What this adds:

- **group_id**: Text field to store which group an email belongs to (defaults to 'active')
- **status**: Text field to store the email status (defaults to 'active')

After running this migration, the group functionality will work properly and you'll be able to:
- Move emails between groups
- Use bulk move operations
- Organize emails by groups
