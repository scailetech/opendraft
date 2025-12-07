# Supabase Migrations

## Integration Migrations (New)

These migrations set up the integrations and context features:

1. **001_create_integrations.sql**
   - Creates `integrations` table
   - Sets up pgsodium encryption
   - Creates encryption/decryption functions

2. **002_create_integration_syncs.sql**
   - Creates `integration_syncs` table for tracking sync operations

3. **003_create_integration_data.sql**
   - Creates `integration_data` table for caching synced data

4. **004_create_storage_policies.sql**
   - Creates RLS policies for `context-files` storage bucket
   - **Note**: Bucket must be created first (run `node scripts/setup-storage-bucket.js`)

## Existing Migrations

The following migrations are from the original codebase and should not be modified:

- `002_lead_finder_tables.sql` - Lead finder feature
- `003_add_token_tracking.sql` - Token tracking
- `20251029*` - API keys and usage tracking
- `20251031*` - Batch RLS fixes
- `20251106*` - Beta limits and polling
- `20251110*` - Tools column
- `20251113*` - Selected input columns

## Migration Order

Run migrations in this order:
1. All existing migrations (already applied)
2. `001_create_integrations.sql`
3. `002_create_integration_syncs.sql`
4. `003_create_integration_data.sql`
5. Create storage bucket (via script or Dashboard)
6. `004_create_storage_policies.sql`

## Notes

- Migrations use `IF NOT EXISTS` where possible for idempotency
- Storage bucket creation cannot be done via SQL (must use script or Dashboard)
- Encryption uses pgsodium with pgcrypto for key generation

