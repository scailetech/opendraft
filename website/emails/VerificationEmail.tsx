/**
 * ABOUTME: Email sent when user signs up for waitlist
 * ABOUTME: Prompts user to verify their email address
 */

import { Heading, Text, Section } from '@react-email/components';
import * as React from 'react';
import { styles, colors, spacing } from './styles';
import {
  EmailWrapper,
  PrimaryButton,
  ButtonGroup,
  Card,
  CodeBox,
  StatBox,
} from './components';

interface VerificationEmailProps {
  fullName: string;
  verificationUrl: string;
  position: number;
  referralCode: string;
}

export const VerificationEmail = ({
  fullName = 'Student',
  verificationUrl = 'https://opendraft.io/waitlist/verify?token=abc123',
  position = 42,
  referralCode = 'ABC123XYZ',
}: VerificationEmailProps) => (
  <EmailWrapper preview="Verify your OpenDraft waitlist spot">
    <Heading style={styles.h1} className="email-text">Verify Your Email</Heading>

    <Text style={styles.text} className="email-text-muted">Hi {fullName},</Text>

    <Text style={styles.text} className="email-text-muted">
      Thanks for joining the OpenDraft waitlist! Please verify your email to
      secure your spot.
    </Text>

    <Card>
      <table width="100%" cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr>
            <td style={{ textAlign: 'center' as const }}>
              <StatBox value={position} label="Your Position" prefix="#" />
            </td>
          </tr>
        </tbody>
      </table>
    </Card>

    <ButtonGroup>
      <PrimaryButton href={verificationUrl}>Verify Email Address</PrimaryButton>
    </ButtonGroup>

    <Text style={styles.textSmall} className="email-text-muted">
      This link expires in 7 days. If the button doesn't work, copy and paste
      this URL into your browser:
    </Text>
    <Text style={{
      ...styles.textSmall,
      wordBreak: 'break-all' as const,
      color: colors.primary,
    }}>
      {verificationUrl}
    </Text>

    <Section style={{ marginTop: spacing[8] }}>
      <Heading style={styles.h2} className="email-text">Want to Skip the Line?</Heading>
      <Text style={styles.text} className="email-text-muted">
        Share your referral code with friends. Every 3 verified referrals moves
        you up <strong style={styles.strong}>100 positions</strong>!
      </Text>
      <CodeBox label="Your Referral Code" value={referralCode} />
    </Section>
  </EmailWrapper>
);

export default VerificationEmail;
