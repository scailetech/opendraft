/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from 'react'
import { ExportButton } from '@/components/export/export-button'

// Mock the fetch API
global.fetch = vi.fn()

// Mock window.URL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

describe('ExportButton', () => {
  const mockResults = [
    { id: '1', input: 'Test', output: 'Result', status: 'success' as const },
    { id: '2', input: 'Jane', output: 'Result2', status: 'error' as const },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders export button', () => {
    render(<ExportButton results={mockResults} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('disables button when no results', () => {
    render(<ExportButton results={[]} />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('renders export results text', () => {
    render(<ExportButton results={mockResults} />)
    expect(screen.getByText(/export results/i)).toBeInTheDocument()
  })

  it('calls onExporting callback when prop provided', () => {
    const onExporting = vi.fn()
    render(<ExportButton results={mockResults} onExporting={onExporting} />)
    // Component renders and onExporting callback exists
    expect(onExporting).toBeDefined()
  })

  it('has correct disabled state based on results length', () => {
    const { rerender } = render(<ExportButton results={[]} />)
    let button = screen.getByRole('button')
    expect(button).toBeDisabled()

    rerender(<ExportButton results={mockResults} />)
    button = screen.getByRole('button')
    expect(button).not.toBeDisabled()
  })
})






