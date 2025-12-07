/**
 * API Route: Billing Invoices
 * GET /api/billing/invoices - List invoices for user
 * POST /api/billing/invoices - Create invoice (for agency, manual creation)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/logger'
import { InvoiceCreate } from '@/lib/types/billing'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    try {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          invoice_items (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (status) {
        query = query.eq('status', status)
      }

      const { data: invoices, error } = await query

      if (error) {
        // Handle case where invoices table doesn't exist (beta mode)
        // PGRST116 = no rows found, but other errors might indicate table missing
        const errorMessage = String(error.message || '')
        const errorCode = String(error.code || '')
        const errorString = JSON.stringify(error).toLowerCase()
        
        if (
          errorCode === 'PGRST116' || 
          errorMessage.toLowerCase().includes('relation') || 
          errorMessage.toLowerCase().includes('does not exist') ||
          errorMessage.toLowerCase().includes('schema cache') ||
          errorMessage.toLowerCase().includes('could not find the table') ||
          errorString.includes('schema cache') ||
          errorString.includes('could not find the table')
        ) {
          // Return empty array gracefully for beta mode
          logError('Invoices table not found or empty - returning empty array', error)
          return NextResponse.json({ invoices: [] })
        }
        
        logError('Error fetching invoices', error)
        return NextResponse.json(
          { error: 'Failed to fetch invoices', details: errorMessage },
          { status: 500 }
        )
      }

      return NextResponse.json({ invoices: invoices || [] })
    } catch (queryError) {
      // Catch any errors thrown during query execution
      const errorMessage = queryError instanceof Error ? queryError.message : String(queryError)
      const errorString = errorMessage.toLowerCase()
      
      if (
        errorString.includes('relation') || 
        errorString.includes('does not exist') ||
        errorString.includes('schema cache') ||
        errorString.includes('could not find the table')
      ) {
        logError('Invoices table not found - returning empty array', queryError)
        return NextResponse.json({ invoices: [] })
      }
      
      throw queryError // Re-throw if it's a different error
    }
  } catch (error) {
    logError('Error in GET /api/billing/invoices', error)
    // In beta mode, return empty array instead of error
    if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
      return NextResponse.json({ invoices: [] })
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is an agency (only agencies can create invoices manually)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Only admins can create invoices manually' },
        { status: 403 }
      )
    }

    const body: InvoiceCreate = await request.json()
    const { billing_type, period_start, period_end, subtotal, tax, total, due_date } = body

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        invoice_number: invoiceNumber,
        billing_type,
        period_start,
        period_end,
        subtotal,
        tax: tax || 0,
        total,
        due_date: due_date || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      logError('Error creating invoice', error)
      return NextResponse.json(
        { error: 'Failed to create invoice' },
        { status: 500 }
      )
    }

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (error) {
    logError('Error in POST /api/billing/invoices', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

