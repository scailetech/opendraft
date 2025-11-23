'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service (e.g., Sentry)
    // For now, only log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error boundary caught:', error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-border via-white to-accent">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-red-100 p-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>

        <p className="text-muted-foreground mb-6">
          We encountered an unexpected error. This has been logged and we&apos;ll look into it.
        </p>

        {process.env.NODE_ENV === 'development' && error.digest && (
          <p className="text-sm text-muted-foreground mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Button onClick={reset} size="lg" className="w-full">
            Try again
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => window.location.href = '/'}
          >
            Go to homepage
          </Button>
        </div>
      </Card>
    </div>
  );
}
