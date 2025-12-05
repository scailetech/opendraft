/**
 * ABOUTME: Email preview script - renders all templates to HTML files for testing
 * ABOUTME: Run with: npx tsx scripts/preview-emails.ts
 */

import { render } from '@react-email/render';
import { VerificationEmail } from '../emails/VerificationEmail';
import { WelcomeEmail } from '../emails/WelcomeEmail';
import { ReferralRewardEmail } from '../emails/ReferralRewardEmail';
import { CompletionEmail } from '../emails/CompletionEmail';
import * as fs from 'fs';
import * as path from 'path';

// Output directory for previews
const outputDir = path.join(__dirname, '../email-previews');

// Sample data for previews
const sampleData = {
  fullName: 'John Doe',
  email: 'john@example.com',
  position: 42,
  referralCode: 'JOHN42XY',
  thesisTopic: 'The Impact of AI on Academic Writing',
  verificationUrl: 'https://opendraft.io/waitlist/verify?token=abc123',
  dashboardUrl: 'https://opendraft.io/waitlist/user-123',
  estimatedWait: '~2 days',
  referralCount: 6,
  newPosition: 12,
  oldPosition: 112,
  pdfUrl: 'https://example.com/thesis.pdf',
  docxUrl: 'https://example.com/thesis.docx',
  academicLevel: "Master's",
  language: 'English',
  citationCount: 67,
  wordCount: '~32,000',
};

// Helper to replace placeholders (simulating production behavior)
function replaceEmailPlaceholders(html: string, email: string): string {
  const encodedEmail = encodeURIComponent(email);
  const baseUrl = 'https://opendraft.io';
  return html
    .replace(/\{\{UNSUBSCRIBE_URL\}\}/g, `${baseUrl}/unsubscribe?email=${encodedEmail}`)
    .replace(/\{\{PREFERENCES_URL\}\}/g, `${baseUrl}/preferences?email=${encodedEmail}`);
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  // Render all emails (await each render)
  const emails = [
    {
      name: 'verification',
      html: await render(
        VerificationEmail({
          fullName: sampleData.fullName,
          verificationUrl: sampleData.verificationUrl,
          position: sampleData.position,
          referralCode: sampleData.referralCode,
        })
      ),
    },
    {
      name: 'welcome',
      html: await render(
        WelcomeEmail({
          fullName: sampleData.fullName,
          position: sampleData.position,
          referralCode: sampleData.referralCode,
          referralUrl: `https://opendraft.xyz/waitlist/r/${sampleData.referralCode}`,
        })
      ),
    },
    {
      name: 'referral-reward',
      html: await render(
        ReferralRewardEmail({
          fullName: sampleData.fullName,
          newPosition: sampleData.newPosition,
          oldPosition: sampleData.oldPosition,
          referralCount: sampleData.referralCount,
          dashboardUrl: sampleData.dashboardUrl,
          positionsSkipped: sampleData.oldPosition - sampleData.newPosition,
        })
      ),
    },
    {
      name: 'completion',
      html: await render(
        CompletionEmail({
          fullName: sampleData.fullName,
          pdfUrl: sampleData.pdfUrl,
          docxUrl: sampleData.docxUrl,
        })
      ),
    },
  ];

  // Write previews
  emails.forEach(({ name, html }) => {
    const processedHtml = replaceEmailPlaceholders(html, sampleData.email);
    const outputPath = path.join(outputDir, `${name}.html`);
    fs.writeFileSync(outputPath, processedHtml);
    console.log(`Generated: ${outputPath}`);
  });

  // Create an index page
  const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Email Previews</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #171717; }
    .email-list { list-style: none; padding: 0; }
    .email-list li { margin: 12px 0; }
    .email-list a {
      display: inline-block;
      padding: 12px 24px;
      background: #22c55e;
      color: #000;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
    }
    .email-list a:hover { background: #16a34a; }
    .tip { background: #f5f5f5; padding: 16px; border-radius: 8px; margin-top: 24px; }
  </style>
</head>
<body>
  <h1>OpenDraft Email Previews</h1>
  <p>Click to preview each email template:</p>
  <ul class="email-list">
    ${emails.map(({ name }) => `<li><a href="${name}.html">${name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</a></li>`).join('\n    ')}
  </ul>
  <div class="tip">
    <strong>Tip:</strong> Toggle your system appearance (light/dark mode) to test both themes.
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml);
  console.log(`\nGenerated: ${path.join(outputDir, 'index.html')}`);
  console.log('\nOpen email-previews/index.html in your browser to preview all emails.');
}

main().catch(console.error);
