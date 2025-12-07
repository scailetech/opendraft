import { useCallback } from 'react'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { toast } from 'sonner'

export interface SavedPrompt {
  id: string
  name: string
  prompt: string
  description?: string | null
  tags?: string[] | null
  created_at: string
  updated_at: string
  usage_count: number
  last_used_at?: string | null
}

export interface UseSavedPromptsReturn {
  prompts: SavedPrompt[]
  isLoading: boolean
  savePrompt: (name: string, prompt: string, description?: string, tags?: string[]) => Promise<SavedPrompt | null>
  updatePrompt: (id: string, name: string, prompt: string, description?: string, tags?: string[]) => Promise<SavedPrompt | null>
  deletePrompt: (id: string) => Promise<void>
  loadPrompts: () => Promise<void>
  recordUsage: (id: string) => Promise<void>
}

// Fetcher function with performance logging
const fetcher = async (url: string) => {
  const startTime = performance.now()
  const res = await fetch(url)
  const fetchTime = performance.now() - startTime
  
  if (!res.ok) {
    throw new Error('Failed to fetch')
  }
  
  const parseStart = performance.now()
  const data = await res.json()
  const parseTime = performance.now() - parseStart
  const totalTime = performance.now() - startTime
  
  console.log(`[PERF] Saved prompts fetch:`, {
    fetch: `${fetchTime.toFixed(2)}ms`,
    parse: `${parseTime.toFixed(2)}ms`,
    total: `${totalTime.toFixed(2)}ms`,
  })
  
  return data.prompts || []
}

export function useSavedPrompts(): UseSavedPromptsReturn {
  // Auto-caching, revalidation, deduplication with SWR
  const { data: prompts = [], isLoading, mutate } = useSWR('/api/prompts', fetcher, {
    revalidateOnFocus: false, // Don't refetch on window focus
    revalidateOnReconnect: false, // Don't refetch on reconnect
    dedupingInterval: 5000, // Dedupe requests within 5s
    revalidateIfStale: false, // Don't revalidate stale data automatically (use cache)
    keepPreviousData: true, // Show previous data while revalidating
    revalidateOnMount: false, // Don't revalidate on mount if we have cached data
    fallbackData: [], // Instant initial render with empty array
  })

  // Save mutation with optimistic update
  const { trigger: savePromptMutation } = useSWRMutation(
    '/api/prompts',
    async (url, { arg }: { arg: { name: string, prompt: string, description?: string, tags?: string[] } }) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arg),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save prompt')
      }
      return await res.json()
    },
    {
      onSuccess: (data: { prompt: SavedPrompt }) => {
        // Optimistically update cache
        mutate((currentPrompts: SavedPrompt[] = []) => {
          const filtered = currentPrompts.filter(p => p.id !== data.prompt.id)
          return [data.prompt, ...filtered]
        }, false)
        
        toast.success(`Saved "${data.prompt.name}"`)
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to save prompt')
      },
    }
  )

  // Update mutation
  const { trigger: updatePromptMutation } = useSWRMutation(
    '/api/prompts',
    async (url, { arg }: { arg: { id: string, name: string, prompt: string, description?: string, tags?: string[] } }) => {
      const res = await fetch(`${url}/${arg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: arg.name,
          prompt: arg.prompt,
          description: arg.description,
          tags: arg.tags,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update prompt')
      }
      return await res.json()
    },
    {
      onSuccess: (data: { prompt: SavedPrompt }) => {
        // Optimistically update cache
        mutate((currentPrompts: SavedPrompt[] = []) => 
          currentPrompts.map(p => p.id === data.prompt.id ? data.prompt : p),
          false
        )
        
        toast.success(`Updated "${data.prompt.name}"`)
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to update prompt')
      },
    }
  )

  // Delete mutation
  const { trigger: deletePromptMutation } = useSWRMutation(
    '/api/prompts',
    async (url, { arg }: { arg: { id: string } }) => {
      const res = await fetch(`${url}/${arg.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete prompt')
      }
    },
    {
      onSuccess: () => {
        mutate() // Revalidate to get fresh list
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to delete prompt')
      },
    }
  )

  // Record usage mutation
  const { trigger: recordUsageMutation } = useSWRMutation(
    '/api/prompts',
    async (url, { arg }: { arg: { id: string } }) => {
      const res = await fetch(`${url}/${arg.id}`, {
        method: 'PATCH',
      })
      if (!res.ok) {
        throw new Error('Failed to record usage')
      }
      // Update usage count after successful mutation
      mutate((currentPrompts: SavedPrompt[] = []) =>
        currentPrompts.map(p =>
          p.id === arg.id
            ? {
                ...p,
                usage_count: p.usage_count + 1,
                last_used_at: new Date().toISOString(),
              }
            : p
        ),
        false
      )
    },
    {
      onError: () => {
        // Don't show error toast for usage tracking failures
      },
    }
  )

  return {
    prompts,
    isLoading: isLoading && prompts.length === 0, // Only show loading if no cached data
    savePrompt: useCallback(async (name: string, prompt: string, description?: string, tags?: string[]) => {
      try {
        const result = await savePromptMutation({ name, prompt, description, tags })
        return result?.prompt || null
      } catch (error) {
        return null
      }
    }, [savePromptMutation]),
    updatePrompt: useCallback(async (id: string, name: string, prompt: string, description?: string, tags?: string[]) => {
      try {
        const result = await updatePromptMutation({ id, name, prompt, description, tags })
        return result?.prompt || null
      } catch (error) {
        return null
      }
    }, [updatePromptMutation]),
    deletePrompt: useCallback(async (id: string) => {
      const prompt = prompts.find((p: SavedPrompt) => p.id === id)
      if (!prompt) return

      // Optimistically remove from UI
      mutate((currentPrompts: SavedPrompt[] = []) => 
        currentPrompts.filter((p: SavedPrompt) => p.id !== id), 
        false
      )

      try {
        await deletePromptMutation({ id })
      } catch (error) {
        // Rollback on error
        mutate()
        throw error
      }
    }, [prompts, deletePromptMutation, mutate]),
    loadPrompts: useCallback(async () => {
      await mutate() // Force revalidation
    }, [mutate]),
    recordUsage: useCallback(async (id: string) => {
      try {
        await recordUsageMutation({ id })
      } catch (error) {
        // Don't show error for usage tracking failures
      }
    }, [recordUsageMutation]),
  }
}
