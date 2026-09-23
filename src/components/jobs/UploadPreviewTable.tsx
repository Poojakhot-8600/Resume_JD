'use client';

import React from 'react';

export type ParsedJob = {
  Position_ID: string;
  'Job Title': string;
  JD: string;
  Department?: string;
  Location?: string;
  Experience?: string;
  status?: 'READY' | 'DUPLICATE' | 'MISSING_DATA';
};

interface UploadPreviewTableProps {
  data: ParsedJob[];
}

export default function UploadPreviewTable({ data }: UploadPreviewTableProps) {
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
                    Position ID
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Job Title
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    JD Snippet
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.map((job, index) => (
                  <tr 
                    key={index} 
                    className={
                      job.status === 'MISSING_DATA' 
                        ? 'bg-red-50/50' 
                        : job.status === 'DUPLICATE' 
                        ? 'bg-yellow-50/50' 
                        : ''
                    }
                  >
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6">
                      {job.status === 'READY' && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Ready
                        </span>
                      )}
                      {job.status === 'DUPLICATE' && (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                          Duplicate (Skip)
                        </span>
                      )}
                      {job.status === 'MISSING_DATA' && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          Failed (Missing Fields)
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {job.Position_ID || (
                        <span className="text-red-500 font-semibold italic text-xs">Missing ID</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      {job['Job Title'] || (
                        <span className="text-red-500 font-semibold italic text-xs">Missing Title</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate md:max-w-md lg:max-w-lg">
                        {job.JD || (
                          <span className="text-red-500 font-semibold italic text-xs">Missing Description (JD)</span>
                        )}
                      </div>
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
