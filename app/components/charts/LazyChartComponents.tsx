/**
 * Lazy-loaded chart components to reduce initial bundle size
 * Recharts is a heavy library (~200KB), so we load it only when charts are needed
 */

'use client'

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

// Lazy load all recharts components
export const LazyLineChart = dynamic(
  () => import('recharts').then(mod => mod.LineChart),
  { ssr: false }
) as ComponentType<Record<string, unknown>>

export const LazyLine = dynamic(
  () => import('recharts').then(mod => mod.Line),
  { ssr: false }
) as ComponentType<Record<string, unknown>>

export const LazyBarChart = dynamic(
  () => import('recharts').then(mod => mod.BarChart),
  { ssr: false }
) as ComponentType<Record<string, unknown>>

export const LazyBar = dynamic(
  () => import('recharts').then(mod => mod.Bar),
  { ssr: false }
) as ComponentType<Record<string, unknown>>

export const LazyXAxis = dynamic(
  () => import('recharts').then(mod => mod.XAxis),
  { ssr: false }
) as ComponentType<Record<string, unknown>>

export const LazyYAxis = dynamic(
  () => import('recharts').then(mod => mod.YAxis),
  { ssr: false }
) as ComponentType<Record<string, unknown>>

export const LazyCartesianGrid = dynamic(
  () => import('recharts').then(mod => mod.CartesianGrid),
  { ssr: false }
) as ComponentType<Record<string, unknown>>

export const LazyTooltip = dynamic(
  () => import('recharts').then(mod => mod.Tooltip),
  { ssr: false }
) as ComponentType<Record<string, unknown>>

export const LazyLegend = dynamic(
  () => import('recharts').then(mod => mod.Legend),
  { ssr: false }
) as ComponentType<Record<string, unknown>>

export const LazyResponsiveContainer = dynamic(
  () => import('recharts').then(mod => mod.ResponsiveContainer) as Promise<ComponentType<Record<string, unknown>>>,
  { ssr: false }
)

export const LazyReferenceLine = dynamic(
  () => import('recharts').then(mod => mod.ReferenceLine),
  { ssr: false }
) as ComponentType<Record<string, unknown>>

export const LazyLabel = dynamic(
  () => import('recharts').then(mod => mod.Label),
  { ssr: false }
) as ComponentType<Record<string, unknown>>

