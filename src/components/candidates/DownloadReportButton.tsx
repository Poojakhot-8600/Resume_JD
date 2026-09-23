'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { downloadCandidateReport } from '@/utils/pdfGenerator';

interface DownloadReportButtonProps {
  candidate: any;
  assessment: any;
}

export default function DownloadReportButton({ candidate, assessment }: DownloadReportButtonProps) {
  const handleDownload = () => {
    if (candidate && assessment) {
      downloadCandidateReport(candidate, assessment);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      variant="outline"
      className="cursor-pointer gap-2 border-neutral-200 shadow-xs hover:border-indigo-600 hover:text-indigo-600 transition-colors"
    >
      <Download className="h-4 w-4" />
      <span>Download PDF Report</span>
    </Button>
  );
}
