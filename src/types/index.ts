export interface Question {
  id: string;
  question: string;
  topic: string;
  options?: any;
  answer?: string;
}

export interface Assessment {
  id?: string;
  score: number | null;
  percentage: number | null;
  evaluationData: any;
  questions?: any;
  answers?: any;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  assessmentStatus?: string;
  assessments: Assessment[];
  job: {
    id: string;
    title: string;
  };
}

export interface JobMinimal {
  id: string;
  title: string;
  status?: string;
}

export interface CandidateItem {
  id: string;
  candidateId?: string | null;
  name: string;
  email: string;
  phone: string | null;
  jobId: string;
  assessmentStatus: 'INVITED' | 'STARTED' | 'COMPLETED' | 'EVALUATED' | 'SHORTLISTED' | 'SCHEDULED' | 'EXPIRED';
  assessmentToken: string;
  inviteSentAt: string;
  yearsOfExperience?: number | string | null;
  currentJobTitle?: string | null;
  currentCompany?: string | null;
  skills?: string[] | any;
  summary?: string | null;
  resumeText?: string | null;
  resumeUrl?: string | null;
  job?: {
    title: string;
  };
  assessments: {
    score: number | null;
  }[];
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  experience: string;
  status: string;
  createdAt: string;
  parsedJDData: {
    seniority?: string;
    experience?: string;
    topics?: string[];
    mustHave?: string[];
    goodToHave?: string[];
    weights?: Record<string, number>;
  };
  questions: Question[];
  candidates: Candidate[];
}

export interface TimeSlot {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  type: string; // 'Technical Interview' | 'System Design' | 'HR Screening'
  status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED';
  candidateName?: string;
  candidateEmail?: string;
}

export interface JobItem {
  id: string;
  title: string;
  department: string;
  location: string;
  experience: string;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  createdAt: string;
  parsedJDData: any;
  _count: {
    candidates: number;
    questions: number;
  };
}

export interface MatchedCandidate {
  jobCode: string;
  candidateName: string;
  candidateEmail: string;
  score: number;
  matchStatus: string;
  createdAt: string;
}

export interface JobDescriptionItem {
  contentHash: string;
  jobCode: string;
  jobTitle: string;
  jdText: string;
  createdAt: string;
  candidatesCount: number;
  matchedCandidates?: MatchedCandidate[];
}
