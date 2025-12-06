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

interface VerificationEmailProps {
  fullName: string;
  verificationUrl: string;
  position: number;
  referralCode: string;
}

export const VerificationEmail = ({
  fullName = 'Student',
  verificationUrl = 'https://opendraft.ai/waitlist/verify?token=abc123',
  position = 42,
  referralCode = 'ABC123XYZ',
}: VerificationEmailProps) => (
  <Html>
    <Head />
    <Preview>Verify your OpenDraft waitlist spot</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to OpenDraft Waitlist!</Heading>

        <Text style={text}>Hi {fullName},</Text>

        <Text style={text}>
          You're <strong>#{position}</strong> in line for a free AI-generated thesis (20,000+ words).
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={verificationUrl}>
            Verify Email
          </Button>
        </Section>

        <Text style={text}>
          Or copy this link:<br />
          <span style={code}>{verificationUrl}</span>
        </Text>

        <Section style={ctaSection}>
          <Text style={ctaText}>
            <strong>Want to skip ahead?</strong>
          </Text>
          <Text style={text}>
            Each referral = <strong>20 positions</strong> skipped for you, and <strong>10 positions</strong> for your friend!
          </Text>
          <Text style={text}>
            Your referral code: <span style={code}>{referralCode}</span>
          </Text>
        </Section>

        <Text style={footer}>
          Thanks,
          <br />
          OpenDraft Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default VerificationEmail;

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
  color: '#26251e',
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
};

const buttonContainer = {
  padding: '27px 40px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#8B5CF6',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const code = {
  fontFamily: 'monospace',
  backgroundColor: '#f3f4f6',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '14px',
};

const ctaSection = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  margin: '32px 40px',
  padding: '20px',
};

const ctaText = {
  color: '#26251e',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '32px 0',
  padding: '0 40px',
};
