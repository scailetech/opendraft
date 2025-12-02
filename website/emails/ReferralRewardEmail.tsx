/**
 * ABOUTME: Email sent when user earns referral reward (every 3 verified referrals)
 * ABOUTME: Celebrates the position jump and encourages more referrals
 */

import { Heading, Text, Section } from '@react-email/components';
import * as React from 'react';
import { styles, colors, spacing, typography, borderRadius } from './styles';
import {
  EmailWrapper,
  PrimaryButton,
  ButtonGroup,
  Card,
  CodeBox,
  StatBox,
  StatRow,
} from './components';

interface ReferralRewardEmailProps {
  fullName: string;
  newPosition: number;
  oldPosition: number;
  referralCount: number;
  dashboardUrl: string;
  referralCode: string;
}

export const ReferralRewardEmail = ({
  fullName = 'Student',
  newPosition = 47,
  oldPosition = 147,
  referralCount = 3,
  dashboardUrl = 'https://opendraft.io/waitlist/abc123',
  referralCode = 'ABC123XYZ',
}: ReferralRewardEmailProps) => {
  const positionsSkipped = oldPosition - newPosition;

  return (
    <EmailWrapper preview={`You skipped ${positionsSkipped} positions! Now at #${newPosition}`}>
      <Heading style={styles.h1} className="email-text">You Skipped {positionsSkipped} Positions!</Heading>

      <Text style={styles.text} className="email-text-muted">Hi {fullName},</Text>

      <Text style={styles.text} className="email-text-muted">
        Amazing news! {referralCount} of your referrals verified their emails,
        so you've earned a reward!
      </Text>

      {/* Big position display */}
      <Section style={{
        backgroundColor: colors.primaryMuted,
        borderRadius: borderRadius.lg,
        padding: spacing[6],
        margin: `${spacing[6]} 0`,
        textAlign: 'center' as const,
        border: `1px solid ${colors.primary}`,
      }} className="email-card-highlight">
        <Text style={{
          color: colors.mutedLight,
          fontSize: typography.fontSize.sm,
          margin: `0 0 ${spacing[2]} 0`,
        }} className="email-text-muted">
          Your New Position
        </Text>
        <Text style={{
          color: colors.primary,
          fontSize: '48px',
          fontWeight: typography.fontWeight.bold,
          margin: 0,
          lineHeight: '1',
        }}>
          #{newPosition}
        </Text>
        <Text style={{
          color: colors.mutedLight,
          fontSize: typography.fontSize.sm,
          margin: `${spacing[2]} 0 0 0`,
        }} className="email-text-muted">
          was #{oldPosition}
        </Text>
      </Section>

      <Card>
        <StatRow>
          <StatBox value={referralCount} label="Verified Referrals" />
          <StatBox value={positionsSkipped} label="Positions Skipped" />
        </StatRow>
      </Card>

      <Text style={styles.text} className="email-text-muted">
        Keep sharing! Get 3 more verified referrals to skip another 100
        positions.
      </Text>

      <CodeBox label="Your Referral Code" value={referralCode} />

      <ButtonGroup>
        <PrimaryButton href={dashboardUrl}>View Dashboard</PrimaryButton>
      </ButtonGroup>
    </EmailWrapper>
  );
};

export default ReferralRewardEmail;
