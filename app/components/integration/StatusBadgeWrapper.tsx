/**
 * StatusBadgeWrapper Component
 * 
 * Wrapper for AccessibleStatusBadge that handles status mapping.
 * Use this to replace existing status badges in tables.
 * 
 * Usage:
 * ```tsx
 * <StatusBadgeWrapper status={batch.status} size="sm" />
 * ```
 */

'use client'

import React from 'react'
import { AccessibleStatusBadge } from '@/components/ui/accessible-status-badge'

type StatusType = 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed'

interface StatusBadgeWrapperProps {
  /** Status value (can be string from database) */
  status: string | StatusType
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional className */
  className?: string
}

/**
 * Maps various status strings to the expected StatusType
 */
function normalizeStatus(status: string): StatusType {
  const normalized = status.toLowerCase().trim()
  
  if (normalized.includes('completed') && normalized.includes('error')) {
    return 'completed_with_errors'
  }
  
  if (normalized.includes('completed') || normalized === 'success') {
    return 'completed'
  }
  
  if (normalized.includes('processing') || normalized === 'in_progress') {
    return 'processing'
  }
  
  if (normalized.includes('failed') || normalized === 'error') {
    return 'failed'
  }
  
  return 'pending'
}

export function StatusBadgeWrapper({
  status,
  size = 'md',
  className = '',
}: StatusBadgeWrapperProps) {
  const normalizedStatus = normalizeStatus(status as string)
  
  return (
    <AccessibleStatusBadge
      status={normalizedStatus}
      size={size}
      className={className}
    />
  )
}

