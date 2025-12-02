/**
 * ABOUTME: Email preferences page for managing notification settings
 * ABOUTME: Located at /preferences?email=user@example.com
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Email Preferences - OpenDraft',
  description: 'Manage your OpenDraft email notification preferences',
  robots: 'noindex, nofollow',
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PreferencesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const email = typeof params.email === 'string' ? params.email : '';

  // Sanitize email for display (prevent XSS)
  const sanitizedEmail = email
    ? decodeURIComponent(email).replace(/[<>"'&]/g, (char) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
          '&': '&amp;',
        };
        return entities[char] || char;
      })
    : '';

  // Validate it looks like an email (basic check)
  const isValidEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Email Preferences</h1>

        <p className="text-muted-foreground">
          Manage your OpenDraft email notifications.
        </p>

        {sanitizedEmail && isValidEmailFormat && (
          <p className="text-sm text-muted-foreground">
            Email: {sanitizedEmail}
          </p>
        )}

        <div className="bg-card border border-border rounded-lg p-6 text-left space-y-4">
          <p className="text-muted-foreground text-sm">
            Currently, we only send essential emails:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-2">
            <li>Email verification</li>
            <li>Waitlist position updates</li>
            <li>Thesis completion notification</li>
            <li>Referral rewards</li>
          </ul>
          <p className="text-muted-foreground text-sm">
            These are all transactional emails required for the service to
            function. You cannot opt out of these while on the waitlist.
          </p>
        </div>

        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Want to stop all emails?{' '}
            <a
              href={`/unsubscribe${email ? `?email=${encodeURIComponent(email)}` : ''}`}
              className="text-primary hover:underline"
            >
              Unsubscribe completely
            </a>
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Questions?{' '}
          <a
            href="mailto:support@clients.opendraft.xyz"
            className="text-primary hover:underline"
          >
            Contact support
          </a>
        </p>

        <a href="/" className="inline-block mt-4 text-primary hover:underline">
          Return to homepage
        </a>
      </div>
    </div>
  );
}
