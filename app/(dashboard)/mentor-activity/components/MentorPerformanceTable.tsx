'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useUserAccess } from '@/hooks/useUserAccess';
import {
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  ChevronDown,
  ChevronUp,
  Building2,
  Filter,
} from 'lucide-react';

interface MentorStat {
  mentorId: string;
  mentorName: string;
  email: string;
  departmentId: string;
  designation: string;
  sessionCount: number;
  studentCount: number;
  lastSessionDate: string | null;
  status: 'active' | 'low' | 'inactive';
}

interface Summary {
  totalMentors: number;
  activeMentors: number;
  lowActivityMentors: number;
  inactiveMentors: number;
  totalSessions: number;
  period: string;
  startDate: string;
  endDate: string;
}

type SortField = 'mentorName' | 'sessionCount' | 'studentCount' | 'lastSessionDate' | 'status';
type SortDirection = 'asc' | 'desc';

interface Institution {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

const periodOptions = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'year', label: 'This Year' },
];

export default function MentorPerformanceTable() {
  const { accessToken } = useAuth();
  const { accessInfo } = useUserAccess();
  const [mentors, setMentors] = useState<MentorStat[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [sortField, setSortField] = useState<SortField>('sessionCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Institution & Department filters
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const isSuperAdmin = accessInfo?.role === 'super_admin' || accessInfo?.isSuperAdmin;

  // Fetch institutions on mount (for super admin)
  useEffect(() => {
    if (isSuperAdmin && accessToken) {
      fetchInstitutions();
    }
  }, [isSuperAdmin, accessToken]);

  // Fetch departments when institution changes
  useEffect(() => {
    if (accessToken && (selectedInstitution || !isSuperAdmin)) {
      fetchDepartments();
    }
  }, [selectedInstitution, accessToken, isSuperAdmin]);

  useEffect(() => {
    fetchData();
  }, [period, accessToken, selectedInstitution, selectedDepartment]);

  async function fetchInstitutions() {
    try {
      const response = await fetch('/api/jkkn/institutions', {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setInstitutions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching institutions:', error);
    }
  }

  async function fetchDepartments() {
    try {
      const instId = selectedInstitution || accessInfo?.institutionId;
      const url = instId
        ? `/api/jkkn/departments?institutionId=${instId}`
        : '/api/jkkn/departments';
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }

  async function fetchData() {
    if (!accessToken) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({ period });
      if (selectedInstitution) params.append('institutionId', selectedInstitution);
      if (selectedDepartment) params.append('departmentId', selectedDepartment);

      const response = await fetch(`/api/mentor-activity/institution-stats?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setMentors(data.mentors || []);
        setSummary(data.summary || null);
      }
    } catch (error) {
      console.error('Error fetching mentor performance:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  function getSortedMentors() {
    let filtered = mentors;

    if (filterStatus !== 'all') {
      filtered = mentors.filter((m) => m.status === filterStatus);
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'mentorName':
          comparison = a.mentorName.localeCompare(b.mentorName);
          break;
        case 'sessionCount':
          comparison = a.sessionCount - b.sessionCount;
          break;
        case 'studentCount':
          comparison = a.studentCount - b.studentCount;
          break;
        case 'lastSessionDate':
          const dateA = a.lastSessionDate ? new Date(a.lastSessionDate).getTime() : 0;
          const dateB = b.lastSessionDate ? new Date(b.lastSessionDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'status':
          const statusOrder = { inactive: 0, low: 1, active: 2 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            Low Activity
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3" />
            No Sessions
          </span>
        );
      default:
        return null;
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function exportToCSV() {
    const headers = ['Mentor Name', 'Email', 'Sessions', 'Learners', 'Last Session', 'Status'];
    const rows = getSortedMentors().map((m) => [
      m.mentorName,
      m.email,
      m.sessionCount.toString(),
      m.studentCount.toString(),
      formatDate(m.lastSessionDate),
      m.status,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mentor-performance-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-neutral-100 bg-gradient-to-r from-[#0b6d41]/5 to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0b6d41]/10 rounded-xl">
              <Users className="w-5 h-5 text-[#0b6d41]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Mentor Performance
              </h2>
              <p className="text-sm text-neutral-500">
                Track mentor activity and identify inactive mentors
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all duration-200 ${
                showFilters 
                  ? 'bg-[#0b6d41] text-white border-[#0b6d41] shadow-lg shadow-[#0b6d41]/20' 
                  : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            {/* Period Filter */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2.5 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 bg-white focus:ring-2 focus:ring-[#0b6d41]/20 focus:border-[#0b6d41] transition-all cursor-pointer hover:border-neutral-300"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 bg-white focus:ring-2 focus:ring-[#0b6d41]/20 focus:border-[#0b6d41] transition-all cursor-pointer hover:border-neutral-300"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="low">Low Activity</option>
              <option value="inactive">No Sessions</option>
            </select>

            {/* Export */}
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0b6d41] text-white rounded-xl text-sm font-medium hover:bg-[#095433] transition-all duration-200 shadow-lg shadow-[#0b6d41]/20"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Institution & Department Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 mt-4 p-4 bg-gray-50 rounded-lg">
            {/* Institution Filter - Only for Super Admin */}
            {isSuperAdmin && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  <Building2 className="w-3 h-3 inline mr-1" />
                  Institution
                </label>
                <select
                  value={selectedInstitution}
                  onChange={(e) => {
                    setSelectedInstitution(e.target.value);
                    setSelectedDepartment(''); // Reset department
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0b6d41] focus:border-transparent"
                >
                  <option value="">All Institutions</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Department Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0b6d41] focus:border-transparent"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(selectedInstitution || selectedDepartment) && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedInstitution('');
                    setSelectedDepartment('');
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 border-b border-neutral-100 bg-neutral-50/50">
            <div className="bg-white rounded-xl p-4 border border-neutral-100 shadow-sm">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Total Mentors</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{summary.totalMentors}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm">
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Active</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{summary.activeMentors}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Low Activity</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{summary.lowActivityMentors}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
              <p className="text-xs font-medium text-red-600 uppercase tracking-wide">No Sessions</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{summary.inactiveMentors}</p>
            </div>
          </div>
        )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('mentorName')}
              >
                <div className="flex items-center gap-1">
                  Mentor Name
                  <SortIcon field="mentorName" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('sessionCount')}
              >
                <div className="flex items-center gap-1">
                  Sessions
                  <SortIcon field="sessionCount" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('studentCount')}
              >
                <div className="flex items-center gap-1">
                  Students
                  <SortIcon field="studentCount" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('lastSessionDate')}
              >
                <div className="flex items-center gap-1">
                  Last Session
                  <SortIcon field="lastSessionDate" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  <SortIcon field="status" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {getSortedMentors().length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No mentors found
                </td>
              </tr>
            ) : (
              getSortedMentors().map((mentor) => (
                <tr
                  key={mentor.mentorId}
                  className={`hover:bg-gray-50 ${mentor.status === 'inactive' ? 'bg-red-50/50' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{mentor.mentorName}</p>
                      <p className="text-xs text-gray-500">{mentor.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span
                        className={`text-sm font-medium ${
                          mentor.sessionCount === 0
                            ? 'text-red-600'
                            : mentor.sessionCount <= 2
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }`}
                      >
                        {mentor.sessionCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{mentor.studentCount}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(mentor.lastSessionDate)}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(mentor.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
