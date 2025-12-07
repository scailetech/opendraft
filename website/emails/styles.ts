/**
 * Shared email design tokens - Single source of truth for all email styling
 * Light mode default (matches actual email design)
 */

// =============================================================================
// COLOR TOKENS - Light mode default (matches working VerificationEmail)
// =============================================================================

export const colors = {
  // Backgrounds (light mode - default)
  background: '#fafaf9',        // Light cream background
  backgroundLight: '#ffffff',  // White cards
  backgroundMuted: '#f9fafb',  // Muted sections

  // Text
  foreground: '#1c1917',       // Primary text (dark brown)
  muted: '#57534e',            // Secondary text
  mutedLight: '#a8a29e',       // Tertiary text
  mutedSubtle: '#737373',      // Very subtle text

  // Primary - Green accent
  primary: '#10b981',          // Green-500 (emerald)
  primaryHover: '#059669',     // Green-600
  primaryLight: '#34d399',     // Green-400

  // Success/Green variants
  success: '#10b981',
  successLight: '#dcfce7',     // Light green background
  successBorder: '#bbf7d0',    // Green border
  successText: '#15803d',      // Dark green text
  successDark: '#166534',      // Darker green

  // Info/Blue variants
  info: '#3b82f6',
  infoLight: '#dbeafe',        // Light blue background
  infoBorder: '#bfdbfe',       // Blue border
  infoText: '#1d4ed8',         // Dark blue text
  infoDark: '#2563eb',         // Darker blue

  // Warning/Amber variants
  warning: '#f59e0b',
  warningLight: '#fef3c7',     // Light amber background
  warningBorder: '#fbbf24',    // Amber border
  warningText: '#78350f',      // Dark amber text

  // Error/Red variants
  error: '#ef4444',
  errorLight: '#fee2e2',       // Light red background
  errorBorder: '#fca5a5',      // Red border
  errorText: '#991b1b',        // Dark red text

  // Secondary
  secondary: '#262626',         // Dark gray
  secondaryHover: '#404040',

  // Borders
  border: '#e7e5e4',           // Light border
  borderLight: '#e5e7eb',      // Very light border

  // Dark mode variants (for @media prefers-color-scheme: dark)
  dark: {
    background: '#0a0a0a',
    backgroundLight: '#171717',
    backgroundMuted: '#262626',
    foreground: '#fafafa',
    muted: '#a3a3a3',
    mutedLight: '#737373',
    border: '#262626',
    primary: '#22c55e',
    successLight: '#052e16',
    successBorder: '#166534',
    infoLight: '#172554',
    infoBorder: '#1e40af',
    infoText: '#60a5fa',
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
    xs: '11px',
    sm: '12px',
    base: '13px',
    md: '14px',
    lg: '15px',
    xl: '16px',
    '2xl': '18px',
    '3xl': '20px',
    '4xl': '24px',
    '5xl': '28px',
    '6xl': '48px',
  },

  // Line heights
  lineHeight: {
    tight: '1.2',
    normal: '1.5',
    relaxed: '1.6',
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
// BORDER RADIUS
// =============================================================================

export const borderRadius = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '10px',
  '2xl': '12px',
  full: '20px',
  pill: '9999px',
} as const;

// =============================================================================
// DARK MODE MEDIA QUERY CSS
// =============================================================================

export const darkModeMediaQuery = `
  @media (prefers-color-scheme: dark) {
    .email-body { background-color: ${colors.dark.background} !important; }
    .email-container { background-color: ${colors.dark.background} !important; }
    .email-card { background-color: ${colors.dark.backgroundLight} !important; border-color: ${colors.dark.border} !important; }
    .email-text { color: ${colors.dark.foreground} !important; }
    .email-text-muted { color: ${colors.dark.muted} !important; }
    .email-text-subtle { color: ${colors.dark.mutedLight} !important; }
    .email-divider { border-color: ${colors.dark.border} !important; }
    .info-badge { background-color: ${colors.dark.infoLight} !important; color: ${colors.dark.infoText} !important; }
    .referral-card { background-color: ${colors.dark.successLight} !important; border-color: ${colors.dark.successBorder} !important; }
    .position-card { background-color: ${colors.dark.successLight} !important; border-color: ${colors.dark.successBorder} !important; }
    .celebration-card { background-color: ${colors.dark.successLight} !important; border-color: ${colors.dark.successBorder} !important; }
    .alert-card { background-color: #2d2517 !important; border-color: #78350f !important; }
    .info-card { background-color: ${colors.dark.infoLight} !important; border-color: ${colors.dark.infoBorder} !important; }
    .btn-secondary { background-color: ${colors.dark.secondary} !important; border-color: #404040 !important; color: ${colors.dark.foreground} !important; }
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
    margin: '0',
    padding: '0',
  },

  // Container
  container: {
    backgroundColor: colors.background,
    margin: '0 auto',
    padding: `${spacing[10]} ${spacing[5]}`,
    maxWidth: '560px',
  },

  // Header
  header: {
    textAlign: 'center' as const,
    marginBottom: spacing[8],
  },

  // Logo
  logo: {
    color: colors.foreground,
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    letterSpacing: '-0.5px',
    margin: '0',
    padding: '0',
  },

  // Hero section
  heroSection: {
    textAlign: 'center' as const,
    marginBottom: spacing[8],
  },

  // Badge
  badge: {
    backgroundColor: colors.infoLight,
    color: colors.infoText,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    padding: '6px 14px',
    borderRadius: borderRadius.full,
    display: 'inline-block',
    marginBottom: spacing[4],
  },

  // Headings
  h1: {
    color: colors.foreground,
    fontSize: typography.fontSize['5xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
    margin: '0 0 12px 0',
    padding: '0',
  },

  h2: {
    color: colors.foreground,
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
    margin: '0 0 16px 0',
    padding: '0',
  },

  // Body text
  text: {
    color: colors.muted,
    fontSize: typography.fontSize.xl,
    lineHeight: typography.lineHeight.relaxed,
    margin: `${spacing[4]} 0`,
    padding: '0',
  },

  heroText: {
    color: colors.muted,
    fontSize: typography.fontSize.xl,
    lineHeight: typography.lineHeight.relaxed,
    margin: '0',
    padding: '0',
  },

  textSmall: {
    color: colors.mutedLight,
    fontSize: typography.fontSize.md,
    lineHeight: typography.lineHeight.normal,
    margin: '0',
    padding: '0',
  },

  linkText: {
    color: colors.mutedLight,
    fontSize: typography.fontSize.base,
    textAlign: 'center' as const,
    marginBottom: spacing[8],
    padding: '0',
  },

  // Strong/highlight text
  strong: {
    color: colors.foreground,
    fontWeight: typography.fontWeight.semibold,
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    color: '#ffffff',
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 32px',
    minWidth: '200px',
  },

  buttonSecondary: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    color: '#ffffff',
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 32px',
    minWidth: '200px',
  },

  buttonWrapper: {
    textAlign: 'center' as const,
    marginBottom: spacing[6],
  },

  // Code/monospace
  code: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.fontSize.sm,
  },

  codeBlock: {
    fontFamily: typography.fontFamilyMono,
    background: colors.successLight,
    padding: '10px 16px',
    borderRadius: borderRadius.md,
    color: colors.successText,
    textAlign: 'center' as const,
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    margin: '0',
    letterSpacing: '1px',
    display: 'block',
  },

  // Links
  link: {
    color: colors.primary,
    textDecoration: 'none',
  },

  // Divider
  divider: {
    border: 'none',
    borderTop: `1px solid ${colors.border}`,
    margin: `0 0 ${spacing[6]} 0`,
  },

  // Cards
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginBottom: spacing[6],
    border: `1px solid ${colors.border}`,
  },

  // Success/Green card (referral, position, celebration)
  cardSuccess: {
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginBottom: spacing[6],
    border: `1px solid ${colors.successBorder}`,
  },

  cardSuccessCentered: {
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    marginBottom: spacing[6],
    border: `1px solid ${colors.successBorder}`,
    textAlign: 'center' as const,
  },

  // Info/Blue card
  cardInfo: {
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginBottom: spacing[6],
    border: `1px solid ${colors.infoBorder}`,
  },

  // Warning/Amber card
  cardWarning: {
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.xl,
    padding: `${spacing[4]} ${spacing[5]}`,
    marginBottom: spacing[6],
    border: `1px solid ${colors.warningBorder}`,
  },

  // Card titles
  cardTitle: {
    color: colors.successText,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    margin: '0 0 8px 0',
    padding: '0',
  },

  cardTitleInfo: {
    color: colors.infoText,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    margin: '0 0 12px 0',
    padding: '0',
  },

  cardText: {
    color: colors.successDark,
    fontSize: typography.fontSize.md,
    lineHeight: typography.lineHeight.normal,
    margin: '0 0 12px 0',
    padding: '0',
  },

  cardTextInfo: {
    color: colors.infoDark,
    fontSize: typography.fontSize.md,
    lineHeight: typography.lineHeight.normal,
    margin: '8px 0',
    padding: '0',
  },

  // Position number
  positionNumber: {
    color: colors.primary,
    fontSize: typography.fontSize['6xl'],
    fontWeight: typography.fontWeight.bold,
    margin: '0 0 12px 0',
    lineHeight: '1',
    padding: '0',
  },

  positionLabel: {
    color: colors.successDark,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    margin: '0 0 8px 0',
    padding: '0',
  },

  // Footer
  footerWrapper: {
    textAlign: 'center' as const,
    marginTop: spacing[10],
    paddingTop: spacing[6],
    borderTop: `1px solid ${colors.border}`,
  },

  footer: {
    color: colors.mutedLight,
    fontSize: typography.fontSize.base,
    margin: '0 0 8px 0',
    padding: '0',
  },

  copyright: {
    color: colors.mutedLight,
    fontSize: typography.fontSize.sm,
    margin: '0',
    padding: '0',
  },
} as const;
