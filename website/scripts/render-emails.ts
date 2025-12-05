/**
 * ABOUTME: Pre-renders React Email templates to static HTML for Python backend
 * ABOUTME: Run with: npx tsx scripts/render-emails.ts
 */

import { render } from '@react-email/render';
import { CompletionEmail } from '../emails/CompletionEmail';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  // Output directory for Python backend
  const outputDir = path.join(__dirname, '../../backend/email_templates');

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Render CompletionEmail with placeholder variables
  // Python backend will replace these with actual values
  const html = await render(
    CompletionEmail({
      fullName: '{{FULL_NAME}}',
      pdfUrl: '{{PDF_URL}}',
      docxUrl: '{{DOCX_URL}}',
    })
  );

  // Note: {{UNSUBSCRIBE_URL}} and {{PREFERENCES_URL}} are already in the template
  // and will be replaced by Python backend
  const htmlWithPlaceholders = html;

  // Write to file
  const outputPath = path.join(outputDir, 'completion.html');
  fs.writeFileSync(outputPath, htmlWithPlaceholders);

  console.log(`Generated: ${outputPath}`);
  console.log('');
  console.log('Placeholders in template:');
  console.log("  {{FULL_NAME}} - User's full name");
  console.log('  {{THESIS_TOPIC}} - Thesis topic');
  console.log('  {{PDF_URL}} - Signed URL for PDF download');
  console.log('  {{DOCX_URL}} - Signed URL for DOCX download');
  console.log('  {{ACADEMIC_LEVEL}} - e.g. "Master\'s", "Bachelor\'s"');
  console.log('  {{LANGUAGE}} - e.g. "English"');
  console.log('  {{CITATION_COUNT}} - Number of citations');
  console.log('  {{WORD_COUNT}} - e.g. "~30,000"');
  console.log('  {{UNSUBSCRIBE_URL}} - Unsubscribe link');
  console.log('  {{PREFERENCES_URL}} - Email preferences link');
}

main().catch(console.error);
