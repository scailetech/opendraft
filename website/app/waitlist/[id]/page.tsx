import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PositionTracker } from '@/components/waitlist/PositionTracker';
import { ReferralDashboard } from '@/components/waitlist/ReferralDashboard';
import { DownloadButtons } from '@/components/waitlist/DownloadButtons';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';

interface PageProps {
  params: { id: string };
  searchParams: { verified?: string };
}

export default async function UserDashboard({ params, searchParams }: PageProps) {
  const { id } = params;

  // Fetch user data
  const { data: user, error } = await supabaseAdmin
    .from('waitlist')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !user) {
    notFound();
  }

  const statusIcons = {
    waiting: <Clock className="h-5 w-5 text-blue-500" />,
    processing: <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />,
    completed: <CheckCircle className="h-5 w-5 text-green-500" />,
    failed: <XCircle className="h-5 w-5 text-red-500" />,
  };

  const statusLabels = {
    waiting: 'Waiting in Queue',
    processing: 'Generating Thesis',
    completed: 'Completed',
    failed: 'Failed',
  };

  return (
    <section className="container py-24 sm:py-32">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Welcome, {user.full_name}!</h1>
          <div className="flex items-center justify-center gap-2">
            {statusIcons[user.status as keyof typeof statusIcons]}
            <span className="text-muted-foreground">
              Status: {statusLabels[user.status as keyof typeof statusLabels]}
            </span>
          </div>
        </div>

        {/* Verification Banner */}
        {searchParams.verified && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg">
            <p className="text-green-800 dark:text-green-200 text-center">
              ✅ Email verified successfully! You&apos;re now in the queue.
            </p>
          </div>
        )}

        {!user.email_verified && (
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200 text-center">
              ⚠️ Please verify your email to activate your waitlist position. Check your inbox!
            </p>
          </div>
        )}

        {/* Thesis Topic */}
        <div className="bg-muted/50 p-6 rounded-xl">
          <h2 className="font-semibold mb-2">Your Thesis Topic:</h2>
          <p className="text-muted-foreground">{user.thesis_topic}</p>
          <div className="flex gap-2 mt-3">
            <Badge variant="outline">{user.language.toUpperCase()}</Badge>
            <Badge variant="outline">{user.academic_level}</Badge>
          </div>
        </div>

        {/* Position Tracker */}
        {user.email_verified && user.status === 'waiting' && (
          <PositionTracker userId={user.id} initialPosition={user.position} />
        )}

        {/* Download Buttons */}
        <DownloadButtons
          pdfUrl={user.pdf_url}
          docxUrl={user.docx_url}
          status={user.status}
        />

        {/* Referral Dashboard */}
        {user.email_verified && (
          <ReferralDashboard referralCode={user.referral_code} userId={user.id} />
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Original Position</p>
            <p className="text-2xl font-bold">#{user.original_position}</p>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Current Position</p>
            <p className="text-2xl font-bold text-primary dark:text-border">
              #{user.position}
            </p>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Positions Skipped</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {user.original_position - user.position}
            </p>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Joined</p>
            <p className="text-sm font-medium">
              {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
