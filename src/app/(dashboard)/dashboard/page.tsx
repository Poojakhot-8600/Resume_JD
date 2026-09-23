import Link from 'next/link';
import { prisma } from '@/database/db';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Briefcase, Users, Hourglass, CheckSquare, Award, ArrowUpRight, Plus, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const revalidate = 0; // Dynamic server page

export default async function DashboardPage() {
  // Run queries in parallel
  const [
    totalJobs,
    totalCandidates,
    pendingCount,
    completedCount,
    avgScoreData,
    recentCandidates,
    jobsList,
  ] = await Promise.all([
    prisma.job.count(),
    prisma.candidate.count(),
    prisma.candidate.count({
      where: {
        assessmentStatus: { in: ['INVITED', 'STARTED'] },
      },
    }),
    prisma.candidate.count({
      where: {
        assessmentStatus: { in: ['COMPLETED', 'EVALUATED'] },
      },
    }),
    prisma.assessment.aggregate({
      _avg: {
        score: true,
      },
    }),
    prisma.candidate.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        job: { select: { title: true } },
        assessments: { select: { score: true } },
      },
    }),
    prisma.job.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { candidates: true } },
      },
    }),
  ]);

  const avgScore = avgScoreData._avg.score ? Math.round(avgScoreData._avg.score * 10) / 10 : 0;
  const avgPercentage = avgScore ? Math.round(avgScore * 10) : 0;

  // Candidate status distributions
  const invitedCount = await prisma.candidate.count({ where: { assessmentStatus: 'INVITED' } });
  const startedCount = await prisma.candidate.count({ where: { assessmentStatus: 'STARTED' } });
  const compCount = await prisma.candidate.count({ where: { assessmentStatus: 'COMPLETED' } });
  const evalCount = await prisma.candidate.count({ where: { assessmentStatus: 'EVALUATED' } });

  const statusMetrics = [
    { name: 'Invited', count: invitedCount, color: 'bg-neutral-300' },
    { name: 'Started', count: startedCount, color: 'bg-amber-400' },
    { name: 'Completed', count: compCount, color: 'bg-indigo-500' },
    { name: 'Evaluated', count: evalCount, color: 'bg-emerald-500' },
  ];

  const maxStatusCount = Math.max(...statusMetrics.map((m) => m.count), 1);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Greetings Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">Dashboard Overview</h2>
          <p className="text-xs text-neutral-500">
            Real-time assessment tracking, candidate response metrics, and scoring reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/jobs/upload">
            <Button size="sm" variant="outline" className="cursor-pointer gap-1">
              <UploadCloud className="h-4 w-4" />
              <span>Bulk Upload</span>
            </Button>
          </Link>
          <Link href="/dashboard/jobs/new">
            <Button size="sm" className="cursor-pointer gap-1">
              <Plus className="h-4 w-4" />
              <span>Post New Job</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Jobs Card */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Total Jobs</span>
              <p className="text-2xl font-bold text-neutral-900">{totalJobs}</p>
            </div>
            <div className="p-2 border border-indigo-100 rounded-sm bg-indigo-50/70">
              <Briefcase className="h-4 w-4 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        {/* Total Candidates Card */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Candidates</span>
              <p className="text-2xl font-bold text-neutral-900">{totalCandidates}</p>
            </div>
            <div className="p-2 border border-blue-100 rounded-sm bg-blue-50/70">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Assessments Card */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Pending Tests</span>
              <p className="text-2xl font-bold text-neutral-900">{pendingCount}</p>
            </div>
            <div className="p-2 border border-amber-100 rounded-sm bg-amber-50/70">
              <Hourglass className="h-4 w-4 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        {/* Completed Assessments Card */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Completed</span>
              <p className="text-2xl font-bold text-neutral-900">{completedCount}</p>
            </div>
            <div className="p-2 border border-emerald-100 rounded-sm bg-emerald-50/70">
              <CheckSquare className="h-4 w-4 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        {/* Average Score Card */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Avg Score</span>
              <p className="text-2xl font-bold text-neutral-900">
                {avgScore > 0 ? `${avgPercentage}%` : 'N/A'}
              </p>
            </div>
            <div className="p-2 border border-violet-100 rounded-sm bg-violet-50/70">
              <Award className="h-4 w-4 text-violet-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row with Charts and Recents */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Status distribution chart */}
        <Card className="lg:col-span-1 flex flex-col h-full">
          <div className="p-6 border-b border-neutral-100">
            <h3 className="text-sm font-semibold text-neutral-900">Candidate Flow</h3>
            <p className="text-[11px] text-neutral-500 mt-1">Status distribution of all invitees.</p>
          </div>
          <CardContent className="p-6 flex-1 flex flex-col justify-center space-y-4">
            {statusMetrics.map((m) => {
              const percentage = (m.count / maxStatusCount) * 100;
              return (
                <div key={m.name} className="space-y-1">
                  <div className="flex justify-between text-xs text-neutral-700">
                    <span className="font-medium">{m.name}</span>
                    <span className="font-semibold text-neutral-900">{m.count}</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-100 rounded-sm overflow-hidden">
                    <div
                      className={`h-full ${m.color} transition-all duration-500`}
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Candidate Activities */}
        <Card className="lg:col-span-2 flex flex-col h-full">
          <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Recent Candidates</h3>
              <p className="text-[11px] text-neutral-500 mt-1">Status details of the latest invitees.</p>
            </div>
            <Link href="/dashboard/candidates" className="text-xs text-neutral-600 hover:text-neutral-900 font-medium inline-flex items-center gap-0.5">
              <span>View all</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex-1">
            {recentCandidates.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-neutral-400 text-xs gap-1">
                <span>No candidates invited yet.</span>
                <Link href="/dashboard/candidates" className="text-neutral-900 font-semibold underline">
                  Invite your first candidate
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Applied Job</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCandidates.map((c: any) => {
                    const candidateScore = c.assessments[0]?.score;
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="text-xs font-semibold text-neutral-900">{c.name}</div>
                          <div className="text-[10px] text-neutral-500">{c.email}</div>
                        </TableCell>
                        <TableCell className="text-xs text-neutral-700">
                          {c.job?.title || c.currentJobTitle || 'Not Assigned'}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-sm ${c.assessmentStatus === 'EVALUATED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.assessmentStatus === 'COMPLETED'
                                ? 'bg-blue-100 text-blue-800'
                                : c.assessmentStatus === 'STARTED'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-neutral-100 text-neutral-800'
                              }`}
                          >
                            {c.assessmentStatus}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-neutral-900">
                          {candidateScore !== undefined && candidateScore !== null
                            ? `${Math.round(candidateScore * 10)}%`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </div>

      {/* Active Jobs Performance */}
      <Card>
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Active Job Positions</h3>
            <p className="text-[11px] text-neutral-500 mt-1">Overview of currently posted jobs and application counts.</p>
          </div>
          <Link href="/dashboard/jobs" className="text-xs text-neutral-600 hover:text-neutral-900 font-medium inline-flex items-center gap-0.5">
            <span>View all jobs</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <div>
          {jobsList.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-neutral-400 text-xs gap-1">
              <span>No jobs posted yet.</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead className="text-right">Candidates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobsList.map((j: any) => (
                  <TableRow key={j.id}>
                    <TableCell className="text-xs font-semibold text-neutral-900">
                      <Link href={`/dashboard/jobs`} className="hover:underline">
                        {j.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-neutral-700">{j.department}</TableCell>
                    <TableCell className="text-xs text-neutral-600">{j.location}</TableCell>
                    <TableCell className="text-xs text-neutral-600">{j.experience}</TableCell>
                    <TableCell className="text-right text-xs font-bold text-neutral-900">
                      {j._count.candidates}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
