/**
 * InvoiceList Component
 * Displays list of invoices for the user - clean and responsive design
 */

'use client'

import { useState, useEffect } from 'react'
import { Invoice } from '@/lib/types/billing'
import { FileText, Download, Calendar, Sparkles, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchInvoices() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch('/api/billing/invoices')

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || errorData.details || 'Failed to fetch invoices'
          throw new Error(errorMessage)
        }

        const data = await response.json()
        setInvoices(data.invoices || [])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load invoices'
        setError(errorMessage)
        setInvoices([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvoices()
  }, [])

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    setDownloadingId(invoiceId)
    try {
      const response = await fetch(`/api/billing/invoices/${invoiceId}/download`)

      if (!response.ok) {
        throw new Error('Failed to download invoice')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoiceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download invoice'
      setError(errorMessage)
    } finally {
      setDownloadingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-muted/50 rounded w-40 animate-pulse" />
        <div className="h-32 bg-muted/30 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (error && invoices.length === 0) {
    return (
      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          {error.includes('table') || error.includes('relation') || error.includes('does not exist')
            ? 'Invoice system is being set up. Invoices will appear here once billing is enabled.'
            : error}
        </p>
      </div>
    )
  }

  // Empty state - Beta plan
  if (invoices.length === 0) {
    return (
      <div className="space-y-6">
        {/* Beta Plan Card */}
        <div className="rounded-xl border border-border/60 bg-gradient-to-br from-muted/30 to-muted/10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                <h3 className="text-lg font-semibold text-foreground">Beta Plan</h3>
                <Badge variant="secondary" className="text-xs font-medium">Free</Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                You&apos;re enjoying free access during our beta period. Usage is tracked in the{' '}
                <span className="font-medium text-foreground">Usage & Credits</span> tab.
              </p>
            </div>
          </div>
        </div>

        {/* What to expect */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/40 bg-background/50 p-4">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">No Payment Required</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Beta access is completely free. We&apos;ll notify you before any billing changes.
            </p>
          </div>
          <div className="rounded-lg border border-border/40 bg-background/50 p-4">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Invoices Coming Soon</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Once paid plans launch, your invoice history will appear here.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      paid: { variant: 'default', className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
      pending: { variant: 'secondary', className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' },
      overdue: { variant: 'destructive', className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
      draft: { variant: 'outline', className: '' },
      cancelled: { variant: 'outline', className: 'text-muted-foreground' },
    }
    const { variant, className } = config[status] || { variant: 'outline' as const, className: '' }
    return (
      <Badge variant={variant} className={cn('text-xs font-medium', className)}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">Invoice History</h2>
      
      {/* Desktop Table View */}
      <div className="hidden sm:block rounded-lg border border-border/60 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 border-b border-border/40">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Period</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-foreground">{invoice.invoice_number}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(invoice.period_start), 'MMM d')} – {format(new Date(invoice.period_end), 'MMM d, yyyy')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {getStatusBadge(invoice.status)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-foreground">${invoice.total.toFixed(2)}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    disabled={downloadingId === invoice.id}
                    onClick={() => handleDownloadInvoice(invoice.id, invoice.invoice_number)}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {downloadingId === invoice.id ? 'Downloading...' : 'PDF'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="rounded-lg border border-border/60 bg-background/50 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{invoice.invoice_number}</span>
              {getStatusBadge(invoice.status)}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {format(new Date(invoice.period_start), 'MMM d')} – {format(new Date(invoice.period_end), 'MMM d, yyyy')}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <span className="text-base font-semibold text-foreground">${invoice.total.toFixed(2)}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={downloadingId === invoice.id}
                onClick={() => handleDownloadInvoice(invoice.id, invoice.invoice_number)}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                {downloadingId === invoice.id ? '...' : 'Download'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
