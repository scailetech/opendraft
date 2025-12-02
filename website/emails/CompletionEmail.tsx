/**
 * ABOUTME: Email sent when thesis generation is complete
 * ABOUTME: Contains download links for PDF and DOCX
 */

import { Heading, Text, Section } from '@react-email/components';
import * as React from 'react';
import { styles, colors, spacing } from './styles';
import {
  EmailWrapper,
  PrimaryButton,
  SecondaryButton,
  ButtonGroup,
  Card,
  DetailsTable,
  AlertBox,
} from './components';

interface CompletionEmailProps {
  fullName: string;
  thesisTopic: string;
  pdfUrl: string;
  docxUrl: string;
  academicLevel: string;
  language: string;
  citationCount: number;
  wordCount: string;
}

export const CompletionEmail = ({
  fullName = 'Student',
  thesisTopic = 'The Impact of AI on Modern Healthcare',
  pdfUrl = 'https://example.com/thesis.pdf',
  docxUrl = 'https://example.com/thesis.docx',
  academicLevel = "Master's",
  language = 'English',
  citationCount = 63,
  wordCount = '~30,000',
}: CompletionEmailProps) => (
  <EmailWrapper preview="Your AI-Generated Thesis is Ready!">
    <Heading style={styles.h1} className="email-text">Your Thesis is Ready!</Heading>

    <Text style={styles.text} className="email-text-muted">Hi {fullName},</Text>

    <Text style={styles.text} className="email-text-muted">
      Great news! Your AI-generated thesis is complete.
      Download it now:
    </Text>

    <ButtonGroup>
      <PrimaryButton href={pdfUrl}>Download PDF</PrimaryButton>
      <SecondaryButton href={docxUrl}>Download Word</SecondaryButton>
    </ButtonGroup>

    <Text style={styles.smallText} className="email-text-muted">
      <em>Note: Word may show a dialog about updating fields when opening - click "Yes" to enable the table of contents with page numbers.</em>
    </Text>

    <AlertBox type="warning" title="Download links expire in 7 days">
      Make sure to download your thesis files before they expire.
    </AlertBox>

    <Section>
      <Heading style={styles.h2} className="email-text">Thesis Details</Heading>
      <Card>
        <DetailsTable
          items={[
            { label: 'Topic', value: thesisTopic },
            { label: 'Academic Level', value: academicLevel },
            { label: 'Language', value: language },
            { label: 'Citations', value: `${citationCount} academic sources` },
            { label: 'Word Count', value: `${wordCount} words` },
          ]}
        />
      </Card>
    </Section>

    <Section>
      <Heading style={styles.h2} className="email-text">What's Included</Heading>
      <Text style={styles.text} className="email-text-muted">
        • Full thesis structure (Introduction, Literature Review, Methodology,
        Results, Discussion, Conclusion)
        <br />
        • Properly formatted citations (APA/IEEE)
        <br />
        • Abstract and Executive Summary
        <br />
        • Table of Contents
        <br />• Complete Bibliography
      </Text>
    </Section>

    <AlertBox type="info" title="Academic Honesty Reminder">
      This AI-generated thesis is a research aid, not a substitute for your own
      work. Check your institution's AI usage policy. We recommend using it as a
      starting point, outline template, or reference for structure.
    </AlertBox>
  </EmailWrapper>
);

export default CompletionEmail;
