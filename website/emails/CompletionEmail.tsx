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

interface CompletionEmailProps {
  fullName: string;
  pdfUrl: string;
  docxUrl: string;
  zipUrl?: string;
}

export const CompletionEmail = ({
  fullName = 'Student',
  pdfUrl = 'https://example.com/thesis.pdf',
  docxUrl = 'https://example.com/thesis.docx',
  zipUrl,
}: CompletionEmailProps) => (
  <Html>
    <Head>
      <style>{darkModeMediaQuery}</style>
    </Head>
    <Preview>Your AI-Generated Thesis is Ready! 🎓</Preview>
    <Body style={styles.main} className="email-body">
      <Container style={styles.container} className="email-container">
        {/* Header */}
        <div style={styles.header}>
          <Text style={styles.logo}>OpenDraft</Text>
        </div>

        {/* Hero Section */}
        <div style={styles.heroSection}>
          <span className="info-badge" style={styles.badge}>
            🎓 Thesis Ready!
          </span>
          <Heading style={styles.h1}>Your Thesis is Ready, {fullName}!</Heading>
          <Text style={styles.heroText} className="email-text-muted">
            We've generated your thesis using our 19 AI agents. Download it now:
          </Text>
        </div>

        {/* Download Buttons */}
        <div style={styles.buttonWrapper}>
          <Button style={styles.buttonPrimary} href={pdfUrl}>
            Download PDF
          </Button>
          <div style={{ marginTop: '12px' }}>
            <Button style={styles.buttonSecondary} href={docxUrl}>
              Download Word
            </Button>
          </div>
          {zipUrl && (
            <div style={{ marginTop: '12px' }}>
              <Button style={styles.buttonSecondary} href={zipUrl}>
                📦 Download ZIP (All Files)
              </Button>
            </div>
          )}
        </div>

        {/* Alert Box */}
        <div className="alert-card" style={styles.cardWarning}>
          <Text style={{ color: colors.warningText, fontSize: styles.textSmall.fontSize, lineHeight: styles.textSmall.lineHeight, margin: '0', padding: '0' }}>
            <span style={styles.strong}>⏰ These links expire in 7 days.</span>
            <br />
            Make sure to download your thesis files before they expire.
          </Text>
        </div>

        {/* Academic Honesty Box */}
        <div className="info-card" style={styles.cardInfo}>
          <Text style={styles.cardTitleInfo}>
            <span style={styles.strong}>📚 Academic Honesty Reminder</span>
          </Text>
          <Text style={styles.cardTextInfo} className="email-text-muted">
            This AI-generated thesis is a <span style={styles.strong}>research aid</span>, not a substitute for your own work.
            Check your institution's AI usage policy before submission. We recommend using it as:
          </Text>
          <ul style={{ color: colors.infoDark, fontSize: styles.textSmall.fontSize, lineHeight: styles.textSmall.lineHeight, margin: '8px 0', paddingLeft: '20px' }}>
            <li>A starting point for research</li>
            <li>An outline template</li>
            <li>A reference for structure and formatting</li>
          </ul>
          <Text style={styles.cardTextInfo} className="email-text-muted">
            Always cite AI tools appropriately and ensure all work meets your institution's standards.
          </Text>
        </div>

        <Text style={styles.text} className="email-text">
          Love your thesis? Star us on{' '}
          <a href="https://github.com/federicodeponte/opendraft" style={styles.link}>
            GitHub
          </a>!
        </Text>

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

export default CompletionEmail;
