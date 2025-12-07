/**
 * Integration API key encryption utilities
 * Uses Supabase pgsodium extension (similar to zola-aisdkv5/data-integrations-complete)
 * 
 * Note: Encryption/decryption happens server-side via PostgreSQL functions
 * The API key is never exposed in plaintext to the client
 */

import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * Encrypt an API key using Supabase pgsodium
 * This calls the database function that handles encryption server-side
 * Returns the encrypted BYTEA as base64 string
 */
export async function encryptApiKey(apiKey: string): Promise<string> {
  const supabase = await createServerSupabaseClient()
  
  // Call the encrypt_api_key PostgreSQL function
  const { data, error } = await supabase.rpc('encrypt_api_key', {
    api_key: apiKey,
  })

  if (error) {
    console.error('Encryption error:', error)
    throw new Error(`Failed to encrypt API key: ${error.message}`)
  }

  if (!data) {
    throw new Error('Encryption returned no data')
  }

  // The function returns BYTEA, convert to base64 for storage/transmission
  if (data instanceof Uint8Array || Buffer.isBuffer(data)) {
    return Buffer.from(data).toString('base64')
  }
  
  // If already a string (base64), return as-is
  return data as string
}

/**
 * Decrypt an API key using Supabase pgsodium
 * This calls the database function that handles decryption server-side
 * Takes base64 string, converts to BYTEA, decrypts, returns plaintext
 */
export async function decryptApiKey(encryptedKeyBase64: string): Promise<string> {
  const supabase = await createServerSupabaseClient()
  
  // Convert base64 string to Buffer (BYTEA)
  const encryptedBytes = Buffer.from(encryptedKeyBase64, 'base64')
  
  // Call the decrypt_api_key PostgreSQL function
  // Supabase RPC accepts BYTEA as Buffer/Uint8Array directly
  // We pass it as a Buffer which Supabase will convert to BYTEA
  const { data, error } = await supabase.rpc('decrypt_api_key', {
    encrypted_key: encryptedBytes,
  })

  if (error) {
    console.error('Decryption error:', error)
    throw new Error(`Failed to decrypt API key: ${error.message}`)
  }

  if (!data) {
    throw new Error('Decryption returned no data')
  }

  return data as string
}

