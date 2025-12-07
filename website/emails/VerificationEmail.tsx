import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { styles, colors, darkModeMediaQuery } from './styles';

interface VerificationEmailProps {
  fullName: string;
  verificationUrl: string;
  position: number;
  referralCode: string;
}

export const VerificationEmail = ({
  fullName = 'Student',
  verificationUrl = 'https://opendraft.xyz/waitlist/verify?token=abc123',
  position = 42,
  referralCode = 'ABC123XYZ',
}: VerificationEmailProps) => (
  <Html>
    <Head>
      <style>{darkModeMediaQuery}</style>
    </Head>
    <Preview>Verify your OpenDraft waitlist spot</Preview>
    <Body style={styles.main} className="email-body">
      <Container style={styles.container} className="email-container">
        {/* Header */}
        <div style={styles.header}>
          <Text style={styles.logo}>OpenDraft</Text>
        </div>

        {/* Hero Section */}
        <div style={styles.heroSection}>
          <span className="info-badge" style={styles.badge}>
            ✉️ Email Verification
          </span>
          <Heading style={styles.h1}>Verify Your Email</Heading>
          <Text style={styles.heroText} className="email-text-muted">
            Hi {fullName}, you're <span style={styles.strong}>#{position}</span> in line for a free AI-generated thesis.
          </Text>
        </div>

        {/* Verify Button */}
        <div style={styles.buttonWrapper}>
          <Button style={styles.buttonPrimary} href={verificationUrl}>
            ✓ Verify Email Address
          </Button>
        </div>

        <Text style={styles.linkText} className="email-text-subtle">
          Or copy this link: <span style={styles.code}>{verificationUrl}</span>
        </Text>

        <Hr style={styles.divider} className="email-divider" />

        {/* Referral Card */}
        <div className="referral-card" style={styles.cardSuccess}>
          <Text style={styles.cardTitle}>🚀 Want to skip ahead?</Text>
          <Text style={styles.cardText} className="email-text-muted">
            Each referral = <span style={styles.strong}>20 positions</span> skipped! Share your code:
          </Text>
          <Text style={styles.codeBlock}>{referralCode}</Text>
        </div>

        {/* Footer */}
        <div style={styles.footerWrapper}>
          <Text style={styles.footer} className="email-text-subtle">
            Thanks,
            <br />
            OpenDraft Team
          </Text>
          <Text style={styles.copyright} className="email-text-subtle">
            © 2025 OpenDraft ·{' '}
            <a href="https://opendraft.xyz" style={styles.link}>
              opendraft.xyz
            </a>
          </Text>
        </div>
      </Container>
    </Body>
  </Html>
);

export default VerificationEmail;
