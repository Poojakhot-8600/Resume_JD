/**
 * Application-wide Environment Configuration
 * Centralizes all environment configuration variables, prevents hardcoding,
 * and provides type-safe, validated access across server and client boundaries.
 */

export const env = {
  // Application
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',

  // Security & Authentication
  jwtSecret: process.env.JWT_SECRET || '',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  // Bootstrap Admin & Recruiter Credentials
  defaultAdminEmail: (process.env.DEFAULT_ADMIN_EMAIL || 'admin@gmail.com').trim().toLowerCase(),
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
  defaultRecruiterEmail: (process.env.DEFAULT_RECRUITER_EMAIL || 'recruiter@gmail.com').trim().toLowerCase(),
  defaultRecruiterPassword: process.env.DEFAULT_RECRUITER_PASSWORD || 'recruiter123',

  // Demo Login (Enabled in non-production / demo environments)
  enableDemoLogin: process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true',
  demoAdminEmail: (process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL || process.env.DEFAULT_ADMIN_EMAIL || 'admin@gmail.com').trim().toLowerCase(),
  demoAdminPassword: process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',

  // Webhook Integrations & Secrets
  n8nSharedSecret: process.env.N8N_SHARED_SECRET || '',
  n8nJdWebhookUrl: process.env.N8N_JD_WEBHOOK_URL || '',
  n8nCandidateResumeWebhookUrl: process.env.N8N_CANDIDATE_RESUME_WEBHOOK_URL || '',
  n8nGenerateAssessmentUrl: process.env.N8N_GENERATE_ASSESSMENT_URL || '',
  n8nEvaluateAssessmentUrl: process.env.N8N_EVALUATE_ASSESSMENT_URL || '',
  cronSecret: process.env.CRON_SECRET || '',

  // Database Connection
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_URL || '',

  // Supabase
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Email Notification System
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'Assessment Platform <onboarding@resend.dev>',
};
