# Encryption Setup Guide

This document clarifies the encryption setup for integration API keys using pgsodium in Supabase.

## Current Implementation

### Database Migration (`001_create_integrations.sql`)

1. **Enables pgsodium extension**: `CREATE EXTENSION IF NOT EXISTS pgsodium;`
2. **Creates encryption key in database**: Uses `pgsodium.create_key()` to create a named key `integrations_api_key_encryption`
3. **Creates encryption/decryption functions**: PostgreSQL functions that use pgsodium to encrypt/decrypt API keys

### Key Points

- **No environment variable needed** for basic pgsodium setup in Supabase
- The encryption key is created and stored **in the database** (in `pgsodium.key` table)
- Encryption/decryption happens **server-side** via PostgreSQL functions
- API keys are **never exposed in plaintext** to the client

## Environment Variables

### Required Variables (Already Set)

These are standard Supabase variables that should already be configured:

```env
# .env.local (for local development)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For server-side operations
```

### Optional: pgsodium Root Key (If Needed)

If the zola-aisdkv5 implementation uses a custom root key pattern, you might need:

```env
# Only if zola-aisdkv5 uses this pattern
PGSODIUM_ROOT_KEY=your-root-key-here
```

**However**, Supabase typically manages pgsodium root keys internally, so this is usually **NOT needed**.

## Vercel Configuration

### Environment Variables to Set in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables (if not already set):
   - `NEXT_PUBLIC_SUPABASE_URL` (Production, Preview, Development)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production, Preview, Development)
   - `SUPABASE_SERVICE_ROLE_KEY` (Production, Preview, Development) - **Mark as sensitive**

### No Additional Encryption Key Needed

Unless zola-aisdkv5 uses a specific root key pattern, **no additional encryption key environment variable is needed** because:
- pgsodium creates and manages keys in the database
- The migration creates the encryption key automatically
- Supabase handles the root key internally

## Verification Steps

### 1. Run the Migration

```bash
# Apply the migration to your Supabase database
# This will:
# - Enable pgsodium extension
# - Create the integrations table
# - Create the encryption key
# - Create encryption/decryption functions
```

### 2. Verify Encryption Key Exists

Run this SQL in Supabase SQL Editor:

```sql
SELECT id, name, created FROM pgsodium.key WHERE name = 'integrations_api_key_encryption';
```

You should see one row with the key.

### 3. Test Encryption/Decryption

Run this SQL to test:

```sql
-- Test encryption
SELECT encrypt_api_key('test-api-key-123');

-- Test decryption (use the BYTEA result from above)
SELECT decrypt_api_key('\x...'); -- Replace with actual encrypted value
```

### 4. Test via API

1. Connect an integration via the UI
2. Check Supabase database - `api_key_encrypted` should contain encrypted BYTEA
3. Try syncing - decryption should work automatically

## Troubleshooting

### Error: "Encryption key not found"

**Cause**: The migration hasn't been run or the key wasn't created.

**Fix**: 
1. Run the migration: `001_create_integrations.sql`
2. Verify key exists: `SELECT * FROM pgsodium.key WHERE name = 'integrations_api_key_encryption';`
3. If missing, manually create it:
   ```sql
   PERFORM pgsodium.create_key(
     name := 'integrations_api_key_encryption',
     raw_key := pgsodium.randombytes_buf(32)
   );
   ```

### Error: "pgsodium extension not enabled"

**Cause**: pgsodium extension not enabled in Supabase.

**Fix**: Run `CREATE EXTENSION IF NOT EXISTS pgsodium;` in Supabase SQL Editor.

### Error: "Function encrypt_api_key does not exist"

**Cause**: Migration not fully applied.

**Fix**: Re-run the migration `001_create_integrations.sql` completely.

## Differences from zola-aisdkv5

If zola-aisdkv5 uses a different pattern, check for:

1. **Root key in environment variable**: They might use `PGSODIUM_ROOT_KEY` env var
2. **Different key creation method**: They might create keys differently
3. **Different function signatures**: Their encrypt/decrypt functions might have different parameters
4. **BYTEA handling**: They might pass BYTEA differently to RPC functions

## Next Steps

1. **Verify zola-aisdkv5 pattern**: Check their `data-integrations-complete` branch for:
   - Migration files in `supabase/migrations/`
   - Encryption utilities in `lib/integrations/` or similar
   - Environment variable usage
   
2. **Align if needed**: If they use a different pattern, update our implementation to match

3. **Test thoroughly**: Test encryption/decryption end-to-end before production use

