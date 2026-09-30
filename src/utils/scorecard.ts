/**
 * Utility helper to safely parse JSON fields that might be returned as strings
 * from Supabase/PostgreSQL or as native objects/arrays.
 */
export function parseJsonField<T>(value: any, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return (parsed ?? fallback) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export interface CandidateScorecardData {
  id?: string;
  resume_id?: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  job_code: string;
  job_title: string;
  job_seniority?: string | null;
  match_percent: number;
  band?: string | null;
  coverage_matched?: number | null;
  coverage_total?: number | null;
  coverage_percent?: number | null;
  coverage_text?: string | null;
  score_skills?: number | string | null;
  score_experience?: number | string | null;
  score_responsibilities?: number | string | null;
  score_domain?: number | string | null;
  score_seniority?: number | string | null;
  score_education?: number | string | null;
  dimension_scores?: any;
  dimension_contributions?: any;
  matched_skills?: string[] | string | null;
  gap_skills?: string[] | string | null;
  knockout_status?: string | null;
  knockout_flags?: string[] | string | null;
  data_confidence?: number | null;
  recommended_next_step?: string | null;
  explanation?: any;
  created_at?: string | null;

  // Joined from candidates table:
  phone?: string | null;
  current_job_title?: string | null;
  current_company?: string | null;
  years_of_experience?: number | string | null;
  seniority?: string | null;
  candidate_seniority?: string | null;
  location?: string | null;
}
