/**
 * Invoice Detail Component
 * Shows invoice details with full transparency (package + overage line items)
 */

'use client'

import { Invoice } from '@/lib/types/billing'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

interface InvoiceDetailProps {
  invoice: Invoice | null
  open: boolean
  onClose: () => void
}

export function InvoiceDetail({ invoice, open, onClose }: InvoiceDetailProps) {
  if (!invoice) return null

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      paid: 'default',
      pending: 'secondary',
      overdue: 'destructive',
      draft: 'outline',
      cancelled: 'outline',
    }
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Invoice {invoice.invoice_number}</DialogTitle>
            {getStatusBadge(invoice.status)}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Invoice Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Billing Period</p>
              <p className="font-medium">
                {new Date(invoice.period_start).toLocaleDateString()} - {new Date(invoice.period_end).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Billing Type</p>
              <p className="font-medium capitalize">{invoice.billing_type.replace('_', ' ')}</p>
            </div>
            {invoice.due_date && (
              <div>
                <p className="text-xs text-muted-foreground">Due Date</p>
                <p className="font-medium">{new Date(invoice.due_date).toLocaleDateString()}</p>
              </div>
            )}
            {invoice.paid_at && (
              <div>
                <p className="text-xs text-muted-foreground">Paid At</p>
                <p className="font-medium">{new Date(invoice.paid_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Line Items</h3>
            <div className="border border-border rounded-lg divide-y divide-border">
              {/* Package Subscription Line Item */}
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Package Subscription</p>
                  <p className="text-xs text-muted-foreground">
                    Monthly package subscription
                  </p>
                </div>
                <p className="text-sm font-medium">
                  ${invoice.subtotal.toFixed(2)}
                </p>
              </div>

              {/* Self-Service Overage Line Item (always shown for transparency) */}
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Self-Service Overage</p>
                  <p className="text-xs text-muted-foreground">
                    Usage beyond included credits
                  </p>
                </div>
                <p className="text-sm font-medium">
                  ${(invoice.total - invoice.subtotal).toFixed(2)}
                </p>
              </div>

              {/* Tax */}
              {invoice.tax > 0 && (
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Tax</p>
                  </div>
                  <p className="text-sm font-medium">
                    ${invoice.tax.toFixed(2)}
                  </p>
                </div>
              )}

              {/* Total */}
              <div className="p-3 flex items-center justify-between border-t-2 border-border bg-secondary/20">
                <div>
                  <p className="text-sm font-semibold">Total</p>
                </div>
                <p className="text-sm font-semibold">
                  ${invoice.total.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button size="sm" onClick={() => toast.info('PDF download coming soon')}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

