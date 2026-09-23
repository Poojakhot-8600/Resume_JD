'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DataTable } from '@/components/ui/data-table';
import { UserCheck, Plus, Trash2, Shield, Mail, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'RECRUITER';
  createdAt: string;
}

const addHRSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'RECRUITER']),
});

type AddHRFormValues = z.infer<typeof addHRSchema>;

export default function TeamManagementPage() {
  const [users, setUsers] = React.useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddHRFormValues>({
    resolver: zodResolver(addHRSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'RECRUITER',
    },
  });

  const loadTeam = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/team');
      if (!res.ok) {
        throw new Error('Failed to load team members');
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error loading team:', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadTeam();
  }, []);

  const onSubmit = async (data: AddHRFormValues) => {
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create account');
      }

      alert('HR/Recruiter user added successfully!');
      setIsAddOpen(false);
      reset();
      loadTeam();
    } catch (err: any) {
      alert(err.message || 'Error creating user account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recruiter account? They will lose dashboard access immediately.')) {
      return;
    }

    try {
      setDeletingId(id);
      const res = await fetch(`/api/team/${id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Deletion failed');
      }

      alert('Account removed successfully.');
      loadTeam();
    } catch (err: any) {
      alert(err.message || 'Error deleting user account');
    } finally {
      setDeletingId(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    return role === 'ADMIN'
      ? 'bg-neutral-950 text-white border-neutral-900'
      : 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  const columns = [
    {
      header: 'Name',
      accessorKey: 'name',
      sortable: true,
      cell: (member: TeamMember) => (
        <span className="text-xs font-semibold text-neutral-900">{member.name}</span>
      ),
    },
    {
      header: 'Email Address',
      accessorKey: 'email',
      sortable: true,
      cell: (member: TeamMember) => (
        <div className="flex items-center gap-1.5 text-neutral-600">
          <Mail className="h-3 w-3 text-neutral-400" />
          <span>{member.email}</span>
        </div>
      ),
    },
    {
      header: 'Access Level',
      accessorKey: 'role',
      sortable: true,
      cell: (member: TeamMember) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-bold uppercase tracking-wider ${getRoleBadgeColor(
            member.role
          )}`}
        >
          <Shield className="h-2.5 w-2.5" />
          <span>{member.role}</span>
        </span>
      ),
    },
    {
      header: 'Created On',
      accessorKey: 'createdAt',
      sortable: true,
      cell: (member: TeamMember) => (
        <span className="text-xs text-neutral-500 font-medium">
          {new Date(member.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (member: TeamMember) => (
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(member.id)}
            disabled={deletingId === member.id}
            className="h-8 w-8 p-0 cursor-pointer text-red-500 hover:text-red-700 hover:bg-red-50 border-neutral-200"
            title="Delete HR account"
          >
            {deletingId === member.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Overview</span>
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <UserCheck className="h-5.5 w-5.5 text-indigo-600" />
            <span>HR Team Management</span>
          </h2>
          <p className="text-xs text-neutral-500">
            Create, audit, and manage recruiter accounts to grant backend platform privileges.
          </p>
        </div>
        <Button size="sm" className="cursor-pointer gap-1.5" onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4.5 w-4.5" />
          <span>Add HR User</span>
        </Button>
      </div>

      {/* Table Section */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3 bg-white border border-neutral-200 rounded-sm">
          <Loader2 className="h-6 w-6 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full" />
          <span className="text-xs text-neutral-400 font-medium">Loading HR team profiles...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center space-y-3 bg-white border border-neutral-200 rounded-sm">
          <UserCheck className="h-8 w-8 text-neutral-300" />
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">No HR Accounts</h3>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Add your first recruiter to assign recruitment, JD uploads, and candidate testing roles.
            </p>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          searchPlaceholder="Search by name or email address..."
          searchKey="name"
        />
      )}

      {/* Add HR Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add HR Team Member">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">Full Name</label>
            <Input
              type="text"
              placeholder="e.g. Sarah Jenkins"
              className="text-xs"
              {...register('name')}
            />
            {errors.name && <p className="text-[10px] text-red-500 font-medium">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">Email Address</label>
            <Input
              type="email"
              placeholder="e.g. sarah.j@company.com"
              className="text-xs"
              {...register('email')}
            />
            {errors.email && <p className="text-[10px] text-red-500 font-medium">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">Temporary Password</label>
            <Input
              type="password"
              placeholder="Min. 6 characters"
              className="text-xs"
              {...register('password')}
            />
            {errors.password && <p className="text-[10px] text-red-500 font-medium">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">Access Role</label>
            <select
              className="w-full text-xs rounded-sm border border-neutral-200 bg-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
              {...register('role')}
            >
              <option value="RECRUITER">RECRUITER (Can manage candidates/jobs)</option>
              <option value="ADMIN">ADMIN (Full access + HR user creation)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              size="sm"
              className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
