import { useCallback } from 'react'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { toast } from 'sonner'

export interface ContextFile {
  id: string
  name: string
  type: string
  size: number
  path: string
  url?: string
  uploadedAt: string
  fileType?: 'input' | 'output' | 'manual'
  tags?: string[]
}

export interface UseContextFilesReturn {
  files: ContextFile[]
  isLoading: boolean
  uploadFile: (file: File, fileType?: 'input' | 'output' | 'manual') => Promise<ContextFile | null>
  deleteFile: (fileId: string) => Promise<void>
  updateFileTags: (fileId: string, tags: string[]) => Promise<void>
  refreshFiles: () => Promise<void>
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
  
  console.log(`[PERF] SWR fetch:`, {
    fetch: `${fetchTime.toFixed(2)}ms`,
    parse: `${parseTime.toFixed(2)}ms`,
    total: `${totalTime.toFixed(2)}ms`,
    cached: 'false', // SWR will show cache hits separately
  })
  
  return data.files || []
}

export function useContextFiles(): UseContextFilesReturn {
  // Auto-caching, revalidation, deduplication with SWR
  const { data: files = [], isLoading, mutate } = useSWR('/api/context-files', fetcher, {
    revalidateOnFocus: false, // Don't refetch on window focus
    revalidateOnReconnect: false, // Don't refetch on reconnect
    dedupingInterval: 5000, // Dedupe requests within 5s
    revalidateIfStale: false, // Don't revalidate stale data automatically (use cache)
    keepPreviousData: true, // Show previous data while revalidating
    revalidateOnMount: false, // Don't revalidate on mount if we have cached data
    fallbackData: [], // Instant initial render with empty array
  })

  // Upload mutation with optimistic update
  const { trigger: uploadFileMutation } = useSWRMutation(
    '/api/context-files/upload',
    async (url, { arg }: { arg: { file: File, fileType?: string } }) => {
      const formData = new FormData()
      formData.append('file', arg.file)
      formData.append('fileType', arg.fileType || 'manual')

      const res = await fetch(url, { method: 'POST', body: formData })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to upload')
      }
      return await res.json()
    },
    {
      onSuccess: (uploadedFile: ContextFile) => {
        // Optimistically update cache
        mutate((currentFiles: ContextFile[] = []) => {
          // Remove any temp files with same name
          const filtered = currentFiles.filter((f: ContextFile) => 
            !f.id.startsWith('temp-') && f.name !== uploadedFile.name
          )
          return [uploadedFile, ...filtered]
        }, false) // false = don't revalidate, we already have the data
        
        toast.success(`Uploaded ${uploadedFile.name}`)
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to upload file')
      },
    }
  )

  // Update tags mutation
  const { trigger: updateTagsMutation } = useSWRMutation(
    '/api/context-files/update-tags',
    async (url, { arg }: { arg: { filePath: string, tags: string[] } }) => {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: arg.filePath, tags: arg.tags }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update tags')
      }
      return await res.json()
    },
    {
      onSuccess: () => {
        mutate() // Revalidate to get updated tags
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to update tags')
      },
    }
  )

  // Delete mutation
  const { trigger: deleteFileMutation } = useSWRMutation(
    '/api/context-files',
    async (url, { arg }: { arg: { filePath: string } }) => {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: arg.filePath }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete')
      }
    },
    {
      onSuccess: () => {
        // Revalidate to get fresh list
        mutate()
        toast.success('File deleted')
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to delete file')
      },
    }
  )

  return {
    files,
    isLoading: isLoading && files.length === 0, // Only show loading if no cached data
    uploadFile: useCallback(async (file: File, fileType?: 'input' | 'output' | 'manual') => {
      try {
        // Optimistically add file to UI
        const optimisticFile: ContextFile = {
          id: `temp-${Date.now()}`,
          name: file.name,
          type: file.type,
          size: file.size,
          path: `temp/${file.name}`,
          uploadedAt: new Date().toISOString(),
          fileType: fileType || 'manual',
        }
        
        // Update cache optimistically
        mutate((currentFiles: ContextFile[] = []) => [optimisticFile, ...currentFiles], false)
        
        const uploadedFile = await uploadFileMutation({ file, fileType })
        return uploadedFile as ContextFile
      } catch (error) {
        // Rollback optimistic update
        mutate((currentFiles: ContextFile[] = []) => 
          currentFiles.filter((f: ContextFile) => !f.id.startsWith('temp-')), 
          false
        )
        return null
      }
    }, [uploadFileMutation, mutate]),
    deleteFile: useCallback(async (fileId: string) => {
      const file = files.find((f: ContextFile) => f.id === fileId)
      if (!file) return

      // Optimistically remove from UI
      mutate((currentFiles: ContextFile[] = []) => 
        currentFiles.filter((f: ContextFile) => f.id !== fileId), 
        false
      )

      try {
        await deleteFileMutation({ filePath: file.path })
      } catch (error) {
        // Rollback on error
        mutate()
        throw error
      }
    }, [files, deleteFileMutation, mutate]),
    updateFileTags: useCallback(async (fileId: string, tags: string[]) => {
      const file = files.find((f: ContextFile) => f.id === fileId)
      if (!file) return

      // Optimistically update tags in UI
      mutate((currentFiles: ContextFile[] = []) => 
        currentFiles.map((f: ContextFile) => 
          f.id === fileId ? { ...f, tags } : f
        ), 
        false
      )

      try {
        await updateTagsMutation({ filePath: file.path, tags })
      } catch (error) {
        // Rollback on error
        mutate()
        throw error
      }
    }, [files, updateTagsMutation, mutate]),
    refreshFiles: useCallback(async () => {
      await mutate() // Force revalidation
    }, [mutate]),
  }
}
