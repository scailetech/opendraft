// Waitlist configuration constants

export const WAITLIST_CONFIG = {
  // Daily processing limits
  DAILY_THESIS_LIMIT: parseInt(process.env.NEXT_PUBLIC_DAILY_THESIS_LIMIT || '20'),

  // Referral mechanics: 1 referral = 20 positions
  REFERRAL_REWARD: parseInt(process.env.NEXT_PUBLIC_REFERRAL_REWARD || '20'), // Positions per referral
  REFERRALS_REQUIRED: parseInt(process.env.NEXT_PUBLIC_REFERRALS_REQUIRED || '1'), // 1 referral = reward

  // Rate limiting
  SIGNUPS_PER_IP_PER_DAY: 3,

  // File expiry
  FILE_EXPIRY_DAYS: 7,
  FILE_EXPIRY_SECONDS: 7 * 24 * 60 * 60, // 7 days in seconds

  // Referral code settings
  REFERRAL_CODE_LENGTH: 9,
  REFERRAL_CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // No confusing chars (0,O,1,I)

  // Email settings
  FROM_EMAIL: 'OpenDraft <hello@opendraft.ai>',
  REPLY_TO_EMAIL: 'support@opendraft.ai',

  // Processing schedule
  PROCESSING_TIME_UTC: '09:00', // 9am UTC daily

  // Status values
  STATUS: {
    WAITING: 'waiting',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
  } as const,

  // Academic levels
  ACADEMIC_LEVELS: {
    BACHELOR: 'bachelor',
    MASTER: 'master',
    PHD: 'phd',
  } as const,

  // Supported languages
  LANGUAGES: [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
  ] as const,
} as const;

export type WaitlistStatus = typeof WAITLIST_CONFIG.STATUS[keyof typeof WAITLIST_CONFIG.STATUS];
export type AcademicLevel = typeof WAITLIST_CONFIG.ACADEMIC_LEVELS[keyof typeof WAITLIST_CONFIG.ACADEMIC_LEVELS];
export type LanguageCode = typeof WAITLIST_CONFIG.LANGUAGES[number]['code'];
