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
  dashboardUrl = 'https://opendraft.ai/waitlist/abc123',
  positionsSkipped = 20,
}: ReferralRewardEmailProps) => (
  <Html>
    <Head />
    <Preview>You skipped {String(positionsSkipped)} positions on the waitlist!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Congratulations, {fullName}!</Heading>

        <Section style={celebrationBox}>
          <Text style={bigText}>
            You skipped <strong>{positionsSkipped} positions</strong>!
          </Text>
          <Text style={text}>
            <span style={strikethrough}>#{oldPosition}</span> → <span style={highlight}>#{newPosition}</span>
          </Text>
        </Section>

        <Text style={text}>
          Thanks to your verified referral{referralCount > 1 ? 's' : ''}, you&apos;ve moved up the waitlist!
        </Text>

        <Section style={infoBox}>
          <Text style={infoTitle}>Keep Going!</Text>
          <Text style={smallText}>
            Each verified referral = 20 more positions skipped. Share your link to move up faster!
          </Text>
        </Section>

        <Section style={buttonContainer}>
          <Button style={button} href={dashboardUrl}>
            View Dashboard
          </Button>
        </Section>

        <Text style={footer}>
          Thanks for spreading the word!
          <br />
          OpenDraft Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ReferralRewardEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#0a0a0a',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const bigText = {
  color: '#0a0a0a',
  fontSize: '20px',
  fontWeight: 'bold',
  lineHeight: '28px',
  margin: '0',
  textAlign: 'center' as const,
};

const celebrationBox = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '24px',
  border: '2px solid #22c55e',
};

const strikethrough = {
  textDecoration: 'line-through',
  color: '#9ca3af',
  fontSize: '18px',
};

const highlight = {
  color: '#22c55e',
  fontSize: '28px',
  fontWeight: 'bold',
};

const infoBox = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '16px',
  border: '1px solid #3b82f6',
};

const infoTitle = {
  color: '#0a0a0a',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const smallText = {
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

const buttonContainer = {
  padding: '27px 40px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '32px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};
