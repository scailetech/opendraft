/**
 * ABOUTME: Email sent after user verifies their email
 * ABOUTME: Confirms waitlist spot and shows dashboard link
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
  StatRow,
} from './components';

interface WelcomeEmailProps {
  fullName: string;
  position: number;
  thesisTopic: string;
  referralCode: string;
  referralCount: number;
  estimatedWait: string;
  dashboardUrl: string;
}

export const WelcomeEmail = ({
  fullName = 'Student',
  position = 42,
  thesisTopic = 'The Impact of AI on Modern Healthcare',
  referralCode = 'ABC123XYZ',
  referralCount = 0,
  estimatedWait = '~2 days',
  dashboardUrl = 'https://opendraft.io/waitlist/abc123',
}: WelcomeEmailProps) => (
  <EmailWrapper preview="Welcome to OpenDraft! Your spot is confirmed">
    <Heading style={styles.h1} className="email-text">Welcome to OpenDraft!</Heading>

    <Text style={styles.text} className="email-text-muted">Hi {fullName},</Text>

    <Text style={styles.text} className="email-text-muted">
      Your email has been verified and your spot on the waitlist is confirmed!
      We'll notify you when your thesis is ready.
    </Text>

    <Card>
      <StatRow>
        <StatBox value={position} label="Your Position" prefix="#" />
        <StatBox value={referralCount} label="Referrals" />
        <StatBox value={estimatedWait} label="Est. Wait" />
      </StatRow>
    </Card>

    <Section>
      <Heading style={styles.h2} className="email-text">Your Thesis Topic</Heading>
      <Card highlight>
        <Text style={{
          ...styles.text,
          margin: 0,
          color: colors.foreground,
        }} className="email-text">
          "{thesisTopic}"
        </Text>
      </Card>
    </Section>

    <Section>
      <Heading style={styles.h2} className="email-text">Skip the Line</Heading>
      <Text style={styles.text} className="email-text-muted">
        Share your referral code and move up{' '}
        <strong style={styles.strong}>100 positions</strong> for every 3
        verified friends:
      </Text>
      <CodeBox label="Your Referral Code" value={referralCode} />
    </Section>

    <ButtonGroup>
      <PrimaryButton href={dashboardUrl}>View Your Dashboard</PrimaryButton>
    </ButtonGroup>

    <Text style={styles.textSmall} className="email-text-muted">
      We process 100 theses daily at 9am UTC. You'll receive an email when your
      thesis is ready!
    </Text>
  </EmailWrapper>
);

export default WelcomeEmail;
