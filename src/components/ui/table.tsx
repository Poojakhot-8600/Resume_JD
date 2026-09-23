import * as React from 'react';

export const Table = ({ className = '', ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="relative w-full overflow-auto border border-neutral-200 rounded-sm">
    <table className={`w-full caption-bottom text-sm border-collapse ${className}`} {...props} />
  </div>
);

export const TableHeader = ({ className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={`border-b border-neutral-200 bg-neutral-50/70 ${className}`} {...props} />
);

export const TableBody = ({ className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={`[&_tr:last-child]:border-0 ${className}`} {...props} />
);

export const TableRow = ({ className = '', ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={`border-b border-neutral-100 transition-colors hover:bg-neutral-50/50 ${className}`}
    {...props}
  />
);

export const TableHead = ({ className = '', ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={`h-10 px-4 text-left align-middle font-semibold text-neutral-500 uppercase tracking-wider text-xs [&:has([role=checkbox])]:pr-0 ${className}`}
    {...props}
  />
);

export const TableCell = ({ className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={`p-4 align-middle text-neutral-700 [&:has([role=checkbox])]:pr-0 ${className}`} {...props} />
);
