import React, { useState, useMemo } from 'react';
import { Schedule, Laboratory, Trainer, UserProfile } from '../types';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  Monitor, 
  LayoutGrid, 
  ListFilter,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Building2,
  Filter,
  Check,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Printer
} from 'lucide-react';
import { 
  getConflictingScheduleMap, 
  doTimesOverlap, 
  formatTime12, 
  timeToMinutes 
} from '../utils/conflicts';

interface TimetableMatrixProps {
  schedules: Schedule[];
  laboratories: Laboratory[];
  trainers: Trainer[];
  profile: UserProfile | null;
  onAddSchedule: (prefill?: Partial<Schedule>) => void;
  onEditSchedule: (schedule: Schedule) => void;
  onDeleteSchedule: (id: string) => void;
  onOpenPrintModal?: (mode?: 'room' | 'faculty', targetId?: string) => void;
}

const DAYS: Schedule['day'][] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export const TimetableMatrix: React.FC<TimetableMatrixProps> = ({
  schedules,
  laboratories,
  trainers,
  profile,
  onAddSchedule,
  onEditSchedule,
  onDeleteSchedule,
  onOpenPrintModal,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [selectedLabFilter, setSelectedLabFilter] = useState<string>('all');
  const [selectedTrainerFilter, setSelectedTrainerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [showAvailabilityChecker, setShowAvailabilityChecker] = useState(false);

  // Availability checker state
  const [checkDay, setCheckDay] = useState<Schedule['day']>('Monday');
  const [checkStartTime, setCheckStartTime] = useState('08:00');
  const [checkEndTime, setCheckEndTime] = useState('10:00');

  const now = new Date();
  const currentDay = format(now, 'EEEE');
  const currentTime = format(now, 'HH:mm');

  const isAuthorized = profile?.role === 'teacher' || profile?.role === 'admin';

  // Conflict evaluation across entire timetable dataset
  const conflictMap = useMemo(() => {
    return getConflictingScheduleMap(schedules);
  }, [schedules]);

  const conflictingCount = conflictMap.size;

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (showConflictsOnly && !conflictMap.has(s.id)) return false;
      if (selectedDayFilter !== 'all' && s.day !== selectedDayFilter) return false;
      if (selectedLabFilter !== 'all' && s.labId !== selectedLabFilter) return false;
      if (selectedTrainerFilter !== 'all' && s.trainerId !== selectedTrainerFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const subjectMatch = s.subject.toLowerCase().includes(q);
        const sectionMatch = s.yearSection.toLowerCase().includes(q);
        const teacherMatch = s.teacherName.toLowerCase().includes(q);
        if (!subjectMatch && !sectionMatch && !teacherMatch) return false;
      }
      return true;
    }).sort((a, b) => {
      const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [schedules, showConflictsOnly, conflictMap, selectedDayFilter, selectedLabFilter, selectedTrainerFilter, searchQuery]);

  // Availability status calculation for each laboratory during the checked slot
  const labAvailabilityList = useMemo(() => {
    if (!showAvailabilityChecker) return [];
    return laboratories.map(lab => {
      const collision = schedules.find(s => 
        s.labId === lab.id && 
        s.day === checkDay && 
        doTimesOverlap(checkStartTime, checkEndTime, s.startTime, s.endTime)
      );

      return {
        lab,
        isAvailable: !collision,
        conflictingSchedule: collision,
      };
    });
  }, [showAvailabilityChecker, laboratories, schedules, checkDay, checkStartTime, checkEndTime]);

  return (
    <div className="space-y-6">
      {/* Control & Filter Header */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Laboratory Timetable & Class Schedules
              </h2>

              {/* Conflict Status Badge */}
              {conflictingCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowConflictsOnly(prev => !prev)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    showConflictsOnly
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-200'
                  }`}
                  title="Click to toggle filtering conflicting schedules"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>{conflictingCount} Double-Booked / Conflict(s)</span>
                  <span className="text-[10px] underline ml-0.5">
                    {showConflictsOnly ? 'Show All' : 'Filter Conflicts'}
                  </span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Conflict-Free (0 double-bookings)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Real-time conflict detection prevents double-booking across all classrooms and faculty.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Print Weekly Schedules Button */}
            {onOpenPrintModal && (
              <button
                type="button"
                onClick={() => onOpenPrintModal('room', selectedLabFilter !== 'all' ? selectedLabFilter : undefined)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 transition-colors cursor-pointer shadow-2xs"
                title="Print Weekly Schedules for Rooms or Faculty"
              >
                <Printer className="w-3.5 h-3.5 text-amber-600" />
                <span>Print Schedule</span>
              </button>
            )}

            {/* Quick Availability Checker Toggle */}
            <button
              type="button"
              onClick={() => setShowAvailabilityChecker(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                showAvailabilityChecker
                  ? 'bg-blue-50 text-blue-900 border-blue-300'
                  : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Check Room Availability</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-zinc-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Weekly Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
            </div>

            {/* Add Schedule CTA for authorized users */}
            {isAuthorized && (
              <button
                type="button"
                onClick={() => onAddSchedule()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Class Schedule</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Room Availability Checker Drawer / Panel */}
        {showAvailabilityChecker && (
          <div className="mt-4 p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
                <span className="font-bold text-xs text-blue-950">
                  Quick Room Availability Checker
                </span>
              </div>
              <span className="text-[11px] text-blue-800">
                Instantly check which laboratory rooms are open before booking
              </span>
            </div>

            {/* Slot Selector Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-blue-900 uppercase tracking-wider mb-1">
                  Target Day
                </label>
                <select
                  value={checkDay}
                  onChange={(e) => setCheckDay(e.target.value as Schedule['day'])}
                  className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                >
                  {DAYS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-blue-900 uppercase tracking-wider mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={checkStartTime}
                  onChange={(e) => setCheckStartTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-mono font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-blue-900 uppercase tracking-wider mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={checkEndTime}
                  onChange={(e) => setCheckEndTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-mono font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Room Availability Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
              {labAvailabilityList.map(({ lab, isAvailable, conflictingSchedule }) => (
                <div
                  key={lab.id}
                  className={`p-3 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                    isAvailable
                      ? 'bg-white border-emerald-200 shadow-2xs'
                      : 'bg-red-50/60 border-red-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-zinc-900">{lab.name}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isAvailable
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {isAvailable ? '✓ VACANT' : '⚠️ BOOKED'}
                      </span>
                    </div>

                    {isAvailable ? (
                      <p className="text-[11px] text-zinc-500">
                        Available on {checkDay} ({checkStartTime}–{checkEndTime}). Capacity: {lab.capacity || 30} stations.
                      </p>
                    ) : (
                      <p className="text-[11px] text-red-700">
                        Booked by <strong>{conflictingSchedule?.teacherName}</strong> for "{conflictingSchedule?.subject}" ({conflictingSchedule?.startTime}–{conflictingSchedule?.endTime}).
                      </p>
                    )}
                  </div>

                  {isAuthorized && isAvailable && (
                    <button
                      type="button"
                      onClick={() => onAddSchedule({
                        labId: lab.id,
                        day: checkDay,
                        startTime: checkStartTime,
                        endTime: checkEndTime,
                      })}
                      className="mt-2 text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 self-start cursor-pointer hover:underline"
                    >
                      <span>Book this room</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap items-center gap-3">
          {/* Day selection tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setSelectedDayFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                selectedDayFilter === 'all'
                  ? 'bg-[#0A192F] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Days
            </button>
            {DAYS.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDayFilter(day)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  selectedDayFilter === day
                    ? 'bg-[#0A192F] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-zinc-200 hidden md:block" />

          {/* Lab filter */}
          <select
            value={selectedLabFilter}
            onChange={(e) => setSelectedLabFilter(e.target.value)}
            className="px-2.5 py-1 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer"
          >
            <option value="all">All Laboratories</option>
            {laboratories.map(lab => (
              <option key={lab.id} value={lab.id}>{lab.name}</option>
            ))}
          </select>

          {/* Trainer filter */}
          <select
            value={selectedTrainerFilter}
            onChange={(e) => setSelectedTrainerFilter(e.target.value)}
            className="px-2.5 py-1 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer"
          >
            <option value="all">All Faculty</option>
            {trainers.map(trainer => (
              <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
            ))}
          </select>

          {/* Search input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subject or section..."
              className="w-full pl-8 pr-3 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          {/* Conflict filter toggle if conflicts exist */}
          {conflictingCount > 0 && (
            <button
              type="button"
              onClick={() => setShowConflictsOnly(prev => !prev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showConflictsOnly
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Conflicts Only ({conflictingCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid View Mode */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {DAYS.map(day => {
            const daySchedules = filteredSchedules.filter(s => s.day === day);
            const isToday = currentDay === day;

            return (
              <div
                key={day}
                className={`bg-white border rounded-xl overflow-hidden shadow-xs flex flex-col ${
                  isToday 
                    ? 'border-zinc-900 ring-1 ring-zinc-900' 
                    : 'border-zinc-200'
                }`}
              >
                {/* Day Header */}
                <div className={`p-3 border-b flex items-center justify-between ${
                  isToday ? 'bg-[#0A192F] text-white border-[#0A192F]' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs">{day}</span>
                    {isToday && (
                      <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.2 bg-emerald-500 text-white rounded">
                        Today
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-mono tabular-nums ${isToday ? 'text-zinc-300' : 'text-zinc-400'}`}>
                    {daySchedules.length}
                  </span>
                </div>

                {/* Day Schedule Items */}
                <div className="p-2.5 space-y-2.5 flex-1 min-h-[220px] bg-zinc-50/40">
                  {daySchedules.length === 0 ? (
                    <div className="h-full flex items-center justify-center p-4 text-center">
                      <span className="text-[11px] text-zinc-400 italic">No classes</span>
                    </div>
                  ) : (
                    daySchedules.map(schedule => {
                      const lab = laboratories.find(l => l.id === schedule.labId);
                      const trainer = trainers.find(t => t.id === schedule.trainerId);
                      const isLive = isToday && currentTime >= schedule.startTime && currentTime <= schedule.endTime;
                      const hasConflict = conflictMap.has(schedule.id);
                      const conflictList = conflictMap.get(schedule.id) || [];
                      const roomConflict = conflictList.find(c => c.type === 'room_overlap');

                      return (
                        <div
                          key={schedule.id}
                          className={`group p-3 rounded-lg border transition-all text-xs relative ${
                            hasConflict
                              ? 'border-red-400 bg-red-50/40 ring-1 ring-red-300 shadow-xs'
                              : isLive
                              ? 'border-amber-400 ring-1 ring-amber-400 shadow-xs bg-white'
                              : 'border-zinc-200 hover:border-zinc-300 bg-white'
                          }`}
                        >
                          {/* Conflict Callout Badge */}
                          {hasConflict && (
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-100/90 px-1.5 py-0.5 rounded mb-1.5">
                              <AlertTriangle className="w-3 h-3 shrink-0 text-red-600" />
                              <span className="truncate">
                                {roomConflict ? 'DOUBLE-BOOKED' : 'FACULTY OVERLAP'}
                              </span>
                            </div>
                          )}

                          {/* Live pulse if active right now */}
                          {isLive && !hasConflict && (
                            <div className="flex items-center gap-1 text-[10px] font-mono text-amber-700 font-semibold mb-1">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                              </span>
                              <span>LIVE NOW</span>
                            </div>
                          )}

                          {/* Time */}
                          <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-zinc-600 mb-1">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            <span>{schedule.startTime}–{schedule.endTime}</span>
                          </div>

                          {/* Subject */}
                          <p className="font-bold text-zinc-900 leading-snug line-clamp-2">
                            {schedule.subject}
                          </p>

                          {/* Section & Lab info */}
                          <div className="mt-1.5 pt-1.5 border-t border-zinc-100 space-y-0.5 text-[11px]">
                            <p className="text-zinc-700 font-medium truncate">
                              {schedule.yearSection}
                            </p>
                            <p className="text-zinc-500 truncate flex items-center gap-1">
                              <Monitor className="w-2.5 h-2.5 text-zinc-400" />
                              <span>{lab?.name || 'Lab'}</span>
                            </p>
                            <div className="text-zinc-600 truncate flex items-center gap-1.5 font-medium">
                              {trainer?.photoUrl ? (
                                <img
                                  src={trainer.photoUrl}
                                  alt={trainer.name}
                                  className="w-4 h-4 rounded-full object-cover border border-zinc-200 shrink-0"
                                />
                              ) : (
                                <Users className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                              )}
                              <span className="truncate">{trainer?.name || schedule.teacherName}</span>
                            </div>
                          </div>

                          {/* Conflict message explanation */}
                          {hasConflict && conflictList[0] && (
                            <div className="mt-2 pt-1.5 border-t border-red-200 text-[10px] text-red-800">
                              <span className="line-clamp-2">{conflictList[0].message}</span>
                            </div>
                          )}

                          {/* Action icons on hover for authorized users */}
                          {isAuthorized && (
                            <div className="mt-2 pt-1 border-t border-zinc-100 flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => onEditSchedule(schedule)}
                                className={`p-1 rounded cursor-pointer transition-colors ${
                                  hasConflict
                                    ? 'text-red-700 bg-red-100 hover:bg-red-200'
                                    : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
                                }`}
                                title={hasConflict ? 'Resolve Conflict' : 'Edit Schedule'}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteSchedule(schedule.id)}
                                className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors"
                                title="Delete Schedule"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View Mode */
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold">
                  <th className="px-4 py-3 font-mono">Day & Time</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Year / Section</th>
                  <th className="px-4 py-3">Laboratory</th>
                  <th className="px-4 py-3">Faculty / Trainer</th>
                  <th className="px-4 py-3">Status</th>
                  {isAuthorized && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-sans">
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={isAuthorized ? 7 : 6} className="px-4 py-12 text-center text-zinc-400">
                      No matching schedules found.
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map(schedule => {
                    const lab = laboratories.find(l => l.id === schedule.labId);
                    const trainer = trainers.find(t => t.id === schedule.trainerId);
                    const isLive = currentDay === schedule.day && currentTime >= schedule.startTime && currentTime <= schedule.endTime;
                    const hasConflict = conflictMap.has(schedule.id);
                    const conflictList = conflictMap.get(schedule.id) || [];

                    return (
                      <tr 
                        key={schedule.id}
                        className={`hover:bg-zinc-50 transition-colors ${
                          hasConflict 
                            ? 'bg-red-50/50' 
                            : isLive 
                            ? 'bg-amber-50/50' 
                            : ''
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-zinc-900">{schedule.day}</span>
                            {isLive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-zinc-500 block">
                            {schedule.startTime} - {schedule.endTime}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-zinc-900">
                          {schedule.subject}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 font-mono text-[11px]">
                          {schedule.yearSection}
                        </td>
                        <td className="px-4 py-3 text-zinc-700">
                          {lab?.name || 'Unknown Lab'}
                        </td>
                        <td className="px-4 py-3 text-zinc-700">
                          <div className="flex items-center gap-2">
                            {trainer?.photoUrl ? (
                              <img
                                src={trainer.photoUrl}
                                alt={trainer.name}
                                className="w-5 h-5 rounded-full object-cover border border-zinc-200 shrink-0"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-600 font-bold text-[9px] flex items-center justify-center shrink-0">
                                {(trainer?.name || schedule.teacherName).charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="font-medium text-zinc-800">{trainer?.name || schedule.teacherName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {hasConflict ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-800" title={conflictList[0]?.message}>
                              <AlertTriangle className="w-3 h-3" />
                              <span>Double-Booked</span>
                            </span>
                          ) : isLive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>Live Now</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Available</span>
                            </span>
                          )}
                        </td>
                        {isAuthorized && (
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onEditSchedule(schedule)}
                                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                  hasConflict
                                    ? 'text-red-700 bg-red-100 hover:bg-red-200 font-semibold'
                                    : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
                                }`}
                                title={hasConflict ? 'Resolve Conflict' : 'Edit'}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteSchedule(schedule.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                title="Delete"
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
        </div>
      )}
    </div>
  );
};
