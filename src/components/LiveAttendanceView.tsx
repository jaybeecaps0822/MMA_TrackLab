import React, { useState, useMemo } from 'react';
import { LabUsage, Laboratory, UserProfile } from '../types';
import { getLabCapacityStatus } from '../utils/capacity';
import { format, differenceInMinutes } from 'date-fns';
import { 
  Users, 
  Search, 
  Download, 
  Clock, 
  Monitor, 
  LogOut, 
  Pencil, 
  CheckCircle2, 
  LogIn, 
  AlertTriangle,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react';

interface LiveAttendanceViewProps {
  activeSessions: LabUsage[];
  laboratories: Laboratory[];
  profile: UserProfile | null;
  currentUserId?: string;
  onOpenCheckIn: () => void;
  onCheckOut: (sessionId: string) => void;
  onBatchCheckOut?: (sessionIds: string[]) => Promise<void>;
  onOpenDismissModal?: (labId?: string) => void;
  onEditStation: (session: LabUsage) => void;
}

export const LiveAttendanceView: React.FC<LiveAttendanceViewProps> = ({
  activeSessions,
  laboratories,
  profile,
  currentUserId,
  onOpenCheckIn,
  onCheckOut,
  onBatchCheckOut,
  onOpenDismissModal,
  onEditStation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabFilter, setSelectedLabFilter] = useState('all');
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [isBatchCheckingOut, setIsBatchCheckingOut] = useState(false);

  const isAuthorized = profile?.role === 'teacher' || profile?.role === 'admin';

  // Filtered active attendees
  const filteredSessions = useMemo(() => {
    return activeSessions.filter(session => {
      if (selectedLabFilter !== 'all' && session.labId !== selectedLabFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = session.userName.toLowerCase().includes(q);
        const stationMatch = session.station.toLowerCase().includes(q);
        const purposeMatch = session.purpose.toLowerCase().includes(q);
        if (!nameMatch && !stationMatch && !purposeMatch) return false;
      }
      return true;
    });
  }, [activeSessions, selectedLabFilter, searchQuery]);

  const toggleSession = (id: string) => {
    setSelectedSessionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedSessionIds(new Set(filteredSessions.map(s => s.id)));
  };

  const handleDeselectAll = () => {
    setSelectedSessionIds(new Set());
  };

  const handleBatchCheckoutSelected = async () => {
    if (selectedSessionIds.size === 0 || !onBatchCheckOut) return;
    try {
      setIsBatchCheckingOut(true);
      await onBatchCheckOut(Array.from(selectedSessionIds));
      setSelectedSessionIds(new Set());
    } catch (err) {
      console.error(err);
    } finally {
      setIsBatchCheckingOut(false);
    }
  };

  // Export current attendance as CSV
  const handleExportCSV = () => {
    if (activeSessions.length === 0) return;
    const headers = ['Student Name', 'Laboratory', 'Station', 'Check-In Time', 'Duration (mins)', 'Purpose'];
    const rows = activeSessions.map(s => {
      const lab = laboratories.find(l => l.id === s.labId)?.name || 'Unknown Lab';
      const checkInTime = s.checkIn ? format(s.checkIn.toDate(), 'yyyy-MM-dd HH:mm:ss') : '';
      const duration = s.checkIn ? differenceInMinutes(new Date(), s.checkIn.toDate()) : 0;
      return [
        `"${s.userName.replace(/"/g, '""')}"`,
        `"${lab.replace(/"/g, '""')}"`,
        `"${s.station.replace(/"/g, '""')}"`,
        `"${checkInTime}"`,
        duration,
        `"${s.purpose.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ICT_TrackLab_Attendance_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards & Controls */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900 tracking-tight">
              Live Laboratory Attendance & Logs
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Real-time monitoring of students currently logged in across all workstations with batch dismissal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isAuthorized && onOpenDismissModal && activeSessions.length > 0 && (
              <button
                onClick={() => onOpenDismissModal(selectedLabFilter !== 'all' ? selectedLabFilter : undefined)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                title="Dismiss laboratory class and checkout students"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Dismiss Lab Class</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              disabled={activeSessions.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-700 rounded-lg text-xs font-semibold transition-colors"
              title="Download CSV Attendance Log"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onOpenCheckIn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Check In Student</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap items-center gap-3">
          {/* Lab Filter */}
          <select
            value={selectedLabFilter}
            onChange={(e) => {
              setSelectedLabFilter(e.target.value);
              setSelectedSessionIds(new Set());
            }}
            className="px-2.5 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            <option value="all">All Laboratories ({activeSessions.length})</option>
            {laboratories.map(lab => {
              const count = activeSessions.filter(s => s.labId === lab.id).length;
              const cap = getLabCapacityStatus(count, lab.capacity);
              return (
                <option key={lab.id} value={lab.id}>
                  {lab.name} {cap.isWarning ? `⚠️ [Capacity Alert: ${count}/${cap.capacity}]` : `(${count}/${cap.capacity})`}
                </option>
              );
            })}
          </select>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by student name, station, purpose..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>
        </div>

        {/* Batch Checkout Action Bar if items selected */}
        {isAuthorized && selectedSessionIds.size > 0 && (
          <div className="mt-3 p-3 bg-zinc-900 text-white rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <span>
                <strong className="font-bold text-sm text-white">{selectedSessionIds.size}</strong> student{selectedSessionIds.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-xs text-zinc-400 hover:text-white underline"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleBatchCheckoutSelected}
                disabled={isBatchCheckingOut}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {isBatchCheckingOut ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Checking Out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Check Out Selected ({selectedSessionIds.size})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold">
                {isAuthorized && (
                  <th className="px-3 py-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSessionIds.size === filteredSessions.length && filteredSessions.length > 0) {
                          handleDeselectAll();
                        } else {
                          handleSelectAll();
                        }
                      }}
                      className="text-zinc-500 hover:text-zinc-900"
                    >
                      {selectedSessionIds.size === filteredSessions.length && filteredSessions.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-zinc-900" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>
                  </th>
                )}
                <th className="px-4 py-3 font-mono">Student</th>
                <th className="px-4 py-3">Laboratory</th>
                <th className="px-4 py-3 font-mono">Station</th>
                <th className="px-4 py-3">Purpose of Visit</th>
                <th className="px-4 py-3 font-mono">Check-In</th>
                <th className="px-4 py-3 font-mono">Duration</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-sans">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={isAuthorized ? 8 : 7} className="px-4 py-16 text-center">
                    <Users className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="text-zinc-500 font-medium">No active students found</p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {searchQuery || selectedLabFilter !== 'all' 
                        ? 'Try adjusting your search filters' 
                        : 'Currently there are no students checked into the laboratories.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSessions.map(session => {
                  const lab = laboratories.find(l => l.id === session.labId);
                  const isCurrentUser = session.uid === currentUserId;
                  const isSelected = selectedSessionIds.has(session.id);
                  const minutesActive = session.checkIn 
                    ? differenceInMinutes(new Date(), session.checkIn.toDate())
                    : 0;
                  const isOvertime = minutesActive >= 90;

                  // Check if this lab has capacity warning
                  const labSessionsCount = activeSessions.filter(s => s.labId === session.labId).length;
                  const labCap = getLabCapacityStatus(labSessionsCount, lab?.capacity);

                  return (
                    <tr 
                      key={session.id}
                      className={`hover:bg-zinc-50/80 transition-colors ${
                        isSelected 
                          ? 'bg-red-50/40'
                          : isCurrentUser 
                          ? 'bg-blue-50/40' 
                          : ''
                      }`}
                    >
                      {isAuthorized && (
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSession(session.id)}
                            className="rounded border-zinc-300 text-red-600 focus:ring-red-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isCurrentUser ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-700'
                          }`}>
                            {session.userName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-900 block leading-tight">
                              {session.userName}
                            </span>
                            {isCurrentUser && (
                              <span className="text-[10px] text-blue-600 font-medium">You</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Monitor className="w-3 h-3 text-zinc-400" />
                            {lab?.name || 'Unknown Lab'}
                          </span>
                          {labCap.isWarning && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-red-100 text-red-700 text-[10px] font-mono font-bold" title={labCap.label}>
                              <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
                              <span>{labCap.isExceeded ? 'FULL' : 'NEAR'}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded text-[11px]">
                          {session.station}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 max-w-[240px] truncate" title={session.purpose}>
                        {session.purpose}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-zinc-600 whitespace-nowrap">
                        {session.checkIn ? format(session.checkIn.toDate(), 'hh:mm a') : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-zinc-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="tabular-nums">{minutesActive}m elapsed</span>
                          {isOvertime && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-sans">
                              Overtime
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAuthorized && (
                            <button
                              onClick={() => onEditStation(session)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
                              title="Edit Station"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(isAuthorized || isCurrentUser) && (
                            <button
                              onClick={() => onCheckOut(session.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="End Session"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>{isCurrentUser ? 'Sign Out' : 'End'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
