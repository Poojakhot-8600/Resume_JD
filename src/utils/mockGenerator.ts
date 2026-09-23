import { prisma } from '@/database/db';

export function get150MockQuestions(title: string): { question: string; options: string[]; answer: string; topic: string }[] {
  const topics = [
    { name: "Frontend Core", skills: ["React", "CSS Layouts", "TypeScript type-guards", "Next.js routing", "Zustand state"] },
    { name: "Backend Systems", skills: ["Node.js microservices", "REST API routes", "Express middleware", "GraphQL schemas", "gRPC proto contracts"] },
    { name: "Database Design", skills: ["SQL indexing", "Relational Normalization", "Prisma ORM transactions", "Redis caches", "PostgreSQL tables"] },
    { name: "System Design", skills: ["Distributed Caching", "Load Balancers", "Message Queues", "Horizontal Auto-scaling", "API Gateways"] },
    { name: "Security & Auth", skills: ["JWT signatures", "OAuth token flows", "HTTPS TLS handshakes", "CORS policies", "Data Encryption"] },
    { name: "DevOps & CI/CD", skills: ["Docker container configs", "Kubernetes cluster state", "GitHub Actions workflows", "AWS ECS tasks", "Infrastructure as Code"] },
  ];

  const questionTemplates = [
    {
      q: "How would you optimize a performance bottleneck in {skill} during production deployments?",
      opts: ["Configure in-memory caching and memoization rules", "Double the CPU size of the database host node", "Rewrite the codebase scripts", "Disable diagnostic logging layers"],
      ans: "Configure in-memory caching and memoization rules"
    },
    {
      q: "What is the primary architectural trade-off when implementing {skill} structures?",
      opts: ["Increased setup complexity vs long-term scalability and audit logs", "High memory footprints vs minor disk space gains", "Single-threaded limits vs native multi-core processes", "Database connection leaks vs low lock latency"],
      ans: "Increased setup complexity vs long-term scalability and audit logs"
    },
    {
      q: "Which protocol is considered best practice when coordinating {skill} interfaces?",
      opts: ["Structured JSON payloads over secure HTTPS channels", "Raw TCP packet streams without handshakes", "Short polling requests every 10 milliseconds", "Direct file system triggers"],
      ans: "Structured JSON payloads over secure HTTPS channels"
    },
    {
      q: "In a high-throughput application utilizing {skill}, how do you prevent data race conditions?",
      opts: ["Implement optimistic locking and secure transactions", "Restrict application runtime to a single thread", "Disable query indexes during updates", "Inject standard setTimeout delays"],
      ans: "Implement optimistic locking and transactions"
    },
    {
      q: "Which hook or function is standard for initializing state in {skill} contexts?",
      opts: ["Lifecycle callbacks / state hooks", "Basic console debugger statements", "Custom action button click handlers", "Direct DOM query selector overrides"],
      ans: "Lifecycle callbacks / state hooks"
    }
  ];

  const list: any[] = [];
  while (list.length < 150) {
    const topic: any = topics[list.length % topics.length];
    const skill: string = topic.skills[Math.floor(list.length / topics.length) % topic.skills.length];
    const template: any = questionTemplates[list.length % questionTemplates.length];
    
    const formattedQ: string = template.q.replace("{skill}", skill);
    const rawOpts: string[] = template.opts.map((opt: string) => opt.replace("{skill}", skill));
    const formattedAns: string = template.ans.replace("{skill}", skill);

    // Shuffle options array randomly to distribute correct answer key across A, B, C, D indexes
    const formattedOpts = [...rawOpts];
    for (let i = formattedOpts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = formattedOpts[i];
      formattedOpts[i] = formattedOpts[j];
      formattedOpts[j] = temp;
    }

    list.push({
      question: `[MCQ-${list.length + 1}] ${formattedQ}`,
      options: formattedOpts,
      answer: formattedAns,
      topic: topic.name
    });
  }
  return list;
}

