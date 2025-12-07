'use client'

import { useCallback, useState, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, FileSpreadsheet, File, X, CheckCircle, Search, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useContextFiles } from '@/hooks/useContextFiles'
import { EmptyState } from '@/components/ui/empty-state'

const ACCEPTED_FILE_TYPES = {
  'text/csv': ['.csv'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function getFileIcon(type: string) {
  if (type.includes('csv') || type.includes('spreadsheet') || type.includes('excel')) {
    return FileSpreadsheet
  }
  if (type.includes('pdf')) {
    return FileText
  }
  return File
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatUploadTime(uploadedAt: string): string {
  const date = new Date(uploadedAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  // For older files, show date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

export function ContextFileUpload() {
  const { files, isLoading, uploadFile, deleteFile, updateFileTags } = useContextFiles()
  const [uploading, setUploading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [editingTags, setEditingTags] = useState<string | null>(null)
  const [newTagInput, setNewTagInput] = useState('')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        continue
      }

      setUploading(file.name)
      try {
        await uploadFile(file)
      } catch (error) {
        // Error handled by uploadFile
      } finally {
        setUploading(null)
      }
    }
  }, [uploadFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    multiple: true,
    maxSize: MAX_FILE_SIZE,
    noClick: false,
    noKeyboard: false,
  })

  const removeFile = useCallback(async (fileId: string) => {
    try {
      await deleteFile(fileId)
    } catch (error) {
      // Error handled by deleteFile
    }
  }, [deleteFile])

  // Get all unique tags from files
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    files.forEach(file => {
      (file.tags || []).forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [files])

  // Filter files by search query and selected tag
  const filteredFiles = useMemo(() => {
    let filtered = files

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(file =>
        file.name.toLowerCase().includes(query) ||
        (file.tags || []).some(tag => tag.includes(query))
      )
    }

    // Filter by selected tag
    if (selectedTag) {
      filtered = filtered.filter(file =>
        (file.tags || []).includes(selectedTag)
      )
    }

    return filtered
  }, [files, searchQuery, selectedTag])

  // Save tags to API
  const saveTags = useCallback(async (fileId: string, tags: string[]) => {
    try {
      await updateFileTags(fileId, tags)
      setEditingTags(null)
      setNewTagInput('')
    } catch (error) {
      // Error handled by updateFileTags
    }
  }, [updateFileTags])

  // Add tag
  const addTag = useCallback((fileId: string, tag: string) => {
    const trimmedTag = tag.trim().toLowerCase()
    if (!trimmedTag) return
    
    const file = files.find(f => f.id === fileId)
    if (!file) return

    const currentTags = file.tags || []
    if (currentTags.includes(trimmedTag)) return

    saveTags(fileId, [...currentTags, trimmedTag])
  }, [files, saveTags])

  // Remove tag
  const removeTag = useCallback((fileId: string, tagToRemove: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return

    const updatedTags = (file.tags || []).filter(tag => tag !== tagToRemove)
    saveTags(fileId, updatedTags)
  }, [files, saveTags])

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground mb-4">
        Upload files to use as context in your agent prompts. Supported formats: CSV, XLSX, PDF, DOCX
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/20'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          or click to browse • Max 10MB per file
        </p>
        <p className="text-xs text-muted-foreground mt-3">
          CSV, XLSX, PDF, DOCX
        </p>
      </div>

      {/* File List */}
      {isLoading && files.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-2.5 border border-border rounded-md bg-secondary/20 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded bg-muted-foreground/20 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-3 w-40 rounded bg-muted-foreground/20 mb-1.5" />
                  <div className="h-2 w-32 rounded bg-muted-foreground/10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : files.length > 0 ? (
        <div className="space-y-3">
          {/* Search and Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8 h-8 text-xs"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Tag Filters */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Filter:</span>
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    variant={selectedTag === null ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => setSelectedTag(null)}
                  >
                    All
                  </Badge>
                  {allTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTag === tag ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Files Count */}
            {filteredFiles.length !== files.length && (
              <p className="text-xs text-muted-foreground">
                Showing {filteredFiles.length} of {files.length} files
              </p>
            )}
          </div>

          {/* Files List */}
          <div className="space-y-2">
            {filteredFiles.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No files match your search"
                description={searchQuery ? `No files found matching "${searchQuery}". Try a different search term or clear the search.` : 'No files found. Try adjusting your filters or tags.'}
                size="sm"
                className="py-6"
                action={
                  searchQuery || selectedTag
                    ? {
                        label: 'Clear Filters',
                        onClick: () => {
                          setSearchQuery('')
                          setSelectedTag(null)
                        },
                        variant: 'outline',
                      }
                    : undefined
                }
              />
            ) : (
              filteredFiles.map((file) => {
              const Icon = getFileIcon(file.type)
              const isFileUploading = uploading === file.name
                const fileTags = file.tags || []
                const isEditingTags = editingTags === file.id

              return (
                <div
                  key={file.id}
                    className="group p-2.5 bg-secondary/40 border border-border rounded-lg hover:bg-secondary/60 transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs font-medium truncate">{file.name}</p>
                      {file.fileType && file.fileType !== 'manual' && (
                            <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                          {file.fileType === 'input' ? 'Input' : 'Output'}
                            </Badge>
                      )}
                    </div>
                        <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {file.type || 'Unknown type'} • {formatUploadTime(file.uploadedAt)}
                    </p>
                        
                        {/* Tags */}
                        {(fileTags.length > 0 || isEditingTags) && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {fileTags.map(tag => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs cursor-pointer h-4 px-1"
                                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                              >
                                {tag}
                                {isEditingTags && (
                                  <X
                                    className="h-2 w-2 ml-0.5 inline-block hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removeTag(file.id, tag)
                                    }}
                                  />
                                )}
                              </Badge>
                            ))}
                            {isEditingTags && (
                              <Input
                                type="text"
                                placeholder="Add tag..."
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    addTag(file.id, newTagInput)
                                  } else if (e.key === 'Escape') {
                                    setEditingTags(null)
                                    setNewTagInput('')
                                  }
                                }}
                                onBlur={() => {
                                  if (newTagInput.trim()) {
                                    addTag(file.id, newTagInput)
                                  } else {
                                    setEditingTags(null)
                                    setNewTagInput('')
                                  }
                                }}
                                className="h-4 px-1 text-xs w-20"
                                autoFocus
                              />
                            )}
                          </div>
                        )}
                        {!isEditingTags && fileTags.length === 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingTags(file.id)}
                            className="h-4 px-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Add tags"
                          >
                            <Tag className="h-2.5 w-2.5" />
                          </Button>
                        )}
                        </div>
                  </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                  {isFileUploading ? (
                          <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
                  ) : (
                    <>
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                        aria-label={`Remove ${file.name}`}
                              title="Delete file"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                      </div>
                    </div>
                </div>
              )
              })
            )}
          </div>
        </div>
      ) : null}

      {/* Empty State */}
      {!isLoading && files.length === 0 && !isDragActive && (
        <EmptyState
          icon={FileText}
          title="No files uploaded yet"
          description="Upload files to use them as context in your prompts. Drag and drop files here or click to browse."
          size="md"
        >
          <div className="mt-4 text-xs text-muted-foreground max-w-md">
            <p className="mb-2">💡 <strong>Tip:</strong> Upload reference documents, product catalogs, or any files you want to reference in your prompts.</p>
            <p>Files are stored securely and can be reused across multiple jobs.</p>
        </div>
        </EmptyState>
      )}
    </div>
  )
}
