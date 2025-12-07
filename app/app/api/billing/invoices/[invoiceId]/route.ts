/**
 * API Route: Invoice by ID
 * GET /api/billing/invoices/[invoiceId] - Get invoice details
 * PUT /api/billing/invoices/[invoiceId] - Update invoice status (agency only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (*)
      `)
      .eq('id', params.invoiceId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        )
      }
      logError('Error fetching invoice', error)
      return NextResponse.json(
        { error: 'Failed to fetch invoice' },
        { status: 500 }
      )
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    logError('Error in GET /api/billing/invoices/[invoiceId]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is an agency (only agencies can update invoice status)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { status, paid_at } = body

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (paid_at !== undefined) updateData.paid_at = paid_at

    const { data: invoice, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', params.invoiceId)
      .select()
      .single()

    if (error) {
      logError('Error updating invoice', error)
      return NextResponse.json(
        { error: 'Failed to update invoice' },
        { status: 500 }
      )
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    logError('Error in PUT /api/billing/invoices/[invoiceId]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

