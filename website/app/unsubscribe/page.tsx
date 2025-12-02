/**
 * ABOUTME: Unsubscribe confirmation page for CAN-SPAM compliance
 * ABOUTME: Located at /unsubscribe?email=user@example.com
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Unsubscribe - OpenDraft',
  description: 'Unsubscribe from OpenDraft emails',
  robots: 'noindex, nofollow',
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const email = typeof params.email === 'string' ? params.email : '';
  const success = params.success === 'true';
  const error = typeof params.error === 'string' ? params.error : '';

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
        <h1 className="text-2xl font-bold text-foreground">
          {success ? 'Unsubscribed' : 'Unsubscribe'}
        </h1>

        {error === 'missing_email' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive text-sm">
              Missing email address. Please use the link from your email.
            </p>
          </div>
        )}

        {error === 'invalid_email' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive text-sm">
              Invalid email address format.
            </p>
          </div>
        )}

        {error === 'failed' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive text-sm">
              Something went wrong. Please try again or contact support.
            </p>
          </div>
        )}

        {success ? (
          <>
            <p className="text-muted-foreground">
              You have been successfully unsubscribed from OpenDraft emails.
            </p>

            {sanitizedEmail && isValidEmailFormat && (
              <p className="text-sm text-muted-foreground">
                Email: {sanitizedEmail}
              </p>
            )}

            <p className="text-sm text-muted-foreground">
              You will no longer receive marketing emails from us. Note that you
              may still receive essential transactional emails (like thesis
              delivery).
            </p>
          </>
        ) : (
          !error && (
            <>
              <p className="text-muted-foreground">
                Click the button below to unsubscribe from OpenDraft emails.
              </p>

              {sanitizedEmail && isValidEmailFormat && (
                <p className="text-sm text-muted-foreground">
                  Email: {sanitizedEmail}
                </p>
              )}

              <form action="/api/unsubscribe" method="GET">
                <input type="hidden" name="email" value={email} />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Confirm Unsubscribe
                </button>
              </form>
            </>
          )
        )}

        <p className="text-sm text-muted-foreground">
          Questions or changed your mind?{' '}
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
