'use client';

import React from 'react';

export type ParsedCandidate = {
  name: string;
  email: string;
  phone: string;
  jobTitle?: string;
  jobId?: string;
  Position_ID?: string;
  Candidate_ID?: string;
  status?: 'READY' | 'DUPLICATE' | 'MISSING_DATA';
};

interface CandidatePreviewTableProps {
  data: ParsedCandidate[];
  resolvedJobs: Record<string, string>; // jobId -> jobTitle map
}

export default function CandidatePreviewTable({ data, resolvedJobs }: CandidatePreviewTableProps) {
  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Email
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Phone
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Job Opening
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.map((c, index) => (
                  <tr 
                    key={index} 
                    className={
                      c.status === 'MISSING_DATA' 
                        ? 'bg-red-50/50' 
                        : c.status === 'DUPLICATE' 
                        ? 'bg-yellow-50/50' 
                        : ''
                    }
                  >
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6">
                      {c.status === 'READY' && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Ready
                        </span>
                      )}
                      {c.status === 'DUPLICATE' && (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                          Already Invited (Skip)
                        </span>
                      )}
                      {c.status === 'MISSING_DATA' && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          Failed (Missing Fields)
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-semibold">
                      {c.name || (
                        <span className="text-red-500 font-semibold italic text-xs">Missing Name</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {c.email || (
                        <span className="text-red-500 font-semibold italic text-xs">Missing Email</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {c.phone || '-'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-medium">
                      {c.jobId ? (resolvedJobs[c.jobId] || c.jobId) : (c.jobTitle || 'Default Job')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
