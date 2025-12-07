/**
 * Toast Helpers
 * 
 * Enhanced toast notification helpers with consistent styling and actions.
 * Provides better UX for success, error, and info messages.
 */

import React from 'react'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, AlertCircle, Info, Sparkles } from 'lucide-react'

interface ToastAction {
  label: string
  onClick: () => void
}

interface SuccessToastOptions {
  title?: string
  description?: string
  action?: ToastAction
  duration?: number
  showIcon?: boolean
}

/**
 * Show a success toast with enhanced styling
 */
export function showSuccessToast(
  message: string,
  options: SuccessToastOptions = {}
) {
  const { title, description, action, duration = 4000, showIcon = true } = options

  return toast.success(title || message, {
    description: description || (title ? message : undefined),
    duration,
    icon: showIcon ? React.createElement(CheckCircle2, { className: 'h-5 w-5 text-green-500' }) : undefined,
    action: action ? {
      label: action.label,
      onClick: action.onClick,
    } : undefined,
    className: 'border-green-500/20 bg-green-500/5 animate-in fade-in slide-in-from-top-2',
  })
}

/**
 * Show an error toast with enhanced styling
 */
export function showErrorToast(
  message: string,
  options: { description?: string; action?: ToastAction; duration?: number } = {}
) {
  const { description, action, duration = 5000 } = options

  return toast.error(message, {
    description,
    duration,
    icon: React.createElement(XCircle, { className: 'h-5 w-5 text-red-500' }),
    action: action ? {
      label: action.label,
      onClick: action.onClick,
    } : undefined,
    className: 'border-red-500/20 bg-red-500/5 animate-in fade-in slide-in-from-top-2',
  })
}

/**
 * Show a warning toast with enhanced styling
 */
export function showWarningToast(
  message: string,
  options: { description?: string; action?: ToastAction; duration?: number } = {}
) {
  const { description, action, duration = 4000 } = options

  return toast.warning(message, {
    description,
    duration,
    icon: React.createElement(AlertCircle, { className: 'h-5 w-5 text-amber-500' }),
    action: action ? {
      label: action.label,
      onClick: action.onClick,
    } : undefined,
    className: 'border-amber-500/20 bg-amber-500/5 animate-in fade-in slide-in-from-top-2',
  })
}

/**
 * Show an info toast with enhanced styling
 */
export function showInfoToast(
  message: string,
  options: { description?: string; action?: ToastAction; duration?: number } = {}
) {
  const { description, action, duration = 4000 } = options

  return toast.info(message, {
    description,
    duration,
    icon: React.createElement(Info, { className: 'h-5 w-5 text-blue-500' }),
    action: action ? {
      label: action.label,
      onClick: action.onClick,
    } : undefined,
    className: 'border-blue-500/20 bg-blue-500/5 animate-in fade-in slide-in-from-top-2',
  })
}

/**
 * Show a celebration toast for major achievements
 */
export function showCelebrationToast(
  message: string,
  options: { description?: string; action?: ToastAction; duration?: number } = {}
) {
  const { description, action, duration = 5000 } = options

  return toast.success(message, {
    description,
    duration,
    icon: React.createElement(Sparkles, { className: 'h-5 w-5 text-yellow-500' }),
    action: action ? {
      label: action.label,
      onClick: action.onClick,
    } : undefined,
    className: 'border-yellow-500/20 bg-yellow-500/5 animate-in fade-in slide-in-from-top-2 zoom-in-95',
  })
}

/**
 * Show a loading toast that can be updated
 */
export function showLoadingToast(message: string, id?: string) {
  return toast.loading(message, {
    id,
    className: 'animate-in fade-in slide-in-from-top-2',
  })
}

/**
 * Update a toast (useful for loading -> success transitions)
 */
export function updateToast(
  id: string | number,
  type: 'success' | 'error' | 'warning' | 'info',
  message: string,
  options: { description?: string; action?: ToastAction; duration?: number } = {}
) {
  const { description, action, duration = 4000 } = options

  const icons = {
    success: React.createElement(CheckCircle2, { className: 'h-5 w-5 text-green-500' }),
    error: React.createElement(XCircle, { className: 'h-5 w-5 text-red-500' }),
    warning: React.createElement(AlertCircle, { className: 'h-5 w-5 text-amber-500' }),
    info: React.createElement(Info, { className: 'h-5 w-5 text-blue-500' }),
  }

  const classes = {
    success: 'border-green-500/20 bg-green-500/5',
    error: 'border-red-500/20 bg-red-500/5',
    warning: 'border-amber-500/20 bg-amber-500/5',
    info: 'border-blue-500/20 bg-blue-500/5',
  }

  return toast[type](message, {
    id,
    description,
    duration,
    icon: icons[type],
    action: action ? {
      label: action.label,
      onClick: action.onClick,
    } : undefined,
    className: `${classes[type]} animate-in fade-in slide-in-from-top-2`,
  })
}

