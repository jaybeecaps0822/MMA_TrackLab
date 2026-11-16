import React, { useState, useEffect, useMemo } from 'react';
import { Laboratory, Trainer, Schedule, LabUsage, IssueCategory, IssueSeverity, Section, Subject } from '../types';
import { getLabCapacityStatus } from '../utils/capacity';
import { compressImageFile } from '../utils/image';
import { 
  findScheduleConflicts, 
  getSuggestedNextSlot, 
  findAlternativeAvailableLabs, 
  getLabDayTimeline, 
  formatTime12, 
  timeToMinutes,
  minutesToTime 
} from '../utils/conflicts';
import { 
  AlertCircle, 
  AlertTriangle, 
  X, 
  Check, 
  Monitor, 
  Users, 
  Calendar, 
  Clock, 
  Upload, 
  Camera, 
  Wrench, 
  Sparkles, 
  ArrowRight, 
  Building2, 
  CheckCircle2, 
  ShieldAlert, 
  ChevronRight,
  BookOpen,
  Layers,
  GraduationCap,
  Plus,
  Trash2,
  Mail,
  Phone,
  BadgeCheck,
  FileText,
  Hash
} from 'lucide-react';

/* -------------------------------------------------------------
 * 1. CheckInModal
 * ----------------------------------------------------------- */
interface CheckInModalProps {
  laboratories: Laboratory[];
  activeSessions?: LabUsage[];
  initialLabId?: string;
  initialStation?: string;
  isOpen: boolean;
  onClose: () => void;
  onCheckIn: (labId: string, station: string, purpose: string) => void;
}

const PURPOSE_SUGGESTIONS = [
  'Multimedia & Graphic Design',
  '3D Animation & Modeling',
  'Web & App Programming',
  'Computer Networking Lab',
  'Research & Academic Project',
  'Open Station Practice'
];

