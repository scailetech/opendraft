import { Suspense } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Payment Successful! 🎉</h1>
        <p className="text-muted-foreground mb-6">
          Your payment has been confirmed. Your thesis is now being generated!
        </p>
        <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 p-4 rounded-lg mb-4">
          <p className="text-sm text-green-800 dark:text-green-200">
            <strong>📧 Check your email</strong> - You'll receive a confirmation email shortly, 
            and another email with download links when your thesis is ready (usually within 30-60 minutes).
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Processing your thesis now...
        </p>
      </div>
    </div>
  );
}

