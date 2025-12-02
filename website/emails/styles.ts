/**
 * ABOUTME: Shared email design tokens aligned with website design system
 * ABOUTME: Single source of truth for all email styling - Clean B/W with Green Accent
 */

// =============================================================================
// COLOR TOKENS - Matches website globals.css
// =============================================================================

export const colors = {
  // Backgrounds (dark mode - default)
  background: '#171717',        // Dark mode background (--background dark)
  backgroundLight: '#1c1c1c',   // Card background (--card dark)
  backgroundMuted: '#262626',   // Muted sections (--muted dark)

  // Text
  foreground: '#fafafa',        // Primary text (--foreground dark)
  muted: '#a3a3a3',             // Secondary text (--muted-foreground dark)
  mutedLight: '#737373',        // Tertiary text

  // Primary - Green accent (matches website)
  primary: '#22c55e',           // Green-500 (--primary dark)
  primaryHover: '#16a34a',      // Green-600
  // Solid hex - 10% green blended on #171717 (Outlook compatible)
  primaryMuted: '#1a2f1f',

  // Secondary
  secondary: '#262626',         // (--secondary dark)
  secondaryHover: '#333333',

  // Borders
  border: '#404040',            // (--border dark)
  borderLight: '#333333',

  // Status colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Status muted colors (solid hex - Outlook compatible)
  successMuted: '#1a2f1f',      // 10% green on dark
  warningMuted: '#2d2517',      // 10% amber on dark
  infoMuted: '#1a2333',         // 10% blue on dark
  errorMuted: '#2d1a1a',        // 10% red on dark

  // Light mode variants (for @media prefers-color-scheme: light)
  light: {
    background: '#ffffff',
    backgroundLight: '#f5f5f5',
    backgroundMuted: '#e5e5e5',
    foreground: '#171717',
    muted: '#525252',
    mutedLight: '#737373',
    primary: '#16a34a',           // Green-600 for light mode
    primaryMuted: '#dcfce7',
    successMuted: '#dcfce7',
    warningMuted: '#fef3c7',
    infoMuted: '#dbeafe',
    errorMuted: '#fee2e2',
    border: '#d4d4d4',
    borderLight: '#e5e5e5',
  },
} as const;

// =============================================================================
// TYPOGRAPHY - Matches website font stack
// =============================================================================

export const typography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
  fontFamilyMono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',

  // Font sizes
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
  },

  // Line heights
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.625',
  },

  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

// =============================================================================
// SPACING - Matches website spacing scale
// =============================================================================

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

// =============================================================================
// BORDER RADIUS - Matches website (--radius: 0.5rem = 8px)
// =============================================================================

export const borderRadius = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
} as const;

// =============================================================================
// DARK MODE MEDIA QUERY CSS
// Injected into email <head> for light mode support
// =============================================================================

export const darkModeMediaQuery = `
  @media (prefers-color-scheme: light) {
    .email-body { background-color: ${colors.light.background} !important; }
    .email-container { background-color: ${colors.light.background} !important; }
    .email-text { color: ${colors.light.foreground} !important; }
    .email-text-muted { color: ${colors.light.muted} !important; }
    .email-card {
      background-color: ${colors.light.backgroundLight} !important;
      border-color: ${colors.light.border} !important;
    }
    .email-card-highlight {
      background-color: ${colors.light.primaryMuted} !important;
    }
    .email-footer {
      border-color: ${colors.light.border} !important;
    }
    .email-button-primary {
      background-color: ${colors.light.primary} !important;
    }
    .email-alert-info {
      background-color: ${colors.light.infoMuted} !important;
    }
    .email-alert-warning {
      background-color: ${colors.light.warningMuted} !important;
    }
    .email-alert-success {
      background-color: ${colors.light.successMuted} !important;
    }
    .email-alert-error {
      background-color: ${colors.light.errorMuted} !important;
    }
  }
`;

// =============================================================================
// SHARED STYLES - Reusable style objects
// =============================================================================

export const styles = {
  // Main wrapper
  main: {
    backgroundColor: colors.background,
    fontFamily: typography.fontFamily,
  },

  // Container
  container: {
    backgroundColor: colors.background,
    margin: '0 auto',
    padding: `${spacing[10]} ${spacing[6]}`,
    maxWidth: '600px',
  },

  // Logo/Header area
  logo: {
    color: colors.foreground,
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    margin: '0',
    padding: '0',
  },

  // Headings
  h1: {
    color: colors.foreground,
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
    margin: `${spacing[6]} 0`,
  },

  h2: {
    color: colors.foreground,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.tight,
    margin: `${spacing[5]} 0 ${spacing[3]} 0`,
  },

  // Body text
  text: {
    color: colors.muted,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
    margin: `${spacing[4]} 0`,
  },

  textSmall: {
    color: colors.mutedLight,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
    margin: `${spacing[2]} 0`,
  },

  // Strong/highlight text
  strong: {
    color: colors.foreground,
    fontWeight: typography.fontWeight.semibold,
  },

  // Primary button (Green)
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    color: '#000000',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: `${spacing[3]} ${spacing[6]}`,
  },

  // Secondary button
  buttonSecondary: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    color: colors.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: `${spacing[3]} ${spacing[6]}`,
    border: `1px solid ${colors.border}`,
  },

  // Button container (centered)
  buttonContainer: {
    textAlign: 'center' as const,
    margin: `${spacing[6]} 0`,
  },

  // Cards/boxes
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing[5],
    margin: `${spacing[5]} 0`,
    border: `1px solid ${colors.borderLight}`,
  },

  cardHighlight: {
    backgroundColor: colors.primaryMuted,
    borderRadius: borderRadius.lg,
    padding: spacing[5],
    margin: `${spacing[5]} 0`,
    border: `1px solid ${colors.primary}`,
  },

  // Stats display
  statNumber: {
    color: colors.primary,
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: '1',
  },

  statLabel: {
    color: colors.mutedLight,
    fontSize: typography.fontSize.sm,
    marginTop: spacing[1],
  },

  // Code/monospace
  code: {
    fontFamily: typography.fontFamilyMono,
    backgroundColor: colors.backgroundMuted,
    padding: `${spacing[1]} ${spacing[2]}`,
    borderRadius: borderRadius.sm,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },

  // Links
  link: {
    color: colors.primary,
    textDecoration: 'underline',
  },

  // Divider
  divider: {
    borderTop: `1px solid ${colors.border}`,
    margin: `${spacing[8]} 0`,
  },

  // Footer
  footer: {
    color: colors.mutedLight,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
    marginTop: spacing[10],
    paddingTop: spacing[6],
    borderTop: `1px solid ${colors.border}`,
  },

  // Table for structured data
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },

  tableCell: {
    padding: `${spacing[2]} 0`,
    color: colors.muted,
    fontSize: typography.fontSize.sm,
  },

  tableCellValue: {
    padding: `${spacing[2]} 0`,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
    textAlign: 'right' as const,
  },
} as const;
