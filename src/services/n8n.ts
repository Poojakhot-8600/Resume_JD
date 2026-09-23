import '@/utils/dns-fix';

export interface JDAnalysisData {
  skills: string[];
  mustHave: string[];
  goodToHave: string[];
  experience: string;
  seniority: string;
  topics: string[];
  weights: Record<string, number>;
}

export interface QuestionItem {
  id: string;
  question: string;
  topic: string;
}

export interface AnswerItem {
  questionId: string;
  questionText: string;
  answerText: string;
}

export interface EvaluationResponse {
  score: number;
  percentage: number;
  evaluationData: {
    overallFeedback: string;
    topicScores: Record<string, number>;
    skillScores: Record<string, number>;
    answersEvaluation: Record<
      string,
      {
        score: number;
        feedback: string;
      }
    >;
  };
}

const N8N_JD_WEBHOOK = process.env.N8N_JD_WEBHOOK_URL;
const N8N_GENERATE_ASSESSMENT = process.env.N8N_GENERATE_ASSESSMENT_URL;
const N8N_EVALUATE_ASSESSMENT = process.env.N8N_EVALUATE_ASSESSMENT_URL;

/**
 * Sends a job description to n8n for AI parsing, or falls back to mock data.
 */
export async function parseJobDescription(params: {
  title: string;
  experience: string;
  jdText: string;
}): Promise<JDAnalysisData> {
  const { title, experience, jdText } = params;

  if (N8N_JD_WEBHOOK) {
    try {
      console.log(`[n8n Service] POST to ${N8N_JD_WEBHOOK}`);
      const res = await fetch(N8N_JD_WEBHOOK, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-selected-label': 'JDInfo',
          'selectedLabel': 'JDInfo',
        },
        body: JSON.stringify({ title, experience, jdText }),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return (await res.json()) as JDAnalysisData;
    } catch (err) {
      console.error('[n8n Service] Error calling JD parser webhook:', err);
      console.log('[n8n Service] Falling back to mock JD analysis data');
    }
  }

  // Mock Fallback
  await new Promise((r) => setTimeout(r, 1500)); // Simulate AI delay
  const coreSkills = title.toLowerCase().includes('frontend')
    ? ['React', 'Next.js', 'TypeScript', 'CSS', 'Tailwind']
    : title.toLowerCase().includes('backend')
    ? ['Node.js', 'PostgreSQL', 'Prisma', 'REST APIs', 'TypeScript']
    : ['TypeScript', 'Next.js', 'Prisma', 'PostgreSQL', 'Tailwind CSS'];

  return {
    skills: coreSkills,
    mustHave: [
      `${experience} of relevant full-stack software development experience`,
      `Hands-on experience with ${coreSkills.slice(0, 3).join(', ')}`,
      'Proven ability to build scalable features and database models',
    ],
    goodToHave: [
      'Knowledge of cloud services (AWS, Vercel, Supabase)',
      'Experience with CI/CD and unit testing structures',
    ],
    experience: experience || 'Not available',
    seniority: experience.toLowerCase().includes('senior') ? 'Senior' : 'Mid-Level',
    topics: ['System Architecture', 'Database & ORMs', 'API Implementation', 'State Management'],
    weights: coreSkills.reduce((acc, skill, i) => {
      acc[skill] = 30 - i * 5;
      return acc;
    }, {} as Record<string, number>),
  };
}

/**
 * Sends job details to n8n to generate assessment questions, or falls back to mock questions.
 */
