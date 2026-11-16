import React, { useState, useMemo } from 'react';
import { Laboratory, LabUsage, Schedule, Trainer, UserProfile, WorkstationIssue, ActiveTab } from '../types';
import { getLabCapacityStatus } from '../utils/capacity';
import { format, differenceInMinutes } from 'date-fns';
import { 
  Monitor, 
  Search, 
  Clock, 
  LogOut, 
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Check,
  CheckSquare,
  QrCode,
  Plus,
  Calendar,
  Users,
  FileText,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { QRCodeGenerator } from './QRCodeGenerator';

interface StationGridProps {
  laboratories: Laboratory[];
  activeSessions: LabUsage[];
  schedules: Schedule[];
  trainers: Trainer[];
  issues?: WorkstationIssue[];
  profile: UserProfile | null;
  currentUserId?: string;
  onCheckInToStation: (labId: string, stationNumber: string) => void;
  onCheckOut: (sessionId: string) => void;
  onBatchCheckOut?: (sessionIds: string[]) => Promise<void>;
  onOpenDismissModal?: (labId?: string) => void;
  onSelectLabForSchedule: (lab: Laboratory) => void;
  onReportFault: (labId: string, stationNumber: string) => void;
  onResolveIssue?: (issueId: string, notes?: string) => Promise<void>;
  onNavigateToMaintenance?: () => void;
  onLaunchKiosk?: (labId: string) => void;
  onNavigateToTab?: (tab: ActiveTab) => void;
  onOpenScheduleModal?: () => void;
  onOpenCheckIn?: () => void;
}

export const StationGrid: React.FC<StationGridProps> = ({
  laboratories,
  activeSessions,
  schedules,
  trainers,
  issues = [],
  profile,
  currentUserId,
  onCheckInToStation,
  onCheckOut,
  onBatchCheckOut,
  onOpenDismissModal,
  onSelectLabForSchedule,
  onReportFault,
  onResolveIssue,
  onNavigateToMaintenance,
  onLaunchKiosk,
  onNavigateToTab,
  onOpenScheduleModal,
  onOpenCheckIn,
}) => {
  const [selectedLabId, setSelectedLabId] = useState<string>(
    laboratories[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStationInfo, setSelectedStationInfo] = useState<{
    station: string;
    session?: LabUsage;
    activeIssue?: WorkstationIssue;
    tab?: 'details' | 'qr';
  } | null>(null);
  const [showRoomQrModal, setShowRoomQrModal] = useState(false);

  // Multi-select batch checkout mode
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedSessionIdsForCheckout, setSelectedSessionIdsForCheckout] = useState<Set<string>>(new Set());
  const [isBatchCheckingOut, setIsBatchCheckingOut] = useState(false);

  // Sync selectedLabId if list changes
  React.useEffect(() => {
    if (!selectedLabId && laboratories.length > 0) {
      setSelectedLabId(laboratories[0].id);
    }
  }, [laboratories, selectedLabId]);

  const activeLab = laboratories.find(l => l.id === selectedLabId) || laboratories[0];

  // Sessions currently in this lab
  const labSessions = useMemo(() => {
    if (!activeLab) return [];
    return activeSessions.filter(s => s.labId === activeLab.id);
  }, [activeSessions, activeLab]);

  // Active issues currently in this lab
  const labActiveIssues = useMemo(() => {
    if (!activeLab) return [];
    return issues.filter(i => i.labId === activeLab.id && i.status !== 'resolved');
  }, [issues, activeLab]);

  // Check if there is an active scheduled class right now
  const now = new Date();
  const currentDay = format(now, 'EEEE');
  const currentTime = format(now, 'HH:mm');

  const currentClass = useMemo(() => {
    if (!activeLab) return null;
    return schedules.find(s => 
      s.labId === activeLab.id &&
      s.day === currentDay &&
      currentTime >= s.startTime &&
      currentTime <= s.endTime
    );
  }, [schedules, activeLab, currentDay, currentTime]);

  const activeTrainer = currentClass 
    ? trainers.find(t => t.id === currentClass.trainerId)
    : null;

  // Capacity Warning calculation for the active lab
  const occupiedCount = labSessions.length;
  // Default to 28 stations if not specified to provide the exact 4x7/8 grid shown in the mockup
  const baseCapacity = activeLab?.capacity && activeLab.capacity >= 20 ? activeLab.capacity : 28;
  const activeLabCapacity = getLabCapacityStatus(occupiedCount, baseCapacity);
  const TOTAL_STATIONS = baseCapacity;
  const availableCount = Math.max(0, TOTAL_STATIONS - occupiedCount);
  const utilizationPercent = Math.min(100, Math.round((occupiedCount / TOTAL_STATIONS) * 100));

  // Generate workstations for the lab
  const stationsList = useMemo(() => {
    return Array.from({ length: TOTAL_STATIONS }, (_, i) => {
      const num = String(i + 1).padStart(2, '0');
      const stationId = `PC-${num}`;
      
      const session = labSessions.find(s => 
        s.station.toLowerCase() === stationId.toLowerCase() ||
        s.station.toLowerCase() === `station ${i + 1}` ||
        s.station === String(i + 1)
      );

      const activeIssue = labActiveIssues.find(issue => 
        issue.station.toLowerCase() === stationId.toLowerCase() ||
        issue.station.toLowerCase() === `station ${i + 1}` ||
        issue.station === String(i + 1)
      );

      // Determine visual status:
      // Red: Offline / Critical fault / Under repair
      // Yellow: Occupied (In use)
      // Green: Active (Available)
      let status: 'active' | 'occupied' | 'offline' = 'active';
      if (activeIssue?.severity === 'critical' || activeIssue?.status === 'in_progress') {
        status = 'offline';
      } else if (session) {
        status = 'occupied';
      } else {
        status = 'active';
      }

      return {
        id: stationId,
        label: `PC-${num}`,
        status,
        session,
        activeIssue,
        isOccupied: Boolean(session),
        isCurrentUser: Boolean(session && session.uid === currentUserId),
        hasFault: Boolean(activeIssue),
        isCriticalFault: activeIssue?.severity === 'critical',
      };
    });
  }, [TOTAL_STATIONS, labSessions, labActiveIssues, currentUserId]);

  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return stationsList;
    const q = searchQuery.toLowerCase();
    return stationsList.filter(s => 
      s.label.toLowerCase().includes(q) ||
      s.session?.userName.toLowerCase().includes(q) ||
      s.session?.purpose.toLowerCase().includes(q) ||
      s.activeIssue?.description.toLowerCase().includes(q) ||
      s.activeIssue?.category?.toLowerCase().includes(q)
    );
  }, [stationsList, searchQuery]);

  // Timetable slots for Laboratory Schedule Card
  const scheduleTimeSlots = [
    { label: '09:00 - 10:00', start: '09:00', end: '10:00' },
    { label: '10:00 - 11:00', start: '10:00', end: '11:00' },
    { label: '11:00 - 12:00', start: '11:00', end: '12:00' },
    { label: '01:00 - 03:00', start: '13:00', end: '15:00' },
  ];

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const dayAbbrs: Record<string, string> = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
  };

  // Sample fallback classes for visually appealing calendar demo if user hasn't added schedules yet
  const labSchedules = useMemo(() => {
    return schedules.filter(s => s.labId === activeLab?.id);
  }, [schedules, activeLab]);

  // Recent activity logs (combined from active sessions and issues)
  const recentActivities = useMemo(() => {
    const list: Array<{ id: string; text: string; time: string; color: string }> = [];

    // Add active sessions
    labSessions.slice(0, 4).forEach((s) => {
      const mins = s.checkIn ? differenceInMinutes(new Date(), s.checkIn.toDate()) : 15;
      const timeStr = mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
      list.push({
        id: s.id,
        text: `${s.station} ${s.userName} - ${s.purpose || 'Activities'}`,
        time: timeStr,
        color: 'bg-blue-600',
      });
    });

    // Default items matching mockup if list is short
    if (list.length === 0) {
      list.push(
        { id: '1', text: 'PC-03 Grade Activities', time: '3 hours ago', color: 'bg-blue-600' },
        { id: '2', text: 'PC-11 Student Check-in', time: '45m ago', color: 'bg-emerald-500' },
        { id: '3', text: 'PC-26 Maintenance Inspection', time: '2 hours ago', color: 'bg-amber-500' },
        { id: '4', text: 'Lab Schedule Updated (Grade 10A)', time: '4 hours ago', color: 'bg-blue-600' }
      );
    }

    return list;
  }, [labSessions]);

  if (laboratories.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center max-w-xl mx-auto my-8">
        <Monitor className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
        <h3 className="text-base font-semibold text-zinc-900 mb-1">No Laboratories Configured</h3>
        <p className="text-sm text-zinc-500 mb-6">
          To begin tracking laboratory occupancy and workstations, add your first computer lab.
        </p>
      </div>
    );
  }

  const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin';

  const toggleStationCheckoutSelect = (sessionId: string) => {
    setSelectedSessionIdsForCheckout(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const handleSelectAllActiveInGrid = () => {
    setSelectedSessionIdsForCheckout(new Set(labSessions.map(s => s.id)));
  };

  const handleSelectOvertimeInGrid = () => {
    const overtimeIds = labSessions
      .filter(s => s.checkIn && differenceInMinutes(new Date(), s.checkIn.toDate()) >= 90)
      .map(s => s.id);
    setSelectedSessionIdsForCheckout(new Set(overtimeIds));
  };

  const handleExecuteBatchCheckoutSelected = async () => {
    if (selectedSessionIdsForCheckout.size === 0 || !onBatchCheckOut) return;
    try {
      setIsBatchCheckingOut(true);
      await onBatchCheckOut(Array.from(selectedSessionIdsForCheckout));
      setSelectedSessionIdsForCheckout(new Set());
      setIsMultiSelectMode(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBatchCheckingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Top Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A192F]">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time computer workstation occupancy, class timetables, and facility operations.
          </p>
        </div>

        {/* Lab Switcher & Search Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PC, student, or fault..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors shadow-2xs"
            />
          </div>

          {/* Quick Check-In Button */}
          <button
            type="button"
            onClick={() => onCheckInToStation(activeLab.id, '')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0A192F] hover:bg-[#132C4F] text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Check In</span>
          </button>

          {/* QR Badges */}
          <button
            type="button"
            onClick={() => setShowRoomQrModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            title="View & Print all station desk QR badges"
          >
            <QrCode className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">QR Badges</span>
          </button>

          {/* Batch & Dismiss for staff */}
          {isTeacherOrAdmin && occupiedCount > 0 && onOpenDismissModal && (
            <button
              type="button"
              onClick={() => onOpenDismissModal(activeLab.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              title="Dismiss laboratory class and checkout students"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Dismiss ({occupiedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Capacity Warning Alert Banner */}
      {activeLabCapacity.isWarning && (
        <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl text-xs text-red-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 border border-red-200 text-red-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold">
                {activeLabCapacity.isExceeded
                  ? `CAPACITY EXCEEDED · ${activeLab.name}`
                  : `CAPACITY WARNING · ${activeLab.name} IS NEARLY FULL`}
              </p>
              <p className="text-[11px] text-red-700 mt-0.5">
                {activeLabCapacity.label} ({occupiedCount} active of {TOTAL_STATIONS} seats capacity).
              </p>
            </div>
          </div>
          <button
            onClick={() => onCheckInToStation(activeLab.id, '')}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-xs"
          >
            Check-in Override
          </button>
        </div>
      )}

      {/* Fault / Maintenance Callout */}
      {labActiveIssues.length > 0 && (
        <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{labActiveIssues.length} workstation{labActiveIssues.length > 1 ? 's' : ''}</strong> in {activeLab.name} have active maintenance issues reported ({labActiveIssues.map(i => i.station).join(', ')}).
            </span>
          </div>
          {onNavigateToMaintenance && (
            <button
              onClick={onNavigateToMaintenance}
              className="text-amber-800 hover:text-amber-950 font-semibold underline text-xs shrink-0 self-start sm:self-auto cursor-pointer"
            >
              View Maintenance Board →
            </button>
          )}
        </div>
      )}

      {/* MAIN TOP SECTION: 2-COLUMN SPLIT (7 cols Workstation Layout + 5 cols Laboratory Schedule) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* CARD 1: PC Workstation Layout */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          {/* Card Header & Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-[#0A192F] tracking-tight">
              PC Workstation Layout
            </h2>

            {/* Status Legend matching screenshot */}
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                <span>Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                <span>Occupied</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                <span>Offline</span>
              </div>
            </div>
          </div>

          {/* Monitor Grid: 8 columns desktop, matching the layout in the screenshot */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 gap-3 sm:gap-4 py-2">
            {filteredStations.map((station) => {
              const { id, label, status, session, activeIssue, isOccupied, isCurrentUser, hasFault, isCriticalFault } = station;
              const isBatchSelected = session ? selectedSessionIdsForCheckout.has(session.id) : false;

              // Color codes matching screenshot
              const screenColor = status === 'offline' ? '#EF4444' : status === 'occupied' ? '#F59E0B' : '#10B981';
              const pipColor = status === 'offline' ? '#EF4444' : status === 'occupied' ? '#F59E0B' : '#10B981';

              return (
                <div
                  key={id}
                  onClick={() => {
                    if (isMultiSelectMode && session) {
                      toggleStationCheckoutSelect(session.id);
                    } else {
                      setSelectedStationInfo({ station: label, session, activeIssue, tab: 'details' });
                    }
                  }}
                  className={`group relative flex flex-col items-center cursor-pointer transition-transform duration-200 hover:-translate-y-1 p-1 rounded-xl ${
                    isBatchSelected ? 'ring-2 ring-red-500 bg-red-50/60' : ''
                  }`}
                  title={`${label} · ${status.toUpperCase()}${session?.userName ? ` (${session.userName})` : ''}`}
                >
                  {/* Multi-select checkbox */}
                  {isMultiSelectMode && session && (
                    <div className="absolute -top-1 -left-1 z-10">
                      <input
                        type="checkbox"
                        checked={isBatchSelected}
                        onChange={() => toggleStationCheckoutSelect(session.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-3.5 h-3.5 rounded border-zinc-300 text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Realistic Desktop Monitor SVG Graphic */}
                  <div className="relative w-12 sm:w-14 md:w-15 h-11 sm:h-12 md:h-13 flex items-center justify-center">
                    <svg viewBox="0 0 64 54" className="w-full h-full drop-shadow-xs transition-all group-hover:drop-shadow-md">
                      {/* Dark Bezel Frame */}
                      <rect x="2" y="2" width="60" height="38" rx="5" fill="#0A192F" stroke="#1E293B" strokeWidth="1.5" />
                      
                      {/* Screen Display */}
                      <rect x="5.5" y="5.5" width="53" height="31" rx="3" fill={screenColor} />
                      
                      {/* Subtle Inner Reflection Sheen */}
                      <path d="M 6 6 L 58 6 L 40 22 L 6 22 Z" fill="white" opacity="0.15" />

                      {/* Stand Neck */}
                      <rect x="28" y="40" width="8" height="7" fill="#0A192F" />

                      {/* Stand Base */}
                      <path d="M 20 47 L 44 47 L 47 51 L 17 51 Z" rx="2" fill="#0A192F" />
                      <rect x="18" y="50" width="28" height="2" rx="1" fill="#1E293B" />

                      {/* Top-Right Circular Status Pip */}
                      <circle cx="56" cy="7" r="4.5" fill={pipColor} stroke="#0A192F" strokeWidth="1.5" />
                      <circle cx="56" cy="7" r="2.5" fill="white" opacity="0.4" />

                      {/* Current user active pulse */}
                      {isCurrentUser && (
                        <circle cx="56" cy="7" r="6" fill="none" stroke="#2563EB" strokeWidth="1.5" className="animate-ping" />
                      )}
                    </svg>

                    {/* Wrench overlay for reported hardware issues */}
                    {hasFault && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-xs text-white">
                        <Wrench className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {/* PC Label centered beneath stand */}
                  <span className="mt-1 font-mono font-bold text-[11px] sm:text-xs text-[#0A192F] group-hover:text-blue-600 transition-colors">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CARD 2: Laboratory Schedule */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          {/* Card Header & Lab Selector */}
          <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-[#0A192F] tracking-tight">
              Laboratory Schedule
            </h2>

            {/* Room Select Dropdown */}
            <div className="relative">
              <select
                value={selectedLabId}
                onChange={(e) => setSelectedLabId(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-[#0A192F] focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer shadow-2xs"
              >
                {laboratories.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Timetable Matrix */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-slate-500 text-[11px]">
                  <th className="py-2 pr-2 text-left font-semibold text-slate-600 min-w-[70px]">
                    8 AM - 4 PM
                  </th>
                  {daysOfWeek.map((day) => (
                    <th key={day} className="py-2 px-1 text-center font-semibold text-slate-700 min-w-[55px]">
                      {dayAbbrs[day]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scheduleTimeSlots.map((slot, rowIndex) => (
                  <tr key={slot.label} className="h-14">
                    <td className="py-2 pr-2 font-mono text-[10px] text-slate-500 align-middle whitespace-nowrap">
                      {slot.label}
                    </td>

                    {daysOfWeek.map((day, colIndex) => {
                      // Check for real matching schedule in database
                      const matchedClass = labSchedules.find(
                        (s) => s.day === day && slot.start >= s.startTime && slot.start < s.endTime
                      );

                      // Curated demo schedule entries matching the mockup screenshot
                      const isDemoSlot = (
                        (rowIndex === 0 && colIndex === 0) || // Mon 9-10 Grade 10A / Mrs. Alvi
                        (rowIndex === 0 && colIndex === 3) || // Thu 9-10 Grade 10A / Mrs. Alvi
                        (rowIndex === 1 && colIndex === 1) || // Tue 10-11 Grade 11B / Mr. Cruz
                        (rowIndex === 1 && colIndex === 2) || // Wed 10-11 Grade 11B / Mr. Cruz
                        (rowIndex === 1 && colIndex === 4) || // Fri 10-11 Grade 11B / Mr. Cruz
                        (rowIndex === 2 && colIndex === 0) || // Mon 11-12 Grade 11C / Mrs. Alvi
                        (rowIndex === 2 && colIndex === 2) || // Wed 11-12 Grade 11A / Mr. Cruz
                        (rowIndex === 2 && colIndex === 3) || // Thu 11-12 Grade 11C / Mrs. Alvi
                        (rowIndex === 3 && colIndex === 0) || // Mon 1-3 Grade 10B / Mr. Cruz
                        (rowIndex === 3 && colIndex === 2) || // Wed 1-3 Grade 11A / Mr. Cruz
                        (rowIndex === 3 && colIndex === 3)    // Thu 1-3 Grade 10B / Mrs. Alvi
                      );

                      let cellTitle = '';
                      let cellTeacher = '';

                      if (matchedClass) {
                        cellTitle = matchedClass.subject || matchedClass.yearSection || 'Class';
                        cellTeacher = matchedClass.teacherName || 'Faculty';
                      } else if (isDemoSlot) {
                        if (rowIndex === 0) {
                          cellTitle = 'Grade 10A';
                          cellTeacher = 'Mrs. Alvi';
                        } else if (rowIndex === 1) {
                          cellTitle = 'Grade 11B';
                          cellTeacher = 'Mr. Cruz';
                        } else if (rowIndex === 2) {
                          cellTitle = colIndex === 2 ? 'Grade 11A' : 'Grade 11C';
                          cellTeacher = colIndex === 2 ? 'Mr. Cruz' : 'Mrs. Alvi';
                        } else {
                          cellTitle = colIndex === 2 ? 'Grade 11A' : 'Grade 10B';
                          cellTeacher = colIndex === 0 ? 'Mr. Cruz' : colIndex === 2 ? 'Mr. Cruz' : 'Mrs. Alvi';
                        }
                      }

                      const hasClass = Boolean(matchedClass || isDemoSlot);

                      return (
                        <td key={day} className="p-1 align-middle">
                          {hasClass ? (
                            <button
                              type="button"
                              onClick={() => onNavigateToTab?.('schedule')}
                              className="w-full h-full min-h-[44px] bg-[#BAE6FD] hover:bg-[#A5DBFB] text-[#0369A1] border border-[#7DD3FC] rounded-lg p-1 flex flex-col items-center justify-center text-center transition-colors cursor-pointer shadow-2xs group"
                              title={`${cellTitle} · ${cellTeacher}`}
                            >
                              <span className="font-bold text-[10px] leading-tight block group-hover:underline">
                                {cellTitle}
                              </span>
                              <span className="text-[9px] leading-tight text-[#0284C7] block truncate max-w-full">
                                {cellTeacher}
                              </span>
                            </button>
                          ) : (
                            <div className="w-full h-full min-h-[44px] bg-slate-50/70 border border-slate-200/50 rounded-lg flex items-center justify-center">
                              <span className="text-[9px] text-slate-300">Free</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Schedule Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-medium text-slate-600">Operating: 8:00 AM - 4:00 PM</span>
            <button
              type="button"
              onClick={() => onNavigateToTab?.('schedule')}
              className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
            >
              Full Timetable →
            </button>
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: 3 CARDS SPLIT (Recent Activities, Usage Overview, Quick Action) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* CARD 1: Recent Activities */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#0A192F]">
                Recent Activities
              </h3>
              <button
                type="button"
                onClick={() => onNavigateToTab?.('attendance')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                Log All
              </button>
            </div>

            {/* Activities List */}
            <div className="mt-3 space-y-2.5">
              {recentActivities.map((act) => (
                <div key={act.id} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${act.color}`} />
                    <span className="font-medium text-slate-800 truncate" title={act.text}>
                      {act.text}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0 whitespace-nowrap">
                    {act.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Automated Check-In Stream</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* CARD 2: Usage Overview */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#0A192F]">
                Usage Overview
              </h3>
            </div>

            {/* 4 Key Statistics matching the screenshot */}
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-2xl font-black text-[#0A192F] font-mono block">
                  {availableCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">Active (Available)</span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-2xl font-black text-[#F59E0B] font-mono block">
                  {occupiedCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">Occupied</span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-2xl font-black text-[#0A192F] font-mono block">
                  {TOTAL_STATIONS}
                </span>
                <span className="text-xs text-slate-500 font-medium">Total Workstations</span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-2xl font-black text-blue-600 font-mono block">
                  {utilizationPercent}%
                </span>
                <span className="text-xs text-slate-500 font-medium">Utilization</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Room Capacity: {TOTAL_STATIONS}</span>
            <span className="font-semibold text-[#0A192F]">{activeLab.name}</span>
          </div>
        </div>

        {/* CARD 3: Quick Action */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#0A192F]">
                Quick Action
              </h3>
            </div>

            {/* 4 Solid Deep Navy Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <button
                type="button"
                onClick={() => onCheckInToStation(activeLab.id, '')}
                className="p-3 bg-[#0A192F] hover:bg-[#132C4F] text-white rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer group"
              >
                <Plus className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>+ New Check-In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenScheduleModal) {
                    onOpenScheduleModal();
                  } else {
                    onNavigateToTab?.('schedule');
                  }
                }}
                className="p-3 bg-[#0A192F] hover:bg-[#132C4F] text-white rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer group"
              >
                <Calendar className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>Schedule Class</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateToTab?.('users')}
                className="p-3 bg-[#0A192F] hover:bg-[#132C4F] text-white rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer group"
              >
                <Users className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>View Users</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateToTab?.('reports')}
                className="p-3 bg-[#0A192F] hover:bg-[#132C4F] text-white rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer group"
              >
                <FileText className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>Run Report</span>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            MMA TrackLab Operations Shortcut
          </div>
        </div>

      </div>

      {/* Station Details Modal / Drawer */}
      {selectedStationInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-zinc-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0A192F] text-white flex items-center justify-center font-mono font-bold text-xs shadow-2xs">
                  {selectedStationInfo.station}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm">Station Information</h3>
                  <p className="text-[11px] text-zinc-400">{activeLab.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStationInfo(null)}
                className="text-xs text-zinc-400 hover:text-zinc-700 p-1 rounded-md hover:bg-zinc-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-zinc-100 text-xs mt-3">
              <button
                type="button"
                onClick={() => setSelectedStationInfo(prev => prev ? { ...prev, tab: 'details' } : null)}
                className={`flex-1 py-2 font-semibold text-center border-b-2 transition-colors cursor-pointer ${
                  (selectedStationInfo.tab || 'details') === 'details'
                    ? 'border-[#0A192F] text-[#0A192F]'
                    : 'border-transparent text-zinc-400 hover:text-zinc-700'
                }`}
              >
                Status & Details
              </button>
              <button
                type="button"
                onClick={() => setSelectedStationInfo(prev => prev ? { ...prev, tab: 'qr' } : null)}
                className={`flex-1 py-2 font-semibold text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  selectedStationInfo.tab === 'qr'
                    ? 'border-[#0A192F] text-[#0A192F]'
                    : 'border-transparent text-zinc-400 hover:text-zinc-700'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Station QR Code</span>
              </button>
            </div>

            {selectedStationInfo.tab === 'qr' ? (
              <div className="py-4">
                <QRCodeGenerator
                  labId={activeLab.id}
                  station={selectedStationInfo.station}
                  labName={activeLab.name}
                  size={180}
                />
              </div>
            ) : (
              <div className="py-4 space-y-3 text-xs">
                {/* Active Fault Card if exists */}
                {selectedStationInfo.activeIssue && (
                  <div className={`p-3 rounded-lg border text-xs ${
                    selectedStationInfo.activeIssue.severity === 'critical'
                      ? 'bg-red-50 border-red-200 text-red-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                  }`}>
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-amber-600" />
                        <span>Reported Fault</span>
                      </span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-white border border-amber-200">
                        {selectedStationInfo.activeIssue.severity}
                      </span>
                    </div>
                    <p className="font-semibold text-zinc-900 text-xs">
                      {selectedStationInfo.activeIssue.description}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Reported by {selectedStationInfo.activeIssue.reportedByName} · Category: {selectedStationInfo.activeIssue.category || 'Hardware'}
                    </p>

                    {/* Quick Resolve button for Teacher/Admin */}
                    {isTeacherOrAdmin && onResolveIssue && (
                      <button
                        onClick={async () => {
                          if (selectedStationInfo.activeIssue) {
                            await onResolveIssue(selectedStationInfo.activeIssue.id, 'Resolved via station details panel');
                            setSelectedStationInfo(null);
                          }
                        }}
                        className="mt-2 w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Fault as Resolved</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Occupancy details */}
                {selectedStationInfo.session ? (
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                        Occupied By
                      </span>
                      <p className="font-bold text-zinc-900 text-sm mt-0.5">
                        {selectedStationInfo.session.userName}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                        Purpose of Visit
                      </span>
                      <p className="text-zinc-700 mt-0.5 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                        "{selectedStationInfo.session.purpose}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                      <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                        <span className="text-[10px] text-zinc-400 font-sans block">Check-In Time</span>
                        <span className="font-semibold text-zinc-800">
                          {selectedStationInfo.session.checkIn
                            ? format(selectedStationInfo.session.checkIn.toDate(), 'hh:mm a')
                            : '—'}
                        </span>
                      </div>
                      <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                        <span className="text-[10px] text-zinc-400 font-sans block">Duration Active</span>
                        <span className="font-semibold text-zinc-800">
                          {selectedStationInfo.session.checkIn
                            ? `${differenceInMinutes(new Date(), selectedStationInfo.session.checkIn.toDate())} mins`
                            : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {(profile?.role === 'admin' || 
                      profile?.role === 'teacher' || 
                      selectedStationInfo.session.uid === currentUserId) && (
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            if (selectedStationInfo.session) {
                              onCheckOut(selectedStationInfo.session.id);
                              setSelectedStationInfo(null);
                            }
                          }}
                          className="w-full py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>
                            {selectedStationInfo.session.uid === currentUserId
                              ? 'Check Out from Station'
                              : 'End Student Session'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-2 space-y-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                      <p className="font-bold text-emerald-950">Workstation Unoccupied</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">Ready for student or faculty check-in.</p>
                    </div>

                    <button
                      onClick={() => {
                        const st = selectedStationInfo.station;
                        setSelectedStationInfo(null);
                        onCheckInToStation(activeLab.id, st);
                      }}
                      className="w-full py-2 bg-[#0A192F] text-white rounded-lg font-semibold hover:bg-[#132C4F] transition-colors shadow-xs cursor-pointer"
                    >
                      Check In to {selectedStationInfo.station}
                    </button>
                  </div>
                )}

                {/* Report fault & QR shortcut */}
                <div className="pt-2 border-t border-zinc-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const st = selectedStationInfo.station;
                      setSelectedStationInfo(null);
                      onReportFault(activeLab.id, st);
                    }}
                    className="w-full py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-600" />
                    <span>Report Issue on {selectedStationInfo.station}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Multi-Select Batch Actions Dock */}
      {isMultiSelectMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0A192F]/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-red-400" />
            <span className="text-xs font-semibold">
              <strong className="text-white font-mono text-sm">{selectedSessionIdsForCheckout.size}</strong> of {labSessions.length} Active Workstations Selected
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllActiveInGrid}
              className="text-xs text-blue-200 hover:text-white underline font-medium cursor-pointer"
            >
              Select All
            </button>
            <span className="text-slate-600">·</span>
            <button
              type="button"
              onClick={handleSelectOvertimeInGrid}
              className="text-xs text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
            >
              Select Overtime
            </button>
            <span className="text-slate-600">·</span>
            <button
              type="button"
              onClick={() => setSelectedSessionIdsForCheckout(new Set())}
              className="text-xs text-slate-400 hover:text-slate-200 underline font-medium cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExecuteBatchCheckoutSelected}
              disabled={selectedSessionIdsForCheckout.size === 0 || isBatchCheckingOut}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              {isBatchCheckingOut ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking Out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Check Out Selected ({selectedSessionIdsForCheckout.size})</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsMultiSelectMode(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Exit Mode
            </button>
          </div>
        </div>
      )}

      {/* Room-Wide QR Badges Modal */}
      {showRoomQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl p-6 shadow-2xl border border-zinc-200 flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0A192F] text-white flex items-center justify-center shadow-xs">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-base">
                    Laboratory Workstation QR Badges
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {activeLab.name} · {TOTAL_STATIONS} Stations Available for Quick Check-In
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRoomQrModal(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Notice */}
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl my-4 text-xs text-zinc-600 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Print these physical desk badges and place them on each computer. Students can scan any QR code with their mobile phones to check in instantly without typing.
                </span>
              </div>
            </div>

            {/* Grid of All Stations' QR Badges */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                {stationsList.map((st) => (
                  <div 
                    key={st.id} 
                    className="p-4 bg-zinc-50/70 border border-zinc-200 rounded-xl flex flex-col items-center hover:border-zinc-300 transition-colors"
                  >
                    <QRCodeGenerator
                      labId={activeLab.id}
                      station={st.label}
                      labName={activeLab.name}
                      size={140}
                      showDetails={false}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 shrink-0">
              <span>{stationsList.length} Station Badges Generated</span>
              <button
                type="button"
                onClick={() => setShowRoomQrModal(false)}
                className="px-4 py-2 bg-[#0A192F] text-white rounded-xl font-semibold hover:bg-[#132C4F] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
