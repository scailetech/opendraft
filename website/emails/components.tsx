/**
 * ABOUTME: Reusable email components using shared design tokens
 * ABOUTME: DRY approach - compose emails from these building blocks
 */

import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Link,
} from '@react-email/components';
import * as React from 'react';
import { colors, styles, spacing, typography, borderRadius, darkModeMediaQuery } from './styles';

// =============================================================================
// EMAIL WRAPPER - Base layout for all emails
// =============================================================================

interface EmailWrapperProps {
  preview: string;
  children: React.ReactNode;
}

export const EmailWrapper = ({ preview, children }: EmailWrapperProps) => (
  <Html>
    <Head>
      <meta name="color-scheme" content="light dark" />
      <meta name="supported-color-schemes" content="light dark" />
      <style dangerouslySetInnerHTML={{ __html: darkModeMediaQuery }} />
    </Head>
    <Preview>{preview}</Preview>
    <Body style={styles.main} className="email-body">
      <Container style={styles.container} className="email-container">
        {/* Logo */}
        <Text style={{ ...styles.logo, marginBottom: spacing[8] }} className="email-text">
          OpenDraft
        </Text>
        {children}
        <EmailFooter />
      </Container>
    </Body>
  </Html>
);

// =============================================================================
// EMAIL FOOTER - Consistent across all emails with CAN-SPAM compliance
// =============================================================================

export const EmailFooter = () => (
  <Section style={styles.footer} className="email-footer">
    <Text style={{ margin: 0, color: colors.mutedLight }} className="email-text-muted">
      OpenDraft - AI-Powered Academic Thesis Generation
    </Text>
    <Text style={{ margin: `${spacing[2]} 0 0 0`, color: colors.mutedLight }} className="email-text-muted">
      Questions? Reply to this email or contact{' '}
      <Link href="mailto:support@clients.opendraft.xyz" style={styles.link}>
        support@clients.opendraft.xyz
      </Link>
    </Text>

    {/* CAN-SPAM compliance */}
    <Text style={{ margin: `${spacing[4]} 0 0 0`, color: colors.mutedLight, fontSize: typography.fontSize.xs }} className="email-text-muted">
      © 2025 OpenDraft Inc.
    </Text>

    {/* Unsubscribe placeholder */}
    <Text style={{ margin: `${spacing[2]} 0 0 0`, color: colors.mutedLight, fontSize: typography.fontSize.xs }} className="email-text-muted">
      <Link href="{{UNSUBSCRIBE_URL}}" style={{ ...styles.link, fontSize: typography.fontSize.xs }}>Unsubscribe</Link>
      {' • '}
      <Link href="{{PREFERENCES_URL}}" style={{ ...styles.link, fontSize: typography.fontSize.xs }}>Email Preferences</Link>
    </Text>
  </Section>
);

// =============================================================================
// PRIMARY BUTTON
// =============================================================================

interface PrimaryButtonProps {
  href: string;
  children: React.ReactNode;
}

export const PrimaryButton = ({ href, children }: PrimaryButtonProps) => (
  <Button style={styles.buttonPrimary} href={href} className="email-button-primary">
    {children}
  </Button>
);

// =============================================================================
// SECONDARY BUTTON
// =============================================================================

interface SecondaryButtonProps {
  href: string;
  children: React.ReactNode;
}

export const SecondaryButton = ({ href, children }: SecondaryButtonProps) => (
  <Button style={styles.buttonSecondary} href={href}>
    {children}
  </Button>
);

// =============================================================================
// BUTTON GROUP - For multiple buttons (table-based for Outlook)
// =============================================================================

interface ButtonGroupProps {
  children: React.ReactNode;
}

