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

interface WelcomeEmailProps {
  fullName: string;
  position: number;
  referralCode: string;
  referralUrl: string;
}

export const WelcomeEmail = ({
  fullName = 'Student',
  position = 42,
  referralCode = 'ABC123XYZ',
  referralUrl = 'https://opendraft.ai/waitlist/r/ABC123XYZ',
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>{`Welcome to OpenDraft - You're #${position} in line!`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to OpenDraft! 🎓</Heading>

        <Text style={text}>Hi {fullName},</Text>

        <Text style={text}>
          You're successfully on the waitlist! Here's everything you need to know:
        </Text>

        <Section style={positionBox}>
          <Text style={positionLabel}>Your Current Position</Text>
          <Text style={positionNumber}>#{position}</Text>
          <Text style={smallText}>
            We process <strong>20 theses per day</strong>, so you'll receive your thesis in approximately{' '}
            <strong>{Math.ceil(position / 20)} days</strong>.
          </Text>
        </Section>

        <Hr style={divider} />

        <Section style={section}>
          <Heading style={h2}>Want to Skip Ahead? 🚀</Heading>
          <Text style={text}>
            Unlock <strong>5 reward tiers</strong> by referring friends. The more you share, the faster you move up!
          </Text>

          <Section style={tierBox}>
            <Text style={tierTitle}>🎁 Reward Tiers</Text>
            <div style={tierList}>
              <Text style={tierItem}>🎯 <strong>Tier 1:</strong> 1 referral = +30 positions + Thesis Template</Text>
              <Text style={tierItem}>⚡ <strong>Tier 2:</strong> 3 referrals = +150 positions + Early Beta Access</Text>
              <Text style={tierItem}>💎 <strong>Tier 3:</strong> 5 referrals = +300 positions + Priority Support</Text>
              <Text style={tierItem}>👑 <strong>Tier 4:</strong> 10 referrals = +1000 positions + Free Generation!</Text>
            </div>
            <Text style={smallText}>
              <strong>Bonus:</strong> Your friends who use your link get +20 positions too! 🎁
            </Text>
          </Section>

          <Section style={referralBox}>
            <Text style={referralLabel}>Your Referral Link:</Text>
            <Text style={referralLink}>{referralUrl}</Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={referralUrl}>
              Share Referral Link
            </Button>
          </Section>
        </Section>

        <Hr style={divider} />

        <Section style={section}>
          <Heading style={h2}>What Happens Next?</Heading>
          <div style={timeline}>
            <Text style={timelineItem}>
              ✅ <strong>Now:</strong> You're on the waitlist
            </Text>
            <Text style={timelineItem}>
              📧 <strong>When processing starts:</strong> You'll get a notification
            </Text>
            <Text style={timelineItem}>
              🎓 <strong>When complete:</strong> Download links for PDF & Word files
            </Text>
          </div>
        </Section>

        <Section style={faqBox}>
          <Text style={faqTitle}>Quick FAQ:</Text>
          <Text style={faqItem}>
            <strong>How long is the thesis?</strong>
            <br />
            20,000+ words (80-100 pages)
          </Text>
          <Text style={faqItem}>
            <strong>What formats do I get?</strong>
            <br />
            Both PDF and Microsoft Word (.docx)
          </Text>
          <Text style={faqItem}>
            <strong>How long do download links last?</strong>
            <br />
            7 days from completion
          </Text>
          <Text style={faqItem}>
            <strong>Can I use this for my actual thesis?</strong>
            <br />
            Check your institution's AI policy. We recommend using it as a research aid and starting point.
          </Text>
        </Section>

        <Text style={footer}>
          Questions? Reply to this email or check our{' '}
          <a href="https://opendraft.ai/#faq" style={link}>
            FAQ
          </a>
          .
        </Text>

        <Text style={footer}>
          Thanks,
          <br />
          OpenDraft Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default WelcomeEmail;

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

const h2 = {
  color: '#26251e',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '24px 0 16px 0',
  padding: '0 40px',
};

const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '0 40px',
};

const section = {
  margin: '24px 0',
};

const positionBox = {
  backgroundColor: '#ede9fe',
  borderRadius: '12px',
  margin: '24px 40px',
  padding: '24px',
  textAlign: 'center' as const,
  border: '2px solid #8B5CF6',
};

const positionLabel = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const positionNumber = {
  color: '#8B5CF6',
  fontSize: '48px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
  lineHeight: '1',
};

const smallText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const referralBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  margin: '16px 40px',
  padding: '16px',
  textAlign: 'center' as const,
};

const referralLabel = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const referralLink = {
  color: '#8B5CF6',
  fontSize: '14px',
  fontFamily: 'monospace',
  margin: '0',
  wordBreak: 'break-all' as const,
};

const buttonContainer = {
  padding: '16px 40px',
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

const timeline = {
  padding: '0 40px',
};

const timelineItem = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '32px',
  margin: '8px 0',
};

const faqBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '20px',
};

const faqTitle = {
  color: '#26251e',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const faqItem = {
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '12px 0',
};

const divider = {
  margin: '32px 40px',
  borderColor: '#e5e7eb',
  borderWidth: '1px',
};

const link = {
  color: '#8B5CF6',
  textDecoration: 'underline',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const tierBox = {
  backgroundColor: '#faf5ff',
  borderRadius: '8px',
  margin: '16px 40px',
  padding: '20px',
  border: '2px solid #8B5CF6',
};

const tierTitle = {
  color: '#26251e',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
  textAlign: 'center' as const,
};

const tierList = {
  margin: '12px 0',
};

const tierItem = {
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};
