import React, { useState, useMemo } from 'react';
import { Laboratory, LabUsage, Schedule, Trainer, UserProfile } from '../types';
import { format, differenceInMinutes } from 'date-fns';
import { 
  X, 
  LogOut, 
  Users, 
  Clock, 
  CheckSquare, 
  Square, 
  AlertTriangle, 
  CheckCircle2, 
  Monitor, 
  BookOpen,
  Calendar,
  Sparkles,
  Loader2
} from 'lucide-react';

interface DismissClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  laboratories: Laboratory[];
  activeSessions: LabUsage[];
  schedules: Schedule[];
  trainers: Trainer[];
  initialLabId?: string;
  profile: UserProfile | null;
  onConfirmBatchCheckout: (sessionIds: string[]) => Promise<void>;
}

export const DismissClassModal: React.FC<DismissClassModalProps> = ({
  isOpen,
  onClose,
  laboratories,
  activeSessions,
  schedules,
  trainers,
  initialLabId,
  profile,
  onConfirmBatchCheckout,
}) => {
  const [selectedLabId, setSelectedLabId] = useState<string>(
    initialLabId || laboratories[0]?.id || ''
  );
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [dismissNotes, setDismissNotes] = useState('');

  // Update selected lab if initialLabId changes
  React.useEffect(() => {
    if (initialLabId) {
      setSelectedLabId(initialLabId);
    } else if (!selectedLabId && laboratories.length > 0) {
      setSelectedLabId(laboratories[0].id);
    }
  }, [initialLabId, laboratories, selectedLabId]);

  const selectedLab = useMemo(() => {
    return laboratories.find(l => l.id === selectedLabId) || laboratories[0];
  }, [laboratories, selectedLabId]);

  // Active sessions in selected laboratory
  const labSessions = useMemo(() => {
    if (!selectedLab) return [];
    return activeSessions.filter(s => s.labId === selectedLab.id);
  }, [activeSessions, selectedLab]);

  // Reset selected sessions when lab changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      // By default select all active sessions in the room for instant dismissal
      setSelectedSessionIds(new Set(labSessions.map(s => s.id)));
      setIsSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen, selectedLabId, labSessions]);

  // Active scheduled class right now in this lab
  const now = new Date();
  const currentDay = format(now, 'EEEE');
  const currentTime = format(now, 'HH:mm');

  const currentClass = useMemo(() => {
    if (!selectedLab) return null;
    return schedules.find(s => 
      s.labId === selectedLab.id &&
      s.day === currentDay &&
      currentTime >= s.startTime &&
      currentTime <= s.endTime
    );
  }, [schedules, selectedLab, currentDay, currentTime]);

  const activeTrainer = currentClass 
    ? trainers.find(t => t.id === currentClass.trainerId)
    : null;

  // Overtime sessions count (> 90 mins)
  const overtimeSessions = useMemo(() => {
    return labSessions.filter(s => {
      if (!s.checkIn) return false;
      return differenceInMinutes(now, s.checkIn.toDate()) >= 90;
    });
  }, [labSessions, now]);

  if (!isOpen) return null;

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
    setSelectedSessionIds(new Set(labSessions.map(s => s.id)));
  };

  const handleDeselectAll = () => {
    setSelectedSessionIds(new Set());
  };

  const handleSelectOvertimeOnly = () => {
    setSelectedSessionIds(new Set(overtimeSessions.map(s => s.id)));
  };

  const handleSubmit = async () => {
    if (selectedSessionIds.size === 0) return;
    try {
      setIsSubmitting(true);
      await onConfirmBatchCheckout(Array.from(selectedSessionIds));
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsSubmitting(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Batch checkout error', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center shadow-xs">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-base flex items-center gap-2">
                <span>End-of-Class Batch Checkout</span>
                <span className="text-[10px] font-mono uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">
                  Lab Dismissal
                </span>
              </h3>
              <p className="text-xs text-zinc-500">
                Check out multiple or all active students in one click when dismissing laboratory class.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Lab Selector & Live Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
                Target Laboratory Room
              </label>
              <select
                value={selectedLabId}
                onChange={(e) => setSelectedLabId(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                {laboratories.map(lab => {
                  const count = activeSessions.filter(s => s.labId === lab.id).length;
                  return (
                    <option key={lab.id} value={lab.id}>
                      {lab.name} — {count} student{count !== 1 ? 's' : ''} currently active
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Current Class Context Banner */}
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-medium mb-0.5">
                  <BookOpen className="w-3 h-3 text-zinc-400" />
                  <span>{currentClass ? 'Current Scheduled Class' : 'Schedule Status'}</span>
                </div>
                {currentClass ? (
                  <p className="font-bold text-zinc-900 truncate">
                    {currentClass.subject} ({currentClass.yearSection})
                  </p>
                ) : (
                  <p className="text-zinc-600">Open Lab / Free Practice Session</p>
                )}
                {currentClass && (
                  <p className="text-[10px] text-zinc-500">
                    Instructor: {activeTrainer?.name || currentClass.teacherName}
                  </p>
                )}
              </div>
              {currentClass && (
                <span className="font-mono text-[10px] bg-white border border-zinc-200 px-2 py-1 rounded text-zinc-700 shrink-0">
                  {currentClass.startTime}–{currentClass.endTime}
                </span>
              )}
            </div>
          </div>

          {/* Overtime Notice if present */}
          {overtimeSessions.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>{overtimeSessions.length} student{overtimeSessions.length !== 1 ? 's' : ''}</strong> have been logged in for over 90 minutes (likely left without signing out).
                </span>
              </div>
              <button
                type="button"
                onClick={handleSelectOvertimeOnly}
                className="px-2.5 py-1 bg-amber-200/70 hover:bg-amber-300 text-amber-900 font-semibold rounded-lg text-[11px] shrink-0 transition-colors"
              >
                Select Overtime Only
              </button>
            </div>
          )}

          {/* Student Selection Controls */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900">
                  Active Students ({labSessions.length})
                </span>
                <span className="text-xs text-zinc-500">
                  · <span className="font-bold text-zinc-900">{selectedSessionIds.size}</span> selected for checkout
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={labSessions.length === 0 || isSubmitting}
                  className="text-zinc-600 hover:text-zinc-900 font-medium hover:underline text-[11px]"
                >
                  Select All
                </button>
                <span className="text-zinc-300">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  disabled={selectedSessionIds.size === 0 || isSubmitting}
                  className="text-zinc-600 hover:text-zinc-900 font-medium hover:underline text-[11px]"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Students List Table */}
            <div className="border border-zinc-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              {labSessions.length === 0 ? (
                <div className="p-8 text-center bg-zinc-50/50">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-zinc-800 text-xs">All Workstations Clear</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    There are no active students signed in to {selectedLab?.name}.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 w-10 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedSessionIds.size === labSessions.length) {
                              handleDeselectAll();
                            } else {
                              handleSelectAll();
                            }
                          }}
                          className="text-zinc-500 hover:text-zinc-900"
                        >
                          {selectedSessionIds.size === labSessions.length && labSessions.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-zinc-900" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-400" />
                          )}
                        </button>
                      </th>
                      <th className="px-3 py-2">Student Name</th>
                      <th className="px-3 py-2 font-mono">Station</th>
                      <th className="px-3 py-2">Purpose</th>
                      <th className="px-3 py-2 font-mono">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {labSessions.map(session => {
                      const isSelected = selectedSessionIds.has(session.id);
                      const minutesActive = session.checkIn
                        ? differenceInMinutes(now, session.checkIn.toDate())
                        : 0;
                      const isOvertime = minutesActive >= 90;

                      return (
                        <tr
                          key={session.id}
                          onClick={() => !isSubmitting && toggleSession(session.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-red-50/40 hover:bg-red-50/70' 
                              : 'hover:bg-zinc-50'
                          }`}
                        >
                          <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isSubmitting}
                              onChange={() => toggleSession(session.id)}
                              className="rounded border-zinc-300 text-red-600 focus:ring-red-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {session.userName.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-zinc-900 truncate">
                                {session.userName}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="font-mono font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded text-[11px]">
                              {session.station}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-zinc-500 max-w-[140px] truncate" title={session.purpose}>
                            {session.purpose}
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="tabular-nums text-zinc-700">{minutesActive}m</span>
                              {isOvertime && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-sans">
                                  Overtime
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Dismissal Notes (Optional) */}
          {labSessions.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">
                Dismissal Remarks / Wrap-up Note (Optional)
              </label>
              <input
                type="text"
                value={dismissNotes}
                onChange={(e) => setDismissNotes(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. Regular period dismissal, all stations sanitized & PCs powered down"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between gap-3">
          <div className="text-xs text-zinc-500">
            {selectedSessionIds.size > 0 ? (
              <span>Ready to check out <strong>{selectedSessionIds.size}</strong> workstation{selectedSessionIds.size !== 1 ? 's' : ''}.</span>
            ) : (
              <span>No students selected.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>

            {isSuccess ? (
              <div className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Class Dismissed Successfully!</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={selectedSessionIds.size === 0 || isSubmitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Batch Checkout...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Dismiss & Check Out ({selectedSessionIds.size})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