export const ButtonGroup = ({ children }: ButtonGroupProps) => (
  <Section style={styles.buttonContainer}>
    <table cellPadding={0} cellSpacing={0} style={{ margin: '0 auto' }}>
      <tbody>
        <tr>
          {React.Children.map(children, (child, index) => (
            <td style={{ padding: index > 0 ? `0 0 0 ${spacing[3]}` : '0' }}>
              {child}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  </Section>
);

// =============================================================================
// CARD - Content box
// =============================================================================

interface CardProps {
  children: React.ReactNode;
  highlight?: boolean;
}

export const Card = ({ children, highlight = false }: CardProps) => (
  <Section
    style={highlight ? styles.cardHighlight : styles.card}
    className={highlight ? 'email-card-highlight' : 'email-card'}
  >
    {children}
  </Section>
);

// =============================================================================
// STAT BOX - For displaying numbers prominently (table-based for Outlook)
// =============================================================================

interface StatBoxProps {
  value: string | number;
  label: string;
  prefix?: string;
}

export const StatBox = ({ value, label, prefix = '' }: StatBoxProps) => (
  <table cellPadding={0} cellSpacing={0} style={{ width: '100%' }}>
    <tbody>
      <tr>
        <td style={{ textAlign: 'center' as const }}>
          <Text style={{ ...styles.statNumber, margin: 0 }}>
            {prefix}{value}
          </Text>
          <Text style={{ ...styles.statLabel, margin: `${spacing[1]} 0 0 0` }} className="email-text-muted">
            {label}
          </Text>
        </td>
      </tr>
    </tbody>
  </table>
);

// =============================================================================
// STAT ROW - Multiple stats in a row (table-based for Outlook)
// =============================================================================

interface StatRowProps {
  children: React.ReactNode;
}

export const StatRow = ({ children }: StatRowProps) => (
  <table width="100%" cellPadding={0} cellSpacing={0}>
    <tbody>
      <tr>
        {React.Children.map(children, (child) => (
          <td style={{ padding: spacing[3], textAlign: 'center' as const }}>
            {child}
          </td>
        ))}
      </tr>
    </tbody>
  </table>
);

// =============================================================================
// CODE BOX - For referral codes, tokens, etc.
// =============================================================================

interface CodeBoxProps {
  label: string;
  value: string;
}

export const CodeBox = ({ label, value }: CodeBoxProps) => (
  <Section style={{
    backgroundColor: colors.backgroundMuted,
    borderRadius: borderRadius.lg,
    padding: spacing[5],
    margin: `${spacing[5]} 0`,
    textAlign: 'center' as const,
  }}>
    <Text style={{
      color: colors.mutedLight,
      fontSize: typography.fontSize.sm,
      margin: `0 0 ${spacing[2]} 0`
    }} className="email-text-muted">
      {label}
    </Text>
    <Text style={{
      color: colors.foreground,
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      fontFamily: typography.fontFamilyMono,
      letterSpacing: '3px',
      margin: 0,
    }} className="email-text">
      {value}
    </Text>
  </Section>
);

// =============================================================================
// DETAILS TABLE - Key-value pairs
// =============================================================================

interface DetailsTableProps {
  items: Array<{ label: string; value: string }>;
}

export const DetailsTable = ({ items }: DetailsTableProps) => (
  <table style={styles.table}>
    <tbody>
      {items.map((item, index) => (
        <tr key={index}>
          <td style={styles.tableCell} className="email-text-muted">{item.label}</td>
          <td style={styles.tableCellValue} className="email-text">{item.value}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

// =============================================================================
// ALERT BOX - For warnings/notices (solid hex colors for Outlook)
// =============================================================================

interface AlertBoxProps {
  type: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  children: React.ReactNode;
}

export const AlertBox = ({ type, title, children }: AlertBoxProps) => {
  const colorMap = {
    info: colors.info,
    warning: colors.warning,
    success: colors.success,
    error: colors.error,
  };

  // Use solid hex colors from styles.ts (Outlook compatible)
  const bgColorMap = {
    info: colors.infoMuted,
    warning: colors.warningMuted,
    success: colors.successMuted,
    error: colors.errorMuted,
  };

  const classNameMap = {
    info: 'email-alert-info',
    warning: 'email-alert-warning',
    success: 'email-alert-success',
    error: 'email-alert-error',
  };

  return (
    <Section
      style={{
        backgroundColor: bgColorMap[type],
        borderRadius: borderRadius.lg,
        padding: spacing[4],
        margin: `${spacing[5]} 0`,
        borderLeft: `4px solid ${colorMap[type]}`,
      }}
      className={classNameMap[type]}
    >
      {title && (
        <Text style={{
          color: colors.foreground,
          fontWeight: typography.fontWeight.semibold,
          fontSize: typography.fontSize.sm,
          margin: `0 0 ${spacing[2]} 0`,
        }} className="email-text">
          {title}
        </Text>
      )}
      <Text style={{
        color: colors.muted,
        fontSize: typography.fontSize.sm,
        margin: 0,
        lineHeight: typography.lineHeight.relaxed,
      }} className="email-text-muted">
        {children}
      </Text>
    </Section>
  );
};