export async function generateAssessmentQuestions(params: {
  jobId: string;
  candidateId: string;
  parsedJDData: JDAnalysisData;
}): Promise<QuestionItem[]> {
  const { jobId, candidateId, parsedJDData } = params;

  if (N8N_GENERATE_ASSESSMENT) {
    try {
      console.log(`[n8n Service] POST to ${N8N_GENERATE_ASSESSMENT}`);
      const res = await fetch(N8N_GENERATE_ASSESSMENT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, candidateId, parsedJDData }),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return (await res.json()) as QuestionItem[];
    } catch (err) {
      console.error('[n8n Service] Error calling generate assessment webhook:', err);
      console.log('[n8n Service] Falling back to mock questions generator');
    }
  }

  // Mock Fallback
  await new Promise((r) => setTimeout(r, 1000));
  const topics = parsedJDData.topics && parsedJDData.topics.length > 0
    ? parsedJDData.topics
    : ['General Tech', 'Coding Practices', 'System Design'];

  const defaultQuestions: QuestionItem[] = [
    {
      id: 'q1',
      question: `Describe a complex feature you built using ${parsedJDData.skills[0] || 'TypeScript'}. What technical challenges did you face, and how did you resolve them?`,
      topic: topics[0] || 'System Architecture',
    },
    {
      id: 'q2',
      question: `What are your best-practice strategies for database schema design and migrations when using SQL databases or ORMs like ${parsedJDData.skills.includes('Prisma') ? 'Prisma' : 'an ORM'}?`,
      topic: topics[1] || 'Database & ORMs',
    },
    {
      id: 'q3',
      question: 'Explain how you approach error handling, input validation, and security protocols (such as JWT/OAuth) when designing backend API endpoints.',
      topic: topics[2] || 'API Implementation',
    },
    {
      id: 'q4',
      question: `How do you handle client-side vs. server-side state coordination? For example, using libraries like ${parsedJDData.skills.includes('Zustand') ? 'Zustand' : 'global stores'} or server cache hooks.`,
      topic: topics[3] || 'State Management',
    },
    {
      id: 'q5',
      question: 'Explain the difference between synchronous execution and asynchronous task queues (e.g. n8n, background queues) for heavy workflows.',
      topic: topics[0] || 'System Architecture',
    },
  ];

  return defaultQuestions;
}

/**
 * Triggers n8n to evaluate candidate answers, or falls back to mock scoring.
 */
export async function evaluateAssessment(params: {
  jobId: string;
  candidateId: string;
  questions: QuestionItem[];
  answers: Record<string, string>;
}): Promise<EvaluationResponse> {
  const { jobId, candidateId, questions, answers } = params;

  if (N8N_EVALUATE_ASSESSMENT) {
    try {
      console.log(`[n8n Service] POST to ${N8N_EVALUATE_ASSESSMENT}`);
      const res = await fetch(N8N_EVALUATE_ASSESSMENT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, candidateId, questions, answers }),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return (await res.json()) as EvaluationResponse;
    } catch (err) {
      console.error('[n8n Service] Error calling evaluate assessment webhook:', err);
      console.log('[n8n Service] Falling back to mock assessment evaluation');
    }
  }

  // Mock Fallback
  await new Promise((r) => setTimeout(r, 2000)); // Evaluation takes longer

  // Generate generic reasonable scores
  const score = Math.round((7 + Math.random() * 2.5) * 10) / 10; // 7.0 - 9.5
  const percentage = score * 10;

  const topicScores: Record<string, number> = {};
  const skillScores: Record<string, number> = {};
  const answersEvaluation: Record<string, { score: number; feedback: string }> = {};

  questions.forEach((q) => {
    const qScore = Math.round((q.id === 'q1' ? 8.5 : 7.0 + Math.random() * 2.5) * 10) / 10;
    topicScores[q.topic] = qScore;
    answersEvaluation[q.id] = {
      score: qScore,
      feedback: `The candidate provided a solid answer regarding ${q.topic}. Correct syntax and structural reasoning were exhibited, with minor gaps in extreme edge cases.`,
    };
  });

  // Calculate default skill scores
  const skills = ['TypeScript', 'Next.js', 'Database design', 'API implementation'];
  skills.forEach((s) => {
    skillScores[s] = Math.round((75 + Math.random() * 20));
  });

  return {
    score,
    percentage,
    evaluationData: {
      overallFeedback: `The candidate demonstrated strong capability. Good command over core technical aspects, showing strong database schemas and structural styling knowledge. Recommended for final technical round.`,
      topicScores,
      skillScores,
      answersEvaluation,
    },
  };
}
