/**
 * Feature Flags Configuration
 *
 * Centralized feature toggles for gradual rollout and demo mode.
 * Change these flags to enable/disable features without code changes.
 */

export const FEATURE_FLAGS = {
  /**
   * WEB_SEARCH_ENABLED
   *
   * Controls whether web-search tool actually works.
   *
   * When FALSE:
   * - UI still shows web-search checkbox (users can select it)
   * - Backend silently ignores web-search requests
   * - No two-step processing (avoids 2x cost)
   * - No API errors during demo
   *
   * When TRUE:
   * - Web-search fully functional
   * - Two-step processing enabled
   * - Users see real web-researched data
   *
   * USE CASES:
   * - Demo/presentation: Set to FALSE (hide complexity)
   * - Beta launch: Set to FALSE (avoid bugs with real users)
   * - Production: Set to TRUE (full functionality)
   *
   * RECOMMENDATION: Start with FALSE, enable after successful demo
   */
  WEB_SEARCH_ENABLED: true,

  /**
   * LOG_DISABLED_FEATURES
   *
   * Log when users try to use disabled features (for analytics)
   *
   * Helps you understand feature demand during beta
   */
  LOG_DISABLED_FEATURES: true,

} as const

/**
 * Helper function to check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature]
}

/**
 * Helper to get feature flag value
 */
export function getFeatureFlag<K extends keyof typeof FEATURE_FLAGS>(
  feature: K
): typeof FEATURE_FLAGS[K] {
  return FEATURE_FLAGS[feature]
}
