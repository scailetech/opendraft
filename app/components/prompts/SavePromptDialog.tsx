'use client'

import { useState, useEffect } from 'react'
// Save icon removed - using emoji now
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'

interface SavePromptDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, description?: string, tags?: string[]) => Promise<void>
  prompt: string
  initialName?: string
  initialDescription?: string
  initialTags?: string[]
}

export function SavePromptDialog({
  isOpen,
  onClose,
  onSave,
  prompt,
  initialName = '',
  initialDescription = '',
  initialTags = [],
}: SavePromptDialogProps) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [tagsInput, setTagsInput] = useState(initialTags.join(', '))
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setName(initialName)
      setDescription(initialDescription)
      setTagsInput(initialTags.join(', '))
    }
  }, [isOpen, initialName, initialDescription, initialTags])

  const handleSave = async () => {
    if (!name.trim()) return

    setIsSaving(true)
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
      await onSave(name.trim(), description.trim() || undefined, tags.length > 0 ? tags : undefined)
      setName('')
      setDescription('')
      setTagsInput('')
      onClose()
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save Prompt"
      titleEmoji="💾"
      size="md"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt-name">Name *</Label>
          <Input
            id="prompt-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Professional Bio Generator"
            className="w-full"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt-description">Description</Label>
          <Textarea
            id="prompt-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of what this prompt does"
            className="w-full min-h-[80px]"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt-tags">Tags</Label>
          <Input
            id="prompt-tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g., bio, content, marketing (comma-separated)"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Separate tags with commas
          </p>
        </div>

        <div className="rounded-md bg-muted/50 p-3 border border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Preview:</p>
          <p className="text-xs text-foreground font-mono line-clamp-3">
            {prompt || '(empty prompt)'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-6">
        <Button variant="ghost" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
          {isSaving ? 'Saving...' : 'Save Prompt'}
        </Button>
      </div>
    </Modal>
  )
}

