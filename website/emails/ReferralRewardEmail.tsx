import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { styles, colors, darkModeMediaQuery } from './styles';

interface ReferralRewardEmailProps {
  fullName: string;
  newPosition: number;
  oldPosition: number;
  referralCount: number;
  dashboardUrl: string;
  positionsSkipped: number;
}

export const ReferralRewardEmail = ({
  fullName = 'Student',
  newPosition = 50,
  oldPosition = 70,
  referralCount = 1,
  dashboardUrl = 'https://opendraft.xyz/waitlist/abc123',
  positionsSkipped = 20,
}: ReferralRewardEmailProps) => (
  <Html>
    <Head>
      <style>{darkModeMediaQuery}</style>
    </Head>
    <Preview>You skipped {String(positionsSkipped)} positions on the waitlist!</Preview>
    <Body style={styles.main} className="email-body">
      <Container style={styles.container} className="email-container">
        {/* Header */}
        <div style={styles.header}>
          <Text style={styles.logo}>OpenDraft</Text>
        </div>

        {/* Hero Section */}
        <div style={styles.heroSection}>
          <span className="info-badge" style={styles.badge}>
            🎉 Position Boost!
          </span>
          <Heading style={styles.h1}>Congratulations, {fullName}!</Heading>
        </div>

        {/* Celebration Box */}
        <div className="celebration-card" style={styles.cardSuccessCentered}>
          <Text style={{ ...styles.cardTitle, fontSize: styles.text.fontSize }}>
            You skipped <span style={styles.strong}>{positionsSkipped} positions</span>!
          </Text>
          <Text style={{ color: colors.successDark, fontSize: styles.h2.fontSize, fontWeight: styles.h2.fontWeight, margin: '0', padding: '0' }}>
            <span style={{ textDecoration: 'line-through', color: colors.mutedLight, fontSize: styles.text.fontSize }}>#{oldPosition}</span> → <span style={{ color: colors.primary, fontSize: styles.h1.fontSize, fontWeight: styles.h1.fontWeight }}>#{newPosition}</span>
          </Text>
        </div>

        <Text style={styles.text} className="email-text">
          Thanks to your verified referral{referralCount > 1 ? 's' : ''}, you've moved up the waitlist!
        </Text>

        {/* Info Box */}
        <div className="info-card" style={styles.cardInfo}>
          <Text style={styles.cardTitleInfo}>Keep Going!</Text>
          <Text style={styles.cardTextInfo} className="email-text-muted">
            Each verified referral = 20 more positions skipped. Share your link to move up faster!
          </Text>
        </div>

        {/* Button */}
        <div style={styles.buttonWrapper}>
          <Button style={styles.buttonPrimary} href={dashboardUrl}>
            View Dashboard
          </Button>
        </div>

        {/* Footer */}
        <div style={styles.footerWrapper}>
          <Text style={styles.footer} className="email-text-subtle">
            Thanks for spreading the word!
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

export default ReferralRewardEmail;
