// ABOUTME: Shared branding configuration for OpenDraft
// ABOUTME: Centralizes colors, gradients, and icons to maintain consistency across all assets

export const BRAND_CONFIG = {
  // Primary brand gradient - used in favicon, OG images, logo backgrounds
  gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',

  // Brand icon - graduation cap emoji representing academic focus
  icon: '🎓',

  // Brand colors (matches Tailwind config)
  colors: {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
  },
} as const;

// Helper function to generate icon styles with consistent branding
export const getIconStyle = (fontSize: number, borderRadius: string) => ({
  fontSize,
  background: BRAND_CONFIG.gradient,
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  borderRadius,
});
