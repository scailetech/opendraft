# Lazy Loading Guide

## Overview
This guide shows how to implement lazy loading for heavy components to improve initial page load times.

## Already Implemented ✅

### 1. Chart Components (`components/charts/LazyChartComponents.tsx`)
The Recharts library (~200KB) is already lazy loaded:
```tsx
import { LazyLineChart, LazyBarChart } from '@/components/charts/LazyChartComponents'
```

**Impact**: Recharts only loads when analytics/charts are viewed, saving ~200KB on initial load.

## Candidates for Lazy Loading

### High Priority

#### 1. Home Page Demo Animation (47.4 KB page)
**File**: `app/(authenticated)/home/page.tsx` (1,121 lines)
**Heavy imports**: framer-motion, complex animation state

**How to optimize**:
```tsx
// Extract the demo section into a separate component
// components/home/ProcessingDemo.tsx
'use client'
import { motion } from 'framer-motion'
// ... demo logic here

// Then in app/(authenticated)/home/page.tsx:
import dynamic from 'next/dynamic'

const ProcessingDemo = dynamic(
  () => import('@/components/home/ProcessingDemo'),
  {
    loading: () => <Skeleton className="h-64 w-full" />,
    ssr: false // Demo doesn't need SSR
  }
)
```

**Expected savings**: ~15-20 KB initial load

#### 2. Analytics Dashboard (`app/(authenticated)/analytics/page.tsx`)
**Already using lazy charts**, but could lazy-load the entire dashboard:

```tsx
import dynamic from 'next/dynamic'

const AnalyticsDashboard = dynamic(
  () => import('@/components/dashboard/AnalyticsDashboard'),
  {
    loading: () => <div>Loading analytics...</div>,
    ssr: false
  }
)
```

#### 3. Schedules Page (38.8 KB)
Complex scheduling UI could be lazy-loaded:

```tsx
const ScheduleManager = dynamic(
  () => import('@/components/schedules/ScheduleManager'),
  { loading: () => <Skeleton /> }
)
```

### Medium Priority

#### 4. Context Forms
Heavy forms with many inputs:
```tsx
const ContextForm = dynamic(() => import('@/components/context/ContextForm'))
```

#### 5. Modal Components
Modals that aren't immediately visible:
```tsx
const ExportModal = dynamic(() => import('@/components/modals/ExportModal'))
```

## How to Implement

### 1. Identify Heavy Components
```bash
# Check bundle analysis
npm run analyze
# Open .next/analyze/client.html in browser
```

### 2. Extract Component
Move the heavy part into its own file:
```tsx
// components/heavy/MyComponent.tsx
export default function MyComponent() {
  // Heavy logic here
}
```

### 3. Lazy Load It
```tsx
import dynamic from 'next/dynamic'

const MyComponent = dynamic(() => import('@/components/heavy/MyComponent'), {
  loading: () => <Skeleton className="h-64" />,
  ssr: false // Optional: disable SSR for client-only components
})
```

### 4. Use It Normally
```tsx
export default function Page() {
  return <MyComponent />
}
```

## Best Practices

### When to Lazy Load
✅ **Do lazy load**:
- Heavy animations (framer-motion)
- Charts and visualizations
- Rich text editors
- Large forms not immediately visible
- Modal/dialog content
- Tab content that's not the default tab

❌ **Don't lazy load**:
- Small components (<10 KB)
- Above-the-fold content
- Critical user interactions
- Components needed for LCP (Largest Contentful Paint)

### Loading States
Always provide a loading skeleton:
```tsx
const Heavy = dynamic(() => import('./Heavy'), {
  loading: () => <Skeleton className="h-64 w-full" />
})
```

### SSR Considerations
For client-only components (using browser APIs):
```tsx
const ClientOnly = dynamic(() => import('./ClientOnly'), {
  ssr: false
})
```

## Monitoring

### Check Bundle Size
```bash
npm run analyze
```

Look at `.next/analyze/client.html` for:
- Largest chunks
- Duplicate dependencies
- Opportunities for code splitting

### Measure Impact
Before and after lazy loading:
- **Bundle size**: Check `.next/analyze/`
- **Load time**: Use Lighthouse
- **FCP/LCP**: Monitor Web Vitals

## Performance Targets

- **Initial bundle**: < 200 KB (currently ~88 KB ✅)
- **Page-specific code**: < 50 KB per page
- **Shared code**: < 100 KB

## Examples

### Example 1: Lazy Load Tabs
```tsx
const Tab1 = dynamic(() => import('./Tab1'))
const Tab2 = dynamic(() => import('./Tab2'))

function TabbedInterface() {
  const [tab, setTab] = useState(0)

  return (
    <>
      {tab === 0 && <Tab1 />}
      {tab === 1 && <Tab2 />}
    </>
  )
}
```

### Example 2: Lazy Load on User Action
```tsx
const [showModal, setShowModal] = useState(false)

const Modal = dynamic(() => import('./Modal'))

return (
  <>
    <button onClick={() => setShowModal(true)}>Open</button>
    {showModal && <Modal />}
  </>
)
```

## Tools

- **Bundle Analyzer**: `npm run analyze`
- **Lighthouse**: Built into Chrome DevTools
- **Next.js Bundle Analyzer**: `.next/analyze/client.html`

## Further Reading

- [Next.js Dynamic Imports](https://nextjs.org/docs/advanced-features/dynamic-import)
- [React.lazy()](https://react.dev/reference/react/lazy)
- [Code Splitting](https://web.dev/code-splitting-with-dynamic-imports-in-nextjs/)
