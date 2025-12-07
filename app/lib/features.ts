/**
 * Feature flags for gradual rollout of v2 architecture
 * Allows safe testing of new components while keeping v1 stable
 */

interface FeatureFlags {
  // Architecture flags
  useNewFileUpload: boolean
  useNewCSVParser: boolean
  useNewBatchProcessor: boolean
  useServiceLayer: boolean
  useZustandStore: boolean
  
  // UI improvement flags
  useCompressedUI: boolean
  useKeyboardShortcuts: boolean
  useSmartDefaults: boolean
  useTemplateSystem: boolean
  
  // Performance flags
  useWebWorkers: boolean
  useOptimizedExport: boolean
  useStreamingResults: boolean
  
  // Monitoring flags
  enableDetailedAnalytics: boolean
  enablePerformanceTracking: boolean
  enableErrorReporting: boolean
}

// Default feature flags
const defaultFlags: FeatureFlags = {
  // All v2 features off by default
  useNewFileUpload: true,
  useNewCSVParser: true,
  useNewBatchProcessor: true,
  useServiceLayer: false,
  useZustandStore: false,
  
  useCompressedUI: false,
  useKeyboardShortcuts: true, // Already implemented
  useSmartDefaults: false,
  useTemplateSystem: false,
  
  useWebWorkers: false,
  useOptimizedExport: false,
  useStreamingResults: true, // Already implemented
  
  enableDetailedAnalytics: false,
  enablePerformanceTracking: false,
  enableErrorReporting: false,
}

// Override with environment variables
const envFlags: Partial<FeatureFlags> = {
  useNewFileUpload: process.env.NEXT_PUBLIC_USE_NEW_FILE_UPLOAD === 'true',
  useNewCSVParser: process.env.NEXT_PUBLIC_USE_NEW_CSV_PARSER === 'true',
  useNewBatchProcessor: process.env.NEXT_PUBLIC_USE_NEW_BATCH_PROCESSOR === 'true',
  useServiceLayer: process.env.NEXT_PUBLIC_USE_SERVICE_LAYER === 'true',
  useZustandStore: process.env.NEXT_PUBLIC_USE_ZUSTAND_STORE === 'true',
  useCompressedUI: process.env.NEXT_PUBLIC_USE_COMPRESSED_UI === 'true',
}

// Merge defaults with env overrides
export const features: FeatureFlags = {
  ...defaultFlags,
  ...Object.fromEntries(
    Object.entries(envFlags).filter(([, value]) => value !== undefined)
  ),
} as FeatureFlags

// Helper to check multiple features at once
export function hasFeatures(...flagNames: (keyof FeatureFlags)[]): boolean {
  return flagNames.every(flag => features[flag])
}

// Helper for gradual rollout based on user ID
export function isFeatureEnabledForUser(
  feature: keyof FeatureFlags,
  userId: string,
  rolloutPercentage: number = 0
): boolean {
  // First check if globally enabled
  if (features[feature]) return true
  
  // Then check rollout percentage
  if (rolloutPercentage === 0) return false
  if (rolloutPercentage >= 100) return true
  
  // Simple hash-based rollout
  const hash = userId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0)
  
  return (Math.abs(hash) % 100) < rolloutPercentage
}

// Feature flag presets for different environments
export const featurePresets = {
  production: defaultFlags,
  beta: {
    ...defaultFlags,
    enableDetailedAnalytics: true,
    enableErrorReporting: true,
  },
  development: {
    ...defaultFlags,
    enableDetailedAnalytics: true,
    enablePerformanceTracking: true,
    enableErrorReporting: true,
    // Enable specific v2 features for testing
    // useNewFileUpload: true,
  },
  test: {
    ...defaultFlags,
    // All features on for testing
    ...Object.fromEntries(
      Object.keys(defaultFlags).map(key => [key, true])
    ),
  },
}

// Export for use in components
export type { FeatureFlags }

// Usage example:
/*
import { features, hasFeatures } from '@/lib/features'

// Single feature check
if (features.useNewFileUpload) {
  return <FileUploadV2 />
} else {
  return <FileUploadV1 />
}

// Multiple features
if (hasFeatures('useServiceLayer', 'useZustandStore')) {
  // Use new architecture
}

// User-based rollout
if (isFeatureEnabledForUser('useCompressedUI', user.id, 10)) {
  // 10% of users get compressed UI
}
*/




