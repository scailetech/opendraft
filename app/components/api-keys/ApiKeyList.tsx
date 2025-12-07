/**
 * ABOUTME: Lists user's API keys with create/revoke actions
 * ABOUTME: Shows key prefix, creation date, last used, and revoke button
 */

'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Key, Trash2, Plus } from 'lucide-react'
import { useApiKeys } from '@/hooks/useApiKeys'
import { AutoSkeleton } from '@/components/ui/auto-skeleton'
import { EmptyState } from '@/components/ui/empty-state'

// Lazy load modal - only loads when user clicks "Create API Key"
const CreateApiKeyModal = dynamic(
  () => import('./CreateApiKeyModal').then(mod => ({ default: mod.CreateApiKeyModal })),
  { ssr: false }
)

export function ApiKeyList() {
  const { keys, isLoading, error, revokeApiKey } = useApiKeys()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null)

  async function handleRevokeKey(keyId: string) {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }

    try {
      setRevokingKeyId(keyId)
      await revokeApiKey(keyId)
    } catch (err) {
      // Error handled by hook/toast
    } finally {
      setRevokingKeyId(null)
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }


  if (error) {
    return (
      <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
        {error instanceof Error ? error.message : String(error)}
      </div>
    )
  }

  return (
    <AutoSkeleton isLoading={isLoading}>
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">API Keys</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Use API keys for programmatic access (curl, n8n, Zapier)
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Create New Key
          </button>
        </div>

      {keys.length === 0 ? (
        <EmptyState
          icon={Key}
          title="No API keys yet"
          description="Create an API key to access the bulk.run API programmatically"
          action={{
            label: 'Create Your First Key',
            onClick: () => setShowCreateModal(true),
          }}
          className="border border-border rounded-lg bg-secondary/30"
        />
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
          {keys.map((key) => (
            <div key={key.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-secondary/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">{key.name}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                  <span className="font-mono bg-secondary/50 px-2 py-0.5 rounded">{key.prefix}...</span>
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground/70">Created:</span>
                    <span>{formatDate(key.createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground/70">Last used:</span>
                    <span>{formatDate(key.lastUsedAt)}</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleRevokeKey(key.id)}
                disabled={revokingKeyId === key.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 rounded transition-colors disabled:opacity-50 self-start sm:self-auto"
                title="Revoke this API key"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {revokingKeyId === key.id ? 'Revoking...' : 'Revoke'}
              </button>
            </div>
          ))}
        </div>
      )}

        <CreateApiKeyModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onKeyCreated={() => {}}
        />
      </div>
    </AutoSkeleton>
  )
}
