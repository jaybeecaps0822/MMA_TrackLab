import React, { useState, useMemo } from 'react';
import { LabUsage, Laboratory, UserProfile } from '../types';
import { format, differenceInMinutes, subDays, isAfter, startOfDay } from 'date-fns';
import { 
  FileText, 
  Search, 
  Download, 
  Calendar, 
  Clock, 
  Monitor, 
  Users, 
  Trash2, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  ArrowUpDown,
  RotateCcw
} from 'lucide-react';

interface ReportsViewProps {
  allSessions: LabUsage[];
  laboratories: Laboratory[];
  profile: UserProfile | null;
  onCheckOutSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

type PeriodFilter = 'all' | 'today' | '7days' | '30days' | 'custom';
type StatusFilter = 'all' | 'completed' | 'active';

function formatDuration(minutes: number) {
  if (minutes < 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  allSessions,
  laboratories,
  profile,
  onCheckOutSession,
  onDeleteSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabFilter, setSelectedLabFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<StatusFilter>('all');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<PeriodFilter>('all');
  const [customDate, setCustomDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const isAdmin = profile?.role === 'admin';

  // Filter sessions
  const filteredSessions = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const sevenDaysAgo = subDays(todayStart, 7);
    const thirtyDaysAgo = subDays(todayStart, 30);

    return allSessions.filter(session => {
      // Lab filter
      if (selectedLabFilter !== 'all' && session.labId !== selectedLabFilter) {
        return false;
      }

      // Status filter
      const isCompleted = session.checkOut !== null;
      if (selectedStatusFilter === 'completed' && !isCompleted) return false;
      if (selectedStatusFilter === 'active' && isCompleted) return false;

      // Period filter
      if (session.checkIn) {
        const sessionDate = session.checkIn.toDate();
        if (selectedPeriodFilter === 'today' && sessionDate < todayStart) {
          return false;
        }
        if (selectedPeriodFilter === '7days' && sessionDate < sevenDaysAgo) {
          return false;
        }
        if (selectedPeriodFilter === '30days' && sessionDate < thirtyDaysAgo) {
          return false;
        }
        if (selectedPeriodFilter === 'custom' && customDate) {
          const sessionDayStr = format(sessionDate, 'yyyy-MM-dd');
          if (sessionDayStr !== customDate) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const studentMatch = session.userName.toLowerCase().includes(q);
        const stationMatch = session.station.toLowerCase().includes(q);
        const purposeMatch = session.purpose.toLowerCase().includes(q);
        const labName = laboratories.find(l => l.id === session.labId)?.name.toLowerCase() || '';
        const labMatch = labName.includes(q);
        if (!studentMatch && !stationMatch && !purposeMatch && !labMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      const timeA = a.checkIn ? a.checkIn.toMillis() : 0;
      const timeB = b.checkIn ? b.checkIn.toMillis() : 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [allSessions, laboratories, selectedLabFilter, selectedStatusFilter, selectedPeriodFilter, customDate, searchQuery, sortOrder]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalCompletedMinutes = 0;
    let completedCount = 0;
    let activeCount = 0;
    const uniqueStudents = new Set<string>();

    allSessions.forEach(s => {
      if (s.userName) uniqueStudents.add(s.userName);
      if (s.checkOut && s.checkIn) {
        completedCount++;
        const duration = differenceInMinutes(s.checkOut.toDate(), s.checkIn.toDate());
        if (duration > 0) totalCompletedMinutes += duration;
      } else if (!s.checkOut) {
        activeCount++;
      }
    });

    const avgMinutes = completedCount > 0 ? Math.round(totalCompletedMinutes / completedCount) : 0;
    const totalHours = Math.round((totalCompletedMinutes / 60) * 10) / 10;

    return {
      totalRecords: allSessions.length,
      completedCount,
      activeCount,
      uniqueStudentsCount: uniqueStudents.size,
      totalHours,
      avgMinutes,
    };
  }, [allSessions]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredSessions.length === 0) return;
    const headers = [
      'Session ID',
      'Student Name',
      'Student UID',
      'Laboratory',
      'Station',
      'Check-In Date',
      'Check-In Time',
      'Check-Out Date',
      'Check-Out Time',
      'Duration (Minutes)',
      'Status',
      'Purpose of Visit'
    ];

    const rows = filteredSessions.map(s => {
      const lab = laboratories.find(l => l.id === s.labId)?.name || 'Unknown Lab';
      const checkInDate = s.checkIn ? format(s.checkIn.toDate(), 'yyyy-MM-dd') : '';
      const checkInTime = s.checkIn ? format(s.checkIn.toDate(), 'HH:mm:ss') : '';
      const checkOutDate = s.checkOut ? format(s.checkOut.toDate(), 'yyyy-MM-dd') : '';
      const checkOutTime = s.checkOut ? format(s.checkOut.toDate(), 'HH:mm:ss') : '';
      const durationMins = s.checkIn && s.checkOut
        ? differenceInMinutes(s.checkOut.toDate(), s.checkIn.toDate())
        : s.checkIn
        ? differenceInMinutes(new Date(), s.checkIn.toDate())
        : 0;
      const status = s.checkOut ? 'Completed' : 'Active';

      return [
        `"${s.id}"`,
        `"${s.userName.replace(/"/g, '""')}"`,
        `"${s.uid}"`,
        `"${lab.replace(/"/g, '""')}"`,
        `"${s.station.replace(/"/g, '""')}"`,
        `"${checkInDate}"`,
        `"${checkInTime}"`,
        `"${checkOutDate}"`,
        `"${checkOutTime}"`,
        durationMins,
        `"${status}"`,
        `"${s.purpose.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MMA_ICT_TrackLab_Audit_Report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasActiveFilters = searchQuery || selectedLabFilter !== 'all' || selectedStatusFilter !== 'all' || selectedPeriodFilter !== 'all' || customDate;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedLabFilter('all');
    setSelectedStatusFilter('all');
    setSelectedPeriodFilter('all');
    setCustomDate('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Laboratory Usage Audit & Historical Reports
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-mono font-bold uppercase tracking-wider">
                Admin Audit
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Comprehensive log of all laboratory check-ins, check-outs, workstation assignments, and session durations.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold transition-colors"
                title="Reset Filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
            <button
              onClick={handleExportCSV}
              disabled={filteredSessions.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
              title="Download Filtered Audit Report (CSV)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit CSV</span>
            </button>
          </div>
        </div>

        {/* Audit Metric Counters Bar */}
        <div className="mt-5 pt-4 border-t border-zinc-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
            <span className="text-zinc-500 block">Total Recorded Sessions</span>
            <span className="text-xl font-bold font-mono tabular-nums text-zinc-900 mt-0.5 block">
              {metrics.totalRecords}
            </span>
          </div>

          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
            <span className="text-zinc-500 block">Completed vs Active</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-bold font-mono tabular-nums text-zinc-900">
                {metrics.completedCount}
              </span>
              <span className="text-[11px] font-mono text-emerald-600 font-semibold">
                ({metrics.activeCount} active now)
              </span>
            </div>
          </div>

          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
            <span className="text-zinc-500 block">Cumulative Lab Hours</span>
            <span className="text-xl font-bold font-mono tabular-nums text-zinc-900 mt-0.5 block">
              {metrics.totalHours} hrs
            </span>
          </div>

          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
            <span className="text-zinc-500 block">Unique Students Audited</span>
            <span className="text-xl font-bold font-mono tabular-nums text-zinc-900 mt-0.5 block">
              {metrics.uniqueStudentsCount}
            </span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap items-center gap-3 text-xs">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, station (PC-01), purpose..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          {/* Laboratory Selector */}
          <select
            value={selectedLabFilter}
            onChange={(e) => setSelectedLabFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-medium"
          >
            <option value="all">All Laboratories</option>
            {laboratories.map(lab => (
              <option key={lab.id} value={lab.id}>{lab.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value as StatusFilter)}
            className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed Only</option>
            <option value="active">Active (Seated)</option>
          </select>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-100 p-0.5 rounded-lg">
            <button
              onClick={() => setSelectedPeriodFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedPeriodFilter === 'all'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setSelectedPeriodFilter('today')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedPeriodFilter === 'today'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedPeriodFilter('7days')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedPeriodFilter === '7days'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Past 7 Days
            </button>
            <button
              onClick={() => setSelectedPeriodFilter('custom')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedPeriodFilter === 'custom'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Specific Date
            </button>
          </div>

          {selectedPeriodFilter === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-800 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          )}

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 rounded-lg text-zinc-700 font-mono text-xs transition-colors"
            title="Toggle Sort by Check-In Time"
          >
            <ArrowUpDown className="w-3 h-3 text-zinc-400" />
            <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Historical Sessions Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold">
                <th className="px-4 py-3 font-mono">Student</th>
                <th className="px-4 py-3">Laboratory</th>
                <th className="px-4 py-3 font-mono">Station</th>
                <th className="px-4 py-3 font-mono">Check-In</th>
                <th className="px-4 py-3 font-mono">Check-Out</th>
                <th className="px-4 py-3 font-mono">Duration</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Status</th>
                {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-sans">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="px-4 py-16 text-center">
                    <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="text-zinc-600 font-semibold text-sm">No historical sessions found</p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {hasActiveFilters 
                        ? 'Try adjusting your filters or search keywords.' 
                        : 'No laboratory usage sessions have been logged yet.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear All Filters</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredSessions.map(session => {
                  const lab = laboratories.find(l => l.id === session.labId);
                  const isCompleted = session.checkOut !== null;
                  const checkInDate = session.checkIn ? session.checkIn.toDate() : null;
                  const checkOutDate = session.checkOut ? session.checkOut.toDate() : null;
                  
                  const durationMinutes = checkInDate && checkOutDate 
                    ? differenceInMinutes(checkOutDate, checkInDate)
                    : checkInDate 
                    ? differenceInMinutes(new Date(), checkInDate)
                    : 0;

                  return (
                    <tr 
                      key={session.id}
                      className={`hover:bg-zinc-50/80 transition-colors ${
                        !isCompleted ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      {/* Student */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-800 flex items-center justify-center font-bold text-[10px]">
                            {session.userName ? session.userName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span className="font-semibold text-zinc-900">
                            {session.userName}
                          </span>
                        </div>
                      </td>

                      {/* Laboratory */}
                      <td className="px-4 py-3 text-zinc-700 whitespace-nowrap font-medium">
                        <div className="flex items-center gap-1.5">
                          <Monitor className="w-3 h-3 text-zinc-400" />
                          <span>{lab?.name || 'Unknown Lab'}</span>
                        </div>
                      </td>

                      {/* Station */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded text-[11px]">
                          {session.station}
                        </span>
                      </td>

                      {/* Check-In Timestamp */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-zinc-700">
                        {checkInDate ? (
                          <div>
                            <span className="block font-medium">{format(checkInDate, 'yyyy-MM-dd')}</span>
                            <span className="text-zinc-500 text-[10px]">{format(checkInDate, 'hh:mm:ss a')}</span>
                          </div>
                        ) : '—'}
                      </td>

                      {/* Check-Out Timestamp */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-zinc-700">
                        {checkOutDate ? (
                          <div>
                            <span className="block font-medium">{format(checkOutDate, 'yyyy-MM-dd')}</span>
                            <span className="text-zinc-500 text-[10px]">{format(checkOutDate, 'hh:mm:ss a')}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[10px] uppercase font-sans">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active / Seated</span>
                          </span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-zinc-700">
                        {formatDuration(durationMinutes)}
                      </td>

                      {/* Purpose */}
                      <td className="px-4 py-3 text-zinc-600 max-w-[200px] truncate" title={session.purpose}>
                        {session.purpose}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-medium text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-zinc-500" />
                            <span>Completed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active Now</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      {isAdmin && (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isCompleted && (
                              <button
                                onClick={() => onCheckOutSession(session.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-amber-700 hover:bg-amber-50 rounded transition-colors"
                                title="Force End Session"
                              >
                                <LogOut className="w-3 h-3" />
                                <span>Sign Out</span>
                              </button>
                            )}
                            <button
                              onClick={() => onDeleteSession(session.id)}
                              className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete Audit Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer info */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
          <span className="font-mono tabular-nums">
            Showing {filteredSessions.length} of {allSessions.length} audit records
          </span>
          <span className="text-[11px]">
            Audit logs are recorded automatically upon student workstation check-in and check-out.
          </span>
        </div>
      </div>
    </div>
  );
};
