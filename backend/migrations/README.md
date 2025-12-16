# Database Migrations

## Running Migrations

### Step 1: Create System Config Table

Run the updated `schema.sql` file in your PostgreSQL database. This will:

- Create the `system_config` table
- Add `config_version` column to `feedback` table
- Create necessary indexes

### Step 2: Seed Initial Configuration

Run the seed script to populate version 1 of the system configuration:

```bash
psql -U your_username -d your_database -f seed_initial_config.sql
```

Or in pgAdmin:

1. Open Query Tool
2. Copy and paste the contents of `seed_initial_config.sql`
3. Execute

### Verification

After running migrations, verify:

```sql
-- Check system_config table exists and has data
SELECT version, is_active, created_at, change_notes
FROM system_config
ORDER BY version;

-- Check feedback table has config_version column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'feedback' AND column_name = 'config_version';

-- Verify active config
SELECT version, config_data->'categories' as categories
FROM system_config
WHERE is_active = true;
```

Expected result: One row in `system_config` with `version = 1` and `is_active = true`.