export async function generateMockDataForJob(jobId: bigint | string, title: string, experience: string) {
  try {
    const positionId = typeof jobId === 'string' ? BigInt(jobId) : jobId;
    // Generate exactly 150 MCQ questions
    const mockQuestions = get150MockQuestions(title);

    // Delete existing if any, to avoid conflicts
    await prisma.questionBank.deleteMany({ where: { positionId } });

    // Create questions in bulk (using transactions/loops)
    const createdQuestions: any[] = [];
    for (const q of mockQuestions) {
      const dbQ = await (prisma as any).questionBank.create({
        data: {
          positionId,
          question: q.question,
          topic: q.topic,
          options: q.options,
          answer: q.answer,
        },
      });
      createdQuestions.push(dbQ);
    }

    // 2. Mock JD details
    const mockJDData = {
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'System Design'],
      mustHave: [`Relevant software development experience for ${title}`, 'Strong understanding of databases & API standards'],
      goodToHave: ['Familiarity with containerization (Docker)', 'Knowledge of caching and event loops'],
      experience: experience,
      seniority: 'Mid-Level',
      topics: ['Frontend Core', 'Backend Systems', 'Database Design', 'System Design', 'Security & Auth', 'DevOps & CI/CD'],
      weights: { 'Frontend Core': 20, 'Backend Systems': 20, 'Database Design': 20, 'System Design': 15, 'Security & Auth': 10, 'DevOps & CI/CD': 15 }
    };

    // Update job to ACTIVE with parsed details
    await prisma.job.update({
      where: { id: positionId },
      data: {
        skills: mockJDData.skills,
        mustHave: mockJDData.mustHave,
        goodToHave: mockJDData.goodToHave,
        experience: mockJDData.experience,
        seniority: mockJDData.seniority,
        topics: mockJDData.topics,
        weights: mockJDData.weights,
        status: 'ACTIVE',
      },
    });

    // 3. Create Mock Candidates (Select a subset of 20 MCQ questions for the assessments)
    const activeQuestions = createdQuestions.slice(0, 20);

    const mockCandidatesRaw = [
      {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        phone: '+1 (555) 019-2834',
        targetScore: 18,
        overallFeedback: 'Jane demonstrates excellent fullstack foundations, scoring 18/20. Her performance in React, Database Design, and API standards shows high competency.',
        skillScores: { 'Frontend Core': 95, 'Backend Systems': 90, 'Database Design': 95, 'System Design': 85, 'Security & Auth': 90 },
      },
      {
        name: 'Alex Rivera',
        email: 'alex.rivera@example.com',
        phone: '+1 (555) 012-9843',
        targetScore: 11,
        overallFeedback: 'Alex scores 11/20, representing mid-level understanding. He has solid knowledge in Frontend development but needs improvement on databases and event loop behaviors.',
        skillScores: { 'Frontend Core': 80, 'Backend Systems': 50, 'Database Design': 60, 'System Design': 45, 'Security & Auth': 40 },
      }
    ];

    for (const c of mockCandidatesRaw) {
      // Delete candidate if exists to avoid unique email conflicts
      const existing = await prisma.candidate.findFirst({
        where: { email: c.email, positionId },
      });
      if (existing) {
        await prisma.candidate.delete({
          where: {
            id: existing.id,
          },
        });
      }

      // Create answers and answersEvaluation
      const answers: Record<string, string> = {};
      const answersEvaluation: Record<string, any> = {};
      let correctCount = 0;

      // Seed answers: we distribute correct/incorrect to match the target score over the 20 active questions
      activeQuestions.forEach((q, idx) => {
        const expectedAns = q.answer || '';
        const options = (q.options as string[]) || [];
        const isCorrect = idx < c.targetScore;

        if (isCorrect) {
          answers[q.id] = expectedAns;
          answersEvaluation[q.id] = {
            score: 10,
            feedback: `Correct option chosen: "${expectedAns}". Matches the expected answer key.`
          };
          correctCount++;
        } else {
          // Select an incorrect option
          const incorrectOptions = options.filter(opt => opt !== expectedAns);
          const chosenWrong = incorrectOptions[0] || 'Unknown Option';
          answers[q.id] = chosenWrong;
          answersEvaluation[q.id] = {
            score: 0,
            feedback: `Incorrect option chosen: "${chosenWrong}". The correct answer key is "${expectedAns}".`
          };
        }
      });

      const actualScore = (correctCount / activeQuestions.length) * 10;
      const actualPercentage = (correctCount / activeQuestions.length) * 100;

      const evaluationData = {
        score: actualScore,
        percentage: actualPercentage,
        overallFeedback: c.overallFeedback,
        skillScores: c.skillScores,
        topicScores: c.skillScores,
        answersEvaluation,
      };

      const nameParts = c.name.trim().split(/\s+/);
      const fname = nameParts[0] || '';
      const lname = nameParts.slice(1).join(' ') || '.';
      const candidateId = Math.floor(100000 + Math.random() * 900000).toString();

      // Create Candidate
      const dbCandidate = await prisma.candidate.create({
        data: {
          positionId,
          candidateId,
          fname,
          lname,
          email: c.email,
          phone: c.phone,
          assessmentStatus: 'EVALUATED',
          assessmentToken: crypto.randomUUID(),
        },
      });

      // Create Assessment
      await prisma.assessment.create({
        data: {
          candidateId: dbCandidate.id,
          jobId: positionId,
          questions: activeQuestions.map(q => ({
            id: q.id,
            question: q.question,
            topic: q.topic,
            options: q.options,
            answer: q.answer
          })) as any,
          assignedQuestionIds: activeQuestions.map(q => q.id),
          answers,
          score: actualScore,
          percentage: actualPercentage,
          evaluationData,
          completedAt: new Date(),
        },
      });
    }

    console.log(`[Mock Generator] Successfully populated mock details and 150 MCQs for job ${jobId}`);
  } catch (error) {
    console.error('[Mock Generator] Error generating mock data:', error);
  }
}
