/**
 * ABOUTME: Shared data table component for consistent table styling
 * ABOUTME: Used by both INPUT preview and Results table for DRY consistency
 */

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// Table component - renders just the table element
export interface DataTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode
}

export function DataTable({ children, className, ...props }: DataTableProps) {
  return (
    <table className={cn("w-full", className)} {...props}>
      {children}
    </table>
  )
}

// Table header
export interface DataTableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode
  sticky?: boolean
}

export function DataTableHeader({ children, className, sticky = true, ...props }: DataTableHeaderProps) {
  return (
    <thead 
      className={cn(
        "bg-secondary/40 border-b border-border/50",
        sticky && "sticky top-0 z-10",
        className
      )} 
      {...props}
    >
      {children}
    </thead>
  )
}

// Table header cell
export interface DataTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode
  isOutput?: boolean
  isFirstOutput?: boolean
}

export function DataTableHead({ 
  children, 
  className, 
  isOutput = false,
  isFirstOutput = false,
  ...props 
}: DataTableHeadProps) {
  return (
    <th 
      className={cn(
        "px-4 py-2.5 text-left font-semibold text-muted-foreground tracking-wider whitespace-nowrap overflow-hidden text-ellipsis",
        isOutput && "bg-primary/5",
        isFirstOutput && "border-l border-primary/30",
        className
      )} 
      {...props}
    >
      {children}
    </th>
  )
}

// Table body
export interface DataTableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode
}

export function DataTableBody({ children, className, ...props }: DataTableBodyProps) {
  return (
    <tbody className={cn("divide-y divide-border/30", className)} {...props}>
      {children}
    </tbody>
  )
}

// Table row
export interface DataTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode
  isEven?: boolean
}

export function DataTableRow({ children, className, isEven, ...props }: DataTableRowProps) {
  return (
    <tr 
      className={cn(
        "transition-colors hover:bg-secondary/30",
        isEven ? "bg-background" : "bg-secondary/10",
        className
      )} 
      {...props}
    >
      {children}
    </tr>
  )
}

// Table cell
export interface DataTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode
  isOutput?: boolean
  isFirstOutput?: boolean
  truncate?: boolean
}

export function DataTableCell({ 
  children, 
  className, 
  isOutput = false,
  isFirstOutput = false,
  truncate = true,
  ...props 
}: DataTableCellProps) {
  return (
    <td 
      className={cn(
        "px-4 py-2.5",
        isOutput && "bg-primary/5",
        isFirstOutput && "border-l border-primary/30",
        truncate && "max-w-[200px] truncate",
        className
      )} 
      {...props}
    >
      {children}
    </td>
  )
}

