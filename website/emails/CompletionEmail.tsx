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

interface CompletionEmailProps {
  fullName: string;
  pdfUrl: string;
  docxUrl: string;
}

export const CompletionEmail = ({
  fullName = 'Student',
  pdfUrl = 'https://example.com/thesis.pdf',
  docxUrl = 'https://example.com/thesis.docx',
}: CompletionEmailProps) => (
  <Html>
    <Head />
    <Preview>Your AI-Generated Thesis is Ready! 🎓</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your Thesis is Ready, {fullName}! 🎓</Heading>

        <Text style={text}>
          We've generated your thesis using our 15 AI agents. Download it now:
        </Text>

        <Section style={buttonContainer}>
          <Button style={buttonPdf} href={pdfUrl}>
            Download PDF
          </Button>
          <Button style={buttonDocx} href={docxUrl}>
            Download Word
          </Button>
        </Section>

        <Section style={alertBox}>
          <Text style={alertText}>
            <strong>⏰ These links expire in 7 days.</strong>
            <br />
            Make sure to download your thesis files before they expire.
          </Text>
        </Section>

        <Section style={academicHonestyBox}>
          <Text style={alertText}>
            <strong>📚 Academic Honesty Reminder</strong>
          </Text>
          <Text style={smallText}>
            This AI-generated thesis is a <strong>research aid</strong>, not a substitute for your own work.
            Check your institution's AI usage policy before submission. We recommend using it as:
          </Text>
          <ul style={list}>
            <li>A starting point for research</li>
            <li>An outline template</li>
            <li>A reference for structure and formatting</li>
          </ul>
          <Text style={smallText}>
            Always cite AI tools appropriately and ensure all work meets your institution's standards.
          </Text>
        </Section>

        <Text style={text}>
          Love your thesis? Star us on{' '}
          <a href="https://github.com/federicodeponte/opendraft" style={link}>
            GitHub
          </a>!
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

export default CompletionEmail;

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

const buttonPdf = {
  backgroundColor: '#8B5CF6',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '8px 8px 8px 0',
};

const buttonDocx = {
  backgroundColor: '#6366f1',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '8px 0',
};

const alertBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '16px',
  border: '1px solid #fbbf24',
};

const academicHonestyBox = {
  backgroundColor: '#dbeafe',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '16px',
  border: '1px solid #3b82f6',
};

const alertText = {
  color: '#26251e',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px 0',
};

const smallText = {
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

const list = {
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
  paddingLeft: '20px',
};

const link = {
  color: '#8B5CF6',
  textDecoration: 'underline',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '32px 0',
  padding: '0 40px',
};
