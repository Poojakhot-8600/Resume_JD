import '@/utils/dns-fix';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { pool } from '@/database/db';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';

    // Query job_descriptions joined with candidate counts from jd_matches
    const res = await pool.query(`
      SELECT 
        jd.content_hash as "contentHash",
        jd.job_code as "jobCode",
        jd.job_title as "jobTitle",
        jd.jd_text as "jdText",
        jd.created_at as "createdAt",
        COALESCE(m.candidates_count, 0)::int as "candidatesCount"
      FROM job_descriptions jd
      LEFT JOIN (
        SELECT job_code, COUNT(DISTINCT candidate_id) as candidates_count
        FROM jd_matches
        GROUP BY job_code
      ) m ON m.job_code = jd.job_code
      ORDER BY jd.created_at DESC;
    `);

    let jobDescriptions = res.rows;

    if (search) {
      jobDescriptions = jobDescriptions.filter((j: any) =>
        (j.jobTitle && j.jobTitle.toLowerCase().includes(search)) ||
        (j.jobCode && j.jobCode.toLowerCase().includes(search)) ||
        (j.jdText && j.jdText.toLowerCase().includes(search))
      );
    }

    // Fetch matched candidates summary for each job
    const candidatesRes = await pool.query(`
      SELECT 
        job_code as "jobCode",
        candidate_name as "candidateName",
        candidate_email as "candidateEmail",
        ROUND(score::numeric, 1)::float as "score",
        match_status as "matchStatus",
        created_at as "createdAt"
      FROM jd_matches
      ORDER BY score DESC;
    `);

    const candidatesByJob: Record<string, any[]> = {};
    candidatesRes.rows.forEach((c) => {
      if (c.jobCode) {
        if (!candidatesByJob[c.jobCode]) {
          candidatesByJob[c.jobCode] = [];
        }
        candidatesByJob[c.jobCode].push(c);
      }
    });

    const enrichedDescriptions = jobDescriptions.map((jd) => ({
      ...jd,
      matchedCandidates: jd.jobCode ? (candidatesByJob[jd.jobCode] || []) : [],
    }));

    return NextResponse.json({
      success: true,
      jobDescriptions: enrichedDescriptions,
    });
  } catch (error: any) {
    console.error('Error fetching job_descriptions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch job descriptions from database' },
      { status: 500 }
    );
  }
}
