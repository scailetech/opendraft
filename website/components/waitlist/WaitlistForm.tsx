'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WAITLIST_CONFIG } from '@/lib/config/waitlist';
import Turnstile from 'react-turnstile';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  thesisTopic: z
    .string()
    .min(10, 'Topic must be at least 10 characters')
    .max(500, 'Topic must be less than 500 characters'),
  language: z.string(),
  academicLevel: z.string(),
});

type FormData = z.infer<typeof formSchema>;

interface WaitlistFormProps {
  referralCode?: string;
}

export function WaitlistForm({ referralCode }: WaitlistFormProps) {
  const [turnstileToken, setTurnstileToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ position: number; referralCode: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      language: 'en',
      academicLevel: 'master',
    },
  });

  const selectedLanguage = watch('language');
  const selectedLevel = watch('academicLevel');

  const onSubmit = async (data: FormData) => {
    if (!turnstileToken) {
      setError('Please complete the verification');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/waitlist/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          turnstileToken,
          referredByCode: referralCode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Signup failed');
      }

      setSuccess({
        position: result.position,
        referralCode: result.referralCode,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-green-50 dark:bg-green-950 rounded-xl border-2 border-green-200 dark:border-green-800">
        <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-4">
          🎉 You&apos;re on the waitlist!
        </h3>
        <p className="text-green-700 dark:text-green-300 mb-4">
          <strong>Position #{success.position}</strong> - Check your email to verify your spot.
        </p>
        <p className="text-sm text-green-600 dark:text-green-400 mb-4">
          Want to skip ahead? Each referral = 20 positions skipped!
        </p>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-green-300 dark:border-green-700">
          <p className="text-xs text-muted-foreground mb-2">Your referral code:</p>
          <code className="text-lg font-mono font-bold text-accent">
            {success.referralCode}
          </code>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-6">
      {referralCode && (
        <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
          <p className="text-sm text-accent">
            🎁 You were referred! Your friend will skip 20 positions when you verify.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Email Address *
        </label>
        <Input
          id="email"
          type="email"
          placeholder="your.email@example.com"
          {...register('email')}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="fullName" className="block text-sm font-medium mb-2">
          Full Name *
        </label>
        <Input
          id="fullName"
          type="text"
          placeholder="John Doe"
          {...register('fullName')}
          className={errors.fullName ? 'border-red-500' : ''}
        />
        {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>}
      </div>

      <div>
        <label htmlFor="thesisTopic" className="block text-sm font-medium mb-2">
          Thesis Topic *
        </label>
        <Textarea
          id="thesisTopic"
          placeholder="Brief description of your thesis topic (e.g., 'Machine learning for climate prediction')"
          {...register('thesisTopic')}
          className={errors.thesisTopic ? 'border-red-500' : ''}
          rows={3}
        />
        {errors.thesisTopic && (
          <p className="text-red-500 text-sm mt-1">{errors.thesisTopic.message}</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="language" className="block text-sm font-medium mb-2">
            Language *
          </label>
          <Select value={selectedLanguage} onValueChange={(value) => setValue('language', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {WAITLIST_CONFIG.LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="academicLevel" className="block text-sm font-medium mb-2">
            Academic Level *
          </label>
          <Select
            value={selectedLevel}
            onValueChange={(value) => setValue('academicLevel', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bachelor">Bachelor&apos;s</SelectItem>
              <SelectItem value="master">Master&apos;s</SelectItem>
              <SelectItem value="phd">PhD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-center">
        <Turnstile
          sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          onVerify={setTurnstileToken}
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-lg">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || !turnstileToken}
        className="w-full bg-accent hover:bg-accent/90 text-white"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Joining Waitlist...
          </>
        ) : (
          'Join Free Waitlist'
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        By joining, you agree to receive email notifications about your thesis generation status.
      </p>
    </form>
  );
}