export const CheckInModal: React.FC<CheckInModalProps> = ({
  laboratories,
  activeSessions = [],
  initialLabId,
  initialStation,
  isOpen,
  onClose,
  onCheckIn,
}) => {
  const [labId, setLabId] = useState(initialLabId || laboratories[0]?.id || '');
  const [station, setStation] = useState(initialStation || '');
  const [purpose, setPurpose] = useState('');

  useEffect(() => {
    if (initialLabId) setLabId(initialLabId);
    else if (laboratories[0]?.id) setLabId(laboratories[0].id);
    if (initialStation) setStation(initialStation);
  }, [initialLabId, initialStation, laboratories]);

  if (!isOpen) return null;

  const selectedLab = laboratories.find(l => l.id === labId);
  const selectedLabSessions = activeSessions.filter(s => s.labId === labId);
  const selectedLabCapacity = getLabCapacityStatus(selectedLabSessions.length, selectedLab?.capacity);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (labId && station.trim() && purpose.trim()) {
      onCheckIn(labId, station.trim(), purpose.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900">Workstation Check-In</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Record your attendance and station assignment.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
              Select Laboratory
            </label>
            <select
              value={labId}
              onChange={(e) => setLabId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="" disabled>Select a room...</option>
              {laboratories.map(lab => {
                const count = activeSessions.filter(s => s.labId === lab.id).length;
                const cap = getLabCapacityStatus(count, lab.capacity);
                return (
                  <option key={lab.id} value={lab.id}>
                    {lab.name} {cap.isWarning ? `⚠️ [Capacity Alert: ${cap.occupiedCount}/${cap.capacity}]` : `(${cap.occupiedCount}/${cap.capacity})`}
                  </option>
                );
              })}
            </select>

            {/* Capacity Warning Alert in Modal */}
            {selectedLabCapacity.isWarning && (
              <div className="mt-2.5 p-3 rounded-lg bg-red-50 border border-red-300 text-red-950 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-red-900">
                    {selectedLabCapacity.isExceeded ? 'Capacity Exceeded Alert' : 'Near Capacity Warning'}
                  </span>
                  <p className="text-[11px] text-red-800 mt-0.5 leading-relaxed">
                    {selectedLabCapacity.isExceeded
                      ? `This laboratory is at or over maximum capacity (${selectedLabCapacity.occupiedCount}/${selectedLabCapacity.capacity} active sessions). Workstation availability cannot be guaranteed.`
                      : `This laboratory is nearing maximum capacity (${selectedLabCapacity.occupiedCount}/${selectedLabCapacity.capacity} active sessions). Only ${selectedLabCapacity.availableCount} workstation(s) left.`}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
              Station Number / PC Identifier
            </label>
            <input
              type="text"
              value={station}
              onChange={(e) => setStation(e.target.value)}
              placeholder="e.g. PC-01, PC-12, Station A"
              required
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
            {/* Quick station picks */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px]">
              <span className="text-zinc-400">Quick:</span>
              {['PC-01', 'PC-02', 'PC-05', 'PC-10', 'PC-15', 'PC-20'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setStation(p)}
                  className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
              Purpose of Laboratory Visit
            </label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Describe what class or project you are working on..."
              rows={2}
              required
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-none"
            />
            {/* Quick purpose suggestions */}
            <div className="flex flex-wrap gap-1 mt-2">
              {PURPOSE_SUGGESTIONS.map(sug => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setPurpose(sug)}
                  className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-zinc-100 text-zinc-700 rounded-lg font-semibold hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
            >
              Confirm Check In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 2. ScheduleModal (Add / Edit Class Schedule)
 * ----------------------------------------------------------- */
interface ScheduleModalProps {
  laboratories: Laboratory[];
  trainers: Trainer[];
  schedules?: Schedule[];
  sections?: Section[];
  subjects?: Subject[];
  initialData?: Schedule | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (schedule: Omit<Schedule, 'id'>) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  laboratories,
  trainers,
  schedules = [],
  sections = [],
  subjects = [],
  initialData,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [labId, setLabId] = useState(initialData?.labId || laboratories[0]?.id || '');
  const [trainerId, setTrainerId] = useState(initialData?.trainerId || trainers[0]?.id || '');
  const [day, setDay] = useState<Schedule['day']>(initialData?.day || 'Monday');
  const [startTime, setStartTime] = useState(initialData?.startTime || '08:00');
  const [endTime, setEndTime] = useState(initialData?.endTime || '10:00');
  const [subject, setSubject] = useState(initialData?.subject || '');
  const [yearSection, setYearSection] = useState(initialData?.yearSection || '');

  useEffect(() => {
    if (initialData) {
      setLabId(initialData.labId);
      setTrainerId(initialData.trainerId || trainers[0]?.id || '');
      setDay(initialData.day);
      setStartTime(initialData.startTime);
      setEndTime(initialData.endTime);
      setSubject(initialData.subject);
      setYearSection(initialData.yearSection);
    } else {
      setLabId(laboratories[0]?.id || '');
      setTrainerId(trainers[0]?.id || '');
      setDay('Monday');
      setStartTime('08:00');
      setEndTime('10:00');
      setSubject('');
      setYearSection('');
    }
  }, [initialData, laboratories, trainers]);

  // Real-time conflict & double-booking detection
  const conflicts = useMemo(() => {
    if (!isOpen || !labId) return [];
    return findScheduleConflicts(
      {
        id: initialData?.id,
        labId,
        day,
        startTime,
        endTime,
        trainerId,
      },
      schedules,
      laboratories,
      trainers
    );
  }, [isOpen, initialData, labId, day, startTime, endTime, trainerId, schedules, laboratories, trainers]);

  const roomConflict = conflicts.find(c => c.type === 'room_overlap');
  const trainerConflict = conflicts.find(c => c.type === 'trainer_overlap');
  const invalidTimeConflict = conflicts.find(c => c.type === 'invalid_time');
  const hasHardConflict = Boolean(roomConflict || invalidTimeConflict);

  // Calculate suggested next slot if room is double-booked
  const suggestedSlot = useMemo(() => {
    if (!roomConflict?.conflictingSchedule) return null;
    const duration = Math.max(30, timeToMinutes(endTime) - timeToMinutes(startTime));
    return getSuggestedNextSlot(roomConflict.conflictingSchedule.endTime, duration > 0 ? duration : 120);
  }, [roomConflict, startTime, endTime]);

  // Find alternative laboratories that are vacant at this exact day and time
  const alternativeLabs = useMemo(() => {
    if (!roomConflict) return [];
    return findAlternativeAvailableLabs(
      {
        day,
        startTime,
        endTime,
        excludeLabId: labId,
        proposedScheduleId: initialData?.id,
      },
      schedules,
      laboratories
    );
  }, [roomConflict, day, startTime, endTime, labId, initialData, schedules, laboratories]);

  // Visual day timeline for the selected laboratory
  const timeline = useMemo(() => {
    if (!isOpen || !labId) return { existingSlots: [], proposedSlot: null, dayStartMinutes: 420, dayEndMinutes: 1140 };
    return getLabDayTimeline(labId, day, schedules, {
      startTime,
      endTime,
      subject: subject || 'Proposed Class',
      excludeScheduleId: initialData?.id,
    });
  }, [isOpen, labId, day, schedules, startTime, endTime, subject, initialData]);

  // Quick duration setter
  const applyDuration = (hours: number) => {
    const startM = timeToMinutes(startTime);
    const endM = Math.min(22 * 60, startM + Math.round(hours * 60));
    setEndTime(minutesToTime(endM));
  };

  // Quick preset slots
  const standardSlots = [
    { label: '8:00 - 10:00 AM', start: '08:00', end: '10:00' },
    { label: '10:00 - 12:00 PM', start: '10:00', end: '12:00' },
    { label: '1:00 - 3:00 PM', start: '13:00', end: '15:00' },
    { label: '3:00 - 5:00 PM', start: '15:00', end: '17:00' },
  ];

  if (!isOpen) return null;

  const currentLab = laboratories.find(l => l.id === labId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasHardConflict) return;
    const trainer = trainers.find(t => t.id === trainerId);
    onSubmit({
      labId,
      trainerId: trainerId || undefined,
      teacherName: trainer ? trainer.name : 'Unknown Faculty',
      subject: subject.trim(),
      yearSection: yearSection.trim(),
      day,
      startTime,
      endTime,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 my-8">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              roomConflict ? 'bg-red-100 text-red-700' : 'bg-zinc-900 text-white'
            }`}>
              {roomConflict ? <ShieldAlert className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                {initialData ? 'Edit Class Schedule' : 'Add Class Schedule'}
              </h3>
              <p className="text-xs text-zinc-500">
                Double-booking prevention active. Validates room and instructor availability in real time.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Room & Faculty Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Target Laboratory <span className="text-red-500">*</span>
              </label>
              <select
                value={labId}
                onChange={(e) => setLabId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer"
              >
                {laboratories.map(lab => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name} {lab.capacity ? `(${lab.capacity} stations)` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Faculty / Instructor <span className="text-red-500">*</span>
              </label>
              <select
                value={trainerId}
                onChange={(e) => setTrainerId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer"
              >
                {trainers.map(trainer => (
                  <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Day of Week & Time Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Day of Week <span className="text-red-500">*</span>
              </label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value as Schedule['day'])}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5 flex items-center justify-between">
                <span>Start Time</span>
                <span className="font-normal text-zinc-400 font-mono text-[9px]">{formatTime12(startTime)}</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5 flex items-center justify-between">
                <span>End Time</span>
                <span className="font-normal text-zinc-400 font-mono text-[9px]">{formatTime12(endTime)}</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Slot Presets & Duration Adjusters */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-zinc-400 font-medium">Standard slots:</span>
            {standardSlots.map(s => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  setStartTime(s.start);
                  setEndTime(s.end);
                }}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  startTime === s.start && endTime === s.end
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                {s.start}–{s.end}
              </button>
            ))}
            <div className="h-3 w-px bg-zinc-200 mx-1 hidden sm:block" />
            <span className="text-[10px] text-zinc-400 font-medium">Duration:</span>
            {[1, 1.5, 2, 3].map(hrs => (
              <button
                key={hrs}
                type="button"
                onClick={() => applyDuration(hrs)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono transition-colors cursor-pointer"
              >
                +{hrs}h
              </button>
            ))}
          </div>

          {/* Room Day Timeline Ribbon: Visualizes occupancy across 7 AM - 7 PM */}
          <div className="p-3 bg-zinc-50/80 rounded-xl border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-zinc-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>{currentLab?.name || 'Laboratory'} • {day} Timeline</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">7:00 AM – 7:00 PM</span>
            </div>

            {/* Timeline Track */}
            <div className="relative h-9 bg-zinc-200/70 rounded-lg overflow-hidden border border-zinc-200">
              {/* Existing Booked Classes */}
              {timeline.existingSlots.map((slot, idx) => (
                <div
                  key={idx}
                  style={{
                    left: `${slot.leftPercent}%`,
                    width: `${slot.widthPercent}%`,
                  }}
                  title={`${slot.label} (${slot.startTime}–${slot.endTime})`}
                  className="absolute top-0 bottom-0 bg-zinc-700 text-zinc-100 flex items-center justify-center px-1 overflow-hidden text-[9px] font-mono border-r border-l border-zinc-900/20 shadow-xs z-10"
                >
                  <span className="truncate">{slot.label} ({slot.startTime})</span>
                </div>
              ))}

              {/* Proposed Class Slot Marker */}
              {timeline.proposedSlot && (
                <div
                  style={{
                    left: `${timeline.proposedSlot.leftPercent}%`,
                    width: `${timeline.proposedSlot.widthPercent}%`,
                  }}
                  className={`absolute top-0 bottom-0 flex items-center justify-center px-1 overflow-hidden text-[9px] font-bold z-20 transition-all ${
                    timeline.proposedSlot.isConflict
                      ? 'bg-red-500 text-white animate-pulse border-2 border-red-700 shadow-md ring-2 ring-red-400'
                      : 'bg-emerald-500 text-white border-2 border-emerald-700 shadow-md ring-2 ring-emerald-300'
                  }`}
                >
                  <span className="truncate">
                    {timeline.proposedSlot.isConflict ? '⚠️ OVERLAP' : '✓ Proposed'} ({startTime}–{endTime})
                  </span>
                </div>
              )}
            </div>

            {/* Hour markers ruler */}
            <div className="flex justify-between text-[9px] text-zinc-400 font-mono px-0.5">
              <span>7 AM</span>
              <span>9 AM</span>
              <span>11 AM</span>
              <span>1 PM</span>
              <span>3 PM</span>
              <span>5 PM</span>
              <span>7 PM</span>
            </div>
          </div>

          {/* Real-Time Conflict Alerts & Auto-Resolutions */}
          {roomConflict ? (
            <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-xl text-xs text-red-950 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-red-900 text-xs">
                    Double-Booking Conflict Detected!
                  </p>
                  <p className="text-[11px] text-red-800 leading-relaxed">
                    {roomConflict.message}
                  </p>
                </div>
              </div>

              {/* Resolution Option 1: Use Next Available Time Slot */}
              {suggestedSlot && (
                <div className="pt-2.5 border-t border-red-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/70 p-2.5 rounded-lg border border-red-200">
                  <div>
                    <span className="text-red-950 font-semibold block text-[11px]">
                      Option 1: Shift Time Slot
                    </span>
                    <span className="text-[10px] text-red-800">
                      Open slot right after conflicting class ends:
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStartTime(suggestedSlot.startTime);
                      setEndTime(suggestedSlot.endTime);
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto text-[11px]"
                  >
                    <span>Use {suggestedSlot.startTime} – {suggestedSlot.endTime}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Resolution Option 2: Switch to Vacant Laboratory */}
              {alternativeLabs.length > 0 && (
                <div className="pt-2 border-t border-red-200/90 bg-white/70 p-2.5 rounded-lg border border-red-200 space-y-2">
                  <div>
                    <span className="text-red-950 font-semibold block text-[11px]">
                      Option 2: Switch to a Free Laboratory
                    </span>
                    <span className="text-[10px] text-red-800">
                      The following rooms have no classes during {startTime} – {endTime}:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {alternativeLabs.map(altLab => (
                      <button
                        key={altLab.id}
                        type="button"
                        onClick={() => setLabId(altLab.id)}
                        className="px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-300 rounded-lg text-[11px] font-medium transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Building2 className="w-3 h-3 text-emerald-600" />
                        <span>Switch to <strong>{altLab.name}</strong></span>
                        {altLab.capacity ? <span className="text-[10px] text-zinc-400">({altLab.capacity} cap)</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : invalidTimeConflict ? (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-amber-900 font-semibold">{invalidTimeConflict.message}</span>
            </div>
          ) : trainerConflict ? (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-1 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">Faculty Schedule Warning</p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    {trainerConflict.message}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-900 block text-[11px]">
                    Room is 100% Available
                  </span>
                  <span className="text-[10px] text-emerald-800">
                    No double-booking detected for {currentLab?.name || 'this room'} on {day} ({startTime}–{endTime}).
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-200/70 text-emerald-900">
                CLEAR
              </span>
            </div>
          )}

          {/* Subject & Section Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px]">
                  Subject Title <span className="text-red-500">*</span>
                </label>
                {subjects.length > 0 && (
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {subjects.length} registered
                  </span>
                )}
              </div>
              <input
                type="text"
                list="registered-subjects-list"
                placeholder="e.g. Multimedia Arts 101, Python 204"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              <datalist id="registered-subjects-list">
                {subjects.map(s => (
                  <option 
                    key={s.id} 
                    value={s.code ? `${s.code} - ${s.name}` : s.name}
                  >
                    {s.category ? `[${s.category}]` : ''} {s.units ? `${s.units} units` : ''}
                  </option>
                ))}
              </datalist>
              {subjects.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {subjects.slice(0, 3).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSubject(s.code ? `${s.code} - ${s.name}` : s.name)}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600 truncate max-w-[140px]"
                      title={s.name}
                    >
                      {s.code || s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px]">
                  Year & Section <span className="text-red-500">*</span>
                </label>
                {sections.length > 0 && (
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {sections.length} registered
                  </span>
                )}
              </div>
              <input
                type="text"
                list="registered-sections-list"
                placeholder="e.g. Grade 12 - ICT A, BSIT 3-1"
                value={yearSection}
                onChange={(e) => setYearSection(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              <datalist id="registered-sections-list">
                {sections.map(sec => (
                  <option key={sec.id} value={sec.name}>
                    {sec.department ? `[${sec.department}]` : ''} {sec.studentCount ? `${sec.studentCount} students` : ''}
                  </option>
                ))}
              </datalist>
              {sections.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {sections.slice(0, 3).map(sec => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setYearSection(sec.name)}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600 truncate max-w-[140px]"
                      title={sec.name}
                    >
                      {sec.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Modal Action Footer */}
          <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-zinc-100 text-zinc-700 rounded-lg font-semibold hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={hasHardConflict}
              className={`flex-1 py-2 rounded-lg font-semibold transition-colors shadow-xs flex items-center justify-center gap-1.5 ${
                hasHardConflict
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-300'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer'
              }`}
            >
              {hasHardConflict ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                  <span>Resolve Conflict to Save</span>
                </>
              ) : initialData ? (
                'Update Schedule'
              ) : (
                'Save Schedule'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 3. LabModal (Add / Edit Laboratory)
 * ----------------------------------------------------------- */
interface LabModalProps {
  initialData?: Laboratory | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string, capacity?: number) => void;
}

export const LabModal: React.FC<LabModalProps> = ({
  initialData,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [capacity, setCapacity] = useState<number>(initialData?.capacity || 24);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setCapacity(initialData.capacity || 24);
    } else {
      setName('');
      setDescription('');
      setCapacity(24);
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), description.trim(), capacity);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-zinc-200 overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900">
            {initialData ? 'Edit Laboratory' : 'Add New Laboratory'}
          </h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
              Laboratory Name
            </label>
            <input
              type="text"
              placeholder="e.g. Multimedia Lab 1, Networking Lab"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
              Workstation Capacity
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              required
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
            <p className="text-[10px] text-zinc-400 mt-1">
              Triggers the red capacity warning when active sessions near or exceed this seat limit.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
              Description & Specifications
            </label>
            <textarea
              placeholder="e.g. Dual-monitor workstations with Adobe Creative Cloud for animation and design students..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-zinc-100 text-zinc-700 rounded-lg font-semibold hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
            >
              {initialData ? 'Update Lab' : 'Create Lab'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 4. TrainerModal (Add / Edit Faculty Member with Photo & Details)
 * ----------------------------------------------------------- */
export interface TrainerFormData {
  name: string;
  specialization: string;
  photoUrl?: string;
  employeeId?: string;
  department?: string;
  email?: string;
  phoneNumber?: string;
  status?: 'active' | 'on_leave' | 'adjunct';
}

interface TrainerModalProps {
  initialData?: Trainer | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TrainerFormData) => void;
}

export const TrainerModal: React.FC<TrainerModalProps> = ({
  initialData,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [employeeId, setEmployeeId] = useState(initialData?.employeeId || '');
  const [department, setDepartment] = useState(initialData?.department || 'Information & Communications Technology');
  const [specialization, setSpecialization] = useState(initialData?.specialization || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || '');
  const [status, setStatus] = useState<'active' | 'on_leave' | 'adjunct'>(initialData?.status || 'active');
  const [photoUrl, setPhotoUrl] = useState(initialData?.photoUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setEmployeeId(initialData.employeeId || '');
      setDepartment(initialData.department || 'Information & Communications Technology');
      setSpecialization(initialData.specialization || '');
      setEmail(initialData.email || '');
      setPhoneNumber(initialData.phoneNumber || '');
      setStatus(initialData.status || 'active');
      setPhotoUrl(initialData.photoUrl || '');
    } else {
      setName('');
      setEmployeeId('');
      setDepartment('Information & Communications Technology');
      setSpecialization('');
      setEmail('');
      setPhoneNumber('');
      setStatus('active');
      setPhotoUrl('');
    }
    setUploadError(null);
  }, [initialData]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPEG, PNG, WebP).');
      return;
    }

    setIsUploading(true);
    try {
      const compressed = await compressImageFile(file, 360, 0.85);
      setPhotoUrl(compressed);
    } catch (err) {
      console.error('Failed to compress image:', err);
      setUploadError('Could not process this image. Please try another photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit({
        name: name.trim(),
        employeeId: employeeId.trim() || undefined,
        department: department.trim() || undefined,
        specialization: specialization.trim(),
        email: email.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        status,
        photoUrl: photoUrl.trim() || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-zinc-200 overflow-hidden my-8 animate-in zoom-in-95">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                {initialData ? 'Edit Faculty Identification' : 'Add Faculty Member'}
              </h3>
              <p className="text-xs text-zinc-500">
                Profile credentials, department, and photo verification for school laboratories.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Photo Identification Upload Area */}
          <div>
            <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
              Faculty Photo Identification
            </label>
            <div className="flex items-center gap-4 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              {/* Photo Preview Circle */}
              <div className="relative shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Faculty Identification"
                    className="w-16 h-16 rounded-full object-cover border-2 border-zinc-900 shadow-xs"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-zinc-200 border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400">
                    <Users className="w-6 h-6" />
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{photoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="px-2.5 py-1.5 bg-zinc-200 hover:bg-red-50 hover:text-red-600 text-zinc-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500">
                  Accepted formats: JPG, PNG, WebP. Auto-compressed for fast sync.
                </p>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-[10px] text-zinc-500 hover:text-zinc-800 underline block"
                >
                  {showUrlInput ? 'Hide URL input' : 'Or paste image URL instead'}
                </button>
              </div>
            </div>

            {showUrlInput && (
              <div className="mt-2">
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            )}

            {uploadError && (
              <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-200 mt-2">
                {uploadError}
              </p>
            )}
          </div>

          {/* Name & Employee ID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Faculty / Instructor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Prof. Alexander Reyes, Engr. Santos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Employee ID
              </label>
              <input
                type="text"
                placeholder="e.g. FAC-2024-01"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          {/* Department & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Department / Program
              </label>
              <input
                type="text"
                list="trainer-departments-list"
                placeholder="e.g. Information Technology"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              <datalist id="trainer-departments-list">
                <option value="Information & Communications Technology" />
                <option value="Multimedia Arts & Digital Animation" />
                <option value="Computer Science" />
                <option value="Computer Engineering" />
                <option value="Senior High School (TVL - ICT)" />
              </datalist>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Faculty Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'on_leave' | 'adjunct')}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer"
              >
                <option value="active">Active · Regular Faculty</option>
                <option value="adjunct">Adjunct / Part-Time Instructor</option>
                <option value="on_leave">On Official Leave</option>
              </select>
            </div>
          </div>

          {/* Specialization */}
          <div>
            <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
              Specialization / Academic Focus
            </label>
            <input
              type="text"
              placeholder="e.g. 3D Animation, Full-Stack Web Development, UI/UX"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Institutional Email
              </label>
              <input
                type="email"
                placeholder="e.g. areyes@school.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Phone / Mobile Number
              </label>
              <input
                type="tel"
                placeholder="e.g. +63 912 345 6789"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-zinc-100 text-zinc-700 rounded-lg font-semibold hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 py-2 bg-zinc-900 disabled:opacity-50 text-white rounded-lg font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
            >
              {initialData ? 'Update Identification' : 'Save Faculty Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 4B. SectionModal (Add / Edit Academic Section or Cohort)
 * ----------------------------------------------------------- */
export interface SectionFormData {
  name: string;
  yearLevel?: string;
  department?: string;
  studentCount?: number;
  adviser?: string;
  room?: string;
  notes?: string;
}

interface SectionModalProps {
  initialData?: Section | null;
  trainers?: Trainer[];
  laboratories?: Laboratory[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SectionFormData) => void;
}

export const SectionModal: React.FC<SectionModalProps> = ({
  initialData,
  trainers = [],
  laboratories = [],
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [yearLevel, setYearLevel] = useState(initialData?.yearLevel || 'Grade 12');
  const [department, setDepartment] = useState(initialData?.department || 'Information & Communications Technology');
  const [studentCount, setStudentCount] = useState<number>(initialData?.studentCount || 35);
  const [adviser, setAdviser] = useState(initialData?.adviser || '');
  const [room, setRoom] = useState(initialData?.room || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setYearLevel(initialData.yearLevel || 'Grade 12');
      setDepartment(initialData.department || 'Information & Communications Technology');
      setStudentCount(initialData.studentCount || 35);
      setAdviser(initialData.adviser || '');
      setRoom(initialData.room || '');
      setNotes(initialData.notes || '');
    } else {
      setName('');
      setYearLevel('Grade 12');
      setDepartment('Information & Communications Technology');
      setStudentCount(35);
      setAdviser(trainers[0]?.name || '');
      setRoom(laboratories[0]?.name || '');
      setNotes('');
    }
  }, [initialData, trainers, laboratories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit({
        name: name.trim(),
        yearLevel: yearLevel.trim() || undefined,
        department: department.trim() || undefined,
        studentCount: studentCount > 0 ? studentCount : undefined,
        adviser: adviser.trim() || undefined,
        room: room.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-zinc-200 overflow-hidden my-8 animate-in zoom-in-95">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                {initialData ? 'Edit Academic Section' : 'Add Academic Section'}
              </h3>
              <p className="text-xs text-zinc-500">
                Class cohort, grade/year level, student headcount, and class adviser.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Section Name & Year Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Section Name / Identifier <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Grade 12 - ICT A, BSIT 3-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Grade / Year Level
              </label>
              <input
                type="text"
                list="section-year-levels"
                placeholder="e.g. Grade 12, 3rd Year"
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              <datalist id="section-year-levels">
                <option value="Grade 11" />
                <option value="Grade 12" />
                <option value="1st Year College" />
                <option value="2nd Year College" />
                <option value="3rd Year College" />
                <option value="4th Year College" />
              </datalist>
            </div>
          </div>

          {/* Department & Student Count */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Department / Track
              </label>
              <input
                type="text"
                list="section-dept-list"
                placeholder="e.g. Information & Communications Technology"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              <datalist id="section-dept-list">
                <option value="Information & Communications Technology" />
                <option value="Multimedia Arts & Animation" />
                <option value="Computer Science" />
                <option value="Technical-Vocational Track" />
              </datalist>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Student Headcount
              </label>
              <input
                type="number"
                min={1}
                max={150}
                value={studentCount}
                onChange={(e) => setStudentCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          {/* Class Adviser & Primary Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Class Adviser / Assigned Instructor
              </label>
              <input
                type="text"
                list="section-adviser-list"
                placeholder="Select or enter adviser name"
                value={adviser}
                onChange={(e) => setAdviser(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              <datalist id="section-adviser-list">
                {trainers.map(t => (
                  <option key={t.id} value={t.name}>
                    {t.specialization ? `(${t.specialization})` : ''}
                  </option>
                ))}
              </datalist>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Designated Home Lab / Room
              </label>
              <input
                type="text"
                list="section-room-list"
                placeholder="Select or enter lab room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              <datalist id="section-room-list">
                {laboratories.map(lab => (
                  <option key={lab.id} value={lab.name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
              Additional Section Notes & Cohort Details
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Shift schedule, software requirements, student coordinator contact..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-zinc-100 text-zinc-700 rounded-lg font-semibold hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
            >
              {initialData ? 'Update Section' : 'Create Section'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 4C. SubjectModal (Add / Edit Curriculum Subject)
 * ----------------------------------------------------------- */
export interface SubjectFormData {
  name: string;
  code?: string;
  category?: string;
  units?: number;
  hoursPerWeek?: number;
  description?: string;
}

interface SubjectModalProps {
  initialData?: Subject | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubjectFormData) => void;
}

export const SubjectModal: React.FC<SubjectModalProps> = ({
  initialData,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [category, setCategory] = useState(initialData?.category || 'Major Specialization');
  const [units, setUnits] = useState<number>(initialData?.units || 3);
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(initialData?.hoursPerWeek || 3);
  const [description, setDescription] = useState(initialData?.description || '');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCode(initialData.code || '');
      setCategory(initialData.category || 'Major Specialization');
      setUnits(initialData.units || 3);
      setHoursPerWeek(initialData.hoursPerWeek || 3);
      setDescription(initialData.description || '');
    } else {
      setName('');
      setCode('');
      setCategory('Major Specialization');
      setUnits(3);
      setHoursPerWeek(3);
      setDescription('');
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit({
        name: name.trim(),
        code: code.trim() || undefined,
        category: category.trim() || undefined,
        units: units > 0 ? units : undefined,
        hoursPerWeek: hoursPerWeek > 0 ? hoursPerWeek : undefined,
        description: description.trim() || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-zinc-200 overflow-hidden my-8 animate-in zoom-in-95">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                {initialData ? 'Edit Curriculum Subject' : 'Add Curriculum Subject'}
              </h3>
              <p className="text-xs text-zinc-500">
                Course code, laboratory contact hours, academic units, and syllabus description.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Subject Code & Subject Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Subject Code
              </label>
              <input
                type="text"
                placeholder="e.g. MMA-101, IT-204"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Subject Title / Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 3D Modeling & Digital Animation"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          {/* Category, Units & Hours per week */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Classification
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer"
              >
                <option value="Major Specialization">Major Specialization</option>
                <option value="Laboratory Practical">Laboratory Practical</option>
                <option value="Core ICT">Core ICT</option>
                <option value="General Education">General Education</option>
                <option value="Elective">Elective</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Academic Units
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={units}
                onChange={(e) => setUnits(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Lab Hours / Week
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          {/* Syllabus Description */}
          <div>
            <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
              Subject Description & Course Competencies
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Focuses on Maya 3D, Blender workflow, UV unwrapping, digital rigging, and lab practical project submissions."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-zinc-100 text-zinc-700 rounded-lg font-semibold hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
            >
              {initialData ? 'Update Subject' : 'Save Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


/* -------------------------------------------------------------
 * 5. EditSessionModal (Edit Station Number for active user)
 * ----------------------------------------------------------- */
interface EditSessionModalProps {
  session: LabUsage | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, station: string) => void;
}

export const EditSessionModal: React.FC<EditSessionModalProps> = ({
  session,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [station, setStation] = useState(session?.station || '');

  useEffect(() => {
    if (session) setStation(session.station);
  }, [session]);

  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl border border-zinc-200 overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900">Change Workstation</h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(session.id, station.trim());
          }}
          className="p-5 space-y-4 text-xs"
        >
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Student
            </label>
            <p className="font-bold text-zinc-900 text-sm">{session.userName}</p>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              New Station Number
            </label>
            <input
              type="text"
              value={station}
              onChange={(e) => setStation(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-zinc-100 text-zinc-700 rounded-lg font-semibold hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
            >
              Save Station
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 6. ConfirmDeleteModal (Safe Confirmation Dialog)
 * ----------------------------------------------------------- */
interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  message,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl border border-zinc-200 p-6 text-center">
        <div className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h3 className="text-base font-bold text-zinc-900 mb-1">{title}</h3>
        <p className="text-xs text-zinc-500 mb-6 leading-relaxed">{message}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-semibold hover:bg-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors shadow-xs"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 7. ReportIssueModal (Report Workstation Hardware/Software Fault)
 * ----------------------------------------------------------- */
const FAULT_SUGGESTIONS = [
  'No display / Monitor will not turn on',
  'Mouse left or right click broken/sticky',
  'Keyboard keys missing or typing repeatedly',
  'No network / Disconnected from internet',
  'System freezing / Blue screen error',
  'Audio headset / microphone not working',
  'Loose power cable or workstation outlet'
];

interface ReportIssueModalProps {
  laboratories: Laboratory[];
  initialLabId?: string;
  initialStation?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    labId: string;
    station: string;
    category: IssueCategory;
    description: string;
    severity: IssueSeverity;
  }) => Promise<void>;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  laboratories,
  initialLabId,
  initialStation,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [labId, setLabId] = useState(initialLabId || laboratories[0]?.id || '');
  const [station, setStation] = useState(initialStation || 'PC-01');
  const [category, setCategory] = useState<IssueCategory>('hardware');
  const [severity, setSeverity] = useState<IssueSeverity>('medium');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialLabId) setLabId(initialLabId);
    else if (laboratories.length > 0 && !labId) setLabId(laboratories[0].id);

    if (initialStation) setStation(initialStation);
  }, [initialLabId, initialStation, laboratories]);

  if (!isOpen) return null;

  const currentLab = laboratories.find(l => l.id === labId) || laboratories[0];
  const stationCount = currentLab?.capacity || 24;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labId || !station.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        labId,
        station: station.trim().toUpperCase(),
        category,
        severity,
        description: description.trim(),
      });
      setDescription('');
      onClose();
    } catch (err) {
      console.error('Error submitting fault report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                Report Workstation Fault
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Notify teachers and technicians of defective equipment or software issues.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Lab & Station Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Target Laboratory
              </label>
              <select
                value={labId}
                onChange={(e) => setLabId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                {laboratories.map(lab => (
                  <option key={lab.id} value={lab.id}>{lab.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Workstation / PC #
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. PC-04"
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono font-medium text-zinc-900 uppercase focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>
          </div>

          {/* Quick Station Picker Buttons */}
          <div>
            <span className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Quick Pick Station in {currentLab?.name || 'Lab'}
            </span>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto no-scrollbar p-1 bg-zinc-50 rounded-lg border border-zinc-200">
              {Array.from({ length: stationCount }, (_, i) => {
                const sLabel = `PC-${String(i + 1).padStart(2, '0')}`;
                const isSelected = station.toUpperCase() === sLabel;
                return (
                  <button
                    key={sLabel}
                    type="button"
                    onClick={() => setStation(sLabel)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                      isSelected
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {sLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category & Severity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Fault Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as IssueCategory)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                <option value="hardware">Hardware (Monitor, CPU, Power)</option>
                <option value="peripheral">Peripherals (Mouse, Keyboard, Audio)</option>
                <option value="network">Network & Internet Connection</option>
                <option value="software">Software, OS or App Error</option>
                <option value="other">Other Issue</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                <option value="low">Low · Workstation usable with slight inconvenience</option>
                <option value="medium">Medium · Workstation functionality impaired</option>
                <option value="critical">Critical · Workstation completely unusable</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
              Issue Description & Symptoms
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what is wrong or what happens when attempting to use this PC..."
              required
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-none"
            />
          </div>

          {/* Quick Suggestion Chips */}
          <div>
            <span className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Common Faults (Click to fill)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {FAULT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setDescription(suggestion)}
                  className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded text-[10px] transition-colors text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-zinc-100 text-zinc-700 rounded-lg font-semibold hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting Report...' : 'Submit Fault Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

