import { useCallback } from 'react'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { toast } from 'sonner'

export interface ApiKey {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

const fetcher = async (): Promise<ApiKey[]> => {
  const response = await fetch('/api/keys')
  if (!response.ok) {
    throw new Error('Failed to load API keys')
  }
  const data = await response.json()
  return data.keys || []
}

export function useApiKeys() {
  const { data: keys = [], isLoading, error, mutate } = useSWR<ApiKey[], Error>(
    'api-keys',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      revalidateOnMount: false,
      dedupingInterval: 5000,
      keepPreviousData: true,
      fallbackData: [],
    }
  )

  const { trigger: createKey } = useSWRMutation(
    'api-keys',
    async (_key, { arg }: { arg: { name: string } }) => {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: arg.name }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create API key')
      }

      const data = await response.json()
      const newKey = data.key || data
      
      // Optimistically add to cache
      mutate((current = []) => [newKey, ...current], false)
      
      toast.success('API key created')
      return newKey
    }
  )

  const { trigger: revokeKey } = useSWRMutation(
    'api-keys',
    async (_key, { arg }: { arg: { keyId: string } }) => {
      const response = await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: arg.keyId }),
      })

      if (!response.ok) {
        throw new Error('Failed to revoke API key')
      }

      // Optimistically remove from cache
      mutate((current = []) => current.filter(k => k.id !== arg.keyId), false)
      
      toast.success('API key revoked')
    }
  )

  const createApiKey = useCallback(
    async (name: string) => {
      try {
        return await createKey({ name })
      } catch (error) {
        mutate() // Rollback on error
        throw error
      }
    },
    [createKey, mutate]
  )

  const revokeApiKey = useCallback(
    async (keyId: string) => {
      try {
        await revokeKey({ keyId })
      } catch (error) {
        mutate() // Rollback on error
        throw error
      }
    },
    [revokeKey, mutate]
  )

  return {
    keys,
    isLoading,
    error,
    createApiKey,
    revokeApiKey,
    refreshKeys: mutate,
  }
}

